const defineProductMediaModel = (sequelize, DataTypes) => {
  const ProductMedia = sequelize.define(
    'ProductMedia',
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
      variantId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'variant_id',
      },
      url: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      mediaType: {
        type: DataTypes.ENUM('image', 'video', 'document', 'external'),
        allowNull: false,
        defaultValue: 'image',
        field: 'media_type',
      },
      altText: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'alt_text',
      },
      position: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: 'product_media',
      timestamps: true,
      indexes: [
        {
          fields: ['product_id'],
        },
        {
          fields: ['variant_id'],
        },
      ],
    }
  );

  ProductMedia.associate = (models) => {
    ProductMedia.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });

    ProductMedia.belongsTo(models.ProductVariant, {
      foreignKey: 'variantId',
      as: 'variant',
    });
  };

  return ProductMedia;
};

module.exports = defineProductMediaModel;
