const defineBrandModel = (sequelize, DataTypes) => {
  const Brand = sequelize.define(
    'Brand',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true,
      },
      slug: {
        type: DataTypes.STRING(140),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      logo: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
    },
    {
      tableName: 'brands',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['name'],
        },
        {
          unique: true,
          fields: ['slug'],
        },
        {
          fields: ['status'],
        },
      ],
    }
  );

  Brand.associate = (models) => {
    Brand.hasMany(models.Product, {
      foreignKey: 'brandId',
      as: 'products',
    });
  };

  return Brand;
};

module.exports = defineBrandModel;
