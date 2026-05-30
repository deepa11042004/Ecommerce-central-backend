const COUPON_TYPES = Object.freeze({
  PERCENTAGE: 'PERCENTAGE',
  FIXED_AMOUNT: 'FIXED_AMOUNT',
});

const COUPON_TYPE_LIST = Object.freeze(Object.values(COUPON_TYPES));

module.exports = {
  COUPON_TYPES,
  COUPON_TYPE_LIST,
};
