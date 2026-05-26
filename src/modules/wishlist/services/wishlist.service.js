const ApiError = require('../../../core/errors/ApiError');
const { sequelize } = require('../../../database/models');
const { buildItemKey, toInteger, toMoney } = require('../../../utils/shopping');
const WishlistRepository = require('../repositories/wishlist.repository');
const ProductCatalogRepository = require('../../product/repositories/productCatalog.repository');

class WishlistService {
  static async getWishlist(actor) {
    this.ensureActor(actor);

    const wishlist = await this.findWishlistForActor(actor, { includeItems: true });

    return this.buildWishlistResponse(wishlist, actor);
  }

  static async addItem(actor, payload) {
    this.ensureActor(actor);

    return this.withTransaction(async (transaction) => {
      const wishlist = await this.getOrCreateWishlistForActor(actor, { transaction });
      const selection = await this.resolveSelection(payload, { transaction });
      const existingItem = await WishlistRepository.findItemByWishlistAndKey(wishlist.id, selection.itemKey, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!existingItem) {
        try {
          await WishlistRepository.createItem(
            {
              wishlistId: wishlist.id,
              productId: selection.product.id,
              variantId: selection.variant?.id || null,
              itemKey: selection.itemKey,
            },
            { transaction }
          );
        } catch (error) {
          if (error.name !== 'SequelizeUniqueConstraintError') {
            throw error;
          }
        }
      }

      const detailedWishlist = await WishlistRepository.findById(wishlist.id, {
        transaction,
        includeItems: true,
      });

      return this.buildWishlistResponse(detailedWishlist, actor);
    });
  }

  static async removeItem(actor, itemId) {
    this.ensureActor(actor);

    return this.withTransaction(async (transaction) => {
      const wishlist = await this.findWishlistForActor(actor, { transaction });

      if (!wishlist) {
        throw ApiError.notFound('Wishlist item not found');
      }

      const item = await WishlistRepository.findItemByWishlistAndId(wishlist.id, itemId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!item) {
        throw ApiError.notFound('Wishlist item not found');
      }

      await WishlistRepository.deleteItem(item, { transaction });

      const detailedWishlist = await WishlistRepository.findById(wishlist.id, {
        transaction,
        includeItems: true,
      });

      return this.buildWishlistResponse(detailedWishlist, actor);
    });
  }

  static async mergeGuestWishlistIntoUser({ userId, guestId }, options = {}) {
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
          const existingWishlist = await WishlistRepository.findByUserId(userId, {
            transaction,
            includeItems: true,
          });

          return {
            ...this.buildWishlistResponse(existingWishlist, actor),
            merge: {
              guestId: null,
              sourceWishlistFound: false,
              mergedItems: 0,
              ignoredDuplicates: 0,
              removedGuestWishlist: false,
            },
          };
        }

        throw ApiError.badRequest('Guest id is required for wishlist merge');
      }

      const guestWishlist = await WishlistRepository.findByGuestId(guestId, {
        transaction,
        includeItems: true,
      });
      let userWishlist = await WishlistRepository.findByUserId(userId, {
        transaction,
        includeItems: true,
      });

      if (!guestWishlist || !guestWishlist.items?.length) {
        if (guestWishlist) {
          await WishlistRepository.deleteWishlist(guestWishlist, { transaction });
        }

        return {
          ...this.buildWishlistResponse(userWishlist, actor),
          merge: {
            guestId,
            sourceWishlistFound: Boolean(guestWishlist),
            mergedItems: 0,
            ignoredDuplicates: 0,
            removedGuestWishlist: Boolean(guestWishlist),
          },
        };
      }

      if (!userWishlist) {
        const createdWishlist = await WishlistRepository.findOrCreateByUserId(userId, { transaction });

        userWishlist = await WishlistRepository.findById(createdWishlist.id, {
          transaction,
          includeItems: true,
        });
      }

      const existingItemsByKey = new Map((userWishlist.items || []).map((item) => [item.itemKey, item]));
      let mergedItems = 0;
      let ignoredDuplicates = 0;

      for (const guestItem of guestWishlist.items || []) {
        if (existingItemsByKey.has(guestItem.itemKey)) {
          ignoredDuplicates += 1;
          continue;
        }

        const createdItem = await WishlistRepository.createItem(
          {
            wishlistId: userWishlist.id,
            productId: guestItem.productId,
            variantId: guestItem.variantId,
            itemKey: guestItem.itemKey,
          },
          { transaction }
        );

        existingItemsByKey.set(createdItem.itemKey, createdItem);
        mergedItems += 1;
      }

      await WishlistRepository.clearItems(guestWishlist.id, { transaction });
      await WishlistRepository.deleteWishlist(guestWishlist, { transaction });

      const mergedWishlist = await WishlistRepository.findById(userWishlist.id, {
        transaction,
        includeItems: true,
      });

      return {
        ...this.buildWishlistResponse(mergedWishlist, actor),
        merge: {
          guestId,
          sourceWishlistFound: true,
          mergedItems,
          ignoredDuplicates,
          removedGuestWishlist: true,
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

  static buildWishlistResponse(wishlist, actor) {
    return {
      wishlist: this.serializeWishlist(wishlist),
      identity: this.buildIdentity(actor),
    };
  }

  static serializeWishlist(wishlist) {
    const items = (wishlist?.items || []).map((item) => this.serializeWishlistItem(item));

    return {
      id: wishlist?.id || null,
      itemCount: items.length,
      items,
      createdAt: wishlist?.createdAt || null,
      updatedAt: wishlist?.updatedAt || null,
    };
  }

  static serializeWishlistItem(item) {
    const product = item.product || null;
    const variant = item.variant || null;
    const latestPrice = this.resolveLivePrice(item);
    const availableStock = this.resolveAvailableStockFromItem(item);
    const productActive = product?.status === 'active';
    const variantActive = variant ? variant.status === 'active' : true;
    const inStock = productActive && variantActive && (availableStock === null || availableStock > 0);

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
      latestPrice,
      availableStock,
      productActive,
      variantActive,
      inStock,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  static resolveLivePrice(item) {
    if (item.variant) {
      return toMoney(item.variant.price, null);
    }

    return toMoney(item.product?.basePrice, null);
  }

  static resolveAvailableStockFromItem(item) {
    if (item.variant) {
      if (item.variant.inventory?.allowBackorder) {
        return null;
      }

      if (!item.variant.inventory) {
        return 0;
      }

      return Math.max(
        toInteger(item.variant.inventory.quantity, 0) - toInteger(item.variant.inventory.reservedQuantity, 0),
        0
      );
    }

    return item.product?.stock == null ? 0 : toInteger(item.product.stock, 0);
  }

  static async findWishlistForActor(actor, options = {}) {
    if (actor.userId) {
      return WishlistRepository.findByUserId(actor.userId, options);
    }

    return WishlistRepository.findByGuestId(actor.guestId, options);
  }

  static async getOrCreateWishlistForActor(actor, { transaction } = {}) {
    if (actor.userId) {
      return WishlistRepository.findOrCreateByUserId(actor.userId, { transaction });
    }

    return WishlistRepository.findOrCreateByGuestId(actor.guestId, { transaction });
  }

  static async resolveSelection(payload, { transaction } = {}) {
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

      return {
        product,
        variant,
        itemKey: buildItemKey(product.id, variant.id),
      };
    }

    if (payload.variantId) {
      throw ApiError.badRequest('Simple products do not support variant selection');
    }

    return {
      product,
      variant: null,
      itemKey: buildItemKey(product.id),
    };
  }
}

module.exports = WishlistService;