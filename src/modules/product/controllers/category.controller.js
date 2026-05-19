const { sendSuccess } = require('../../../core/http/response');
const asyncHandler = require('../../../utils/asyncHandler');
const CategoryService = require('../services/category.service');

const getTree = asyncHandler(async (req, res) => {
  const tree = await CategoryService.getTree(req.query);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Category tree fetched successfully',
    data: tree,
  });
});

module.exports = {
  getTree,
};
