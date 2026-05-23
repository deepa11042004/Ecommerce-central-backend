const { sendSuccess } = require('../../../core/http/response');
const ApiError = require('../../../core/errors/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const ProductService = require('../services/product.service');

const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('Image file is required');
  }

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Image uploaded successfully',
    data: {
      url: `/uploads/products/${req.file.filename}`,
    },
  });
});

const create = asyncHandler(async (req, res) => {
  const product = await ProductService.create(req.body);

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Product created successfully',
    data: product,
  });
});

const generateVariants = asyncHandler(async (req, res) => {
  const preview = await ProductService.generateVariantsFromAttributes(req.body || {});

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Variant combinations generated successfully',
    data: preview,
  });
});

const previewVariantCombinations = asyncHandler(async (req, res) => {
  const preview = await ProductService.previewVariantCombinations(req.params.id, req.body || {});

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Variant combinations generated successfully',
    data: preview,
  });
});

const saveVariants = asyncHandler(async (req, res) => {
  const product = await ProductService.saveVariants(req.params.id, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Product variants saved successfully',
    data: product,
  });
});

const resolveVariant = asyncHandler(async (req, res) => {
  const variant = await ProductService.resolveVariantByAttributes(req.params.id, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Variant resolved successfully',
    data: variant,
  });
});

const findAll = asyncHandler(async (req, res) => {
  const result = await ProductService.list(req.query);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Products fetched successfully',
    data: result,
  });
});

const search = asyncHandler(async (req, res) => {
  const result = await ProductService.search(req.query);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Products fetched successfully',
    data: result,
  });
});

const findOne = asyncHandler(async (req, res) => {
  const product = await ProductService.getById(req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Product fetched successfully',
    data: product,
  });
});

const update = asyncHandler(async (req, res) => {
  const product = await ProductService.update(req.params.id, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Product updated successfully',
    data: product,
  });
});

const remove = asyncHandler(async (req, res) => {
  await ProductService.delete(req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Product deleted successfully',
    data: {},
  });
});

module.exports = {
  uploadImage,
  create,
  generateVariants,
  previewVariantCombinations,
  saveVariants,
  resolveVariant,
  findAll,
  search,
  findOne,
  update,
  remove,
};
