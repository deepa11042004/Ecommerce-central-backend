const defineUserModel = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      firstName: {
        type: DataTypes.STRING(80),
        allowNull: true,
        field: 'first_name',
      },
      lastName: {
        type: DataTypes.STRING(80),
        allowNull: true,
        field: 'last_name',
      },
      fullName: {
        type: DataTypes.STRING(120),
        allowNull: false,
        field: 'full_name',
      },
      email: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true,
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'password_hash',
      },
      roleId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'role_id',
      },
    },
    {
      tableName: 'users',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['email'],
        },
        {
          fields: ['role_id'],
        },
      ],
    }
  );

  User.associate = (models) => {
    User.belongsTo(models.Role, {
      foreignKey: 'roleId',
      as: 'role',
    });

    User.hasOne(models.Cart, {
      foreignKey: 'userId',
      as: 'cart',
    });

    User.hasOne(models.Wishlist, {
      foreignKey: 'userId',
      as: 'wishlist',
    });
  };

  return User;
};

module.exports = defineUserModel;
