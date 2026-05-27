const { Op } = require('sequelize');
const { Cart, CartItem, Product, ProductVariant, Inventory } = require('../../../database/models');

const PRODUCT_ATTRIBUTES = [
  'id',
  'title',
  'slug',
  'productType',
  'hasVariants',
  'basePrice',
  'stock',
  'status',
  'thumbnail',
  'createdAt',
  'updatedAt',
];

const VARIANT_ATTRIBUTES = [
  'id',
  'productId',
  'sku',
  'title',
  'price',
  'comparePrice',
  'status',
  'image',
  'createdAt',
  'updatedAt',
];

class CartRepository {
  static buildDetailInclude() {
    return [
      {
        model: CartItem,
        as: 'items',
        required: false,
        include: [
          {
            model: Product,
            as: 'product',
            attributes: PRODUCT_ATTRIBUTES,
          },
          {
            model: ProductVariant,
            as: 'variant',
            attributes: VARIANT_ATTRIBUTES,
            required: false,
            include: [
              {
                model: Inventory,
                as: 'inventory',
                attributes: ['id', 'quantity', 'reservedQuantity', 'lowStockThreshold', 'allowBackorder'],
                required: false,
              },
            ],
          },
        ],
      },
    ];
  }

  static buildQueryOptions({ transaction, includeItems = false, lock } = {}) {
    const options = { transaction };

    if (includeItems) {
      options.include = this.buildDetailInclude();
      options.order = [[{ model: CartItem, as: 'items' }, 'createdAt', 'ASC']];
    }

    if (lock) {
      options.lock = lock;
    }

    return options;
  }

  static findById(id, options = {}) {
    return Cart.findByPk(id, this.buildQueryOptions(options));
  }

  static findByUserId(userId, options = {}) {
    return Cart.findOne({
      where: { userId },
      ...this.buildQueryOptions(options),
    });
  }

  static findByGuestId(guestId, options = {}) {
    return Cart.findOne({
      where: { guestId },
      ...this.buildQueryOptions(options),
    });
  }

  static async findOrCreateByUserId(userId, { currency, transaction } = {}) {
    const [cart] = await Cart.findOrCreate({
      where: { userId },
      defaults: {
        userId,
        currency,
      },
      transaction,
    });

    return cart;
  }

  static async findOrCreateByGuestId(guestId, { currency, transaction } = {}) {
    const [cart] = await Cart.findOrCreate({
      where: { guestId },
      defaults: {
        guestId,
        currency,
      },
      transaction,
    });

    return cart;
  }

  static findItemByCartAndId(cartId, id, { transaction, lock } = {}) {
    const options = {
      where: { cartId, id },
      transaction,
    };

    if (lock) {
      options.lock = lock;
    }

    return CartItem.findOne(options);
  }

  static findItemByCartAndKey(cartId, itemKey, { transaction, lock } = {}) {
    const options = {
      where: { cartId, itemKey },
      transaction,
    };

    if (lock) {
      options.lock = lock;
    }

    return CartItem.findOne(options);
  }

  static createItem(payload, { transaction } = {}) {
    return CartItem.create(payload, { transaction });
  }

  static updateItem(item, payload, { transaction } = {}) {
    return item.update(payload, { transaction });
  }

  static deleteItem(item, { transaction } = {}) {
    return item.destroy({ transaction });
  }

  static deleteItemsByKeys(cartId, itemKeys, { transaction } = {}) {
    if (!itemKeys?.length) {
      return 0;
    }

    return CartItem.destroy({
      where: {
        cartId,
        itemKey: {
          [Op.in]: itemKeys,
        },
      },
      transaction,
    });
  }

  static clearItems(cartId, { transaction } = {}) {
    return CartItem.destroy({
      where: { cartId },
      transaction,
    });
  }

  static deleteCart(cart, { transaction } = {}) {
    return cart.destroy({ transaction });
  }
}

module.exports = CartRepository;