const ApiError = require('../../../core/errors/ApiError');
const { toMoney } = require('../../../utils/shopping');
const CouponRepository = require('../repositories/coupon.repository');
const DiscountEngineService = require('./discountEngine.service');

class CouponValidationService {
  static normalizeCode(code) {
    return String(code || '').trim().toUpperCase();
  }

  static async validateForSelections({
    actor,
    couponCode,
    selections,
    currency,
    transaction,
    lockCoupon = false,
  }) {
    const normalizedCode = this.normalizeCode(couponCode);

    if (!normalizedCode) {
      throw ApiError.badRequest('Coupon code is required');
    }

    const coupon = await CouponRepository.findByCode(normalizedCode, {
      transaction,
      includeRestrictions: true,
      lock: lockCoupon ? transaction?.LOCK?.UPDATE : undefined,
    });

    if (!coupon) {
      throw ApiError.badRequest('Coupon does not exist');
    }

    this.ensureCouponAvailability(coupon);

    await this.ensureUsageLimits(coupon, actor, { transaction });

    const eligibility = await this.resolveEligibility(coupon, selections, { transaction });

    const subtotal = toMoney(eligibility.subtotal, 0);

    if (subtotal < toMoney(coupon.minimumOrderAmount, 0)) {
      throw ApiError.badRequest('Minimum order amount not reached for this coupon');
    }

    if (eligibility.eligibleSubtotal <= 0) {
      throw ApiError.badRequest('Coupon is not applicable for items in this cart');
    }

    const discount = DiscountEngineService.calculateDiscount({
      coupon,
      eligibleSubtotal: eligibility.eligibleSubtotal,
    });

    if (discount <= 0) {
      throw ApiError.badRequest('Coupon discount is not applicable for this cart');
    }

    const tax = 0;
    const shipping = 0;
    const total = toMoney(subtotal + tax + shipping - discount, 0);

    return {
      coupon,
      couponView: {
        id: coupon.id,
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        type: coupon.couponType,
        discountValue: toMoney(coupon.discountValue, 0),
        maximumDiscountAmount: coupon.maximumDiscountAmount == null
          ? null
          : toMoney(coupon.maximumDiscountAmount, 0),
      },
      pricing: {
        currency,
        subtotal,
        eligibleSubtotal: toMoney(eligibility.eligibleSubtotal, 0),
        discount,
        shipping,
        tax,
        total,
      },
      eligibility,
    };
  }

  static async recordCouponUsage({ coupon, actor, orderId, discountAmount, transaction }) {
    if (!coupon || !discountAmount || discountAmount <= 0) {
      return;
    }

    await CouponRepository.createUsage(
      {
        couponId: coupon.id,
        userId: actor?.userId || null,
        orderId,
        usedAt: new Date(),
        discountAmount: toMoney(discountAmount, 0),
      },
      { transaction }
    );

    await CouponRepository.incrementUsedCount(coupon, 1, { transaction });
  }

  static ensureCouponAvailability(coupon) {
    const now = new Date();

    if (!coupon.isActive) {
      throw ApiError.badRequest('Coupon is inactive');
    }

    if (coupon.startsAt && now < new Date(coupon.startsAt)) {
      throw ApiError.badRequest('Coupon is not active yet');
    }

    if (coupon.expiresAt && now > new Date(coupon.expiresAt)) {
      throw ApiError.badRequest('Coupon is expired');
    }
  }

  static async ensureUsageLimits(coupon, actor, { transaction } = {}) {
    const usageLimit = coupon.usageLimit == null ? null : Number(coupon.usageLimit);
    const perUserUsageLimit = coupon.perUserUsageLimit == null ? null : Number(coupon.perUserUsageLimit);

    if (usageLimit !== null && Number(coupon.usedCount) >= usageLimit) {
      throw ApiError.badRequest('Coupon usage limit has been reached');
    }

    if (perUserUsageLimit !== null) {
      if (!actor?.userId) {
        throw ApiError.badRequest('Login is required to use this coupon');
      }

      const usageByUser = await CouponRepository.countUsageByUser(coupon.id, actor.userId, { transaction });

      if (usageByUser >= perUserUsageLimit) {
        throw ApiError.badRequest('Per-user coupon usage limit has been reached');
      }
    }
  }

  static async resolveEligibility(coupon, selections, { transaction } = {}) {
    const normalizedSelections = (selections || [])
      .map((selection) => ({
        productId: Number(selection.productId),
        quantity: Number(selection.quantity || 0),
        unitPrice: toMoney(selection.unitPrice, 0),
      }))
      .filter((selection) => Number.isFinite(selection.productId) && selection.quantity > 0);

    if (!normalizedSelections.length) {
      throw ApiError.badRequest('Cart is empty');
    }

    const restrictedProductIds = (coupon.productRestrictions || []).map((entry) => Number(entry.productId));
    const restrictedCategoryIds = (coupon.categoryRestrictions || []).map((entry) => Number(entry.categoryId));

    const hasProductRestriction = restrictedProductIds.length > 0;
    const hasCategoryRestriction = restrictedCategoryIds.length > 0;

    const subtotal = normalizedSelections.reduce(
      (sum, item) => sum + toMoney(item.unitPrice * item.quantity, 0),
      0
    );

    if (!hasProductRestriction && !hasCategoryRestriction) {
      return {
        subtotal: toMoney(subtotal, 0),
        eligibleSubtotal: toMoney(subtotal, 0),
        hasRestriction: false,
      };
    }

    const productIds = normalizedSelections.map((item) => item.productId);
    const productCategoryRows = await CouponRepository.findProductCategoryRows(productIds, { transaction });

    const categoryIdsByProductId = productCategoryRows.reduce((acc, row) => {
      const key = Number(row.productId);

      if (!acc.has(key)) {
        acc.set(key, new Set());
      }

      acc.get(key).add(Number(row.categoryId));
      return acc;
    }, new Map());

    const restrictedProductSet = new Set(restrictedProductIds);
    const restrictedCategorySet = new Set(restrictedCategoryIds);

    const eligibleSubtotal = normalizedSelections.reduce((sum, item) => {
      const byProduct = hasProductRestriction && restrictedProductSet.has(item.productId);

      const productCategorySet = categoryIdsByProductId.get(item.productId) || new Set();
      const byCategory = hasCategoryRestriction
        && Array.from(productCategorySet).some((categoryId) => restrictedCategorySet.has(categoryId));

      const isEligible = byProduct || byCategory;

      if (!isEligible) {
        return sum;
      }

      return sum + toMoney(item.unitPrice * item.quantity, 0);
    }, 0);

    return {
      subtotal: toMoney(subtotal, 0),
      eligibleSubtotal: toMoney(eligibleSubtotal, 0),
      hasRestriction: true,
      restrictedProductIds,
      restrictedCategoryIds,
    };
  }
}

module.exports = CouponValidationService;
