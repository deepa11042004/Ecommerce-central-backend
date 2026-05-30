const Joi = require('joi');
const { PAYMENT_METHODS } = require('../../../constants/order');

const checkoutSchema = Joi.object({
  body: Joi.object({
    shippingAddressId: Joi.number().integer().positive().required(),
    billingAddressId: Joi.number().integer().positive().required(),
    paymentMethod: Joi.string().valid(...Object.values(PAYMENT_METHODS)).required(),
    couponCode: Joi.string().trim().min(2).max(80).optional(),
    notes: Joi.string().max(1000).allow(null, '').optional(),
  }).required(),
  params: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
});

module.exports = {
  checkoutSchema,
};
