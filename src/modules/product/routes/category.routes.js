const express = require('express');
const controller = require('../controllers/category.controller');
const auth = require('../../../middleware/auth.middleware');
const can = require('../../../middleware/permission.middleware');
const validate = require('../../../middleware/validate.middleware');
const { PERMISSIONS } = require('../../../constants/permissions');
const { categoryTreeSchema, categoryProductsSchema } = require('../validators/product.validator');

const router = express.Router();

/**
 * @swagger
 * /categories/tree:
 *   get:
 *     tags: [Categories]
 *     summary: Fetch hierarchical category tree
 *     description: |
 *       Access: developer, super_admin, admin, customer.
 *       Returns parent-child category structure with unlimited depth.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         required: false
 *         description: Optional category status filter.
 *     responses:
 *       200:
 *         description: Category tree fetched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryTreeSuccessResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/tree', auth(), can(PERMISSIONS.PRODUCT_READ), validate(categoryTreeSchema), controller.getTree);

/**
 * @swagger
 * /categories/{slug}/products:
 *   get:
 *     tags: [Categories, Products]
 *     summary: Fetch products by category slug
 *     description: |
 *       Category storefront listing endpoint with full catalog filtering support.
 *       Supports includeChildren for nested category discovery.
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: laptops
 *       - in: query
 *         name: includeChildren
 *         schema:
 *           type: boolean
 *         example: true
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: attribute
 *         schema:
 *           oneOf:
 *             - type: string
 *             - type: array
 *               items:
 *                 type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [relevance, price_asc, price_desc, newest, oldest, name_asc, name_desc, discount_desc]
 *     responses:
 *       200:
 *         description: Category products fetched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductListSuccessResponse'
 */
router.get('/:slug/products', validate(categoryProductsSchema), controller.getProductsBySlug);

module.exports = router;
