const Joi = require('joi');

const getWishlistSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
});

const addWishlistItemSchema = Joi.object({
  body: Joi.object({
    productId: Joi.number().integer().positive().required(),
    variantId: Joi.number().integer().positive().optional().allow(null),
  }).required(),
  params: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
});

const wishlistItemParamsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

const mergeWishlistSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
});

module.exports = {
  getWishlistSchema,
  addWishlistItemSchema,
  wishlistItemParamsSchema,
  mergeWishlistSchema,
};