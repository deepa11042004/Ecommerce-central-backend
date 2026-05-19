const { sendSuccess } = require('../../../core/http/response');
const asyncHandler = require('../../../utils/asyncHandler');
const ProductService = require('../services/product.service');

const create = asyncHandler(async (req, res) => {
  const product = await ProductService.create(req.body);

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Product created successfully',
    data: product,
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
  create,
  findAll,
  search,
  findOne,
  update,
  remove,
};
