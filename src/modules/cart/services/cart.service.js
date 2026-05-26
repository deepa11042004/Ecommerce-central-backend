const ApiError = require('../../../core/errors/ApiError');
const env = require('../../../config/env');
const { sequelize } = require('../../../database/models');
const { buildItemKey, normalizeCurrency, toInteger, toMoney } = require('../../../utils/shopping');
const CartRepository = require('../repositories/cart.repository');
const ProductCatalogRepository = require('../../product/repositories/productCatalog.repository');

class CartService {
  static async getCart(actor) {
    this.ensureActor(actor);

    const cart = await this.findCartForActor(actor, { includeItems: true });

    return this.buildCartResponse(cart, actor);
  }

  static async addItem(actor, payload) {
    this.ensureActor(actor);

    return this.withTransaction(async (transaction) => {
      const cart = await this.getOrCreateCartForActor(actor, { transaction });
      const selection = await this.resolveSelection(payload, { transaction, requireStock: true });
      const existingItem = await CartRepository.findItemByCartAndKey(cart.id, selection.itemKey, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (existingItem) {
        const nextQuantity = toInteger(existingItem.quantity) + selection.quantity;

        this.ensureStockAvailable(selection, nextQuantity);

        await CartRepository.updateItem(
          existingItem,
          {
            quantity: nextQuantity,
            unitPrice: selection.latestPrice,
          },
          { transaction }
        );
      } else {
        await this.createCartItemWithRetry({
          cartId: cart.id,
          selection,
          transaction,
        });
      }

      const detailedCart = await CartRepository.findById(cart.id, {
        transaction,
        includeItems: true,
      });

      return this.buildCartResponse(detailedCart, actor);
    });
  }

  static async updateItem(actor, itemId, payload) {
    this.ensureActor(actor);

    return this.withTransaction(async (transaction) => {
      const cart = await this.findCartForActor(actor, { transaction });

      if (!cart) {
        throw ApiError.notFound('Cart item not found');
      }

      const item = await CartRepository.findItemByCartAndId(cart.id, itemId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!item) {
        throw ApiError.notFound('Cart item not found');
      }

      const selection = await this.resolveSelection(
        {
          productId: item.productId,
          variantId: item.variantId,
          quantity: payload.quantity,
        },
        { transaction, requireStock: true }
      );

      await CartRepository.updateItem(
        item,
        {
          quantity: selection.quantity,
          unitPrice: selection.latestPrice,
        },
        { transaction }
      );

      const detailedCart = await CartRepository.findById(cart.id, {
        transaction,
        includeItems: true,
      });

      return this.buildCartResponse(detailedCart, actor);
    });
  }

  static async removeItem(actor, itemId) {
    this.ensureActor(actor);

    return this.withTransaction(async (transaction) => {
      const cart = await this.findCartForActor(actor, { transaction });

      if (!cart) {
        throw ApiError.notFound('Cart item not found');
      }

      const item = await CartRepository.findItemByCartAndId(cart.id, itemId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!item) {
        throw ApiError.notFound('Cart item not found');
      }

      await CartRepository.deleteItem(item, { transaction });

      const detailedCart = await CartRepository.findById(cart.id, {
        transaction,
        includeItems: true,
      });

      return this.buildCartResponse(detailedCart, actor);
    });
  }

  static async clear(actor) {
    this.ensureActor(actor);

    return this.withTransaction(async (transaction) => {
      const cart = await this.findCartForActor(actor, { transaction });

      if (!cart) {
        return this.buildCartResponse(null, actor);
      }

      await CartRepository.clearItems(cart.id, { transaction });

      const detailedCart = await CartRepository.findById(cart.id, {
        transaction,
        includeItems: true,
      });

      return this.buildCartResponse(detailedCart, actor);
    });
  }

  static async mergeGuestCartIntoUser({ userId, guestId }, options = {}) {
    if (!userId) {
      throw ApiError.unauthorized('Authentication required');
    }

    const actor = {
      type: 'user',
      userId,
      guestId: null,
    };

    return this.withTransaction(async (transaction) => {
      if (!guestId) {
        if (options.strictGuestIdentity === false) {
          const existingCart = await CartRepository.findByUserId(userId, {
            transaction,
            includeItems: true,
          });

          return {
            ...this.buildCartResponse(existingCart, actor),
            merge: {
              guestId: null,
              sourceCartFound: false,
              mergedItems: 0,
              mergedQuantity: 0,
              removedGuestCart: false,
              issues: [],
            },
          };
        }

        throw ApiError.badRequest('Guest id is required for cart merge');
      }

      const guestCart = await CartRepository.findByGuestId(guestId, {
        transaction,
        includeItems: true,
      });
      let userCart = await CartRepository.findByUserId(userId, {
        transaction,
        includeItems: true,
      });

      if (!guestCart || !guestCart.items?.length) {
        if (guestCart) {
          await CartRepository.deleteCart(guestCart, { transaction });
        }

        return {
          ...this.buildCartResponse(userCart, actor),
          merge: {
            guestId,
            sourceCartFound: Boolean(guestCart),
            mergedItems: 0,
            mergedQuantity: 0,
            removedGuestCart: Boolean(guestCart),
            issues: [],
          },
        };
      }

      if (!userCart) {
        const createdCart = await CartRepository.findOrCreateByUserId(userId, {
          currency: guestCart.currency || this.getDefaultCurrency(),
          transaction,
        });

        userCart = await CartRepository.findById(createdCart.id, {
          transaction,
          includeItems: true,
        });
      }

      const existingItemsByKey = new Map((userCart.items || []).map((item) => [item.itemKey, item]));
      let mergedQuantity = 0;

      for (const guestItem of guestCart.items || []) {
        mergedQuantity += toInteger(guestItem.quantity);

        const existingItem = existingItemsByKey.get(guestItem.itemKey);
        const unitPrice = this.resolveLivePrice(guestItem, guestItem.unitPrice);

        if (existingItem) {
          const nextQuantity = toInteger(existingItem.quantity) + toInteger(guestItem.quantity);

          const updatedItem = await CartRepository.updateItem(
            existingItem,
            {
              quantity: nextQuantity,
              unitPrice,
            },
            { transaction }
          );

          existingItemsByKey.set(updatedItem.itemKey, updatedItem);
          continue;
        }

        const createdItem = await CartRepository.createItem(
          {
            cartId: userCart.id,
            productId: guestItem.productId,
            variantId: guestItem.variantId,
            itemKey: guestItem.itemKey,
            quantity: guestItem.quantity,
            unitPrice,
          },
          { transaction }
        );

        existingItemsByKey.set(createdItem.itemKey, createdItem);
      }

      await CartRepository.clearItems(guestCart.id, { transaction });
      await CartRepository.deleteCart(guestCart, { transaction });

      const mergedCart = await CartRepository.findById(userCart.id, {
        transaction,
        includeItems: true,
      });
      const response = this.buildCartResponse(mergedCart, actor);

      return {
        ...response,
        merge: {
          guestId,
          sourceCartFound: true,
          mergedItems: guestCart.items.length,
          mergedQuantity,
          removedGuestCart: true,
          issues: this.buildMergeIssues(response.cart),
        },
      };
    }, options.transaction);
  }

  static async withTransaction(work, transaction) {
    if (transaction) {
      return work(transaction);
    }

    return sequelize.transaction(work);
  }

  static ensureActor(actor) {
    if (!actor?.userId && !actor?.guestId) {
      throw ApiError.badRequest('Shopping actor context is required');
    }
  }

  static getDefaultCurrency() {
    return normalizeCurrency(env.DEFAULT_CURRENCY, 'USD');
  }

  static buildIdentity(actor) {
    return actor?.userId
      ? {
          type: 'user',
          userId: actor.userId,
        }
      : {
          type: 'guest',
          guestId: actor?.guestId || null,
        };
  }

  static buildCartResponse(cart, actor) {
    return {
      cart: this.serializeCart(cart),
      identity: this.buildIdentity(actor),
    };
  }

  static serializeCart(cart) {
    const items = (cart?.items || []).map((item) => this.serializeCartItem(item));
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = toMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
    const latestSubtotal = toMoney(items.reduce((sum, item) => sum + item.latestLineTotal, 0));

    return {
      id: cart?.id || null,
      currency: cart?.currency || this.getDefaultCurrency(),
      lineCount: items.length,
      itemCount,
      subtotal,
      latestSubtotal,
      items,
      createdAt: cart?.createdAt || null,
      updatedAt: cart?.updatedAt || null,
    };
  }

  static serializeCartItem(item) {
    const product = item.product || null;
    const variant = item.variant || null;
    const quantity = toInteger(item.quantity, 0);
    const unitPrice = toMoney(item.unitPrice, 0);
    const latestPrice = this.resolveLivePrice(item, unitPrice);
    const productActive = product?.status === 'active';
    const variantActive = variant ? variant.status === 'active' : true;
    const allowBackorder = Boolean(variant?.inventory?.allowBackorder);
    const availableStock = this.resolveAvailableStockFromItem(item);
    const outOfStock = !productActive || !variantActive || (availableStock !== null && availableStock < quantity);

    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId || null,
      product: product
        ? {
            id: product.id,
            title: product.title,
            slug: product.slug,
            thumbnail: product.thumbnail,
          }
        : null,
      variant: variant
        ? {
            id: variant.id,
            sku: variant.sku,
            title: variant.title,
            image: variant.image,
          }
        : null,
      quantity,
      unitPrice,
      latestPrice,
      priceChanged: unitPrice !== latestPrice,
      outOfStock,
      availableStock,
      allowBackorder,
      productActive,
      variantActive,
      lineTotal: toMoney(unitPrice * quantity),
      latestLineTotal: toMoney(latestPrice * quantity),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  static buildMergeIssues(cart) {
    return (cart?.items || [])
      .filter((item) => item.priceChanged || item.outOfStock)
      .map((item) => ({
        cartItemId: item.id,
        productId: item.productId,
        variantId: item.variantId,
        priceChanged: item.priceChanged,
        outOfStock: item.outOfStock,
      }));
  }

  static resolveLivePrice(item, fallbackValue) {
    const latestPrice = item.variant
      ? toMoney(item.variant.price, null)
      : toMoney(item.product?.basePrice, null);

    return latestPrice === null ? toMoney(fallbackValue, 0) : latestPrice;
  }

  static resolveAvailableStockFromItem(item) {
    if (item.variant) {
      return this.resolveAvailableVariantStock(item.variant);
    }

    return item.product?.stock == null ? 0 : toInteger(item.product.stock, 0);
  }

  static resolveAvailableVariantStock(variant) {
    if (variant?.inventory?.allowBackorder) {
      return null;
    }

    if (!variant?.inventory) {
      return 0;
    }

    return Math.max(
      toInteger(variant.inventory.quantity, 0) - toInteger(variant.inventory.reservedQuantity, 0),
      0
    );
  }

  static async findCartForActor(actor, options = {}) {
    if (actor.userId) {
      return CartRepository.findByUserId(actor.userId, options);
    }

    return CartRepository.findByGuestId(actor.guestId, options);
  }

  static async getOrCreateCartForActor(actor, { transaction } = {}) {
    if (actor.userId) {
      return CartRepository.findOrCreateByUserId(actor.userId, {
        currency: this.getDefaultCurrency(),
        transaction,
      });
    }

    return CartRepository.findOrCreateByGuestId(actor.guestId, {
      currency: this.getDefaultCurrency(),
      transaction,
    });
  }

  static async createCartItemWithRetry({ cartId, selection, transaction }) {
    try {
      await CartRepository.createItem(
        {
          cartId,
          productId: selection.product.id,
          variantId: selection.variant?.id || null,
          itemKey: selection.itemKey,
          quantity: selection.quantity,
          unitPrice: selection.latestPrice,
        },
        { transaction }
      );
    } catch (error) {
      if (error.name !== 'SequelizeUniqueConstraintError') {
        throw error;
      }

      const concurrentItem = await CartRepository.findItemByCartAndKey(cartId, selection.itemKey, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!concurrentItem) {
        throw error;
      }

      const nextQuantity = toInteger(concurrentItem.quantity) + selection.quantity;

      this.ensureStockAvailable(selection, nextQuantity);

      await CartRepository.updateItem(
        concurrentItem,
        {
          quantity: nextQuantity,
          unitPrice: selection.latestPrice,
        },
        { transaction }
      );
    }
  }

  static ensureStockAvailable(selection, quantity) {
    if (selection.allowBackorder || selection.availableStock === null) {
      return;
    }

    if (quantity > selection.availableStock) {
      throw ApiError.badRequest('Insufficient stock for requested quantity');
    }
  }

  static async resolveSelection(payload, { transaction, requireStock = false } = {}) {
    const quantity = toInteger(payload.quantity, 0);

    if (quantity <= 0) {
      throw ApiError.badRequest('Quantity must be greater than zero');
    }

    const product = await ProductCatalogRepository.findProductById(payload.productId, { transaction });

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    if (product.status !== 'active') {
      throw ApiError.badRequest('Product is inactive');
    }

    if (product.hasVariants) {
      if (!payload.variantId) {
        throw ApiError.badRequest('Variant id is required for this product');
      }

      const variant = await ProductCatalogRepository.findVariantById(payload.variantId, { transaction });

      if (!variant || Number(variant.productId) !== Number(product.id)) {
        throw ApiError.badRequest('Variant does not belong to the requested product');
      }

      if (variant.status !== 'active') {
        throw ApiError.badRequest('Variant is inactive');
      }

      const latestPrice = toMoney(variant.price, null);

      if (latestPrice === null) {
        throw ApiError.badRequest('Variant price is not configured');
      }

      const availableStock = this.resolveAvailableVariantStock(variant);
      const selection = {
        product,
        variant,
        quantity,
        itemKey: buildItemKey(product.id, variant.id),
        latestPrice,
        availableStock,
        allowBackorder: Boolean(variant.inventory?.allowBackorder),
      };

      if (requireStock) {
        this.ensureStockAvailable(selection, quantity);
      }

      return selection;
    }

    if (payload.variantId) {
      throw ApiError.badRequest('Simple products do not support variant selection');
    }

    const latestPrice = toMoney(product.basePrice, null);

    if (latestPrice === null) {
      throw ApiError.badRequest('Product price is not configured');
    }

    const selection = {
      product,
      variant: null,
      quantity,
      itemKey: buildItemKey(product.id),
      latestPrice,
      availableStock: product.stock == null ? 0 : toInteger(product.stock, 0),
      allowBackorder: false,
    };

    if (requireStock) {
      this.ensureStockAvailable(selection, quantity);
    }

    return selection;
  }
}

module.exports = CartService;