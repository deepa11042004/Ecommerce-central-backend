const { RoleFeatureToggle } = require('../../../database/models');

class FeatureToggleRepository {
  static findByRoleName(roleName) {
    return RoleFeatureToggle.findAll({
      where: { roleName },
      order: [['permissionKey', 'ASC']],
    });
  }

  static findByRoleNameAndPermissionKey(roleName, permissionKey) {
    return RoleFeatureToggle.findOne({
      where: {
        roleName,
        permissionKey,
      },
    });
  }

  static async upsertForRole({ roleName, permissionKey, isEnabled, updatedByUserId }) {
    const existing = await this.findByRoleNameAndPermissionKey(roleName, permissionKey);

    if (existing) {
      existing.isEnabled = isEnabled;
      existing.updatedByUserId = updatedByUserId || null;
      await existing.save();
      return existing;
    }

    return RoleFeatureToggle.create({
      roleName,
      permissionKey,
      isEnabled,
      updatedByUserId: updatedByUserId || null,
    });
  }
}

module.exports = FeatureToggleRepository;
