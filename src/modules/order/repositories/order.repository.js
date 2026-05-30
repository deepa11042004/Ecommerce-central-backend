const { Op } = require('sequelize');
const { Order, OrderItem, Payment, Address, User, OrderStatusHistory } = require('../../../database/models');

const ORDER_ITEM_ATTRIBUTES = [
  'id',
  'orderId',
  'productId',
  'variantId',
  'productNameSnapshot',
  'skuSnapshot',
  'imageSnapshot',
  'unitPrice',
  'quantity',
  'totalPrice',
  'createdAt',
  'updatedAt',
];

const PAYMENT_ATTRIBUTES = [
  'id',
  'orderId',
  'razorpayOrderId',
  'razorpayPaymentId',
  'amount',
  'currency',
  'paymentMethod',
  'provider',
  'paymentStatus',
  'createdAt',
  'updatedAt',
];

const ORDER_STATUS_HISTORY_ATTRIBUTES = [
  'id',
  'orderId',
  'oldStatus',
  'newStatus',
  'changedBy',
  'reason',
  'notes',
  'createdAt',
];

const ORDER_ATTRIBUTES = [
  'id',
  'orderNumber',
  'userId',
  'guestId',
  'subtotal',
  'taxAmount',
  'shippingAmount',
  'discountAmount',
  'couponCodeSnapshot',
  'couponDiscountSnapshot',
  'couponTypeSnapshot',
  'totalAmount',
  'currency',
  'orderStatus',
  'paymentStatus',
  'paymentMethod',
  'billingAddressId',
  'shippingAddressId',
  'notes',
  'createdAt',
  'updatedAt',
];

const ADDRESS_ATTRIBUTES = [
  'id',
  'fullName',
  'phone',
  'addressLine1',
  'addressLine2',
  'city',
  'state',
  'country',
  'postalCode',
  'landmark',
  'type',
];

const USER_ATTRIBUTES = ['id', 'fullName', 'email'];

class OrderRepository {
  static buildInclude({
    includeItems = false,
    includePayments = false,
    includeAddresses = false,
    includeUser = false,
    includeStatusHistory = false,
  } = {}) {
    const include = [];

    if (includeItems) {
      include.push({
        model: OrderItem,
        as: 'items',
        attributes: ORDER_ITEM_ATTRIBUTES,
      });
    }

    if (includePayments) {
      include.push({
        model: Payment,
        as: 'payments',
        attributes: PAYMENT_ATTRIBUTES,
      });
    }

    if (includeAddresses) {
      include.push({
        model: Address,
        as: 'billingAddress',
        attributes: ADDRESS_ATTRIBUTES,
      });
      include.push({
        model: Address,
        as: 'shippingAddress',
        attributes: ADDRESS_ATTRIBUTES,
      });
    }

    if (includeUser) {
      include.push({
        model: User,
        as: 'user',
        attributes: USER_ATTRIBUTES,
      });
    }

    if (includeStatusHistory) {
      include.push({
        model: OrderStatusHistory,
        as: 'statusHistory',
        attributes: ORDER_STATUS_HISTORY_ATTRIBUTES,
      });
    }

    return include;
  }

  static buildQueryOptions({
    transaction,
    includeItems = false,
    includePayments = false,
    includeAddresses = false,
    includeUser = false,
    includeStatusHistory = false,
    lock,
  } = {}) {
    const options = { transaction, attributes: ORDER_ATTRIBUTES };
    const include = this.buildInclude({
      includeItems,
      includePayments,
      includeAddresses,
      includeUser,
      includeStatusHistory,
    });

    if (include.length) {
      options.include = include;
    }

    if (lock) {
      options.lock = lock;
    }

    return options;
  }

  static create(payload, { transaction } = {}) {
    return Order.create(payload, { transaction });
  }

  static update(order, payload, { transaction } = {}) {
    return order.update(payload, { transaction });
  }

  static createItems(orderId, items, { transaction } = {}) {
    const rows = items.map((item) => ({
      orderId,
      productId: item.productId,
      variantId: item.variantId,
      productNameSnapshot: item.productNameSnapshot,
      skuSnapshot: item.skuSnapshot,
      imageSnapshot: item.imageSnapshot,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      totalPrice: item.totalPrice,
    }));

    return OrderItem.bulkCreate(rows, { transaction });
  }

  static findById(id, options = {}) {
    return Order.findByPk(id, this.buildQueryOptions(options));
  }

  static findByIdForActor(id, actor, options = {}) {
    const where = { id };

    if (actor?.userId) {
      where.userId = actor.userId;
    } else if (actor?.guestId) {
      where.guestId = actor.guestId;
    }

    return Order.findOne({
      where,
      ...this.buildQueryOptions(options),
    });
  }

  static findByOrderNumber(orderNumber, { transaction } = {}) {
    return Order.findOne({ where: { orderNumber }, transaction });
  }

  static listByActor({
    actor,
    status,
    paymentStatus,
    dateFrom,
    dateTo,
    search,
    limit,
    offset,
    sortBy,
    sortOrder,
    includeItems = false,
    includePayments = false,
    includeAddresses = false,
  } = {}) {
    const where = {};

    if (actor?.userId) {
      where.userId = actor.userId;
    } else if (actor?.guestId) {
      where.guestId = actor.guestId;
    }

    if (status) {
      where.orderStatus = status;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};

      if (dateFrom) {
        where.createdAt[Op.gte] = dateFrom;
      }

      if (dateTo) {
        where.createdAt[Op.lte] = dateTo;
      }
    }

    if (search) {
      const normalizedSearch = String(search).trim();
      const likeSearch = `%${normalizedSearch}%`;

      where[Op.or] = [
        { orderNumber: { [Op.like]: likeSearch } },
        { guestId: { [Op.like]: likeSearch } },
      ];

      const numericSearch = Number.parseInt(normalizedSearch, 10);

      if (!Number.isNaN(numericSearch)) {
        where[Op.or].push({ id: numericSearch });
      }
    }

    return Order.findAndCountAll({
      where,
      limit,
      offset,
      distinct: true,
      order: [[sortBy || 'createdAt', sortOrder || 'DESC']],
      ...this.buildQueryOptions({ includeItems, includePayments, includeAddresses }),
    });
  }

  static listAdmin({
    status,
    paymentStatus,
    dateFrom,
    dateTo,
    search,
    limit,
    offset,
    sortBy,
    sortOrder,
    includeItems = false,
    includePayments = false,
    includeAddresses = false,
    includeUser = false,
  } = {}) {
    const where = {};

    if (status) {
      where.orderStatus = status;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};

      if (dateFrom) {
        where.createdAt[Op.gte] = dateFrom;
      }

      if (dateTo) {
        where.createdAt[Op.lte] = dateTo;
      }
    }

    if (search) {
      const normalizedSearch = String(search).trim();
      const likeSearch = `%${normalizedSearch}%`;

      where[Op.or] = [
        { orderNumber: { [Op.like]: likeSearch } },
        { guestId: { [Op.like]: likeSearch } },
      ];

      const numericSearch = Number.parseInt(normalizedSearch, 10);

      if (!Number.isNaN(numericSearch)) {
        where[Op.or].push({ id: numericSearch });
        where[Op.or].push({ userId: numericSearch });
      }
    }

    return Order.findAndCountAll({
      where,
      limit,
      offset,
      distinct: true,
      order: [[sortBy || 'createdAt', sortOrder || 'DESC']],
      ...this.buildQueryOptions({ includeItems, includePayments, includeAddresses, includeUser }),
    });
  }

  static findItemsByOrderId(orderId, { transaction } = {}) {
    return OrderItem.findAll({
      where: { orderId },
      order: [['createdAt', 'ASC']],
      transaction,
    });
  }
}

module.exports = OrderRepository;
