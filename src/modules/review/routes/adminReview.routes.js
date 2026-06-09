const express = require('express');
const auth = require('../../../middleware/auth.middleware');
const can = require('../../../middleware/permission.middleware');
const validate = require('../../../middleware/validate.middleware');
const { PERMISSIONS } = require('../../../constants/permissions');
const controller = require('../controllers/adminReview.controller');
const {
  adminListReviewsSchema,
  reviewParamsSchema,
  adminReplySchema,
  analyticsQuerySchema,
} = require('../validators/review.validator');

const router = express.Router();

/**
 * @swagger
 * /admin/reviews:
 *   get:
 *     tags: [Admin Reviews]
 *     summary: List all reviews with admin filters
 *     description: |
 *       Returns paginated reviews across all statuses with rich filtering.
 *       Access: admin, super_admin, developer.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, HIDDEN]
 *         description: Filter by review status
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filter by star rating
 *       - in: query
 *         name: productId
 *         schema:
 *           type: integer
 *         description: Filter by product ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *         description: Filter verified purchase reviews
 *       - in: query
 *         name: withMedia
 *         schema:
 *           type: boolean
 *         description: Filter reviews that have media
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Created from date (ISO 8601)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Created to date (ISO 8601)
 *       - in: query
 *         name: helpfulMin
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Minimum helpful vote count
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [createdAt_desc, createdAt_asc, rating_desc, rating_asc, helpfulCount_desc, helpfulCount_asc]
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
 *               $ref: '#/components/schemas/AdminReviewListSuccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', auth(), can(PERMISSIONS.REVIEW_MODERATE), validate(adminListReviewsSchema), controller.list);

/**
 * @swagger
 * /admin/reviews/analytics:
 *   get:
 *     tags: [Admin Reviews]
 *     summary: Get overall review analytics metrics
 *     description: |
 *       Returns system-wide review metrics including totals, rating distribution,
 *       verified review counts, and status breakdown.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics metrics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewAnalyticsResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/analytics', auth(), can(PERMISSIONS.REVIEW_MODERATE), controller.analytics);

/**
 * @swagger
 * /admin/reviews/analytics/top-rated:
 *   get:
 *     tags: [Admin Reviews]
 *     summary: Get top rated products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Top rated products
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductRatingListResponse'
 */
router.get('/analytics/top-rated', auth(), can(PERMISSIONS.REVIEW_MODERATE), validate(analyticsQuerySchema), controller.topRated);

/**
 * @swagger
 * /admin/reviews/analytics/lowest-rated:
 *   get:
 *     tags: [Admin Reviews]
 *     summary: Get lowest rated products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Lowest rated products
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductRatingListResponse'
 */
router.get('/analytics/lowest-rated', auth(), can(PERMISSIONS.REVIEW_MODERATE), validate(analyticsQuerySchema), controller.lowestRated);

/**
 * @swagger
 * /admin/reviews/analytics/most-reviewed:
 *   get:
 *     tags: [Admin Reviews]
 *     summary: Get most reviewed products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Most reviewed products
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductRatingListResponse'
 */
router.get('/analytics/most-reviewed', auth(), can(PERMISSIONS.REVIEW_MODERATE), validate(analyticsQuerySchema), controller.mostReviewed);

/**
 * @swagger
 * /admin/reviews/{id}:
 *   get:
 *     tags: [Admin Reviews]
 *     summary: Get review details (admin view)
 *     description: Returns review with full data regardless of status.
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
 *         description: Review fetched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminReviewSuccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', auth(), can(PERMISSIONS.REVIEW_MODERATE), validate(reviewParamsSchema), controller.getById);

/**
 * @swagger
 * /admin/reviews/{id}/approve:
 *   patch:
 *     tags: [Admin Reviews]
 *     summary: Approve a review
 *     description: |
 *       Sets review status to APPROVED and triggers rating aggregation recalculation.
 *       Access: admin, super_admin, developer.
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
 *         description: Review approved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminReviewSuccessResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id/approve', auth(), can(PERMISSIONS.REVIEW_MODERATE), validate(reviewParamsSchema), controller.approve);

/**
 * @swagger
 * /admin/reviews/{id}/reject:
 *   patch:
 *     tags: [Admin Reviews]
 *     summary: Reject a review
 *     description: |
 *       Sets review status to REJECTED. Triggers aggregation recalculation
 *       if the review was previously APPROVED.
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
 *         description: Review rejected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminReviewSuccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id/reject', auth(), can(PERMISSIONS.REVIEW_MODERATE), validate(reviewParamsSchema), controller.reject);

/**
 * @swagger
 * /admin/reviews/{id}/hide:
 *   patch:
 *     tags: [Admin Reviews]
 *     summary: Hide a review
 *     description: |
 *       Sets review status to HIDDEN (soft removal from public). Triggers aggregation
 *       recalculation if the review was previously APPROVED.
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
 *         description: Review hidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminReviewSuccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id/hide', auth(), can(PERMISSIONS.REVIEW_MODERATE), validate(reviewParamsSchema), controller.hide);

/**
 * @swagger
 * /admin/reviews/{id}/reply:
 *   patch:
 *     tags: [Admin Reviews]
 *     summary: Add an admin reply to a review
 *     description: |
 *       Posts an admin/store response to a review. The reply is shown alongside the
 *       review on the storefront. Controlled by `admin_review_replies_enabled` feature toggle.
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
 *             type: object
 *             required: [reply]
 *             properties:
 *               reply:
 *                 type: string
 *                 maxLength: 2000
 *                 example: "Thank you for your feedback! We're glad you enjoyed the product."
 *     responses:
 *       200:
 *         description: Reply added
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminReviewSuccessResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id/reply', auth(), can(PERMISSIONS.REVIEW_REPLY), validate(adminReplySchema), controller.reply);

/**
 * @swagger
 * /admin/reviews/{id}:
 *   delete:
 *     tags: [Admin Reviews]
 *     summary: Permanently delete a review
 *     description: |
 *       Hard-deletes a review and its associated media links. Triggers aggregation
 *       recalculation if the review was APPROVED.
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
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', auth(), can(PERMISSIONS.REVIEW_MODERATE), validate(reviewParamsSchema), controller.remove);

module.exports = router;
