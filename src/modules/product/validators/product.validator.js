const Joi = require('joi');

const createProductSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().min(2).max(160).required(),
    slug: Joi.string().min(2).max(190).optional(),
    description: Joi.string().min(5).required(),
    sku: Joi.string().min(2).max(80).required(),
    price: Joi.number().positive().precision(2).required(),
    stock: Joi.number().integer().min(0).required(),
    status: Joi.string().valid('active', 'inactive').default('active'),
    thumbnail: Joi.string().uri().allow(null, '').optional(),
  }).required(),
  params: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
});

const updateProductSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().min(2).max(160).optional(),
    slug: Joi.string().min(2).max(190).optional(),
    description: Joi.string().min(5).optional(),
    sku: Joi.string().min(2).max(80).optional(),
    price: Joi.number().positive().precision(2).optional(),
    stock: Joi.number().integer().min(0).optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
    thumbnail: Joi.string().uri().allow(null, '').optional(),
  })
    .min(1)
    .required(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

const getProductByIdSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

const listProductsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().allow('').optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
    sort: Joi.string()
      .pattern(/^(price|stock|title|createdAt|createdat)_(asc|desc)$/i)
      .optional(),
  }).optional(),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  getProductByIdSchema,
  listProductsSchema,
};
