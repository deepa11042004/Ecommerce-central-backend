const { INVENTORY_RESERVATION_STATUS_LIST } = require('../../../constants/inventory');

const defineInventoryReservationModel = (sequelize, DataTypes) => {
  const InventoryReservation = sequelize.define(
    'InventoryReservation',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      inventoryId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'inventory_id',
      },
      orderId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'order_id',
      },
      orderItemId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'order_item_id',
      },
      productId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'product_id',
      },
      variantId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'variant_id',
      },
      quantity: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(...INVENTORY_RESERVATION_STATUS_LIST),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      reservationExpiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'reservation_expires_at',
      },
      committedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'committed_at',
      },
      releasedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'released_at',
      },
      referenceType: {
        type: DataTypes.STRING(60),
        allowNull: true,
        field: 'reference_type',
      },
      referenceId: {
        type: DataTypes.STRING(120),
        allowNull: true,
        field: 'reference_id',
      },
      reason: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdBy: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'created_by',
      },
    },
    {
      tableName: 'inventory_reservations',
      timestamps: true,
      indexes: [
        {
          fields: ['inventory_id'],
        },
        {
          fields: ['order_id'],
        },
        {
          fields: ['order_item_id'],
        },
        {
          fields: ['status'],
        },
        {
          fields: ['reservation_expires_at'],
        },
      ],
    }
  );

  InventoryReservation.associate = (models) => {
    InventoryReservation.belongsTo(models.Inventory, {
      foreignKey: 'inventoryId',
      as: 'inventory',
    });

    InventoryReservation.belongsTo(models.Order, {
      foreignKey: 'orderId',
      as: 'order',
    });

    InventoryReservation.belongsTo(models.OrderItem, {
      foreignKey: 'orderItemId',
      as: 'orderItem',
    });

    InventoryReservation.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });

    InventoryReservation.belongsTo(models.ProductVariant, {
      foreignKey: 'variantId',
      as: 'variant',
    });

    InventoryReservation.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'createdByUser',
    });
  };

  return InventoryReservation;
};

module.exports = defineInventoryReservationModel;
