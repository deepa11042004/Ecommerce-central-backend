const { sendSuccess } = require('../../../core/http/response');
const asyncHandler = require('../../../utils/asyncHandler');
const CheckoutService = require('../services/checkout.service');

const checkout = asyncHandler(async (req, res) => {
  const data = await CheckoutService.checkout(req.actor, req.body);

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Checkout initiated successfully',
    data,
  });
});

module.exports = {
  checkout,
};
