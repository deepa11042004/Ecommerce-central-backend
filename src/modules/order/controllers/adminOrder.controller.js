const { sendSuccess } = require('../../../core/http/response');
const asyncHandler = require('../../../utils/asyncHandler');
const OrderService = require('../services/order.service');

const list = asyncHandler(async (req, res) => {
  const data = await OrderService.listAdmin(req.query);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Orders fetched successfully',
    data,
  });
});

const updateStatus = asyncHandler(async (req, res) => {
  const data = await OrderService.updateStatusByAdmin(req.params.id, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Order status updated successfully',
    data,
  });
});

module.exports = {
  list,
  updateStatus,
};
