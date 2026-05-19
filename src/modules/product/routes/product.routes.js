const express = require('express');
const controller = require('../controllers/product.controller');
const auth = require('../../../middleware/auth.middleware');
const can = require('../../../middleware/permission.middleware');
const validate = require('../../../middleware/validate.middleware');
const { PERMISSIONS } = require('../../../constants/permissions');
const {
  createProductSchema,
  updateProductSchema,
  getProductByIdSchema,
  listProductsSchema,
} = require('../validators/product.validator');

const router = express.Router();

/**
 * @swagger
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: Fetch products with pagination, search, filtering, sorting
 *     description: |
 *       Access: developer, super_admin, admin, user.
 *       Supports query params: page, limit, search, status, sort.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         example: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         example: iphone
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         example: active
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Supported values include price_desc, price_asc, createdAt_desc, stock_asc
 *         example: price_desc
 *     responses:
 *       200:
 *         description: Product list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductListSuccessResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', auth(), can(PERMISSIONS.PRODUCT_READ), validate(listProductsSchema), controller.findAll);

/**
 * @swagger
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: Create product
 *     description: "Access: developer, super_admin, admin."
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductCreateRequest'
 *     responses:
 *       201:
 *         description: Product created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductSuccessResponse'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', auth(), can(PERMISSIONS.PRODUCT_CREATE), validate(createProductSchema), controller.create);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Fetch product by id
 *     description: "Access: developer, super_admin, admin, user."
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
 *         description: Product detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductSuccessResponse'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', auth(), can(PERMISSIONS.PRODUCT_READ), validate(getProductByIdSchema), controller.findOne);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Update product
 *     description: "Access: developer, super_admin, admin."
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
 *             $ref: '#/components/schemas/ProductUpdateRequest'
 *     responses:
 *       200:
 *         description: Product updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductSuccessResponse'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', auth(), can(PERMISSIONS.PRODUCT_UPDATE), validate(updateProductSchema), controller.update);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Delete product
 *     description: "Access: developer, super_admin, admin."
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
 *         description: Product deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeleteSuccessResponse'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', auth(), can(PERMISSIONS.PRODUCT_DELETE), validate(getProductByIdSchema), controller.remove);

module.exports = router;
