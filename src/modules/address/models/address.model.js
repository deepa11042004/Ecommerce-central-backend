const defineAddressModel = (sequelize, DataTypes) => {
  const Address = sequelize.define(
    'Address',
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
      fullName: {
        type: DataTypes.STRING(160),
        allowNull: false,
        field: 'full_name',
      },
      phone: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      addressLine1: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'address_line_1',
      },
      addressLine2: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'address_line_2',
      },
      city: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      state: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      country: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      postalCode: {
        type: DataTypes.STRING(30),
        allowNull: false,
        field: 'postal_code',
      },
      landmark: {
        type: DataTypes.STRING(190),
        allowNull: true,
      },
      type: {
        type: DataTypes.ENUM('shipping', 'billing', 'both'),
        allowNull: false,
        defaultValue: 'shipping',
      },
    },
    {
      tableName: 'addresses',
      timestamps: true,
      indexes: [
        {
          fields: ['user_id'],
        },
        {
          fields: ['guest_id'],
        },
        {
          fields: ['type'],
        },
      ],
    }
  );

  Address.associate = (models) => {
    Address.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    Address.hasMany(models.Order, {
      foreignKey: 'billingAddressId',
      as: 'billingOrders',
    });

    Address.hasMany(models.Order, {
      foreignKey: 'shippingAddressId',
      as: 'shippingOrders',
    });
  };

  return Address;
};

module.exports = defineAddressModel;
