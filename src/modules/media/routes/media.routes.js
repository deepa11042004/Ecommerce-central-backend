const express = require('express');
const controller = require('../controllers/media.controller');
const auth = require('../../../middleware/auth.middleware');
const can = require('../../../middleware/permission.middleware');
const validate = require('../../../middleware/validate.middleware');
const { PERMISSIONS } = require('../../../constants/permissions');
const { singleImageUpload } = require('../middleware/media-upload.middleware');
const { uploadSectionSchema, entityMediaSchema } = require('../validators/media.validator');

const router = express.Router();

/**
 * @swagger
 * /media/upload/{section}:
 *   post:
 *     tags: [Media]
 *     summary: Upload an image file and return a relative path
 *     description: |
 *       Access: developer, super_admin, admin.
 *       Stores file in backend local storage by section and month bucket.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *           enum: [products, variants, categories, brands, users, temp]
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
 *               baseName:
 *                 type: string
 *                 example: macbook-pro
 *     responses:
 *       201:
 *         description: File uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: File uploaded
 *                 data:
 *                   type: object
 *                   properties:
 *                     path:
 *                       type: string
 *                       example: uploads/products/2026-05/macbook-pro-1748123123-ab12.webp
 */
router.post(
  '/upload/:section',
  auth(),
  can(PERMISSIONS.PRODUCT_UPDATE),
  singleImageUpload('file'),
  validate(uploadSectionSchema),
  controller.upload
);

/**
 * @swagger
 * /media/{section}/{entityId}/replace:
 *   put:
 *     tags: [Media]
 *     summary: Replace image for product/variant/category/brand/user entity
 *     description: |
 *       Access: developer, super_admin, admin.
 *       Uploads new file, updates DB path, then safely deletes previous file.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *           enum: [products, variants, categories, brands, users]
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: integer
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
 *               baseName:
 *                 type: string
 *     responses:
 *       200:
 *         description: File replaced
 */
router.put(
  '/:section/:entityId/replace',
  auth(),
  can(PERMISSIONS.PRODUCT_UPDATE),
  singleImageUpload('file'),
  validate(entityMediaSchema),
  controller.replaceEntityMedia
);

/**
 * @swagger
 * /media/{section}/{entityId}:
 *   delete:
 *     tags: [Media]
 *     summary: Delete image for product/variant/category/brand/user entity
 *     description: |
 *       Access: developer, super_admin, admin.
 *       Clears DB path and safely deletes local file if present.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *           enum: [products, variants, categories, brands, users]
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: File deleted
 */
router.delete(
  '/:section/:entityId',
  auth(),
  can(PERMISSIONS.PRODUCT_UPDATE),
  validate(entityMediaSchema),
  controller.removeEntityMedia
);

/**
 * @swagger
 * /media/users/me/avatar:
 *   put:
 *     tags: [Media]
 *     summary: Replace authenticated user avatar
 *     description: "Access: authenticated users."
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
 *               baseName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Avatar updated
 */
router.put('/users/me/avatar', auth(), singleImageUpload('file'), controller.replaceOwnAvatar);

/**
 * @swagger
 * /media/users/me/avatar:
 *   delete:
 *     tags: [Media]
 *     summary: Delete authenticated user avatar
 *     description: "Access: authenticated users."
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Avatar removed
 */
router.delete('/users/me/avatar', auth(), controller.removeOwnAvatar);

module.exports = router;
