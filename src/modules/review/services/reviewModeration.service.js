const ApiError = require('../../../core/errors/ApiError');
const { sequelize } = require('../../../database/models');
const { REVIEW_STATUS } = require('../../../constants/review');
const ReviewRepository = require('../repositories/review.repository');
const ReviewAggregationService = require('./reviewAggregation.service');
const FeatureToggleService = require('../../rbac/services/featureToggle.service');
const { REVIEW_FEATURE_KEYS } = require('../../../constants/review');
const { parsePagination, buildPaginationMeta } = require('../../../utils/pagination');
const { parseSort } = require('../../../utils/filtering');

const ALLOWED_SORT_FIELDS = ['createdAt', 'rating', 'helpfulCount'];
const DEFAULT_SORT = { sortBy: 'createdAt', sortOrder: 'DESC' };

class ReviewModerationService {
  static async approve(id, adminUserId) {
    const review = await ReviewRepository.findById(id, { includeMedia: true });

    if (!review) {
      throw ApiError.notFound('Review not found');
    }

    if (review.status === REVIEW_STATUS.APPROVED) {
      throw ApiError.badRequest('Review is already approved');
    }

    await ReviewRepository.update(review, { status: REVIEW_STATUS.APPROVED });

    ReviewAggregationService.recalculateAsync(review.productId);

    return ReviewRepository.findById(id, { includeUser: true, includeProduct: true, includeMedia: true });
  }

  static async reject(id, adminUserId) {
    const review = await ReviewRepository.findById(id);

    if (!review) {
      throw ApiError.notFound('Review not found');
    }

    if (review.status === REVIEW_STATUS.REJECTED) {
      throw ApiError.badRequest('Review is already rejected');
    }

    const wasApproved = review.status === REVIEW_STATUS.APPROVED;

    await ReviewRepository.update(review, { status: REVIEW_STATUS.REJECTED });

    if (wasApproved) {
      ReviewAggregationService.recalculateAsync(review.productId);
    }

    return ReviewRepository.findById(id, { includeUser: true, includeProduct: true, includeMedia: true });
  }

  static async hide(id, adminUserId) {
    const review = await ReviewRepository.findById(id);

    if (!review) {
      throw ApiError.notFound('Review not found');
    }

    if (review.status === REVIEW_STATUS.HIDDEN) {
      throw ApiError.badRequest('Review is already hidden');
    }

    const wasApproved = review.status === REVIEW_STATUS.APPROVED;

    await ReviewRepository.update(review, { status: REVIEW_STATUS.HIDDEN });

    if (wasApproved) {
      ReviewAggregationService.recalculateAsync(review.productId);
    }

    return ReviewRepository.findById(id, { includeUser: true, includeProduct: true, includeMedia: true });
  }

  static async addReply(id, adminUserId, replyText) {
    const isEnabled = await FeatureToggleService.isSuperAdminPermissionEnabled(
      REVIEW_FEATURE_KEYS.ADMIN_REVIEW_REPLIES_ENABLED
    );

    if (!isEnabled) {
      throw ApiError.forbidden('Admin review replies are disabled');
    }

    const review = await ReviewRepository.findById(id);

    if (!review) {
      throw ApiError.notFound('Review not found');
    }

    await ReviewRepository.update(review, {
      adminReply: replyText,
      repliedBy: adminUserId,
      repliedAt: new Date(),
    });

    return ReviewRepository.findById(id, { includeUser: true, includeProduct: true, includeMedia: true });
  }

  static async deleteById(id) {
    const review = await ReviewRepository.findById(id);

    if (!review) {
      throw ApiError.notFound('Review not found');
    }

    const { productId, status } = review;

    await sequelize.transaction(async (transaction) => {
      await ReviewRepository.destroyMediaByReviewId(id, { transaction });
      await ReviewRepository.destroy(review, { transaction });
    });

    if (status === REVIEW_STATUS.APPROVED) {
      ReviewAggregationService.recalculateAsync(productId);
    }
  }

  static async list(query = {}) {
    const { page, limit, offset } = parsePagination(query);
    const { sortBy, sortOrder } = parseSort(query.sort, {
      allowedFields: ALLOWED_SORT_FIELDS,
      defaultSort: DEFAULT_SORT,
    });

    const { rows, count } = await ReviewRepository.listAdmin({
      status: query.status,
      rating: query.rating,
      productId: query.productId,
      userId: query.userId,
      verified: query.verified,
      withMedia: query.withMedia,
      dateFrom: query.from,
      dateTo: query.to,
      helpfulMin: query.helpfulMin,
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    return {
      items: rows.map((r) => this.serialize(r, { includeUser: true, includeProduct: true, includeMedia: true })),
      meta: buildPaginationMeta({ page, limit, totalItems: count }),
    };
  }

  static async getById(id) {
    const review = await ReviewRepository.findById(id, {
      includeUser: true,
      includeProduct: true,
      includeMedia: true,
    });

    if (!review) {
      throw ApiError.notFound('Review not found');
    }

    return this.serialize(review, { includeUser: true, includeProduct: true, includeMedia: true });
  }

  static serialize(review, { includeUser = false, includeProduct = false, includeMedia = false } = {}) {
    if (!review) {
      return null;
    }

    return {
      id: review.id,
      productId: review.productId,
      userId: review.userId,
      orderId: review.orderId,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      isVerifiedPurchase: Boolean(review.isVerifiedPurchase),
      status: review.status,
      helpfulCount: review.helpfulCount,
      adminReply: review.adminReply || null,
      repliedBy: review.repliedBy || null,
      repliedAt: review.repliedAt || null,
      user: includeUser && review.user
        ? { id: review.user.id, fullName: review.user.fullName, email: review.user.email }
        : undefined,
      product: includeProduct && review.product
        ? { id: review.product.id, title: review.product.title, slug: review.product.slug, thumbnail: review.product.thumbnail }
        : undefined,
      media: includeMedia
        ? (review.media || []).map((m) => ({
            id: m.id,
            mediaId: m.mediaId,
            url: m.file?.url || null,
            filename: m.file?.filename || null,
            mimeType: m.file?.mimeType || null,
            size: m.file?.size || null,
          }))
        : undefined,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}

module.exports = ReviewModerationService;
