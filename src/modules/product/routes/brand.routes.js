const express = require('express');
const controller = require('../controllers/brand.controller');
const auth = require('../../../middleware/auth.middleware');
const can = require('../../../middleware/permission.middleware');
const validate = require('../../../middleware/validate.middleware');
const { PERMISSIONS } = require('../../../constants/permissions');
const { listBrandsSchema, brandProductsSchema } = require('../validators/product.validator');

const router = express.Router();

router.get('/', auth(), can(PERMISSIONS.PRODUCT_READ), validate(listBrandsSchema), controller.list);

/**
 * @swagger
 * /brands/{slug}/products:
 *   get:
 *     tags: [Products]
 *     summary: Fetch products by brand slug
 *     description: Brand storefront listing endpoint with full catalog query support.
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: dell
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
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
 *         description: Brand products fetched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductListSuccessResponse'
 */
router.get('/:slug/products', validate(brandProductsSchema), controller.getProductsBySlug);

module.exports = router;
