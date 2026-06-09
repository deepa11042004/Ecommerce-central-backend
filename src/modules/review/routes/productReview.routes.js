const express = require('express');
const validate = require('../../../middleware/validate.middleware');
const controller = require('../controllers/review.controller');
const { listProductReviewsSchema } = require('../validators/review.validator');

const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * /products/{id}/reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: List approved reviews for a product
 *     description: |
 *       Returns paginated, publicly visible (APPROVED) reviews for a product.
 *       Supports filtering by rating, verified purchase, media presence, and sorting.
 *       Controlled by `reviews_enabled` feature toggle.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filter by star rating
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *         description: Show only verified purchase reviews
 *       - in: query
 *         name: withMedia
 *         schema:
 *           type: boolean
 *         description: Show only reviews that have images
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [createdAt_desc, createdAt_asc, rating_desc, rating_asc, helpfulCount_desc, helpfulCount_asc]
 *         description: Sort order (default createdAt_desc)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Reviews list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewListSuccessResponse'
 *             example:
 *               success: true
 *               message: Reviews fetched successfully
 *               data:
 *                 items:
 *                   - id: 1
 *                     productId: 42
 *                     userId: 18
 *                     rating: 5
 *                     title: "Excellent product!"
 *                     comment: "Works exactly as described."
 *                     isVerifiedPurchase: true
 *                     status: APPROVED
 *                     helpfulCount: 12
 *                     adminReply: "Thank you for your feedback!"
 *                     user:
 *                       id: 18
 *                       fullName: "Jane Doe"
 *                     media: []
 *                 meta:
 *                   page: 1
 *                   limit: 10
 *                   totalItems: 48
 *                   totalPages: 5
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/', validate(listProductReviewsSchema), controller.listForProduct);

module.exports = router;
