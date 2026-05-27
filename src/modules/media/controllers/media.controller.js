const { sendSuccess } = require('../../../core/http/response');
const asyncHandler = require('../../../utils/asyncHandler');
const MediaService = require('../services/media.service');

const upload = asyncHandler(async (req, res) => {
  const uploaded = await MediaService.uploadFile({
    section: req.params.section,
    file: req.file,
    baseName: req.body?.baseName,
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: 'File uploaded',
    data: {
      path: uploaded.path,
    },
  });
});

const replaceEntityMedia = asyncHandler(async (req, res) => {
  const result = await MediaService.assignEntityFile({
    section: req.params.section,
    entityId: req.params.entityId,
    file: req.file,
    baseName: req.body?.baseName,
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'File replaced successfully',
    data: {
      path: result.path,
    },
  });
});

const removeEntityMedia = asyncHandler(async (req, res) => {
  await MediaService.removeEntityFile({
    section: req.params.section,
    entityId: req.params.entityId,
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'File deleted successfully',
    data: {},
  });
});

const replaceOwnAvatar = asyncHandler(async (req, res) => {
  const result = await MediaService.assignEntityFile({
    section: 'users',
    entityId: req.user.id,
    file: req.file,
    baseName: req.body?.baseName || req.user.fullName || 'avatar',
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Avatar updated successfully',
    data: {
      path: result.path,
    },
  });
});

const removeOwnAvatar = asyncHandler(async (req, res) => {
  await MediaService.removeEntityFile({
    section: 'users',
    entityId: req.user.id,
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Avatar removed successfully',
    data: {},
  });
});

module.exports = {
  upload,
  replaceEntityMedia,
  removeEntityMedia,
  replaceOwnAvatar,
  removeOwnAvatar,
};
