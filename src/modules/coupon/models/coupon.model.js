const { COUPON_TYPE_LIST } = require('../../../constants/coupon');

const defineCouponModel = (sequelize, DataTypes) => {
  const Coupon = sequelize.define(
    'Coupon',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
      },
      title: {
        type: DataTypes.STRING(160),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      couponType: {
        type: DataTypes.ENUM(...COUPON_TYPE_LIST),
        allowNull: false,
        field: 'coupon_type',
      },
      discountValue: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        field: 'discount_value',
      },
      minimumOrderAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'minimum_order_amount',
      },
      maximumDiscountAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        field: 'maximum_discount_amount',
      },
      usageLimit: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        field: 'usage_limit',
      },
      perUserUsageLimit: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        field: 'per_user_usage_limit',
      },
      usedCount: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        field: 'used_count',
      },
      startsAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'starts_at',
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active',
      },
      stackable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdBy: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'created_by',
      },
    },
    {
      tableName: 'coupons',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['code'],
        },
        {
          fields: ['coupon_type'],
        },
        {
          fields: ['is_active', 'starts_at', 'expires_at'],
        },
      ],
    }
  );

  Coupon.associate = (models) => {
    Coupon.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator',
    });

    Coupon.hasMany(models.CouponProduct, {
      foreignKey: 'couponId',
      as: 'productRestrictions',
    });

    Coupon.hasMany(models.CouponCategory, {
      foreignKey: 'couponId',
      as: 'categoryRestrictions',
    });

    Coupon.hasMany(models.CouponUsage, {
      foreignKey: 'couponId',
      as: 'usages',
    });

    Coupon.belongsToMany(models.Product, {
      through: models.CouponProduct,
      foreignKey: 'couponId',
      otherKey: 'productId',
      as: 'restrictedProducts',
    });

    Coupon.belongsToMany(models.Category, {
      through: models.CouponCategory,
      foreignKey: 'couponId',
      otherKey: 'categoryId',
      as: 'restrictedCategories',
    });
  };

  return Coupon;
};

module.exports = defineCouponModel;
