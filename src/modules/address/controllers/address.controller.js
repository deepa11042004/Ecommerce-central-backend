const { sendSuccess } = require('../../../core/http/response');
const asyncHandler = require('../../../utils/asyncHandler');
const AddressService = require('../services/address.service');

const list = asyncHandler(async (req, res) => {
  const data = await AddressService.list(req.actor);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Addresses fetched successfully',
    data,
  });
});

const getById = asyncHandler(async (req, res) => {
  const data = await AddressService.getById(req.actor, req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Address fetched successfully',
    data,
  });
});

const create = asyncHandler(async (req, res) => {
  const data = await AddressService.create(req.actor, req.body);

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Address created successfully',
    data,
  });
});

const update = asyncHandler(async (req, res) => {
  const data = await AddressService.update(req.actor, req.params.id, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Address updated successfully',
    data,
  });
});

const remove = asyncHandler(async (req, res) => {
  const data = await AddressService.remove(req.actor, req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Address deleted successfully',
    data,
  });
});

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
