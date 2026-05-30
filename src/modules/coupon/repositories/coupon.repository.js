const { Op, fn, col } = require('sequelize');
const {
  Coupon,
  CouponProduct,
  CouponCategory,
  CouponUsage,
  ProductCategory,
  User,
} = require('../../../database/models');

const COUPON_ATTRIBUTES = [
  'id',
  'code',
  'title',
  'description',
  'couponType',
  'discountValue',
  'minimumOrderAmount',
  'maximumDiscountAmount',
  'usageLimit',
  'perUserUsageLimit',
  'usedCount',
  'startsAt',
  'expiresAt',
  'isActive',
  'stackable',
  'createdBy',
  'createdAt',
  'updatedAt',
];

class CouponRepository {
  static buildInclude({ includeRestrictions = false, includeCreator = false } = {}) {
    const include = [];

    if (includeRestrictions) {
      include.push({
        model: CouponProduct,
        as: 'productRestrictions',
        attributes: ['id', 'couponId', 'productId'],
      });

      include.push({
        model: CouponCategory,
        as: 'categoryRestrictions',
        attributes: ['id', 'couponId', 'categoryId'],
      });
    }

    if (includeCreator) {
      include.push({
        model: User,
        as: 'creator',
        attributes: ['id', 'fullName', 'email'],
      });
    }

    return include;
  }

  static buildQueryOptions({ transaction, lock, includeRestrictions = false, includeCreator = false } = {}) {
    const options = {
      transaction,
      attributes: COUPON_ATTRIBUTES,
    };

    const include = this.buildInclude({ includeRestrictions, includeCreator });

    if (include.length) {
      options.include = include;
    }

    if (lock) {
      options.lock = lock;
    }

    return options;
  }

  static findById(id, options = {}) {
    return Coupon.findByPk(id, this.buildQueryOptions(options));
  }

  static findByCode(code, options = {}) {
    return Coupon.findOne({
      where: { code },
      ...this.buildQueryOptions(options),
    });
  }

  static create(payload, { transaction } = {}) {
    return Coupon.create(payload, { transaction });
  }

  static update(coupon, payload, { transaction } = {}) {
    return coupon.update(payload, { transaction });
  }

  static delete(coupon, { transaction } = {}) {
    return coupon.destroy({ transaction });
  }

  static async replaceProductRestrictions(couponId, productIds = [], { transaction } = {}) {
    await CouponProduct.destroy({
      where: { couponId },
      transaction,
    });

    if (!productIds.length) {
      return;
    }

    await CouponProduct.bulkCreate(
      productIds.map((productId) => ({
        couponId,
        productId,
      })),
      { transaction }
    );
  }

  static async replaceCategoryRestrictions(couponId, categoryIds = [], { transaction } = {}) {
    await CouponCategory.destroy({
      where: { couponId },
      transaction,
    });

    if (!categoryIds.length) {
      return;
    }

    await CouponCategory.bulkCreate(
      categoryIds.map((categoryId) => ({
        couponId,
        categoryId,
      })),
      { transaction }
    );
  }

  static countUsage(couponId, { transaction } = {}) {
    return CouponUsage.count({
      where: { couponId },
      transaction,
    });
  }

  static countUsageByUser(couponId, userId, { transaction } = {}) {
    return CouponUsage.count({
      where: {
        couponId,
        userId,
      },
      transaction,
    });
  }

  static createUsage(payload, { transaction } = {}) {
    return CouponUsage.create(payload, { transaction });
  }

  static incrementUsedCount(coupon, by = 1, { transaction } = {}) {
    return coupon.increment({ usedCount: by }, { transaction });
  }

  static async list({
    where = {},
    limit,
    offset,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
    includeRestrictions = false,
    includeCreator = false,
  } = {}) {
    return Coupon.findAndCountAll({
      where,
      limit,
      offset,
      distinct: true,
      order: [[sortBy, sortOrder]],
      ...this.buildQueryOptions({ includeRestrictions, includeCreator }),
    });
  }

  static findProductCategoryRows(productIds, { transaction } = {}) {
    if (!productIds?.length) {
      return [];
    }

    return ProductCategory.findAll({
      where: {
        productId: {
          [Op.in]: productIds,
        },
      },
      attributes: ['productId', 'categoryId'],
      transaction,
    });
  }

  static async getUsageAnalytics(couponId, { from, to, transaction } = {}) {
    const where = { couponId };

    if (from || to) {
      where.usedAt = {};

      if (from) {
        where.usedAt[Op.gte] = from;
      }

      if (to) {
        where.usedAt[Op.lte] = to;
      }
    }

    const [totals, uniqueUsers] = await Promise.all([
      CouponUsage.findOne({
        where,
        attributes: [
          [fn('COUNT', col('id')), 'totalUsages'],
          [fn('COALESCE', fn('SUM', col('discount_amount')), 0), 'totalDiscount'],
        ],
        raw: true,
        transaction,
      }),
      CouponUsage.count({
        where: {
          ...where,
          userId: {
            [Op.ne]: null,
          },
        },
        distinct: true,
        col: 'user_id',
        transaction,
      }),
    ]);

    return {
      totalUsages: Number(totals?.totalUsages || 0),
      totalDiscount: Number(totals?.totalDiscount || 0),
      uniqueUsers,
    };
  }
}

module.exports = CouponRepository;
