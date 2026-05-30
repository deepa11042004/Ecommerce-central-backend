const { Op } = require('sequelize');
const ApiError = require('../../../core/errors/ApiError');
const env = require('../../../config/env');
const { sequelize } = require('../../../database/models');
const { parsePagination, buildPaginationMeta } = require('../../../utils/pagination');
const { parseSort } = require('../../../utils/filtering');
const { normalizeCurrency, toMoney } = require('../../../utils/shopping');
const CartRepository = require('../../cart/repositories/cart.repository');
const CouponRepository = require('../repositories/coupon.repository');
const CouponValidationService = require('./couponValidation.service');

const DEFAULT_SORT = {
  sortBy: 'createdAt',
  sortOrder: 'DESC',
};

const ALLOWED_SORT_FIELDS = ['createdAt', 'expiresAt', 'startsAt', 'usedCount', 'code'];

class CouponService {
  static normalizeCode(code) {
    return CouponValidationService.normalizeCode(code);
  }

  static getDefaultCurrency() {
    return normalizeCurrency(env.DEFAULT_CURRENCY, 'USD');
  }

  static async create(payload, actor) {
    const code = this.normalizeCode(payload.code);

    if (!code) {
      throw ApiError.badRequest('Coupon code is required');
    }

    this.ensureDateRange(payload.startsAt, payload.expiresAt);

    const existing = await CouponRepository.findByCode(code);

    if (existing) {
      throw ApiError.badRequest('Coupon code already exists');
    }

    const coupon = await sequelize.transaction(async (transaction) => {
      const created = await CouponRepository.create(
        {
          code,
          title: payload.title,
          description: payload.description || null,
          couponType: payload.couponType,
          discountValue: toMoney(payload.discountValue, 0),
          minimumOrderAmount: toMoney(payload.minimumOrderAmount, 0),
          maximumDiscountAmount: payload.maximumDiscountAmount == null
            ? null
            : toMoney(payload.maximumDiscountAmount, 0),
          usageLimit: payload.usageLimit ?? null,
          perUserUsageLimit: payload.perUserUsageLimit ?? null,
          usedCount: 0,
          startsAt: payload.startsAt,
          expiresAt: payload.expiresAt,
          isActive: payload.isActive ?? true,
          stackable: payload.stackable ?? false,
          createdBy: actor?.id || null,
        },
        { transaction }
      );

      await CouponRepository.replaceProductRestrictions(created.id, payload.productIds || [], { transaction });
      await CouponRepository.replaceCategoryRestrictions(created.id, payload.categoryIds || [], { transaction });

      return CouponRepository.findById(created.id, {
        transaction,
        includeRestrictions: true,
        includeCreator: true,
      });
    });

    return this.serializeCoupon(coupon, { includeRestrictions: true, includeCreator: true });
  }

  static async update(id, payload) {
    const coupon = await CouponRepository.findById(id, { includeRestrictions: true });

    if (!coupon) {
      throw ApiError.notFound('Coupon not found');
    }

    const nextCode = payload.code ? this.normalizeCode(payload.code) : coupon.code;
    const startsAt = payload.startsAt || coupon.startsAt;
    const expiresAt = payload.expiresAt || coupon.expiresAt;

    this.ensureDateRange(startsAt, expiresAt);

    if (nextCode !== coupon.code) {
      const existing = await CouponRepository.findByCode(nextCode);

      if (existing && Number(existing.id) !== Number(coupon.id)) {
        throw ApiError.badRequest('Coupon code already exists');
      }
    }

    const updated = await sequelize.transaction(async (transaction) => {
      await CouponRepository.update(
        coupon,
        {
          code: nextCode,
          title: payload.title ?? coupon.title,
          description: payload.description !== undefined ? payload.description : coupon.description,
          couponType: payload.couponType ?? coupon.couponType,
          discountValue: payload.discountValue == null
            ? coupon.discountValue
            : toMoney(payload.discountValue, 0),
          minimumOrderAmount: payload.minimumOrderAmount == null
            ? coupon.minimumOrderAmount
            : toMoney(payload.minimumOrderAmount, 0),
          maximumDiscountAmount: payload.maximumDiscountAmount === undefined
            ? coupon.maximumDiscountAmount
            : payload.maximumDiscountAmount === null
              ? null
              : toMoney(payload.maximumDiscountAmount, 0),
          usageLimit: payload.usageLimit === undefined ? coupon.usageLimit : payload.usageLimit,
          perUserUsageLimit: payload.perUserUsageLimit === undefined
            ? coupon.perUserUsageLimit
            : payload.perUserUsageLimit,
          startsAt,
          expiresAt,
          isActive: payload.isActive === undefined ? coupon.isActive : payload.isActive,
          stackable: payload.stackable === undefined ? coupon.stackable : payload.stackable,
        },
        { transaction }
      );

      if (payload.productIds) {
        await CouponRepository.replaceProductRestrictions(coupon.id, payload.productIds, { transaction });
      }

      if (payload.categoryIds) {
        await CouponRepository.replaceCategoryRestrictions(coupon.id, payload.categoryIds, { transaction });
      }

      return CouponRepository.findById(coupon.id, {
        transaction,
        includeRestrictions: true,
        includeCreator: true,
      });
    });

    return this.serializeCoupon(updated, { includeRestrictions: true, includeCreator: true });
  }

  static async toggleActive(id, isActive) {
    const coupon = await CouponRepository.findById(id);

    if (!coupon) {
      throw ApiError.notFound('Coupon not found');
    }

    await CouponRepository.update(coupon, { isActive });

    const updated = await CouponRepository.findById(id, {
      includeRestrictions: true,
      includeCreator: true,
    });

    return this.serializeCoupon(updated, { includeRestrictions: true, includeCreator: true });
  }

  static async remove(id) {
    const coupon = await CouponRepository.findById(id);

    if (!coupon) {
      throw ApiError.notFound('Coupon not found');
    }

    await CouponRepository.delete(coupon);

    return {
      id: Number(id),
      deleted: true,
    };
  }

  static async getById(id, query = {}) {
    const coupon = await CouponRepository.findById(id, {
      includeRestrictions: true,
      includeCreator: true,
    });

    if (!coupon) {
      throw ApiError.notFound('Coupon not found');
    }

    const usageAnalytics = await CouponRepository.getUsageAnalytics(coupon.id, {
      from: query.from,
      to: query.to,
    });

    return {
      ...this.serializeCoupon(coupon, { includeRestrictions: true, includeCreator: true }),
      analytics: {
        totalUsages: usageAnalytics.totalUsages,
        uniqueUsers: usageAnalytics.uniqueUsers,
        totalDiscountAmount: toMoney(usageAnalytics.totalDiscount, 0),
      },
    };
  }

  static async list(query = {}) {
    const { page, limit, offset } = parsePagination(query);
    const { sortBy, sortOrder } = parseSort(query.sort, {
      allowedFields: ALLOWED_SORT_FIELDS,
      defaultSort: DEFAULT_SORT,
    });

    const where = this.buildListWhere(query);

    const { rows, count } = await CouponRepository.list({
      where,
      limit,
      offset,
      sortBy,
      sortOrder,
      includeRestrictions: true,
      includeCreator: true,
    });

    return {
      items: rows.map((coupon) => this.serializeCoupon(coupon, { includeRestrictions: true, includeCreator: true })),
      meta: buildPaginationMeta({
        page,
        limit,
        totalItems: count,
      }),
    };
  }

  static async applyCouponOnCart(actor, couponCode) {
    this.ensureActor(actor);

    const cart = actor.userId
      ? await CartRepository.findByUserId(actor.userId, { includeItems: true })
      : await CartRepository.findByGuestId(actor.guestId, { includeItems: true });

    if (!cart || !cart.items?.length) {
      throw ApiError.badRequest('Cart is empty');
    }

    const selections = cart.items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      unitPrice: toMoney(item.variant ? item.variant.price : item.product?.basePrice, toMoney(item.unitPrice, 0)),
    }));

    const validation = await CouponValidationService.validateForSelections({
      actor,
      couponCode,
      selections,
      currency: normalizeCurrency(cart.currency || this.getDefaultCurrency(), this.getDefaultCurrency()),
    });

    return {
      coupon: validation.couponView,
      pricing: validation.pricing,
    };
  }

  static async removeCouponFromCart(actor) {
    this.ensureActor(actor);

    const cart = actor.userId
      ? await CartRepository.findByUserId(actor.userId, { includeItems: true })
      : await CartRepository.findByGuestId(actor.guestId, { includeItems: true });

    if (!cart || !cart.items?.length) {
      throw ApiError.badRequest('Cart is empty');
    }

    const subtotal = toMoney(
      (cart.items || []).reduce((sum, item) => {
        const price = toMoney(item.variant ? item.variant.price : item.product?.basePrice, toMoney(item.unitPrice, 0));
        return sum + price * Number(item.quantity || 0);
      }, 0),
      0
    );

    return {
      coupon: null,
      pricing: {
        currency: normalizeCurrency(cart.currency || this.getDefaultCurrency(), this.getDefaultCurrency()),
        subtotal,
        eligibleSubtotal: subtotal,
        discount: 0,
        shipping: 0,
        tax: 0,
        total: subtotal,
      },
    };
  }

  static buildListWhere(query) {
    const where = {};

    if (query.search) {
      const likeSearch = `%${String(query.search).trim()}%`;

      where[Op.or] = [
        { code: { [Op.like]: likeSearch } },
        { title: { [Op.like]: likeSearch } },
      ];
    }

    if (query.couponType) {
      where.couponType = query.couponType;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const now = new Date();

    if (query.isExpired === true) {
      where.expiresAt = { [Op.lt]: now };
    }

    if (query.isExpired === false) {
      where.expiresAt = { [Op.gte]: now };
    }

    if (query.usageMin != null || query.usageMax != null) {
      where.usedCount = {};

      if (query.usageMin != null) {
        where.usedCount[Op.gte] = Number(query.usageMin);
      }

      if (query.usageMax != null) {
        where.usedCount[Op.lte] = Number(query.usageMax);
      }
    }

    if (query.startsFrom || query.startsTo) {
      where.startsAt = {};

      if (query.startsFrom) {
        where.startsAt[Op.gte] = query.startsFrom;
      }

      if (query.startsTo) {
        where.startsAt[Op.lte] = query.startsTo;
      }
    }

    if (query.expiresFrom || query.expiresTo) {
      where.expiresAt = where.expiresAt || {};

      if (query.expiresFrom) {
        where.expiresAt[Op.gte] = query.expiresFrom;
      }

      if (query.expiresTo) {
        where.expiresAt[Op.lte] = query.expiresTo;
      }
    }

    return where;
  }

  static ensureActor(actor) {
    if (!actor?.userId && !actor?.guestId) {
      throw ApiError.badRequest('Shopping actor context is required');
    }
  }

  static ensureDateRange(startsAt, expiresAt) {
    if (!startsAt || !expiresAt) {
      throw ApiError.badRequest('startsAt and expiresAt are required');
    }

    const startDate = new Date(startsAt);
    const endDate = new Date(expiresAt);

    if (Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf())) {
      throw ApiError.badRequest('Invalid startsAt or expiresAt date');
    }

    if (startDate >= endDate) {
      throw ApiError.badRequest('expiresAt must be greater than startsAt');
    }
  }

  static serializeCoupon(coupon, { includeRestrictions = false, includeCreator = false } = {}) {
    if (!coupon) {
      return null;
    }

    return {
      id: coupon.id,
      code: coupon.code,
      title: coupon.title,
      description: coupon.description,
      couponType: coupon.couponType,
      discountValue: toMoney(coupon.discountValue, 0),
      minimumOrderAmount: toMoney(coupon.minimumOrderAmount, 0),
      maximumDiscountAmount: coupon.maximumDiscountAmount == null ? null : toMoney(coupon.maximumDiscountAmount, 0),
      usageLimit: coupon.usageLimit,
      perUserUsageLimit: coupon.perUserUsageLimit,
      usedCount: Number(coupon.usedCount || 0),
      startsAt: coupon.startsAt,
      expiresAt: coupon.expiresAt,
      isActive: coupon.isActive,
      stackable: coupon.stackable,
      createdBy: coupon.createdBy,
      restrictedProductIds: includeRestrictions
        ? (coupon.productRestrictions || []).map((item) => Number(item.productId))
        : undefined,
      restrictedCategoryIds: includeRestrictions
        ? (coupon.categoryRestrictions || []).map((item) => Number(item.categoryId))
        : undefined,
      creator: includeCreator
        ? (coupon.creator
          ? {
              id: coupon.creator.id,
              fullName: coupon.creator.fullName,
              email: coupon.creator.email,
            }
          : null)
        : undefined,
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
    };
  }
}

module.exports = CouponService;
