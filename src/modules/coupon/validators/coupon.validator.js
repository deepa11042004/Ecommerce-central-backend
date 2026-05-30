const Joi = require('joi');
const { COUPON_TYPE_LIST } = require('../../../constants/coupon');

const baseCouponBody = {
  code: Joi.string().trim().min(2).max(80),
  title: Joi.string().trim().min(2).max(160),
  description: Joi.string().trim().max(2000).allow(null, ''),
  couponType: Joi.string().valid(...COUPON_TYPE_LIST),
  discountValue: Joi.number().positive().precision(2),
  minimumOrderAmount: Joi.number().min(0).precision(2).default(0),
  maximumDiscountAmount: Joi.number().min(0).precision(2).allow(null),
  usageLimit: Joi.number().integer().min(1).allow(null),
  perUserUsageLimit: Joi.number().integer().min(1).allow(null),
  startsAt: Joi.date().iso(),
  expiresAt: Joi.date().iso(),
  isActive: Joi.boolean(),
  stackable: Joi.boolean(),
  productIds: Joi.array().items(Joi.number().integer().positive()).unique().optional().default([]),
  categoryIds: Joi.array().items(Joi.number().integer().positive()).unique().optional().default([]),
};

const createCouponSchema = Joi.object({
  body: Joi.object({
    ...baseCouponBody,
    code: baseCouponBody.code.required(),
    title: baseCouponBody.title.required(),
    couponType: baseCouponBody.couponType.required(),
    discountValue: baseCouponBody.discountValue.required(),
    startsAt: baseCouponBody.startsAt.required(),
    expiresAt: baseCouponBody.expiresAt.required(),
  })
    .custom((value, helper) => {
      if (
        value.maximumDiscountAmount != null
        && value.couponType === 'FIXED_AMOUNT'
        && Number(value.maximumDiscountAmount) < Number(value.discountValue)
      ) {
        return helper.error('any.invalid', {
          message: 'maximumDiscountAmount cannot be smaller than discountValue for FIXED_AMOUNT coupon',
        });
      }

      return value;
    })
    .required(),
  params: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
});

const updateCouponSchema = Joi.object({
  body: Joi.object(baseCouponBody)
    .min(1)
    .custom((value, helper) => {
      if (
        value.maximumDiscountAmount != null
        && value.couponType === 'FIXED_AMOUNT'
        && value.discountValue != null
        && Number(value.maximumDiscountAmount) < Number(value.discountValue)
      ) {
        return helper.error('any.invalid', {
          message: 'maximumDiscountAmount cannot be smaller than discountValue for FIXED_AMOUNT coupon',
        });
      }

      return value;
    })
    .required(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

const toggleCouponSchema = Joi.object({
  body: Joi.object({
    isActive: Joi.boolean().required(),
  }).required(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

const listCouponSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().trim().allow('').optional(),
    couponType: Joi.string().valid(...COUPON_TYPE_LIST).optional(),
    isActive: Joi.boolean().optional(),
    isExpired: Joi.boolean().optional(),
    usageMin: Joi.number().integer().min(0).optional(),
    usageMax: Joi.number().integer().min(0).optional(),
    startsFrom: Joi.date().iso().optional(),
    startsTo: Joi.date().iso().optional(),
    expiresFrom: Joi.date().iso().optional(),
    expiresTo: Joi.date().iso().optional(),
    sort: Joi.string().pattern(/^(createdAt|expiresAt|startsAt|usedCount|code)_(asc|desc)$/i).optional(),
  }).optional(),
});

const couponIdSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
  }).optional(),
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
  createCouponSchema,
  updateCouponSchema,
  toggleCouponSchema,
  listCouponSchema,
  couponIdSchema,
  applyCouponSchema,
  removeCouponSchema,
};
