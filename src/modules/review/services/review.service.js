const { Op } = require('sequelize');
const { sequelize, Order, OrderItem, Product, MediaFile } = require('../../../database/models');
const ApiError = require('../../../core/errors/ApiError');
const { parsePagination, buildPaginationMeta } = require('../../../utils/pagination');
const { parseSort } = require('../../../utils/filtering');
const {
  REVIEW_STATUS,
  REVIEW_CREATION_RULE,
  REVIEW_CREATION_RULE_ENV,
  REVIEW_FEATURE_KEYS,
} = require('../../../constants/review');
const ReviewRepository = require('../repositories/review.repository');
const ReviewVoteRepository = require('../repositories/reviewVote.repository');
const ReviewAggregationService = require('./reviewAggregation.service');
const MediaService = require('../../media/services/media.service');
const FeatureToggleService = require('../../rbac/services/featureToggle.service');
const { SECTION_KEYS } = require('../../media/constants/media.constants');

const ALLOWED_SORT_FIELDS = ['createdAt', 'rating', 'helpfulCount'];
const DEFAULT_SORT = { sortBy: 'createdAt', sortOrder: 'DESC' };
const MAX_MEDIA_PER_REVIEW = 5;

class ReviewService {
  static async assertFeatureEnabled(key) {
    const isEnabled = await FeatureToggleService.isSuperAdminPermissionEnabled(key);

    if (!isEnabled) {
      throw ApiError.forbidden(`Feature is disabled: ${key}`);
    }
  }

  static async resolveVerifiedPurchase(userId, productId) {
    const deliveredOrder = await Order.findOne({
      where: { userId, orderStatus: 'DELIVERED' },
      include: [
        {
          model: OrderItem,
          as: 'items',
          where: { productId },
          required: true,
          attributes: ['id', 'orderId'],
        },
      ],
      attributes: ['id'],
    });

    return {
      isVerifiedPurchase: Boolean(deliveredOrder),
      orderId: deliveredOrder ? deliveredOrder.id : null,
    };
  }

  static async assertCanCreate(userId, productId, orderId) {
    const rule = REVIEW_CREATION_RULE_ENV;

    if (rule === REVIEW_CREATION_RULE.ONE_REVIEW_PER_PRODUCT) {
      const existing = await ReviewRepository.findByProductAndUser(productId, userId);

      if (existing) {
        throw ApiError.badRequest('You have already reviewed this product');
      }
    } else if (rule === REVIEW_CREATION_RULE.ONE_REVIEW_PER_ORDER_ITEM) {
      if (!orderId) {
        throw ApiError.badRequest('Order ID is required for this review creation rule');
      }

      const existing = await ReviewRepository.findByProductUserAndOrder(productId, userId, orderId);

      if (existing) {
        throw ApiError.badRequest('You have already reviewed this product for this order');
      }
    }
  }

  static async validateMediaIds(mediaIds, userId) {
    if (!mediaIds || mediaIds.length === 0) {
      return [];
    }

    if (mediaIds.length > MAX_MEDIA_PER_REVIEW) {
      throw ApiError.badRequest(`Maximum ${MAX_MEDIA_PER_REVIEW} media files allowed per review`);
    }

    const files = await MediaFile.findAll({
      where: {
        id: { [Op.in]: mediaIds },
        section: SECTION_KEYS.REVIEW,
        uploadedBy: userId,
      },
      attributes: ['id'],
    });

    if (files.length !== mediaIds.length) {
      throw ApiError.badRequest('One or more media files are invalid or not owned by you');
    }

    return mediaIds;
  }

  static async create(userId, payload, file = null) {
    await this.assertFeatureEnabled(REVIEW_FEATURE_KEYS.REVIEWS_ENABLED);

    const product = await Product.findByPk(payload.productId, { attributes: ['id'] });

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    const { isVerifiedPurchase, orderId } = await this.resolveVerifiedPurchase(userId, payload.productId);

    const verifiedOnlyEnabled = await FeatureToggleService.isSuperAdminPermissionEnabled(
      REVIEW_FEATURE_KEYS.VERIFIED_REVIEWS_ONLY
    );

    if (verifiedOnlyEnabled && !isVerifiedPurchase) {
      throw ApiError.forbidden('Only customers with a delivered order can review this product');
    }

    await this.assertCanCreate(userId, payload.productId, orderId);

    const moderationEnabled = await FeatureToggleService.isSuperAdminPermissionEnabled(
      REVIEW_FEATURE_KEYS.REVIEW_MODERATION_ENABLED
    );

    const initialStatus = moderationEnabled ? REVIEW_STATUS.PENDING : REVIEW_STATUS.APPROVED;

    let validatedMediaIds = [];

    if (payload.mediaIds && payload.mediaIds.length > 0) {
      const mediaEnabled = await FeatureToggleService.isSuperAdminPermissionEnabled(
        REVIEW_FEATURE_KEYS.REVIEW_MEDIA_ENABLED
      );

      if (mediaEnabled) {
        validatedMediaIds = await this.validateMediaIds(payload.mediaIds, userId);
      }
    }

    // Handle direct file upload for review media
    if (file) {
      const mediaEnabled = await FeatureToggleService.isSuperAdminPermissionEnabled(
        REVIEW_FEATURE_KEYS.REVIEW_MEDIA_ENABLED
      );

      if (mediaEnabled) {
        const uploaded = await MediaService.uploadFile({
          section: SECTION_KEYS.REVIEW,
          file,
          baseName: `review-${userId}`,
        });

        const mediaFile = await MediaFile.create({
          section: SECTION_KEYS.REVIEW,
          url: uploaded.path,
          filename: uploaded.filename,
          originalName: file.originalname,
          size: uploaded.size,
          mimeType: uploaded.mimeType,
          uploadedBy: userId,
        });

        validatedMediaIds.push(mediaFile.id);
      }
    }

    const review = await sequelize.transaction(async (transaction) => {
      const created = await ReviewRepository.create(
        {
          productId: payload.productId,
          userId,
          orderId: orderId || null,
          rating: payload.rating,
          title: payload.title || null,
          comment: payload.comment || null,
          isVerifiedPurchase,
          status: initialStatus,
        },
        { transaction }
      );

      if (validatedMediaIds.length > 0) {
        await ReviewRepository.createMedia(created.id, validatedMediaIds, { transaction });
      }

      return created;
    });

    if (review.status === REVIEW_STATUS.APPROVED) {
      ReviewAggregationService.recalculateAsync(review.productId);
    }

    const populated = await ReviewRepository.findById(review.id, {
      includeUser: true,
      includeMedia: true,
    });

    return this.serialize(populated, { includeUser: true, includeMedia: true });
  }

  static async update(userId, reviewId, payload) {
    const review = await ReviewRepository.findByIdAndUserId(reviewId, userId, { includeMedia: true });

    if (!review) {
      throw ApiError.notFound('Review not found');
    }

    if (![REVIEW_STATUS.PENDING, REVIEW_STATUS.APPROVED].includes(review.status)) {
      throw ApiError.badRequest('Only pending or approved reviews can be updated');
    }

    const wasApproved = review.status === REVIEW_STATUS.APPROVED;

    const updatePayload = {};

    if (payload.rating !== undefined) {
      updatePayload.rating = payload.rating;
    }

    if (payload.title !== undefined) {
      updatePayload.title = payload.title;
    }

    if (payload.comment !== undefined) {
      updatePayload.comment = payload.comment;
    }

    await ReviewRepository.update(review, updatePayload);

    if (wasApproved && updatePayload.rating) {
      ReviewAggregationService.recalculateAsync(review.productId);
    }

    const populated = await ReviewRepository.findById(reviewId, {
      includeUser: true,
      includeMedia: true,
    });

    return this.serialize(populated, { includeUser: true, includeMedia: true });
  }

  static async deleteOwn(userId, reviewId) {
    const review = await ReviewRepository.findByIdAndUserId(reviewId, userId);

    if (!review) {
      throw ApiError.notFound('Review not found');
    }

    const { productId, status } = review;

    await sequelize.transaction(async (transaction) => {
      await ReviewRepository.destroyMediaByReviewId(reviewId, { transaction });
      await ReviewRepository.destroy(review, { transaction });
    });

    if (status === REVIEW_STATUS.APPROVED) {
      ReviewAggregationService.recalculateAsync(productId);
    }
  }

  static async getById(id) {
    const review = await ReviewRepository.findById(id, {
      includeUser: true,
      includeMedia: true,
    });

    if (!review || review.status !== REVIEW_STATUS.APPROVED) {
      throw ApiError.notFound('Review not found');
    }

    return this.serialize(review, { includeUser: true, includeMedia: true });
  }

  static async listForProduct(productId, query = {}) {
    await this.assertFeatureEnabled(REVIEW_FEATURE_KEYS.REVIEWS_ENABLED);

    const product = await Product.findByPk(productId, { attributes: ['id'] });

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    const { page, limit, offset } = parsePagination(query);
    const { sortBy, sortOrder } = parseSort(query.sort, {
      allowedFields: ALLOWED_SORT_FIELDS,
      defaultSort: DEFAULT_SORT,
    });

    const { rows, count } = await ReviewRepository.listPublicForProduct({
      productId,
      rating: query.rating,
      verified: query.verified,
      withMedia: query.withMedia,
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    return {
      items: rows.map((r) => this.serialize(r, { includeUser: true, includeMedia: true })),
      meta: buildPaginationMeta({ page, limit, totalItems: count }),
    };
  }

  static async uploadReviewMedia(userId, file) {
    await this.assertFeatureEnabled(REVIEW_FEATURE_KEYS.REVIEW_MEDIA_ENABLED);

    const uploaded = await MediaService.uploadFile({
      section: SECTION_KEYS.REVIEW,
      file,
      baseName: `review-${userId}`,
    });

    const mediaFile = await MediaFile.create({
      section: SECTION_KEYS.REVIEW,
      url: uploaded.path,
      filename: uploaded.filename,
      originalName: file.originalname,
      size: uploaded.size,
      mimeType: uploaded.mimeType,
      uploadedBy: userId,
    });

    return {
      mediaId: mediaFile.id,
      url: mediaFile.url,
      filename: mediaFile.filename,
      mimeType: mediaFile.mimeType,
      size: mediaFile.size,
    };
  }

  static async addHelpfulVote(userId, reviewId) {
    await this.assertFeatureEnabled(REVIEW_FEATURE_KEYS.REVIEW_HELPFUL_VOTES_ENABLED);

    const review = await ReviewRepository.findById(reviewId);

    if (!review || review.status !== REVIEW_STATUS.APPROVED) {
      throw ApiError.notFound('Review not found');
    }

    if (review.userId === userId) {
      throw ApiError.badRequest('You cannot vote on your own review');
    }

    const existing = await ReviewVoteRepository.findByReviewAndUser(reviewId, userId);

    if (existing) {
      throw ApiError.badRequest('You have already voted on this review');
    }

    await sequelize.transaction(async (transaction) => {
      await ReviewVoteRepository.create(reviewId, userId, { transaction });
      await ReviewRepository.update(
        review,
        { helpfulCount: review.helpfulCount + 1 },
        { transaction }
      );
    });

    return { reviewId, helpfulCount: review.helpfulCount + 1 };
  }

  static async removeHelpfulVote(userId, reviewId) {
    await this.assertFeatureEnabled(REVIEW_FEATURE_KEYS.REVIEW_HELPFUL_VOTES_ENABLED);

    const review = await ReviewRepository.findById(reviewId);

    if (!review) {
      throw ApiError.notFound('Review not found');
    }

    const vote = await ReviewVoteRepository.findByReviewAndUser(reviewId, userId);

    if (!vote) {
      throw ApiError.badRequest('You have not voted on this review');
    }

    const newCount = Math.max(0, review.helpfulCount - 1);

    await sequelize.transaction(async (transaction) => {
      await ReviewVoteRepository.destroy(vote, { transaction });
      await ReviewRepository.update(review, { helpfulCount: newCount }, { transaction });
    });

    return { reviewId, helpfulCount: newCount };
  }

  static serialize(review, { includeUser = false, includeMedia = false } = {}) {
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
      repliedAt: review.repliedAt || null,
      user: includeUser && review.user
        ? { id: review.user.id, fullName: review.user.fullName }
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

module.exports = ReviewService;
