const express = require('express');
const auth = require('../../../middleware/auth.middleware');
const can = require('../../../middleware/permission.middleware');
const validate = require('../../../middleware/validate.middleware');
const { PERMISSIONS } = require('../../../constants/permissions');
const { singleImageUpload } = require('../../media/middleware/media-upload.middleware');
const controller = require('../controllers/review.controller');
const {
  createReviewSchema,
  updateReviewSchema,
  reviewParamsSchema,
  productParamsSchema,
  listProductReviewsSchema,
} = require('../validators/review.validator');

const router = express.Router();

/**
 * @swagger
 * /reviews/media/upload:
 *   post:
 *     tags: [Reviews]
 *     summary: Upload a review media file
 *     description: |
 *       Upload an image file for a review. Returns a mediaId to include in POST /reviews.
 *       Access: authenticated customers.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image file (jpg, jpeg, png, webp — max 5MB)
 *     responses:
 *       201:
 *         description: Media uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewMediaUploadResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post(
  '/media/upload',
  auth(),
  can(PERMISSIONS.REVIEW_CREATE),
  singleImageUpload('file'),
  controller.uploadMedia
);

/**
 * @swagger
 * /reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Submit a product review
 *     description: |
 *       Creates a review for a product. Only customers with a delivered order can submit
 *       verified reviews. The initial status depends on the `review_moderation_enabled`
 *       feature toggle (PENDING if enabled, APPROVED if disabled).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateReviewRequest'
 *           example:
 *             productId: 42
 *             rating: 5
 *             title: "Excellent product!"
 *             comment: "Works exactly as described. Very happy with the purchase."
 *             mediaIds: [1, 2]
 *     responses:
 *       201:
 *         description: Review submitted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewSuccessResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/', auth(), can(PERMISSIONS.REVIEW_CREATE), validate(createReviewSchema), controller.create);

/**
 * @swagger
 * /products/{id}/reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: List approved reviews for a product
 *     description: |
 *       Returns paginated, publicly visible (APPROVED) reviews for a product.
 *       Supports filtering by rating, verified purchase, media presence, and sorting.
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
 *         description: Show only reviews that have media
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [createdAt_desc, createdAt_asc, rating_desc, rating_asc, helpfulCount_desc, helpfulCount_asc]
 *         description: Sort order
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
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/product/:id',
  validate(listProductReviewsSchema),
  controller.listForProduct
);

/**
 * @swagger
 * /reviews/{id}:
 *   get:
 *     tags: [Reviews]
 *     summary: Get a single approved review
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Review fetched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewSuccessResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', validate(reviewParamsSchema), controller.getById);

/**
 * @swagger
 * /reviews/{id}:
 *   patch:
 *     tags: [Reviews]
 *     summary: Update own review
 *     description: |
 *       Customers can update their own pending or approved reviews.
 *       At least one field (rating, title, or comment) must be provided.
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *             $ref: '#/components/schemas/UpdateReviewRequest'
 *           example:
 *             rating: 4
 *             comment: "Updated my review after using the product longer."
 *     responses:
 *       200:
 *         description: Review updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewSuccessResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id', auth(), can(PERMISSIONS.REVIEW_UPDATE), validate(updateReviewSchema), controller.update);

/**
 * @swagger
 * /reviews/{id}:
 *   delete:
 *     tags: [Reviews]
 *     summary: Delete own review
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Review deleted
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', auth(), can(PERMISSIONS.REVIEW_DELETE), validate(reviewParamsSchema), controller.remove);

/**
 * @swagger
 * /reviews/{id}/helpful:
 *   post:
 *     tags: [Reviews]
 *     summary: Mark a review as helpful
 *     description: |
 *       Adds a helpful vote to an approved review. One vote per user per review.
 *       Controlled by `review_helpful_votes_enabled` feature toggle.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Vote recorded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HelpfulVoteResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/:id/helpful', auth(), can(PERMISSIONS.REVIEW_READ), validate(reviewParamsSchema), controller.addHelpfulVote);

/**
 * @swagger
 * /reviews/{id}/helpful:
 *   delete:
 *     tags: [Reviews]
 *     summary: Remove helpful vote from a review
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Vote removed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HelpfulVoteResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id/helpful', auth(), can(PERMISSIONS.REVIEW_READ), validate(reviewParamsSchema), controller.removeHelpfulVote);

module.exports = router;
