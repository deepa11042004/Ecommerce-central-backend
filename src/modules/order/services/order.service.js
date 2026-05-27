const ApiError = require('../../../core/errors/ApiError');
const { parsePagination, buildPaginationMeta } = require('../../../utils/pagination');
const { parseSort } = require('../../../utils/filtering');
const { toMoney } = require('../../../utils/shopping');
const { isOrderStatusTransitionAllowed } = require('../../../utils/orderStatus');
const {
  ORDER_STATUS,
  PAYMENT_STATUS,
} = require('../../../constants/order');
const OrderRepository = require('../repositories/order.repository');
const PaymentService = require('../../payment/services/payment.service');

const DEFAULT_SORT = {
  sortBy: 'createdAt',
  sortOrder: 'DESC',
};

const ALLOWED_SORT_FIELDS = ['createdAt', 'totalAmount', 'orderNumber'];

class OrderService {
  static ensureActor(actor) {
    if (!actor?.userId && !actor?.guestId) {
      throw ApiError.badRequest('Shopping actor context is required');
    }
  }

  static async listForActor(actor, query = {}) {
    this.ensureActor(actor);

    const { page, limit, offset } = parsePagination(query);
    const { sortBy, sortOrder } = parseSort(query.sort, {
      allowedFields: ALLOWED_SORT_FIELDS,
      defaultSort: DEFAULT_SORT,
    });

    const { rows, count } = await OrderRepository.listByActor({
      actor,
      status: query.status,
      paymentStatus: query.paymentStatus,
      dateFrom: query.from,
      dateTo: query.to,
      search: query.search,
      limit,
      offset,
      sortBy,
      sortOrder,
      includeItems: true,
      includeAddresses: true,
    });

    return {
      items: rows.map((order) => this.serialize(order, { includeItems: true, includeAddresses: true })),
      meta: buildPaginationMeta({
        page,
        limit,
        totalItems: count,
      }),
    };
  }

  static async getByIdForActor(actor, id) {
    this.ensureActor(actor);

    const order = await OrderRepository.findByIdForActor(id, actor, {
      includeItems: true,
      includeAddresses: true,
      includePayments: true,
    });

    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    return this.serialize(order, { includeItems: true, includeAddresses: true, includePayments: true });
  }

  static async listItemsForActor(actor, id) {
    this.ensureActor(actor);

    const order = await OrderRepository.findByIdForActor(id, actor, {
      includeItems: true,
    });

    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    return (order.items || []).map((item) => this.serializeItem(item));
  }

  static async retryPayment(actor, id) {
    this.ensureActor(actor);

    const order = await OrderRepository.findByIdForActor(id, actor, {
      includeItems: true,
    });

    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    if (order.orderStatus !== ORDER_STATUS.PENDING_PAYMENT) {
      throw ApiError.badRequest('Order is not awaiting payment');
    }

    const paymentInit = await PaymentService.createRetryPayment(order);

    const totals = {
      subtotal: toMoney(order.subtotal, 0),
      taxAmount: toMoney(order.taxAmount, 0),
      shippingAmount: toMoney(order.shippingAmount, 0),
      discountAmount: toMoney(order.discountAmount, 0),
      totalAmount: toMoney(order.totalAmount, 0),
      currency: order.currency,
    };

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      razorpayOrderId: paymentInit.razorpayOrderId,
      amount: paymentInit.amount,
      currency: paymentInit.currency,
      key: paymentInit.key,
      totals,
    };
  }

  static async listAdmin(query = {}) {
    const { page, limit, offset } = parsePagination(query);
    const { sortBy, sortOrder } = parseSort(query.sort, {
      allowedFields: ALLOWED_SORT_FIELDS,
      defaultSort: DEFAULT_SORT,
    });

    const { rows, count } = await OrderRepository.listAdmin({
      status: query.status,
      paymentStatus: query.paymentStatus,
      dateFrom: query.from,
      dateTo: query.to,
      search: query.search,
      limit,
      offset,
      sortBy,
      sortOrder,
      includeItems: true,
      includeAddresses: true,
      includeUser: true,
    });

    return {
      items: rows.map((order) => this.serialize(order, { includeItems: true, includeAddresses: true, includeUser: true })),
      meta: buildPaginationMeta({
        page,
        limit,
        totalItems: count,
      }),
    };
  }

  static async updateStatusByAdmin(id, payload) {
    const order = await OrderRepository.findById(id);

    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    const nextStatus = payload.status;

    if (!isOrderStatusTransitionAllowed(order.orderStatus, nextStatus)) {
      throw ApiError.badRequest('Order status transition is not allowed');
    }

    const nextPayload = {
      orderStatus: nextStatus,
    };

    if (nextStatus === ORDER_STATUS.REFUNDED) {
      nextPayload.paymentStatus = PAYMENT_STATUS.REFUNDED;
    }

    if (nextStatus === ORDER_STATUS.FAILED) {
      nextPayload.paymentStatus = PAYMENT_STATUS.FAILED;
    }

    await OrderRepository.update(order, nextPayload);

    const detailedOrder = await OrderRepository.findById(order.id, {
      includeItems: true,
      includeAddresses: true,
    });

    return this.serialize(detailedOrder, { includeItems: true, includeAddresses: true });
  }

  static serialize(order, { includeItems = false, includeAddresses = false, includePayments = false, includeUser = false } = {}) {
    if (!order) {
      return null;
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      guestId: order.guestId,
      subtotal: toMoney(order.subtotal, 0),
      taxAmount: toMoney(order.taxAmount, 0),
      shippingAmount: toMoney(order.shippingAmount, 0),
      discountAmount: toMoney(order.discountAmount, 0),
      totalAmount: toMoney(order.totalAmount, 0),
      currency: order.currency,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      billingAddressId: order.billingAddressId,
      shippingAddressId: order.shippingAddressId,
      notes: order.notes,
      items: includeItems ? (order.items || []).map((item) => this.serializeItem(item)) : undefined,
      payments: includePayments ? (order.payments || []).map((payment) => this.serializePayment(payment)) : undefined,
      billingAddress: includeAddresses ? this.serializeAddress(order.billingAddress) : undefined,
      shippingAddress: includeAddresses ? this.serializeAddress(order.shippingAddress) : undefined,
      user: includeUser ? this.serializeUser(order.user) : undefined,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  static serializeItem(item) {
    if (!item) {
      return null;
    }

    return {
      id: item.id,
      orderId: item.orderId,
      productId: item.productId,
      variantId: item.variantId || null,
      productNameSnapshot: item.productNameSnapshot,
      skuSnapshot: item.skuSnapshot,
      imageSnapshot: item.imageSnapshot,
      unitPrice: toMoney(item.unitPrice, 0),
      quantity: item.quantity,
      totalPrice: toMoney(item.totalPrice, 0),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  static serializePayment(payment) {
    if (!payment) {
      return null;
    }

    return {
      id: payment.id,
      orderId: payment.orderId,
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId,
      amount: toMoney(payment.amount, 0),
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      provider: payment.provider,
      paymentStatus: payment.paymentStatus,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  static serializeAddress(address) {
    if (!address) {
      return null;
    }

    return {
      id: address.id,
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      state: address.state,
      country: address.country,
      postalCode: address.postalCode,
      landmark: address.landmark,
      type: address.type,
    };
  }

  static serializeUser(user) {
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
    };
  }
}

module.exports = OrderService;
