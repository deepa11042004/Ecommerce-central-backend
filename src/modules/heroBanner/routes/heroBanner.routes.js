const express = require('express');
const auth = require('../../../middleware/auth.middleware');
const can = require('../../../middleware/permission.middleware');
const validate = require('../../../middleware/validate.middleware');
const { PERMISSIONS } = require('../../../constants/permissions');
const controller = require('../controllers/heroBanner.controller');
const {
  heroBannerIdSchema,
  createHeroBannerSchema,
  updateHeroBannerSchema,
} = require('../validators/heroBanner.validator');

const router = express.Router();

/**
 * @swagger
 * /hero-banners:
 *   get:
 *     tags: [Hero Banners]
 *     summary: List active hero banners
 *     description: Public list of active hero banners for the homepage slider.
 *     responses:
 *       200:
 *         description: Hero banners fetched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HeroBannerListSuccessResponse'
 */
router.get('/', controller.listPublic);

/**
 * @swagger
 * /hero-banners/admin:
 *   get:
 *     tags: [Hero Banners]
 *     summary: List all hero banners (admin)
 *     description: |
 *       Access: developer, super_admin, admin.
 *       Required permission: product.update
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hero banners fetched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HeroBannerListSuccessResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/admin', auth(), can(PERMISSIONS.PRODUCT_UPDATE), controller.listAdmin);

/**
 * @swagger
 * /hero-banners:
 *   post:
 *     tags: [Hero Banners]
 *     summary: Create a hero banner
 *     description: |
 *       Access: developer, super_admin, admin.
 *       Required permission: product.update
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HeroBannerCreateRequest'
 *     responses:
 *       201:
 *         description: Hero banner created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HeroBannerSuccessResponse'
 *       400:
 *         description: Validation error
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
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', auth(), can(PERMISSIONS.PRODUCT_UPDATE), validate(createHeroBannerSchema), controller.create);

/**
 * @swagger
 * /hero-banners/{id}:
 *   patch:
 *     tags: [Hero Banners]
 *     summary: Update a hero banner
 *     description: |
 *       Access: developer, super_admin, admin.
 *       Required permission: product.update
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
 *             $ref: '#/components/schemas/HeroBannerUpdateRequest'
 *     responses:
 *       200:
 *         description: Hero banner updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HeroBannerSuccessResponse'
 *       400:
 *         description: Validation error
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
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id', auth(), can(PERMISSIONS.PRODUCT_UPDATE), validate(updateHeroBannerSchema), controller.update);

/**
 * @swagger
 * /hero-banners/{id}:
 *   delete:
 *     tags: [Hero Banners]
 *     summary: Delete a hero banner
 *     description: |
 *       Access: developer, super_admin, admin.
 *       Required permission: product.update
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
 *         description: Hero banner deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HeroBannerDeleteSuccessResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', auth(), can(PERMISSIONS.PRODUCT_UPDATE), validate(heroBannerIdSchema), controller.remove);

module.exports = router;
