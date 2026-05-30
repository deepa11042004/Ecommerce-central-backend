const express = require('express');
const auth = require('../../../middleware/auth.middleware');
const validate = require('../../../middleware/validate.middleware');
const { resolveShoppingActor, requireCustomerRole } = require('../../../middleware/shoppingActor.middleware');
const controller = require('../controllers/cart.controller');
const {
  getCartSchema,
  addCartItemSchema,
  updateCartItemSchema,
  cartItemParamsSchema,
  mergeCartSchema,
  applyCouponSchema,
  removeCouponSchema,
} = require('../validators/cart.validator');

const router = express.Router();

/**
 * @swagger
 * /cart:
 *   get:
 *     tags: [Cart]
 *     summary: Get the current shopper cart
 *     description: |
 *       Returns the cart for the authenticated customer or the current guest shopper.
 *       Guests can identify themselves with the guestId cookie or the x-guest-id header.
 *       The response includes price drift and stock drift flags for every line item.
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
 *     responses:
 *       200:
 *         description: Cart fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartSuccessResponse'
 */
router.get('/', resolveShoppingActor(), validate(getCartSchema), controller.getCart);

/**
 * @swagger
 * /cart/items:
 *   post:
 *     tags: [Cart]
 *     summary: Add an item to the current cart
 *     description: |
 *       Supports guest and authenticated customer flows.
 *       Duplicate items merge quantity and refresh the stored unit price snapshot to the latest catalog price.
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CartItemRequest'
 *           examples:
 *             simpleProduct:
 *               value:
 *                 productId: 1
 *                 quantity: 2
 *             variantProduct:
 *               value:
 *                 productId: 1
 *                 variantId: 10
 *                 quantity: 2
 *     responses:
 *       200:
 *         description: Cart updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartSuccessResponse'
 *       400:
 *         description: Validation, stock, or catalog state error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/items', resolveShoppingActor(), validate(addCartItemSchema), controller.addItem);

/**
 * @swagger
 * /cart/items/{id}:
 *   patch:
 *     tags: [Cart]
 *     summary: Update cart item quantity
 *     description: Revalidates product status, variant status, stock, and current catalog price before saving the new quantity.
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 3
 *     responses:
 *       200:
 *         description: Cart updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartSuccessResponse'
 */
router.patch('/items/:id', resolveShoppingActor(), validate(updateCartItemSchema), controller.updateItem);

/**
 * @swagger
 * /cart/items/{id}:
 *   delete:
 *     tags: [Cart]
 *     summary: Remove a cart item
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cart updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartSuccessResponse'
 */
router.delete('/items/:id', resolveShoppingActor(), validate(cartItemParamsSchema), controller.removeItem);

/**
 * @swagger
 * /cart/clear:
 *   delete:
 *     tags: [Cart]
 *     summary: Clear the current cart
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartSuccessResponse'
 */
router.delete('/clear', resolveShoppingActor(), validate(getCartSchema), controller.clear);

/**
 * @swagger
 * /cart/apply-coupon:
 *   post:
 *     tags: [Cart, Coupons]
 *     summary: Validate a coupon against current cart pricing
 *     description: |
 *       Validates coupon server-side and recalculates pricing with current catalog prices.
 *       This endpoint does not persist coupon usage or lock totals for checkout.
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CartApplyCouponRequest'
 *     responses:
 *       200:
 *         description: Coupon validated and pricing recalculated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartApplyCouponSuccessResponse'
 *       400:
 *         description: Coupon invalid for current cart state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/apply-coupon', resolveShoppingActor(), validate(applyCouponSchema), controller.applyCoupon);

/**
 * @swagger
 * /cart/remove-coupon:
 *   delete:
 *     tags: [Cart, Coupons]
 *     summary: Remove temporary coupon effect from cart pricing
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
 *     responses:
 *       200:
 *         description: Pricing recalculated without coupon discount
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartRemoveCouponSuccessResponse'
 */
router.delete('/remove-coupon', resolveShoppingActor(), validate(removeCouponSchema), controller.removeCoupon);

/**
 * @swagger
 * /cart/merge:
 *   post:
 *     tags: [Cart]
 *     summary: Merge a guest cart into the authenticated customer cart
 *     description: |
 *       Requires a customer JWT.
 *       The guest cart is merged into the user cart inside a database transaction and then deleted.
 *       Quantity is preserved even when the merged line later resolves to an out-of-stock state; the response flags those issues.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
 *     responses:
 *       200:
 *         description: Cart merged successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartMergeSuccessResponse'
 *       400:
 *         description: Guest id missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/merge', auth(), requireCustomerRole(), validate(mergeCartSchema), controller.merge);

module.exports = router;