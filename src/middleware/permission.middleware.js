const ApiError = require('../core/errors/ApiError');
const { ROLES } = require('../constants/roles');
const asyncHandler = require('../utils/asyncHandler');
const FeatureToggleService = require('../modules/rbac/services/featureToggle.service');

const can = (requiredPermission) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const permissions = req.user.permissions || [];
    const hasAllAccess = req.user.role === ROLES.DEVELOPER || permissions.includes('*');

    if (hasAllAccess || permissions.includes(requiredPermission)) {
      if (req.user.role === ROLES.SUPER_ADMIN) {
        const isEnabled = await FeatureToggleService.isSuperAdminPermissionEnabled(requiredPermission);

        if (!isEnabled) {
          throw ApiError.forbidden(`Feature is disabled by developer: ${requiredPermission}`);
        }
      }

      return next();
    }

    throw ApiError.forbidden(`Missing required permission: ${requiredPermission}`);
  });
};

module.exports = can;
