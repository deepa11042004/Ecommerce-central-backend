const { sendSuccess } = require('../../../core/http/response');
const asyncHandler = require('../../../utils/asyncHandler');
const { readGuestId } = require('../../../utils/guestIdentity');
const CartService = require('../services/cart.service');

const getCart = asyncHandler(async (req, res) => {
  const data = await CartService.getCart(req.actor);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Cart fetched successfully',
    data,
  });
});

const addItem = asyncHandler(async (req, res) => {
  const data = await CartService.addItem(req.actor, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Cart updated successfully',
    data,
  });
});

const updateItem = asyncHandler(async (req, res) => {
  const data = await CartService.updateItem(req.actor, req.params.id, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Cart updated successfully',
    data,
  });
});

const removeItem = asyncHandler(async (req, res) => {
  const data = await CartService.removeItem(req.actor, req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Cart updated successfully',
    data,
  });
});

const clear = asyncHandler(async (req, res) => {
  const data = await CartService.clear(req.actor);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Cart cleared successfully',
    data,
  });
});

const merge = asyncHandler(async (req, res) => {
  const data = await CartService.mergeGuestCartIntoUser({
    userId: req.user.id,
    guestId: readGuestId(req),
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Cart merged successfully',
    data,
  });
});

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clear,
  merge,
};