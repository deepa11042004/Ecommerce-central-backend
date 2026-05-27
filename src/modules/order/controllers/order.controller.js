const { sendSuccess } = require('../../../core/http/response');
const asyncHandler = require('../../../utils/asyncHandler');
const OrderService = require('../services/order.service');

const list = asyncHandler(async (req, res) => {
  const data = await OrderService.listForActor(req.actor, req.query);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Orders fetched successfully',
    data,
  });
});

const getById = asyncHandler(async (req, res) => {
  const data = await OrderService.getByIdForActor(req.actor, req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Order fetched successfully',
    data,
  });
});

const listItems = asyncHandler(async (req, res) => {
  const data = await OrderService.listItemsForActor(req.actor, req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Order items fetched successfully',
    data,
  });
});

const retryPayment = asyncHandler(async (req, res) => {
  const data = await OrderService.retryPayment(req.actor, req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Payment retry initialized successfully',
    data,
  });
});

module.exports = {
  list,
  getById,
  listItems,
  retryPayment,
};
