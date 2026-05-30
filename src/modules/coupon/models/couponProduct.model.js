const defineCouponProductModel = (sequelize, DataTypes) => {
  const CouponProduct = sequelize.define(
    'CouponProduct',
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
      productId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'product_id',
      },
    },
    {
      tableName: 'coupon_products',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['coupon_id', 'product_id'],
        },
        {
          fields: ['product_id'],
        },
      ],
    }
  );

  CouponProduct.associate = (models) => {
    CouponProduct.belongsTo(models.Coupon, {
      foreignKey: 'couponId',
      as: 'coupon',
    });

    CouponProduct.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });
  };

  return CouponProduct;
};

module.exports = defineCouponProductModel;
