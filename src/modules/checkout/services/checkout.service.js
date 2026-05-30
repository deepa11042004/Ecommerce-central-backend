const crypto = require('crypto');
const ApiError = require('../../../core/errors/ApiError');
const env = require('../../../config/env');
const { sequelize } = require('../../../database/models');
const { buildItemKey, normalizeCurrency, toInteger, toMoney } = require('../../../utils/shopping');
const CartRepository = require('../../cart/repositories/cart.repository');
const CartService = require('../../cart/services/cart.service');
const ProductCatalogRepository = require('../../product/repositories/productCatalog.repository');
const OrderRepository = require('../../order/repositories/order.repository');
const PaymentRepository = require('../../payment/repositories/payment.repository');
const PaymentService = require('../../payment/services/payment.service');
const AddressRepository = require('../../address/repositories/address.repository');
const CouponValidationService = require('../../coupon/services/couponValidation.service');
const {
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  PAYMENT_PROVIDERS,
} = require('../../../constants/order');

class CheckoutService {
  static ensureActor(actor) {
    if (!actor?.userId && !actor?.guestId) {
      throw ApiError.badRequest('Shopping actor context is required');
    }
  }

  static async checkout(actor, payload) {
    this.ensureActor(actor);

    const paymentMethod = payload.paymentMethod || PAYMENT_METHODS.RAZORPAY;

    if (paymentMethod !== PAYMENT_METHODS.RAZORPAY) {
      throw ApiError.badRequest('Unsupported payment method');
    }

    const { order, payment, totals, coupon } = await sequelize.transaction(async (transaction) => {
      const cart = await this.findCart(actor, { transaction });

      if (!cart || !cart.items?.length) {
        throw ApiError.badRequest('Cart is empty');
      }

      const billingAddress = await this.resolveAddress(actor, payload.billingAddressId, { transaction });
      const shippingAddress = await this.resolveAddress(actor, payload.shippingAddressId, { transaction });

      const selections = await this.resolveSelections(cart.items, { transaction });
      let couponValidation = null;
      let totals = this.calculateTotals(selections, cart.currency);

      if (payload.couponCode) {
        couponValidation = await CouponValidationService.validateForSelections({
          actor,
          couponCode: payload.couponCode,
          selections: selections.map((selection) => ({
            productId: selection.product.id,
            quantity: selection.quantity,
            unitPrice: selection.unitPrice,
          })),
          currency: totals.currency,
          transaction,
          lockCoupon: true,
        });

        totals = this.calculateTotals(selections, cart.currency, {
          discountAmount: couponValidation.pricing.discount,
        });
      }

      const orderNumber = await this.generateOrderNumber({ transaction });

      const order = await OrderRepository.create(
        {
          orderNumber,
          userId: actor.userId || null,
          guestId: actor.guestId || null,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          shippingAmount: totals.shippingAmount,
          discountAmount: totals.discountAmount,
          couponCodeSnapshot: couponValidation?.couponView?.code || null,
          couponDiscountSnapshot: couponValidation?.pricing?.discount || null,
          couponTypeSnapshot: couponValidation?.couponView?.type || null,
          totalAmount: totals.totalAmount,
          currency: totals.currency,
          orderStatus: ORDER_STATUS.PENDING_PAYMENT,
          paymentStatus: PAYMENT_STATUS.PENDING,
          paymentMethod,
          billingAddressId: billingAddress?.id || null,
          shippingAddressId: shippingAddress?.id || null,
          notes: payload.notes || null,
        },
        { transaction }
      );

      await OrderRepository.createItems(order.id, this.buildOrderItemRows(selections), { transaction });

      if (couponValidation?.coupon && totals.discountAmount > 0) {
        await CouponValidationService.recordCouponUsage({
          coupon: couponValidation.coupon,
          actor,
          orderId: order.id,
          discountAmount: totals.discountAmount,
          transaction,
        });
      }

      const payment = await PaymentRepository.create(
        {
          orderId: order.id,
          amount: totals.totalAmount,
          currency: totals.currency,
          paymentMethod,
          provider: PAYMENT_PROVIDERS.RAZORPAY,
          paymentStatus: PAYMENT_STATUS.PENDING,
        },
        { transaction }
      );

      const detailedOrder = await OrderRepository.findById(order.id, {
        transaction,
        includeItems: true,
        includeAddresses: true,
      });

      return { order: detailedOrder, payment, totals, coupon: couponValidation?.couponView || null };
    });

    try {
      const razorpay = await PaymentService.initializeRazorpayPayment(order, payment);

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        razorpayOrderId: razorpay.razorpayOrderId,
        amount: razorpay.amount,
        currency: razorpay.currency,
        key: razorpay.key,
        totals,
        coupon,
      };
    } catch (error) {
      await PaymentService.markPaymentFailed(order, payment, { reason: error.message });
      throw ApiError.badRequest('Payment initialization failed. Use retry-payment to continue.', [
        { field: 'orderId', message: String(order.id) },
      ]);
    }
  }

  static async findCart(actor, { transaction } = {}) {
    const cart = actor.userId
      ? await CartRepository.findByUserId(actor.userId, { transaction, includeItems: true })
      : await CartRepository.findByGuestId(actor.guestId, { transaction, includeItems: true });

    return CartService.ensureCartCurrency(cart, { transaction });
  }

  static async resolveAddress(actor, addressId, { transaction } = {}) {
    if (!addressId) {
      throw ApiError.badRequest('Address id is required');
    }

    const address = await AddressRepository.findByIdForActor(addressId, actor, { transaction });

    if (!address) {
      throw ApiError.badRequest('Address not found');
    }

    return address;
  }

  static async resolveSelections(items, { transaction } = {}) {
    const selections = [];

    for (const item of items) {
      const selection = await this.resolveSelection(item, { transaction });
      selections.push(selection);
    }

    return selections;
  }

  static async resolveSelection(item, { transaction } = {}) {
    const quantity = toInteger(item.quantity, 0);

    if (quantity <= 0) {
      throw ApiError.badRequest('Quantity must be greater than zero');
    }

    const product = await ProductCatalogRepository.findProductById(item.productId, { transaction });

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    if (product.status !== 'active') {
      throw ApiError.badRequest('Product is inactive');
    }

    if (product.hasVariants) {
      if (!item.variantId) {
        throw ApiError.badRequest('Variant id is required for this product');
      }

      const variant = await ProductCatalogRepository.findVariantById(item.variantId, { transaction });

      if (!variant || Number(variant.productId) !== Number(product.id)) {
        throw ApiError.badRequest('Variant does not belong to the requested product');
      }

      if (variant.status !== 'active') {
        throw ApiError.badRequest('Variant is inactive');
      }

      const latestPrice = toMoney(variant.price, null);

      if (latestPrice === null) {
        throw ApiError.badRequest('Variant price is not configured');
      }

      const availableStock = this.resolveAvailableVariantStock(variant);
      const selection = {
        product,
        variant,
        quantity,
        itemKey: buildItemKey(product.id, variant.id),
        unitPrice: latestPrice,
        availableStock,
        allowBackorder: Boolean(variant.inventory?.allowBackorder),
      };

      this.ensureStockAvailable(selection, quantity);

      return selection;
    }

    if (item.variantId) {
      throw ApiError.badRequest('Simple products do not support variant selection');
    }

    const latestPrice = toMoney(product.basePrice, null);

    if (latestPrice === null) {
      throw ApiError.badRequest('Product price is not configured');
    }

    const selection = {
      product,
      variant: null,
      quantity,
      itemKey: buildItemKey(product.id),
      unitPrice: latestPrice,
      availableStock: product.stock == null ? 0 : toInteger(product.stock, 0),
      allowBackorder: false,
    };

    this.ensureStockAvailable(selection, quantity);

    return selection;
  }

  static ensureStockAvailable(selection, quantity) {
    if (selection.allowBackorder || selection.availableStock === null) {
      return;
    }

    if (quantity > selection.availableStock) {
      throw ApiError.badRequest('Insufficient stock for requested quantity');
    }
  }

  static resolveAvailableVariantStock(variant) {
    if (variant?.inventory?.allowBackorder) {
      return null;
    }

    if (!variant?.inventory) {
      return 0;
    }

    return Math.max(
      toInteger(variant.inventory.quantity, 0) - toInteger(variant.inventory.reservedQuantity, 0),
      0
    );
  }

  static calculateTotals(selections, currency, { discountAmount = 0 } = {}) {
    const subtotal = selections.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    const totals = {
      subtotal: toMoney(subtotal, 0),
      taxAmount: toMoney(0, 0),
      shippingAmount: toMoney(0, 0),
      discountAmount: toMoney(discountAmount, 0),
    };

    totals.totalAmount = toMoney(
      Math.max(totals.subtotal + totals.taxAmount + totals.shippingAmount - totals.discountAmount, 0),
      0
    );

    totals.currency = normalizeCurrency(currency || env.DEFAULT_CURRENCY, 'USD');

    return totals;
  }

  static buildOrderItemRows(selections) {
    return selections.map((selection) => ({
      productId: selection.product.id,
      variantId: selection.variant?.id || null,
      productNameSnapshot: selection.product.title,
      skuSnapshot: selection.variant?.sku || selection.product.sku || null,
      imageSnapshot: selection.variant?.image || selection.product.thumbnail || null,
      unitPrice: selection.unitPrice,
      quantity: selection.quantity,
      totalPrice: toMoney(selection.unitPrice * selection.quantity, 0),
    }));
  }

  static async generateOrderNumber({ transaction } = {}) {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const randomPart = crypto.randomBytes(4).toString('hex');
      const orderNumber = `ORD-${datePart}-${randomPart}`;
      const existing = await OrderRepository.findByOrderNumber(orderNumber, { transaction });

      if (!existing) {
        return orderNumber;
      }
    }

    throw ApiError.badRequest('Failed to generate a unique order number');
  }
}

module.exports = CheckoutService;
