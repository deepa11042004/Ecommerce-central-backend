const Joi = require('joi');

const heroImagePathSchema = Joi.string()
  .pattern(/^uploads\/hero-banners\/[0-9]{4}-[0-9]{2}\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i)
  .message('Image path must be a hero banner upload path (uploads/hero-banners/YYYY-MM/file.webp)');

const heroBannerIdSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

const createHeroBannerSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().trim().max(200).optional().allow('', null),
    subtitle: Joi.string().trim().max(255).optional().allow('', null),
    link: Joi.string().trim().max(500).optional().allow('', null),
    image: heroImagePathSchema.required(),
    isActive: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).max(10000).optional(),
  }).required(),
  params: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
});

const updateHeroBannerSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().trim().max(200).optional(),
    subtitle: Joi.string().trim().max(255).optional().allow('', null),
    link: Joi.string().trim().max(500).optional().allow('', null),
    image: heroImagePathSchema.optional(),
    isActive: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).max(10000).optional(),
  })
    .min(1)
    .required(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

module.exports = {
  heroBannerIdSchema,
  createHeroBannerSchema,
  updateHeroBannerSchema,
};
