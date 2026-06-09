const { sendSuccess } = require('../../../core/http/response');
const asyncHandler = require('../../../utils/asyncHandler');
const ReviewModerationService = require('../services/reviewModeration.service');
const ReviewAnalyticsService = require('../services/reviewAnalytics.service');

const list = asyncHandler(async (req, res) => {
  const data = await ReviewModerationService.list(req.query);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Reviews fetched successfully',
    data,
  });
});

const getById = asyncHandler(async (req, res) => {
  const data = await ReviewModerationService.getById(req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Review fetched successfully',
    data,
  });
});

const approve = asyncHandler(async (req, res) => {
  const data = await ReviewModerationService.approve(req.params.id, req.user.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Review approved successfully',
    data: ReviewModerationService.serialize(data, { includeUser: true, includeProduct: true, includeMedia: true }),
  });
});

const reject = asyncHandler(async (req, res) => {
  const data = await ReviewModerationService.reject(req.params.id, req.user.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Review rejected successfully',
    data: ReviewModerationService.serialize(data, { includeUser: true, includeProduct: true, includeMedia: true }),
  });
});

const hide = asyncHandler(async (req, res) => {
  const data = await ReviewModerationService.hide(req.params.id, req.user.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Review hidden successfully',
    data: ReviewModerationService.serialize(data, { includeUser: true, includeProduct: true, includeMedia: true }),
  });
});

const reply = asyncHandler(async (req, res) => {
  const data = await ReviewModerationService.addReply(req.params.id, req.user.id, req.body.reply);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Reply added successfully',
    data: ReviewModerationService.serialize(data, { includeUser: true, includeProduct: true, includeMedia: true }),
  });
});

const remove = asyncHandler(async (req, res) => {
  await ReviewModerationService.deleteById(req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Review deleted successfully',
    data: {},
  });
});

const analytics = asyncHandler(async (req, res) => {
  const data = await ReviewAnalyticsService.getOverallMetrics();

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Analytics fetched successfully',
    data,
  });
});

const topRated = asyncHandler(async (req, res) => {
  const data = await ReviewAnalyticsService.getTopRatedProducts(req.query);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Top rated products fetched successfully',
    data,
  });
});

const lowestRated = asyncHandler(async (req, res) => {
  const data = await ReviewAnalyticsService.getLowestRatedProducts(req.query);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Lowest rated products fetched successfully',
    data,
  });
});

const mostReviewed = asyncHandler(async (req, res) => {
  const data = await ReviewAnalyticsService.getMostReviewedProducts(req.query);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Most reviewed products fetched successfully',
    data,
  });
});

module.exports = {
  list,
  getById,
  approve,
  reject,
  hide,
  reply,
  remove,
  analytics,
  topRated,
  lowestRated,
  mostReviewed,
};
