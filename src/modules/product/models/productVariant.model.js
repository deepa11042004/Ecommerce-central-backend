const defineProductVariantModel = (sequelize, DataTypes) => {
  const ProductVariant = sequelize.define(
    'ProductVariant',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      productId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'product_id',
      },
      sku: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
      },
      title: {
        type: DataTypes.STRING(160),
        allowNull: true,
      },
      price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      comparePrice: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        field: 'compare_price',
      },
      costPrice: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        field: 'cost_price',
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
      image: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      barcode: {
        type: DataTypes.STRING(120),
        allowNull: true,
        unique: true,
      },
      position: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: 'product_variants',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['sku'],
        },
        {
          fields: ['product_id'],
        },
        {
          fields: ['status'],
        },
        {
          fields: ['price'],
        },
      ],
    }
  );

  ProductVariant.associate = (models) => {
    ProductVariant.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });

    ProductVariant.hasOne(models.Inventory, {
      foreignKey: 'variantId',
      as: 'inventory',
    });

    ProductVariant.hasMany(models.VariantAttributeValue, {
      foreignKey: 'variantId',
      as: 'attributeValues',
    });

    ProductVariant.hasMany(models.ProductMedia, {
      foreignKey: 'variantId',
      as: 'media',
    });

    ProductVariant.hasMany(models.CartItem, {
      foreignKey: 'variantId',
      as: 'cartItems',
    });

    ProductVariant.hasMany(models.WishlistItem, {
      foreignKey: 'variantId',
      as: 'wishlistItems',
    });

    ProductVariant.hasMany(models.OrderItem, {
      foreignKey: 'variantId',
      as: 'orderItems',
    });
  };

  return ProductVariant;
};

module.exports = defineProductVariantModel;
