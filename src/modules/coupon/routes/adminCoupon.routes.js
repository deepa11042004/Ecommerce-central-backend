const express = require('express');
const auth = require('../../../middleware/auth.middleware');
const can = require('../../../middleware/permission.middleware');
const validate = require('../../../middleware/validate.middleware');
const { PERMISSIONS } = require('../../../constants/permissions');
const controller = require('../controllers/adminCoupon.controller');
const {
  createCouponSchema,
  updateCouponSchema,
  toggleCouponSchema,
  listCouponSchema,
  couponIdSchema,
} = require('../validators/coupon.validator');

const router = express.Router();

/**
 * @swagger
 * /admin/coupons:
 *   post:
 *     tags: [Coupons]
 *     summary: Create coupon (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CouponCreateRequest'
 *     responses:
 *       201:
 *         description: Coupon created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CouponSuccessResponse'
 *       400:
 *         description: Validation or business rule failure
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', auth(), can(PERMISSIONS.COUPON_CREATE), validate(createCouponSchema), controller.create);

/**
 * @swagger
 * /admin/coupons/{id}:
 *   put:
 *     tags: [Coupons]
 *     summary: Update coupon (admin)
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
 *             $ref: '#/components/schemas/CouponUpdateRequest'
 *     responses:
 *       200:
 *         description: Coupon updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CouponSuccessResponse'
 */
router.put('/:id', auth(), can(PERMISSIONS.COUPON_UPDATE), validate(updateCouponSchema), controller.update);

/**
 * @swagger
 * /admin/coupons/{id}/toggle:
 *   patch:
 *     tags: [Coupons]
 *     summary: Activate or deactivate coupon (admin)
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
 *             $ref: '#/components/schemas/CouponToggleRequest'
 *     responses:
 *       200:
 *         description: Coupon status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CouponSuccessResponse'
 */
router.patch('/:id/toggle', auth(), can(PERMISSIONS.COUPON_UPDATE), validate(toggleCouponSchema), controller.toggle);

/**
 * @swagger
 * /admin/coupons:
 *   get:
 *     tags: [Coupons]
 *     summary: List coupons with admin filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: isExpired
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: couponType
 *         schema:
 *           type: string
 *           enum: [PERCENTAGE, FIXED_AMOUNT]
 *       - in: query
 *         name: usageMin
 *         schema:
 *           type: integer
 *       - in: query
 *         name: usageMax
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startsFrom
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: startsTo
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: expiresFrom
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: expiresTo
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: usedCount_desc
 *     responses:
 *       200:
 *         description: Coupon list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CouponListSuccessResponse'
 */
router.get('/', auth(), can(PERMISSIONS.COUPON_READ), validate(listCouponSchema), controller.list);

/**
 * @swagger
 * /admin/coupons/{id}:
 *   get:
 *     tags: [Coupons]
 *     summary: Get coupon details with usage analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Coupon detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CouponDetailSuccessResponse'
 */
router.get('/:id', auth(), can(PERMISSIONS.COUPON_READ), validate(couponIdSchema), controller.getById);

/**
 * @swagger
 * /admin/coupons/{id}:
 *   delete:
 *     tags: [Coupons]
 *     summary: Delete coupon (admin)
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
 *         description: Coupon deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CouponDeleteSuccessResponse'
 */
router.delete('/:id', auth(), can(PERMISSIONS.COUPON_DELETE), validate(couponIdSchema), controller.remove);

module.exports = router;
