const defineCartItemModel = (sequelize, DataTypes) => {
  const CartItem = sequelize.define(
    'CartItem',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      cartId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'cart_id',
      },
      productId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'product_id',
      },
      variantId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'variant_id',
      },
      itemKey: {
        type: DataTypes.STRING(120),
        allowNull: false,
        field: 'item_key',
      },
      quantity: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      unitPrice: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        field: 'unit_price',
      },
    },
    {
      tableName: 'cart_items',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['cart_id', 'item_key'],
        },
        {
          fields: ['product_id'],
        },
        {
          fields: ['variant_id'],
        },
      ],
    }
  );

  CartItem.associate = (models) => {
    CartItem.belongsTo(models.Cart, {
      foreignKey: 'cartId',
      as: 'cart',
    });

    CartItem.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });

    CartItem.belongsTo(models.ProductVariant, {
      foreignKey: 'variantId',
      as: 'variant',
    });
  };

  return CartItem;
};

module.exports = defineCartItemModel;