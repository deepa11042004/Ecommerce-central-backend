const defineProductModel = (sequelize, DataTypes) => {
  const Product = sequelize.define(
    'Product',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING(160),
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING(190),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      shortDescription: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'short_description',
      },
      skuPrefix: {
        type: DataTypes.STRING(80),
        allowNull: true,
        field: 'sku_prefix',
      },
      brandId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'brand_id',
      },
      productType: {
        type: DataTypes.ENUM('simple', 'configurable', 'variant'),
        allowNull: false,
        defaultValue: 'simple',
        field: 'product_type',
      },
      hasVariants: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'has_variants',
      },
      basePrice: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        field: 'base_price',
      },
      comparePrice: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        field: 'compare_price',
      },
      stock: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      sku: {
        type: DataTypes.STRING(80),
        allowNull: true,
        unique: true,
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
      thumbnail: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      seoTitle: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'seo_title',
      },
      seoDescription: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'seo_description',
      },
    },
    {
      tableName: 'products',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['slug'],
        },
        {
          fields: ['status'],
        },
        {
          fields: ['title'],
        },
        {
          fields: ['brand_id'],
        },
        {
          fields: ['product_type'],
        },
        {
          fields: ['has_variants'],
        },
        {
          fields: ['base_price'],
        },
        {
          fields: ['stock'],
        },
      ],
    }
  );

  Product.associate = (models) => {
    Product.belongsTo(models.Brand, {
      foreignKey: 'brandId',
      as: 'brand',
    });

    Product.belongsToMany(models.Category, {
      through: models.ProductCategory,
      foreignKey: 'productId',
      otherKey: 'categoryId',
      as: 'categories',
    });

    Product.hasMany(models.ProductCategory, {
      foreignKey: 'productId',
      as: 'categoryLinks',
    });

    Product.belongsToMany(models.Attribute, {
      through: models.ProductAttribute,
      foreignKey: 'productId',
      otherKey: 'attributeId',
      as: 'attributes',
    });

    Product.hasMany(models.ProductAttribute, {
      foreignKey: 'productId',
      as: 'productAttributes',
    });

    Product.hasMany(models.ProductVariant, {
      foreignKey: 'productId',
      as: 'variants',
    });

    Product.hasOne(models.Inventory, {
      foreignKey: 'productId',
      as: 'inventory',
    });

    Product.hasMany(models.ProductMedia, {
      foreignKey: 'productId',
      as: 'media',
    });

    Product.hasMany(models.ProductMeta, {
      foreignKey: 'productId',
      as: 'metaEntries',
    });

    Product.hasMany(models.CartItem, {
      foreignKey: 'productId',
      as: 'cartItems',
    });

    Product.hasMany(models.WishlistItem, {
      foreignKey: 'productId',
      as: 'wishlistItems',
    });

    Product.hasMany(models.OrderItem, {
      foreignKey: 'productId',
      as: 'orderItems',
    });
  };

  return Product;
};

module.exports = defineProductModel;
