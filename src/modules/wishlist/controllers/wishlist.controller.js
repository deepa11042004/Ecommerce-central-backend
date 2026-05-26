const { sendSuccess } = require('../../../core/http/response');
const asyncHandler = require('../../../utils/asyncHandler');
const { readGuestId } = require('../../../utils/guestIdentity');
const WishlistService = require('../services/wishlist.service');

const getWishlist = asyncHandler(async (req, res) => {
  const data = await WishlistService.getWishlist(req.actor);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Wishlist fetched successfully',
    data,
  });
});

const addItem = asyncHandler(async (req, res) => {
  const data = await WishlistService.addItem(req.actor, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Wishlist updated successfully',
    data,
  });
});

const removeItem = asyncHandler(async (req, res) => {
  const data = await WishlistService.removeItem(req.actor, req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Wishlist updated successfully',
    data,
  });
});

const merge = asyncHandler(async (req, res) => {
  const data = await WishlistService.mergeGuestWishlistIntoUser({
    userId: req.user.id,
    guestId: readGuestId(req),
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Wishlist merged successfully',
    data,
  });
});

module.exports = {
  getWishlist,
  addItem,
  removeItem,
  merge,
};