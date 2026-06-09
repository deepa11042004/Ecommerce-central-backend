const { Op } = require('sequelize');
const {
  Review,
  ReviewMedia,
  ReviewVote,
  MediaFile,
  User,
  Product,
} = require('../../../database/models');

const USER_ATTRIBUTES = ['id', 'fullName', 'email'];

const PRODUCT_ATTRIBUTES = ['id', 'title', 'slug', 'thumbnail'];

const MEDIA_FILE_ATTRIBUTES = ['id', 'url', 'filename', 'mimeType', 'size'];

const REVIEW_ATTRIBUTES = [
  'id',
  'productId',
  'userId',
  'orderId',
  'rating',
  'title',
  'comment',
  'isVerifiedPurchase',
  'status',
  'helpfulCount',
  'adminReply',
  'repliedBy',
  'repliedAt',
  'createdAt',
  'updatedAt',
];

class ReviewRepository {
  static buildMediaInclude() {
    return {
      model: ReviewMedia,
      as: 'media',
      attributes: ['id', 'mediaId'],
      include: [
        {
          model: MediaFile,
          as: 'file',
          attributes: MEDIA_FILE_ATTRIBUTES,
        },
      ],
    };
  }

  static buildInclude({ includeUser = false, includeProduct = false, includeMedia = false } = {}) {
    const include = [];

    if (includeUser) {
      include.push({
        model: User,
        as: 'user',
        attributes: USER_ATTRIBUTES,
      });
    }

    if (includeProduct) {
      include.push({
        model: Product,
        as: 'product',
        attributes: PRODUCT_ATTRIBUTES,
      });
    }

    if (includeMedia) {
      include.push(this.buildMediaInclude());
    }

    return include;
  }

  static buildQueryOptions({ transaction, lock, includeUser = false, includeProduct = false, includeMedia = false } = {}) {
    const options = { transaction, attributes: REVIEW_ATTRIBUTES };
    const include = this.buildInclude({ includeUser, includeProduct, includeMedia });

    if (include.length) {
      options.include = include;
    }

    if (lock) {
      options.lock = lock;
    }

    return options;
  }

  static create(payload, { transaction } = {}) {
    return Review.create(payload, { transaction });
  }

  static update(review, payload, { transaction } = {}) {
    return review.update(payload, { transaction });
  }

  static destroy(review, { transaction } = {}) {
    return review.destroy({ transaction });
  }

  static findById(id, options = {}) {
    return Review.findByPk(id, this.buildQueryOptions(options));
  }

  static findByIdAndUserId(id, userId, options = {}) {
    return Review.findOne({
      where: { id, userId },
      ...this.buildQueryOptions(options),
    });
  }

  static findByProductAndUser(productId, userId, { transaction } = {}) {
    return Review.findOne({
      where: { productId, userId },
      transaction,
    });
  }

  static findByProductUserAndOrder(productId, userId, orderId, { transaction } = {}) {
    return Review.findOne({
      where: { productId, userId, orderId },
      transaction,
    });
  }

  static listPublicForProduct({
    productId,
    status = 'APPROVED',
    rating,
    verified,
    withMedia,
    limit,
    offset,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
  } = {}) {
    const where = { productId, status };

    if (rating) {
      where.rating = Number(rating);
    }

    if (verified === true || verified === 'true') {
      where.isVerifiedPurchase = true;
    }

    const include = [
      {
        model: User,
        as: 'user',
        attributes: USER_ATTRIBUTES,
      },
    ];

    const mediaInclude = this.buildMediaInclude();

    if (withMedia === true || withMedia === 'true') {
      mediaInclude.required = true;
    }

    include.push(mediaInclude);

    return Review.findAndCountAll({
      where,
      include,
      attributes: REVIEW_ATTRIBUTES,
      limit,
      offset,
      distinct: true,
      order: [[sortBy, sortOrder]],
    });
  }

  static listAdmin({
    status,
    rating,
    productId,
    userId,
    verified,
    withMedia,
    dateFrom,
    dateTo,
    helpfulMin,
    limit,
    offset,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
  } = {}) {
    const where = {};

    if (status) {
      where.status = status;
    }

    if (rating) {
      where.rating = Number(rating);
    }

    if (productId) {
      where.productId = productId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (verified === true || verified === 'true') {
      where.isVerifiedPurchase = true;
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

    if (helpfulMin !== undefined && helpfulMin !== null) {
      where.helpfulCount = { [Op.gte]: Number(helpfulMin) };
    }

    const include = [
      {
        model: User,
        as: 'user',
        attributes: USER_ATTRIBUTES,
      },
      {
        model: Product,
        as: 'product',
        attributes: PRODUCT_ATTRIBUTES,
      },
    ];

    const mediaInclude = this.buildMediaInclude();

    if (withMedia === true || withMedia === 'true') {
      mediaInclude.required = true;
    }

    include.push(mediaInclude);

    return Review.findAndCountAll({
      where,
      include,
      attributes: REVIEW_ATTRIBUTES,
      limit,
      offset,
      distinct: true,
      order: [[sortBy, sortOrder]],
    });
  }

  static createMedia(reviewId, mediaIds, { transaction } = {}) {
    const rows = mediaIds.map((mediaId) => ({ reviewId, mediaId }));
    return ReviewMedia.bulkCreate(rows, { transaction, ignoreDuplicates: true });
  }

  static destroyMediaByReviewId(reviewId, { transaction } = {}) {
    return ReviewMedia.destroy({ where: { reviewId }, transaction });
  }

  static findMediaByReviewAndIds(reviewId, mediaIds) {
    return ReviewMedia.findAll({
      where: { reviewId, mediaId: { [Op.in]: mediaIds } },
    });
  }

  static countByProductAndStatus(productId, status) {
    return Review.count({ where: { productId, status } });
  }
}

module.exports = ReviewRepository;
