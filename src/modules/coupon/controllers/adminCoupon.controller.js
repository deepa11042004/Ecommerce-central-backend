const { sendSuccess } = require('../../../core/http/response');
const asyncHandler = require('../../../utils/asyncHandler');
const CouponService = require('../services/coupon.service');

const create = asyncHandler(async (req, res) => {
  const data = await CouponService.create(req.body, req.user);

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Coupon created successfully',
    data,
  });
});

const update = asyncHandler(async (req, res) => {
  const data = await CouponService.update(req.params.id, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Coupon updated successfully',
    data,
  });
});

const toggle = asyncHandler(async (req, res) => {
  const data = await CouponService.toggleActive(req.params.id, req.body.isActive);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Coupon status updated successfully',
    data,
  });
});

const list = asyncHandler(async (req, res) => {
  const data = await CouponService.list(req.query);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Coupons fetched successfully',
    data,
  });
});

const getById = asyncHandler(async (req, res) => {
  const data = await CouponService.getById(req.params.id, req.query);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Coupon fetched successfully',
    data,
  });
});

const remove = asyncHandler(async (req, res) => {
  const data = await CouponService.remove(req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Coupon deleted successfully',
    data,
  });
});

module.exports = {
  create,
  update,
  toggle,
  list,
  getById,
  remove,
};
