const defineOrderItemModel = (sequelize, DataTypes) => {
  const OrderItem = sequelize.define(
    'OrderItem',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      orderId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'order_id',
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
      productNameSnapshot: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'product_name_snapshot',
      },
      skuSnapshot: {
        type: DataTypes.STRING(80),
        allowNull: true,
        field: 'sku_snapshot',
      },
      imageSnapshot: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'image_snapshot',
      },
      unitPrice: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        field: 'unit_price',
      },
      quantity: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      totalPrice: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        field: 'total_price',
      },
    },
    {
      tableName: 'order_items',
      timestamps: true,
      indexes: [
        {
          fields: ['order_id'],
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

  OrderItem.associate = (models) => {
    OrderItem.belongsTo(models.Order, {
      foreignKey: 'orderId',
      as: 'order',
    });

    OrderItem.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });

    OrderItem.belongsTo(models.ProductVariant, {
      foreignKey: 'variantId',
      as: 'variant',
    });
  };

  return OrderItem;
};

module.exports = defineOrderItemModel;
