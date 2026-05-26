const defineWishlistItemModel = (sequelize, DataTypes) => {
  const WishlistItem = sequelize.define(
    'WishlistItem',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      wishlistId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'wishlist_id',
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
      itemKey: {
        type: DataTypes.STRING(120),
        allowNull: false,
        field: 'item_key',
      },
    },
    {
      tableName: 'wishlist_items',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['wishlist_id', 'item_key'],
        },
        {
          fields: ['product_id'],
        },
        {
          fields: ['variant_id'],
        },
      ],
    }
  );

  WishlistItem.associate = (models) => {
    WishlistItem.belongsTo(models.Wishlist, {
      foreignKey: 'wishlistId',
      as: 'wishlist',
    });

    WishlistItem.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });

    WishlistItem.belongsTo(models.ProductVariant, {
      foreignKey: 'variantId',
      as: 'variant',
    });
  };

  return WishlistItem;
};

module.exports = defineWishlistItemModel;