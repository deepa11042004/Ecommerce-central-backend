const express = require('express');
const auth = require('../../../middleware/auth.middleware');
const validate = require('../../../middleware/validate.middleware');
const { resolveShoppingActor, requireCustomerRole } = require('../../../middleware/shoppingActor.middleware');
const controller = require('../controllers/wishlist.controller');
const {
  getWishlistSchema,
  addWishlistItemSchema,
  wishlistItemParamsSchema,
  mergeWishlistSchema,
} = require('../validators/wishlist.validator');

const router = express.Router();

/**
 * @swagger
 * /wishlist:
 *   get:
 *     tags: [Wishlist]
 *     summary: Get the current shopper wishlist
 *     description: Returns the wishlist for the authenticated customer or guest shopper.
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
 *     responses:
 *       200:
 *         description: Wishlist fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WishlistSuccessResponse'
 */
router.get('/', resolveShoppingActor(), validate(getWishlistSchema), controller.getWishlist);

/**
 * @swagger
 * /wishlist/items:
 *   post:
 *     tags: [Wishlist]
 *     summary: Add an item to the current wishlist
 *     description: Supports guest and authenticated customer flows. Duplicate items are ignored.
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WishlistItemRequest'
 *           examples:
 *             simpleProduct:
 *               value:
 *                 productId: 1
 *             variantProduct:
 *               value:
 *                 productId: 1
 *                 variantId: 10
 *     responses:
 *       200:
 *         description: Wishlist updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WishlistSuccessResponse'
 */
router.post('/items', resolveShoppingActor(), validate(addWishlistItemSchema), controller.addItem);

/**
 * @swagger
 * /wishlist/items/{id}:
 *   delete:
 *     tags: [Wishlist]
 *     summary: Remove a wishlist item
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Wishlist updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WishlistSuccessResponse'
 */
router.delete('/items/:id', resolveShoppingActor(), validate(wishlistItemParamsSchema), controller.removeItem);

/**
 * @swagger
 * /wishlist/merge:
 *   post:
 *     tags: [Wishlist]
 *     summary: Merge a guest wishlist into the authenticated customer wishlist
 *     description: Requires a customer JWT and merges guest items inside a transaction. Duplicate wishlist items are skipped.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
 *     responses:
 *       200:
 *         description: Wishlist merged successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WishlistMergeSuccessResponse'
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
router.post('/merge', auth(), requireCustomerRole(), validate(mergeWishlistSchema), controller.merge);

module.exports = router;