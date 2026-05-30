const defineCouponCategoryModel = (sequelize, DataTypes) => {
  const CouponCategory = sequelize.define(
    'CouponCategory',
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
      categoryId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'category_id',
      },
    },
    {
      tableName: 'coupon_categories',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['coupon_id', 'category_id'],
        },
        {
          fields: ['category_id'],
        },
      ],
    }
  );

  CouponCategory.associate = (models) => {
    CouponCategory.belongsTo(models.Coupon, {
      foreignKey: 'couponId',
      as: 'coupon',
    });

    CouponCategory.belongsTo(models.Category, {
      foreignKey: 'categoryId',
      as: 'category',
    });
  };

  return CouponCategory;
};

module.exports = defineCouponCategoryModel;
