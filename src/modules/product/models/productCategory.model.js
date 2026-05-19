const defineProductCategoryModel = (sequelize, DataTypes) => {
  const ProductCategory = sequelize.define(
    'ProductCategory',
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
      categoryId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'category_id',
      },
    },
    {
      tableName: 'product_categories',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['product_id', 'category_id'],
        },
        {
          fields: ['category_id'],
        },
      ],
    }
  );

  ProductCategory.associate = (models) => {
    ProductCategory.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });

    ProductCategory.belongsTo(models.Category, {
      foreignKey: 'categoryId',
      as: 'category',
    });
  };

  return ProductCategory;
};

module.exports = defineProductCategoryModel;
