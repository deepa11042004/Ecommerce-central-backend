const Joi = require('joi');

const verifyPaymentSchema = Joi.object({
  body: Joi.object({
    orderId: Joi.number().integer().positive().required(),
    razorpay_order_id: Joi.string().trim().required(),
    razorpay_payment_id: Joi.string().trim().required(),
    razorpay_signature: Joi.string().trim().required(),
  }).required(),
  params: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
});

module.exports = {
  verifyPaymentSchema,
};
