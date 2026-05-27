const Joi = require('joi');

const sectionSchema = Joi.string().valid('products', 'variants', 'categories', 'brands', 'users', 'temp').required();

const uploadSectionSchema = Joi.object({
  body: Joi.object({
    baseName: Joi.string().trim().max(120).optional(),
  }).optional(),
  params: Joi.object({
    section: sectionSchema,
  }).required(),
  query: Joi.object({}).optional(),
});

const entityMediaSchema = Joi.object({
  body: Joi.object({
    baseName: Joi.string().trim().max(120).optional(),
  }).optional(),
  params: Joi.object({
    section: Joi.string().valid('products', 'variants', 'categories', 'brands', 'users').required(),
    entityId: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

module.exports = {
  uploadSectionSchema,
  entityMediaSchema,
};
