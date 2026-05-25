const defineRoleFeatureToggleModel = (sequelize, DataTypes) => {
  const RoleFeatureToggle = sequelize.define(
    'RoleFeatureToggle',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      roleName: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'role_name',
      },
      permissionKey: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'permission_key',
      },
      isEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_enabled',
      },
      updatedByUserId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'updated_by_user_id',
      },
    },
    {
      tableName: 'role_feature_toggles',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['role_name', 'permission_key'],
        },
        {
          fields: ['updated_by_user_id'],
        },
      ],
    }
  );

  RoleFeatureToggle.associate = (models) => {
    RoleFeatureToggle.belongsTo(models.User, {
      foreignKey: 'updatedByUserId',
      as: 'updatedByUser',
    });
  };

  return RoleFeatureToggle;
};

module.exports = defineRoleFeatureToggleModel;
