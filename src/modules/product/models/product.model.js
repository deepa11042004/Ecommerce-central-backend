const defineProductModel = (sequelize, DataTypes) => {
  const Product = sequelize.define(
    'Product',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING(160),
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING(190),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      sku: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
      },
      price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      stock: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
      thumbnail: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      tableName: 'products',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['slug'],
        },
        {
          unique: true,
          fields: ['sku'],
        },
        {
          fields: ['status'],
        },
        {
          fields: ['title'],
        },
      ],
    }
  );

  return Product;
};

module.exports = defineProductModel;
