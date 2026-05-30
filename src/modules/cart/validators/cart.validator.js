const Joi = require('joi');

const getCartSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
});

const addCartItemSchema = Joi.object({
  body: Joi.object({
    productId: Joi.number().integer().positive().required(),
    variantId: Joi.number().integer().positive().optional().allow(null),
    quantity: Joi.number().integer().min(1).required(),
  }).required(),
  params: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
});

const updateCartItemSchema = Joi.object({
  body: Joi.object({
    quantity: Joi.number().integer().min(1).required(),
  }).required(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

const cartItemParamsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

const mergeCartSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
});

const applyCouponSchema = Joi.object({
  body: Joi.object({
    couponCode: Joi.string().trim().min(2).max(80).required(),
  }).required(),
  params: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
});

const removeCouponSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
});

module.exports = {
  getCartSchema,
  addCartItemSchema,
  updateCartItemSchema,
  cartItemParamsSchema,
  mergeCartSchema,
  applyCouponSchema,
  removeCouponSchema,
};