const { sendSuccess } = require('../../../core/http/response');
const asyncHandler = require('../../../utils/asyncHandler');
const HeroBannerService = require('../services/heroBanner.service');

const listPublic = asyncHandler(async (req, res) => {
  const data = await HeroBannerService.listPublic();

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Hero banners fetched successfully',
    data,
  });
});

const listAdmin = asyncHandler(async (req, res) => {
  const data = await HeroBannerService.listAdmin();

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Hero banners fetched successfully',
    data,
  });
});

const create = asyncHandler(async (req, res) => {
  const data = await HeroBannerService.create(req.body);

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Hero banner created successfully',
    data,
  });
});

const update = asyncHandler(async (req, res) => {
  const data = await HeroBannerService.update(req.params.id, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Hero banner updated successfully',
    data,
  });
});

const remove = asyncHandler(async (req, res) => {
  const data = await HeroBannerService.remove(req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Hero banner deleted successfully',
    data,
  });
});

module.exports = {
  listPublic,
  listAdmin,
  create,
  update,
  remove,
};
