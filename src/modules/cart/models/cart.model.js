const defineCartModel = (sequelize, DataTypes) => {
  const Cart = sequelize.define(
    'Cart',
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
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
      },
    },
    {
      tableName: 'carts',
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
        {
          fields: ['currency'],
        },
      ],
    }
  );

  Cart.associate = (models) => {
    Cart.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    Cart.hasMany(models.CartItem, {
      foreignKey: 'cartId',
      as: 'items',
    });
  };

  return Cart;
};

module.exports = defineCartModel;