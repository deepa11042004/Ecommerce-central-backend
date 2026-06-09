const { sendSuccess } = require('../../../core/http/response');
const asyncHandler = require('../../../utils/asyncHandler');
const ReviewService = require('../services/review.service');

const create = asyncHandler(async (req, res) => {
  const data = await ReviewService.create(req.user.id, req.body, req.file || null);

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Review submitted successfully',
    data,
  });
});

const update = asyncHandler(async (req, res) => {
  const data = await ReviewService.update(req.user.id, req.params.id, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Review updated successfully',
    data,
  });
});

const remove = asyncHandler(async (req, res) => {
  await ReviewService.deleteOwn(req.user.id, req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Review deleted successfully',
    data: {},
  });
});

const getById = asyncHandler(async (req, res) => {
  const data = await ReviewService.getById(req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Review fetched successfully',
    data,
  });
});

const listForProduct = asyncHandler(async (req, res) => {
  const data = await ReviewService.listForProduct(req.params.id, req.query);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Reviews fetched successfully',
    data,
  });
});

const uploadMedia = asyncHandler(async (req, res) => {
  const data = await ReviewService.uploadReviewMedia(req.user.id, req.file);

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Media uploaded successfully',
    data,
  });
});

const addHelpfulVote = asyncHandler(async (req, res) => {
  const data = await ReviewService.addHelpfulVote(req.user.id, req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Helpful vote recorded',
    data,
  });
});

const removeHelpfulVote = asyncHandler(async (req, res) => {
  const data = await ReviewService.removeHelpfulVote(req.user.id, req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Helpful vote removed',
    data,
  });
});

module.exports = {
  create,
  update,
  remove,
  getById,
  listForProduct,
  uploadMedia,
  addHelpfulVote,
  removeHelpfulVote,
};
