const Joi = require('joi');
const { REVIEW_STATUS_LIST } = require('../../../constants/review');

const reviewParamsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

const productParamsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

const createReviewSchema = Joi.object({
  body: Joi.object({
    productId: Joi.number().integer().positive().required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    title: Joi.string().trim().max(160).optional().allow('', null),
    comment: Joi.string().trim().max(5000).optional().allow('', null),
    mediaIds: Joi.array()
      .items(Joi.number().integer().positive())
      .max(5)
      .optional(),
  }).required(),
  params: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
});

const updateReviewSchema = Joi.object({
  body: Joi.object({
    rating: Joi.number().integer().min(1).max(5).optional(),
    title: Joi.string().trim().max(160).optional().allow('', null),
    comment: Joi.string().trim().max(5000).optional().allow('', null),
  })
    .or('rating', 'title', 'comment')
    .required(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

const listProductReviewsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    rating: Joi.number().integer().min(1).max(5).optional(),
    verified: Joi.boolean().optional(),
    withMedia: Joi.boolean().optional(),
    sort: Joi.string()
      .pattern(/^(createdAt|rating|helpfulCount)_(asc|desc)$/i)
      .optional(),
  }).optional(),
});

const adminListReviewsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    status: Joi.string().valid(...REVIEW_STATUS_LIST).optional(),
    rating: Joi.number().integer().min(1).max(5).optional(),
    productId: Joi.number().integer().positive().optional(),
    userId: Joi.number().integer().positive().optional(),
    verified: Joi.boolean().optional(),
    withMedia: Joi.boolean().optional(),
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
    helpfulMin: Joi.number().integer().min(0).optional(),
    sort: Joi.string()
      .pattern(/^(createdAt|rating|helpfulCount)_(asc|desc)$/i)
      .optional(),
  }).optional(),
});

const adminReplySchema = Joi.object({
  body: Joi.object({
    reply: Joi.string().trim().min(1).max(2000).required(),
  }).required(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

const analyticsQuerySchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(50).optional(),
  }).optional(),
});

module.exports = {
  reviewParamsSchema,
  productParamsSchema,
  createReviewSchema,
  updateReviewSchema,
  listProductReviewsSchema,
  adminListReviewsSchema,
  adminReplySchema,
  analyticsQuerySchema,
};
