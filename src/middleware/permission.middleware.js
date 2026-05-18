const ApiError = require('../core/errors/ApiError');
const { ROLES } = require('../constants/roles');

const can = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    const permissions = req.user.permissions || [];
    const hasAllAccess = req.user.role === ROLES.DEVELOPER || permissions.includes('*');

    if (hasAllAccess || permissions.includes(requiredPermission)) {
      return next();
    }

    return next(ApiError.forbidden(`Missing required permission: ${requiredPermission}`));
  };
};

module.exports = can;
