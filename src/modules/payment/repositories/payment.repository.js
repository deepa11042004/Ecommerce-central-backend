const { Payment } = require('../../../database/models');

class PaymentRepository {
  static create(payload, { transaction } = {}) {
    return Payment.create(payload, { transaction });
  }

  static update(payment, payload, { transaction } = {}) {
    return payment.update(payload, { transaction });
  }

  static findById(id, { transaction, lock } = {}) {
    const options = { transaction };

    if (lock) {
      options.lock = lock;
    }

    return Payment.findByPk(id, options);
  }

  static findLatestByOrderId(orderId, { transaction, lock } = {}) {
    const options = {
      where: { orderId },
      order: [['createdAt', 'DESC']],
      transaction,
    };

    if (lock) {
      options.lock = lock;
    }

    return Payment.findOne(options);
  }

  static findByRazorpayOrderId(razorpayOrderId, { transaction, lock } = {}) {
    const options = {
      where: { razorpayOrderId },
      transaction,
    };

    if (lock) {
      options.lock = lock;
    }

    return Payment.findOne(options);
  }

  static findByRazorpayPaymentId(razorpayPaymentId, { transaction, lock } = {}) {
    const options = {
      where: { razorpayPaymentId },
      transaction,
    };

    if (lock) {
      options.lock = lock;
    }

    return Payment.findOne(options);
  }
}

module.exports = PaymentRepository;
