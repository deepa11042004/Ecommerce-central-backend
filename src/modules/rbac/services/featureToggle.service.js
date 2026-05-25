const ApiError = require('../../../core/errors/ApiError');
const { ALL_PERMISSIONS, PERMISSIONS } = require('../../../constants/permissions');
const { ROLES } = require('../../../constants/roles');
const FeatureToggleRepository = require('../repositories/featureToggle.repository');

const PERMISSION_DESCRIPTION_MAP = Object.freeze({
  [PERMISSIONS.ADMIN_MANAGE]: 'Manage administrator accounts',
  [PERMISSIONS.PRODUCT_CREATE]: 'Create products',
  [PERMISSIONS.PRODUCT_UPDATE]: 'Update products',
  [PERMISSIONS.PRODUCT_DELETE]: 'Delete products',
  [PERMISSIONS.PRODUCT_READ]: 'View products and categories',
});

class FeatureToggleService {
  static buildPayload(permissionKey, toggleRow) {
    return {
      permissionKey,
      description: PERMISSION_DESCRIPTION_MAP[permissionKey] || permissionKey,
      isEnabled: toggleRow ? Boolean(toggleRow.isEnabled) : true,
      updatedAt: toggleRow ? toggleRow.updatedAt : null,
      updatedByUserId: toggleRow ? toggleRow.updatedByUserId : null,
    };
  }

  static async listSuperAdminToggles() {
    const rows = await FeatureToggleRepository.findByRoleName(ROLES.SUPER_ADMIN);
    const rowByPermission = rows.reduce((acc, row) => {
      acc[row.permissionKey] = row;
      return acc;
    }, {});

    return ALL_PERMISSIONS.map((permissionKey) => {
      return this.buildPayload(permissionKey, rowByPermission[permissionKey]);
    });
  }

  static async setSuperAdminToggle({ permissionKey, isEnabled, updatedByUserId }) {
    if (!ALL_PERMISSIONS.includes(permissionKey)) {
      throw ApiError.badRequest('Unsupported permission key for feature toggle');
    }

    const row = await FeatureToggleRepository.upsertForRole({
      roleName: ROLES.SUPER_ADMIN,
      permissionKey,
      isEnabled,
      updatedByUserId,
    });

    return this.buildPayload(permissionKey, row);
  }

  static async isSuperAdminPermissionEnabled(permissionKey) {
    if (!ALL_PERMISSIONS.includes(permissionKey)) {
      return true;
    }

    const row = await FeatureToggleRepository.findByRoleNameAndPermissionKey(
      ROLES.SUPER_ADMIN,
      permissionKey
    );

    if (!row) {
      return true;
    }

    return Boolean(row.isEnabled);
  }
}

module.exports = FeatureToggleService;
