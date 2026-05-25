const Joi = require('joi');
const { ALL_PERMISSIONS } = require('../../../constants/permissions');

const listSuperAdminFeatureTogglesSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
});

const updateSuperAdminFeatureToggleSchema = Joi.object({
  body: Joi.object({
    isEnabled: Joi.boolean().required(),
  }).required(),
  params: Joi.object({
    permissionKey: Joi.string().valid(...ALL_PERMISSIONS).required(),
  }).required(),
  query: Joi.object({}).optional(),
});

module.exports = {
  listSuperAdminFeatureTogglesSchema,
  updateSuperAdminFeatureToggleSchema,
};
