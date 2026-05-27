const defineCategoryModel = (sequelize, DataTypes) => {
  const Category = sequelize.define(
    'Category',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(140),
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING(160),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      image: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      parentId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'parent_id',
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'sort_order',
      },
    },
    {
      tableName: 'categories',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['slug'],
        },
        {
          fields: ['parent_id'],
        },
        {
          fields: ['status'],
        },
      ],
    }
  );

  Category.associate = (models) => {
    Category.belongsTo(models.Category, {
      foreignKey: 'parentId',
      as: 'parent',
    });

    Category.hasMany(models.Category, {
      foreignKey: 'parentId',
      as: 'children',
    });

    Category.belongsToMany(models.Product, {
      through: models.ProductCategory,
      foreignKey: 'categoryId',
      otherKey: 'productId',
      as: 'products',
    });

    Category.hasMany(models.ProductCategory, {
      foreignKey: 'categoryId',
      as: 'productLinks',
    });
  };

  return Category;
};

module.exports = defineCategoryModel;
