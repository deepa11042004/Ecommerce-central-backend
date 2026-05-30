const { COUPON_TYPES } = require('../../../constants/coupon');
const { toMoney } = require('../../../utils/shopping');

class DiscountEngineService {
  static calculateDiscount({ coupon, eligibleSubtotal }) {
    const subtotal = toMoney(eligibleSubtotal, 0);

    if (!coupon || subtotal <= 0) {
      return 0;
    }

    let discount = 0;

    if (coupon.couponType === COUPON_TYPES.PERCENTAGE) {
      discount = toMoney((subtotal * toMoney(coupon.discountValue, 0)) / 100, 0);
    }

    if (coupon.couponType === COUPON_TYPES.FIXED_AMOUNT) {
      discount = toMoney(coupon.discountValue, 0);
    }

    const maximumDiscountAmount = coupon.maximumDiscountAmount == null
      ? null
      : toMoney(coupon.maximumDiscountAmount, 0);

    if (maximumDiscountAmount !== null) {
      discount = Math.min(discount, maximumDiscountAmount);
    }

    discount = Math.max(0, discount);
    discount = Math.min(discount, subtotal);

    return toMoney(discount, 0);
  }
}

module.exports = DiscountEngineService;
