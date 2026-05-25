const { sendSuccess } = require('../../../core/http/response');
const asyncHandler = require('../../../utils/asyncHandler');
const BrandService = require('../services/brand.service');

const list = asyncHandler(async (req, res) => {
  const brands = await BrandService.list(req.query);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Brands fetched successfully',
    data: brands,
  });
});

module.exports = {
  list,
};
