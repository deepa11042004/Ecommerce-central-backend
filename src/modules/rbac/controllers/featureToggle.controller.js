const ApiError = require('../../../core/errors/ApiError');
const { sendSuccess } = require('../../../core/http/response');
const { ROLES } = require('../../../constants/roles');
const asyncHandler = require('../../../utils/asyncHandler');
const FeatureToggleService = require('../services/featureToggle.service');

const canViewToggleRoles = new Set([ROLES.DEVELOPER, ROLES.SUPER_ADMIN]);

const listSuperAdminFeatureToggles = asyncHandler(async (req, res) => {
  if (!canViewToggleRoles.has(req.user?.role)) {
    throw ApiError.forbidden('Only developer or super admin can view these feature toggles');
  }

  const data = await FeatureToggleService.listSuperAdminToggles();

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Super admin feature toggles fetched successfully',
    data,
  });
});

const updateSuperAdminFeatureToggle = asyncHandler(async (req, res) => {
  if (req.user?.role !== ROLES.DEVELOPER) {
    throw ApiError.forbidden('Only developer can update super admin feature toggles');
  }

  const data = await FeatureToggleService.setSuperAdminToggle({
    permissionKey: req.params.permissionKey,
    isEnabled: req.body.isEnabled,
    updatedByUserId: req.user.id,
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Super admin feature toggle updated successfully',
    data,
  });
});

module.exports = {
  listSuperAdminFeatureToggles,
  updateSuperAdminFeatureToggle,
};
