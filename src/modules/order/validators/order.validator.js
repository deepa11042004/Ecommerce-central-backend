const Joi = require('joi');
const { ORDER_STATUS_LIST, PAYMENT_STATUS_LIST } = require('../../../constants/order');

const listOrdersSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    status: Joi.string().valid(...ORDER_STATUS_LIST).optional(),
    paymentStatus: Joi.string().valid(...PAYMENT_STATUS_LIST).optional(),
    search: Joi.string().allow('').max(120).optional(),
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
    sort: Joi.string()
      .pattern(/^(createdAt|totalAmount|orderNumber)_(asc|desc)$/i)
      .optional(),
  }).optional(),
});

const orderParamsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

const updateOrderStatusSchema = Joi.object({
  body: Joi.object({
    status: Joi.string().valid(...ORDER_STATUS_LIST).required(),
  }).required(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

module.exports = {
  listOrdersSchema,
  orderParamsSchema,
  updateOrderStatusSchema,
};
