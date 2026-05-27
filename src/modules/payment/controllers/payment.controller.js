const { sendSuccess } = require('../../../core/http/response');
const asyncHandler = require('../../../utils/asyncHandler');
const PaymentService = require('../services/payment.service');

const verify = asyncHandler(async (req, res) => {
  const data = await PaymentService.verifyPayment(req.actor, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Payment verified successfully',
    data,
  });
});

const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const data = await PaymentService.handleRazorpayWebhook({
    rawBody: req.rawBody,
    signature,
    payload: req.body,
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Webhook processed successfully',
    data,
  });
});

module.exports = {
  verify,
  handleRazorpayWebhook,
};
