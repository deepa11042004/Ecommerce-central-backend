const defineOrderStatusHistoryModel = (sequelize, DataTypes) => {
  const OrderStatusHistory = sequelize.define(
    'OrderStatusHistory',
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
      oldStatus: {
        type: DataTypes.STRING(40),
        allowNull: true,
        field: 'old_status',
      },
      newStatus: {
        type: DataTypes.STRING(40),
        allowNull: false,
        field: 'new_status',
      },
      changedBy: {
        type: DataTypes.STRING(120),
        allowNull: true,
        field: 'changed_by',
      },
      reason: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'order_status_histories',
      timestamps: true,
      updatedAt: false,
      indexes: [
        {
          fields: ['order_id'],
        },
        {
          fields: ['new_status'],
        },
        {
          fields: ['created_at'],
        },
      ],
    }
  );

  OrderStatusHistory.associate = (models) => {
    OrderStatusHistory.belongsTo(models.Order, {
      foreignKey: 'orderId',
      as: 'order',
    });
  };

  return OrderStatusHistory;
};

module.exports = defineOrderStatusHistoryModel;