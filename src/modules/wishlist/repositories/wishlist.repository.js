const { Wishlist, WishlistItem, Product, ProductVariant, Inventory } = require('../../../database/models');

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

class WishlistRepository {
  static buildDetailInclude() {
    return [
      {
        model: WishlistItem,
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
      options.order = [[{ model: WishlistItem, as: 'items' }, 'createdAt', 'ASC']];
    }

    if (lock) {
      options.lock = lock;
    }

    return options;
  }

  static findById(id, options = {}) {
    return Wishlist.findByPk(id, this.buildQueryOptions(options));
  }

  static findByUserId(userId, options = {}) {
    return Wishlist.findOne({
      where: { userId },
      ...this.buildQueryOptions(options),
    });
  }

  static findByGuestId(guestId, options = {}) {
    return Wishlist.findOne({
      where: { guestId },
      ...this.buildQueryOptions(options),
    });
  }

  static async findOrCreateByUserId(userId, { transaction } = {}) {
    const [wishlist] = await Wishlist.findOrCreate({
      where: { userId },
      defaults: {
        userId,
      },
      transaction,
    });

    return wishlist;
  }

  static async findOrCreateByGuestId(guestId, { transaction } = {}) {
    const [wishlist] = await Wishlist.findOrCreate({
      where: { guestId },
      defaults: {
        guestId,
      },
      transaction,
    });

    return wishlist;
  }

  static findItemByWishlistAndId(wishlistId, id, { transaction, lock } = {}) {
    const options = {
      where: { wishlistId, id },
      transaction,
    };

    if (lock) {
      options.lock = lock;
    }

    return WishlistItem.findOne(options);
  }

  static findItemByWishlistAndKey(wishlistId, itemKey, { transaction, lock } = {}) {
    const options = {
      where: { wishlistId, itemKey },
      transaction,
    };

    if (lock) {
      options.lock = lock;
    }

    return WishlistItem.findOne(options);
  }

  static createItem(payload, { transaction } = {}) {
    return WishlistItem.create(payload, { transaction });
  }

  static deleteItem(item, { transaction } = {}) {
    return item.destroy({ transaction });
  }

  static clearItems(wishlistId, { transaction } = {}) {
    return WishlistItem.destroy({
      where: { wishlistId },
      transaction,
    });
  }

  static deleteWishlist(wishlist, { transaction } = {}) {
    return wishlist.destroy({ transaction });
  }
}

module.exports = WishlistRepository;