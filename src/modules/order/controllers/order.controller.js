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

const timeline = asyncHandler(async (req, res) => {
  const data = await OrderService.getTimelineForActor(req.actor, req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Order timeline fetched successfully',
    data,
  });
});

const cancel = asyncHandler(async (req, res) => {
  const data = await OrderService.cancelForActor(req.actor, req.params.id, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Order cancelled successfully',
    data,
  });
});

const requestReturn = asyncHandler(async (req, res) => {
  const data = await OrderService.requestReturnForActor(req.actor, req.params.id, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Return request submitted successfully',
    data,
  });
});

const requestRefund = asyncHandler(async (req, res) => {
  const data = await OrderService.requestRefundForActor(req.actor, req.params.id, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Refund request submitted successfully',
    data,
  });
});

module.exports = {
  list,
  getById,
  listItems,
  retryPayment,
  timeline,
  cancel,
  requestReturn,
  requestRefund,
};
