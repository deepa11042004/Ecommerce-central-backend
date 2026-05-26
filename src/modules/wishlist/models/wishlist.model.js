const defineWishlistModel = (sequelize, DataTypes) => {
  const Wishlist = sequelize.define(
    'Wishlist',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'user_id',
      },
      guestId: {
        type: DataTypes.STRING(80),
        allowNull: true,
        field: 'guest_id',
      },
    },
    {
      tableName: 'wishlists',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['user_id'],
        },
        {
          unique: true,
          fields: ['guest_id'],
        },
      ],
    }
  );

  Wishlist.associate = (models) => {
    Wishlist.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    Wishlist.hasMany(models.WishlistItem, {
      foreignKey: 'wishlistId',
      as: 'items',
    });
  };

  return Wishlist;
};

module.exports = defineWishlistModel;