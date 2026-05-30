const defineCouponUsageModel = (sequelize, DataTypes) => {
  const CouponUsage = sequelize.define(
    'CouponUsage',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      couponId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'coupon_id',
      },
      userId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'user_id',
      },
      orderId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'order_id',
      },
      usedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'used_at',
      },
      discountAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'discount_amount',
      },
    },
    {
      tableName: 'coupon_usages',
      timestamps: true,
      indexes: [
        {
          fields: ['coupon_id'],
        },
        {
          fields: ['user_id'],
        },
        {
          unique: true,
          fields: ['order_id'],
        },
        {
          fields: ['used_at'],
        },
      ],
    }
  );

  CouponUsage.associate = (models) => {
    CouponUsage.belongsTo(models.Coupon, {
      foreignKey: 'couponId',
      as: 'coupon',
    });

    CouponUsage.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    CouponUsage.belongsTo(models.Order, {
      foreignKey: 'orderId',
      as: 'order',
    });
  };

  return CouponUsage;
};

module.exports = defineCouponUsageModel;
