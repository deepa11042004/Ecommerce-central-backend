const ApiError = require('../../../core/errors/ApiError');
const env = require('../../../config/env');
const { sequelize } = require('../../../database/models');
const { toInteger } = require('../../../utils/shopping');
const {
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  PAYMENT_PROVIDERS,
} = require('../../../constants/order');
const OrderRepository = require('../../order/repositories/order.repository');
const OrderLifecycleService = require('../../order/services/orderLifecycle.service');
const PaymentRepository = require('../repositories/payment.repository');
const CartRepository = require('../../cart/repositories/cart.repository');
const ProductCatalogRepository = require('../../product/repositories/productCatalog.repository');
const InventoryRepository = require('../../product/repositories/inventory.repository');
const RazorpayService = require('./razorpay.service');
const { buildItemKey, normalizeCurrency } = require('../../../utils/shopping');

class PaymentService {
  static ensureActor(actor) {
    if (!actor?.userId && !actor?.guestId) {
      throw ApiError.badRequest('Shopping actor context is required');
    }
  }

  static ensureOrderOwnership(order, actor) {
    if (actor?.userId && Number(order.userId) !== Number(actor.userId)) {
      throw ApiError.notFound('Order not found');
    }

    if (actor?.guestId && String(order.guestId || '') !== String(actor.guestId || '')) {
      throw ApiError.notFound('Order not found');
    }
  }

  static async createPaymentAttempt(order, { transaction } = {}) {
    return PaymentRepository.create(
      {
        orderId: order.id,
        amount: order.totalAmount,
        currency: normalizeCurrency(order.currency || env.DEFAULT_CURRENCY, 'USD'),
        paymentMethod: order.paymentMethod || PAYMENT_METHODS.RAZORPAY,
        provider: PAYMENT_PROVIDERS.RAZORPAY,
        paymentStatus: PAYMENT_STATUS.PENDING,
      },
      { transaction }
    );
  }

  static async initializeRazorpayPayment(order, payment) {
    const amount = RazorpayService.toMinorUnit(order.totalAmount);

    if (!amount || amount <= 0) {
      throw ApiError.badRequest('Invalid order amount for payment');
    }

    const response = await RazorpayService.createOrder({
      amount,
      currency: order.currency,
      receipt: order.orderNumber,
      notes: {
        orderId: String(order.id),
      },
    });

    await PaymentRepository.update(payment, {
      razorpayOrderId: response.id,
      rawResponseJson: response,
    });

    return {
      razorpayOrderId: response.id,
      amount: response.amount,
      currency: response.currency,
      key: RazorpayService.getKeyId(),
    };
  }

  static async markPaymentFailed(order, payment, { reason } = {}) {
    await PaymentRepository.update(payment, {
      paymentStatus: PAYMENT_STATUS.FAILED,
      rawResponseJson: reason ? { error: reason } : payment.rawResponseJson,
    });

    await OrderLifecycleService.transition(order, ORDER_STATUS.FAILED, {
      actor: { userId: null },
      reason: reason || null,
    });
  }

  static async createRetryPayment(order) {
    const payment = await sequelize.transaction(async (transaction) => {
      const lockedOrder = await OrderRepository.findById(order.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!lockedOrder) {
        throw ApiError.notFound('Order not found');
      }

      if (lockedOrder.orderStatus !== ORDER_STATUS.PENDING_PAYMENT) {
        throw ApiError.badRequest('Order is not awaiting payment');
      }

      const createdPayment = await this.createPaymentAttempt(lockedOrder, { transaction });

      await OrderRepository.update(lockedOrder, { paymentStatus: PAYMENT_STATUS.PENDING }, { transaction });

      return createdPayment;
    });

    return this.initializeRazorpayPayment(order, payment);
  }

  static async verifyPayment(actor, payload) {
    this.ensureActor(actor);

    const order = await OrderRepository.findById(payload.orderId, {
      includeItems: true,
      includeAddresses: true,
    });

    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    this.ensureOrderOwnership(order, actor);

    const payment = await PaymentRepository.findByRazorpayOrderId(payload.razorpay_order_id);

    if (!payment || Number(payment.orderId) !== Number(order.id)) {
      throw ApiError.badRequest('Payment record not found');
    }

    if (payment.paymentStatus === PAYMENT_STATUS.SUCCESS) {
      return this.buildVerificationResponse(order, payment, { alreadyConfirmed: true });
    }

    if (order.orderStatus !== ORDER_STATUS.PENDING_PAYMENT) {
      throw ApiError.badRequest('Order is not awaiting payment');
    }

    const signatureValid = RazorpayService.verifyPaymentSignature({
      razorpayOrderId: payload.razorpay_order_id,
      razorpayPaymentId: payload.razorpay_payment_id,
      razorpaySignature: payload.razorpay_signature,
    });

    if (!signatureValid) {
      await PaymentRepository.update(payment, {
        razorpayPaymentId: payload.razorpay_payment_id,
        razorpaySignature: payload.razorpay_signature,
        paymentStatus: PAYMENT_STATUS.FAILED,
        rawResponseJson: payload,
      });
      await OrderLifecycleService.transition(order, ORDER_STATUS.FAILED, {
        actor: actor ? { userId: actor.userId || null, guestId: actor.guestId || null } : { userId: null },
        reason: 'Payment verification failed',
      });
      throw ApiError.badRequest('Payment verification failed');
    }

    return sequelize.transaction(async (transaction) => {
      const lockedOrder = await OrderRepository.findById(order.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
        includeItems: true,
        includeAddresses: true,
        includePayments: true,
        includeStatusHistory: true,
      });
      const lockedPayment = await PaymentRepository.findById(payment.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!lockedOrder || !lockedPayment) {
        throw ApiError.notFound('Order not found');
      }

      if (lockedPayment.paymentStatus === PAYMENT_STATUS.SUCCESS) {
        return this.buildVerificationResponse(lockedOrder, lockedPayment, { alreadyConfirmed: true });
      }

      await PaymentRepository.update(
        lockedPayment,
        {
          razorpayPaymentId: payload.razorpay_payment_id,
          razorpaySignature: payload.razorpay_signature,
          paymentStatus: PAYMENT_STATUS.SUCCESS,
          rawResponseJson: payload,
        },
        { transaction }
      );

      await this.finalizePaidOrder(lockedOrder, { transaction });

      const updatedOrder = await OrderRepository.findById(order.id, {
        transaction,
        includeItems: true,
        includeAddresses: true,
        includePayments: true,
      });

      return this.buildVerificationResponse(updatedOrder, lockedPayment, { alreadyConfirmed: false });
    });
  }

  static async handleRazorpayWebhook({ rawBody, signature, payload }) {
    const signatureValid = RazorpayService.verifyWebhookSignature({
      rawBody,
      signature,
    });

    if (!signatureValid) {
      throw ApiError.badRequest('Invalid webhook signature');
    }

    const event = payload?.event;

    if (!event) {
      return { received: false };
    }

    if (event === 'payment.captured') {
      return this.handlePaymentCaptured(payload);
    }

    if (event === 'payment.failed') {
      return this.handlePaymentFailed(payload);
    }

    if (event === 'refund.processed' || event === 'refund.created') {
      return this.handleRefundEvent(payload);
    }

    return { received: true };
  }

  static async handlePaymentCaptured(payload) {
    const paymentEntity = payload?.payload?.payment?.entity;

    if (!paymentEntity?.order_id) {
      return { received: false };
    }

    const payment = await PaymentRepository.findByRazorpayOrderId(paymentEntity.order_id);

    if (!payment) {
      return { received: false };
    }

    if (payment.paymentStatus === PAYMENT_STATUS.SUCCESS) {
      return { received: true, alreadyConfirmed: true };
    }

    return sequelize.transaction(async (transaction) => {
      const lockedPayment = await PaymentRepository.findById(payment.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const order = await OrderRepository.findById(payment.orderId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
        includeItems: true,
        includeAddresses: true,
        includePayments: true,
        includeStatusHistory: true,
      });

      if (!lockedPayment || !order) {
        return { received: false };
      }

      if (lockedPayment.paymentStatus === PAYMENT_STATUS.SUCCESS) {
        return { received: true, alreadyConfirmed: true };
      }

      await PaymentRepository.update(
        lockedPayment,
        {
          razorpayPaymentId: paymentEntity.id,
          paymentStatus: PAYMENT_STATUS.SUCCESS,
          rawResponseJson: payload,
        },
        { transaction }
      );

      await this.finalizePaidOrder(order, { transaction });

      return { received: true };
    });
  }

  static async handlePaymentFailed(payload) {
    const paymentEntity = payload?.payload?.payment?.entity;

    if (!paymentEntity?.order_id) {
      return { received: false };
    }

    const payment = await PaymentRepository.findByRazorpayOrderId(paymentEntity.order_id);

    if (!payment) {
      return { received: false };
    }

    if (payment.paymentStatus === PAYMENT_STATUS.REFUNDED) {
      return { received: true, alreadyConfirmed: true };
    }

    await PaymentRepository.update(payment, {
      razorpayPaymentId: paymentEntity.id,
      paymentStatus: PAYMENT_STATUS.FAILED,
      rawResponseJson: payload,
    });

    const order = await OrderRepository.findById(payment.orderId);

    if (order && order.paymentStatus !== PAYMENT_STATUS.SUCCESS) {
      await OrderLifecycleService.transition(order, ORDER_STATUS.FAILED, {
        actor: { userId: null },
        reason: 'Payment failed webhook received',
      });
    }

    return { received: true };
  }

  static async handleRefundEvent(payload) {
    const refundEntity = payload?.payload?.refund?.entity;

    if (!refundEntity?.payment_id) {
      return { received: false };
    }

    const payment = await PaymentRepository.findByRazorpayPaymentId(refundEntity.payment_id);

    if (!payment) {
      return { received: false };
    }

    await PaymentRepository.update(payment, {
      paymentStatus: PAYMENT_STATUS.REFUNDED,
      rawResponseJson: payload,
    });

    const order = await OrderRepository.findById(payment.orderId, {
      includeItems: true,
      includeAddresses: true,
      includePayments: true,
      includeStatusHistory: true,
    });

    if (order) {
      await OrderLifecycleService.transition(order, ORDER_STATUS.REFUNDED, {
        actor: { userId: null },
        reason: 'Refund webhook received',
      });
    }

    return { received: true };
  }

  static async finalizePaidOrder(order, { transaction } = {}) {
    if (!order || !order.items?.length) {
      throw ApiError.badRequest('Order items are missing for fulfillment');
    }

    if (order.orderStatus !== ORDER_STATUS.PENDING_PAYMENT) {
      return order;
    }

    await this.deductInventory(order.items, { transaction });
    await this.clearCartForOrder(order, { transaction });

    return OrderLifecycleService.transition(order, ORDER_STATUS.CONFIRMED, {
      actor: { userId: null },
      reason: 'Payment captured and order fulfilled',
      transaction,
    });
  }

  static async deductInventory(items, { transaction } = {}) {
    for (const item of items) {
      const quantity = toInteger(item.quantity, 0);

      if (quantity <= 0) {
        throw ApiError.badRequest('Invalid order quantity');
      }

      if (item.variantId) {
        const variant = await ProductCatalogRepository.findVariantById(item.variantId, { transaction });

        if (!variant || !variant.product) {
          throw ApiError.badRequest('Variant is unavailable for fulfillment');
        }

        if (variant.status !== 'active' || variant.product.status !== 'active') {
          throw ApiError.badRequest('Variant is inactive');
        }

        const inventory = await InventoryRepository.findInventoryByVariantIdForUpdate(item.variantId, { transaction });

        if (!inventory) {
          throw ApiError.badRequest('Inventory record is missing');
        }

        const available = Math.max(
          toInteger(inventory.quantity, 0) - toInteger(inventory.reservedQuantity, 0),
          0
        );

        if (!inventory.allowBackorder && quantity > available) {
          throw ApiError.badRequest('Insufficient stock for order fulfillment');
        }

        const nextQuantity = toInteger(inventory.quantity, 0) - quantity;

        await InventoryRepository.updateInventoryQuantity(inventory, nextQuantity, { transaction });
        continue;
      }

      const product = await InventoryRepository.findProductByIdForUpdate(item.productId, { transaction });

      if (!product) {
        throw ApiError.badRequest('Product is unavailable for fulfillment');
      }

      if (product.status !== 'active') {
        throw ApiError.badRequest('Product is inactive');
      }

      const currentStock = toInteger(product.stock, 0);

      if (quantity > currentStock) {
        throw ApiError.badRequest('Insufficient stock for order fulfillment');
      }

      await InventoryRepository.updateProductStock(product, currentStock - quantity, { transaction });
    }
  }

  static async clearCartForOrder(order, { transaction } = {}) {
    if (!order?.id) {
      return;
    }

    let cart = null;

    if (order.userId) {
      cart = await CartRepository.findByUserId(order.userId, { transaction });
    } else if (order.guestId) {
      cart = await CartRepository.findByGuestId(order.guestId, { transaction });
    }

    if (!cart) {
      return;
    }

    const itemKeys = (order.items || []).map((item) => buildItemKey(item.productId, item.variantId));

    await CartRepository.deleteItemsByKeys(cart.id, itemKeys, { transaction });
  }

  static buildVerificationResponse(order, payment, { alreadyConfirmed } = {}) {
    return {
      verified: true,
      alreadyConfirmed: Boolean(alreadyConfirmed),
      orderId: order.id,
      orderStatus: order.orderStatus,
      paymentStatus: payment.paymentStatus,
    };
  }
}

module.exports = PaymentService;
