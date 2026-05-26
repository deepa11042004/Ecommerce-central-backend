const { Product, ProductVariant, Inventory } = require('../../../database/models');

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

class ProductCatalogRepository {
  static findProductById(id, { transaction, lock } = {}) {
    const options = {
      transaction,
      attributes: PRODUCT_ATTRIBUTES,
    };

    if (lock) {
      options.lock = lock;
    }

    return Product.findByPk(id, options);
  }

  static findVariantById(id, { transaction, lock } = {}) {
    const options = {
      transaction,
      attributes: VARIANT_ATTRIBUTES,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: PRODUCT_ATTRIBUTES,
        },
        {
          model: Inventory,
          as: 'inventory',
          attributes: ['id', 'quantity', 'reservedQuantity', 'lowStockThreshold', 'allowBackorder'],
          required: false,
        },
      ],
    };

    if (lock) {
      options.lock = lock;
    }

    return ProductVariant.findByPk(id, options);
  }
}

module.exports = ProductCatalogRepository;