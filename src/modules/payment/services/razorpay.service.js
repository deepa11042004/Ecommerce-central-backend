const crypto = require('crypto');
const Razorpay = require('razorpay');
const env = require('../../../config/env');

const client = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_SECRET,
});

class RazorpayService {
  static getKeyId() {
    return env.RAZORPAY_KEY_ID;
  }

  static toMinorUnit(amount) {
    const normalized = Number(amount);

    if (!Number.isFinite(normalized)) {
      return 0;
    }

    return Math.round(normalized * 100);
  }

  static async createOrder({ amount, currency, receipt, notes }) {
    return client.orders.create({
      amount,
      currency,
      receipt,
      notes,
    });
  }

  static verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_SECRET)
      .update(payload)
      .digest('hex');

    return expected === razorpaySignature;
  }

  static verifyWebhookSignature({ rawBody, signature }) {
    if (!rawBody || !signature) {
      return false;
    }

    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    return expected === signature;
  }
}

module.exports = RazorpayService;
