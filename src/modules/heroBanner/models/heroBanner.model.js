const defineHeroBannerModel = (sequelize, DataTypes) => {
  const HeroBanner = sequelize.define(
    'HeroBanner',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      subtitle: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      link: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      imagePath: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'image_path',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active',
      },
      sortOrder: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        field: 'sort_order',
      },
    },
    {
      tableName: 'hero_banners',
      timestamps: true,
      indexes: [
        {
          fields: ['is_active'],
        },
        {
          fields: ['sort_order'],
        },
      ],
    }
  );

  return HeroBanner;
};

module.exports = defineHeroBannerModel;
