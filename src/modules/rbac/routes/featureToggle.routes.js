const express = require('express');
const auth = require('../../../middleware/auth.middleware');
const validate = require('../../../middleware/validate.middleware');
const controller = require('../controllers/featureToggle.controller');
const {
  listSuperAdminFeatureTogglesSchema,
  updateSuperAdminFeatureToggleSchema,
} = require('../validators/featureToggle.validator');

const router = express.Router();

router.get(
  '/super-admin/toggles',
  auth(),
  validate(listSuperAdminFeatureTogglesSchema),
  controller.listSuperAdminFeatureToggles
);

router.put(
  '/super-admin/toggles/:permissionKey',
  auth(),
  validate(updateSuperAdminFeatureToggleSchema),
  controller.updateSuperAdminFeatureToggle
);

module.exports = router;
