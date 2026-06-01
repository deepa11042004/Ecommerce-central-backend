const express = require('express');
const controller = require('../controllers/product.controller');
const auth = require('../../../middleware/auth.middleware');
const can = require('../../../middleware/permission.middleware');
const validate = require('../../../middleware/validate.middleware');
const { PERMISSIONS } = require('../../../constants/permissions');
const { singleImageUpload } = require('../../media/middleware/media-upload.middleware');
const {
  createProductSchema,
  updateProductSchema,
  getProductByIdSchema,
  listProductsSchema,
  generateVariantsSchema,
  previewVariantCombinationsSchema,
  saveProductVariantsSchema,
  resolveVariantSchema,
  relatedProductsSchema,
} = require('../validators/product.validator');

const router = express.Router();

router.post('/uploads', auth(), can(PERMISSIONS.PRODUCT_CREATE), singleImageUpload('file'), controller.uploadImage);

/**
 * @swagger
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: Fetch products with generalized filtering
 *     description: |
 *       Access: developer, super_admin, admin, customer.
 *       Supports pagination, keyword search, category filter, dynamic attribute filter,
 *       product type filter, status filter, and sorting.
 *       Required permission: product.read
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
 *         example: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         example: wireless
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         example: active
 *       - in: query
 *         name: productType
 *         schema:
 *           type: string
 *           enum: [simple, configurable, variant]
 *         example: variant
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         example: electronics
 *       - in: query
 *         name: includeChildren
 *         schema:
 *           type: boolean
 *         description: Include nested subcategory products when category is provided.
 *         example: true
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Brand slug filter (for example dell).
 *         example: dell
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         example: 20000
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         example: 50000
 *       - in: query
 *         name: availability
 *         schema:
 *           type: string
 *           enum: [all, in_stock, out_of_stock]
 *         example: in_stock
 *       - in: query
 *         name: discounted
 *         schema:
 *           type: boolean
 *         example: true
 *       - in: query
 *         name: attribute
 *         schema:
 *           oneOf:
 *             - type: string
 *             - type: array
 *               items:
 *                 type: string
 *         description: Dynamic filter using attribute:value1,value2 format. Can be repeated.
 *         example: color:black,white
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [relevance, price_asc, price_desc, newest, oldest, name_asc, name_desc, discount_desc, popular, rating]
 *         description: Relevance works only when search is present.
 *         example: price_desc
 *       - in: query
 *         name: includeFacets
 *         schema:
 *           type: boolean
 *         description: Set false to skip facet metadata for ultra-low latency requests.
 *         example: true
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
router.get('/', validate(listProductsSchema), controller.findAll);

/**
 * @swagger
 * /products/search:
 *   get:
 *     tags: [Products]
 *     summary: Search products endpoint
 *     description: |
 *       Access: developer, super_admin, admin, customer.
 *       Behavior is identical to GET /products but exposed as explicit search endpoint.
 *       Supports relevance scoring, faceted metadata, dynamic attributes, and variant-aware filters.
 *       Required permission: product.read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         example: compatible
 *       - in: query
 *         name: attribute
 *         schema:
 *           type: string
 *         example: language:english
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         example: books
 *       - in: query
 *         name: includeChildren
 *         schema:
 *           type: boolean
 *         example: true
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         example: dell
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         example: 20000
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         example: 50000
 *       - in: query
 *         name: availability
 *         schema:
 *           type: string
 *           enum: [all, in_stock, out_of_stock]
 *         example: in_stock
 *       - in: query
 *         name: discounted
 *         schema:
 *           type: boolean
 *         example: true
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [relevance, price_asc, price_desc, newest, oldest, name_asc, name_desc, discount_desc, popular, rating]
 *         example: relevance
 *       - in: query
 *         name: includeFacets
 *         schema:
 *           type: boolean
 *         example: true
 *     responses:
 *       200:
 *         description: Search result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductListSuccessResponse'
 */
router.get('/search', validate(listProductsSchema), controller.search);

/**
 * @swagger
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: Create generalized product
 *     description: |
 *       Access: developer, super_admin, admin.
 *       Creates base product + optional categories + dynamic attributes.
 *       Variants can be sent directly, or staged using preview and save-variants endpoints.
 *       Required permission: product.create
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
 * /products/generate-variants:
 *   post:
 *     tags: [Products, Variants]
 *     summary: Generate variant combinations from attributes (preview only)
 *     description: |
 *       Access: developer, super_admin, admin.
 *       Generates all possible combinations from dynamic attributes without persisting variants.
 *       Required permission: product.create
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [attributes]
 *             properties:
 *               attributes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [name, values]
 *                   properties:
 *                     name:
 *                       type: string
 *                     code:
 *                       type: string
 *                     values:
 *                       type: array
 *                       items:
 *                         oneOf:
 *                           - type: string
 *                           - type: object
 *                             properties:
 *                               value:
 *                                 type: string
 *                               slug:
 *                                 type: string
 *               maxCombinations:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5000
 *                 default: 500
 *     responses:
 *       200:
 *         description: Combination preview generated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VariantCombinationPreviewSuccessResponse'
 */
router.post(
  '/generate-variants',
  auth(),
  can(PERMISSIONS.PRODUCT_CREATE),
  validate(generateVariantsSchema),
  controller.generateVariants
);

/**
 * @swagger
 * /products/{id}/variant-combinations/preview:
 *   post:
 *     tags: [Products, Variants]
 *     summary: Preview generated variant combinations
 *     description: |
 *       Access: developer, super_admin, admin.
 *       Generates all possible combinations from product variant-axis attributes without saving variants.
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxCombinations:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5000
 *                 default: 500
 *               onlyMissing:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Combination preview generated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VariantCombinationPreviewSuccessResponse'
 */
router.post(
  '/:id/variant-combinations/preview',
  auth(),
  can(PERMISSIONS.PRODUCT_UPDATE),
  validate(previewVariantCombinationsSchema),
  controller.previewVariantCombinations
);

/**
 * @swagger
 * /products/{id}/variants:
 *   post:
 *     tags: [Products, Variants]
 *     summary: Save selected sellable variants
 *     description: |
 *       Access: developer, super_admin, admin.
 *       Persists only selected sellable variants for the product. This is the second step after preview.
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
 *             type: object
 *             required: [variants]
 *             properties:
 *               replaceExisting:
 *                 type: boolean
 *                 default: true
 *               variants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     sku:
 *                       type: string
 *                     price:
 *                       type: number
 *                       format: float
 *                     salePrice:
 *                       type: number
 *                       format: float
 *                     comparePrice:
 *                       type: number
 *                       format: float
 *                     stock:
 *                       type: integer
 *                     attributeValues:
 *                       type: array
 *                       items:
 *                         oneOf:
 *                           - type: string
 *                             example: color:black
 *                           - type: object
 *                             properties:
 *                               code:
 *                                 type: string
 *                               value:
 *                                 type: string
 *               media:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     mediaType:
 *                       type: string
 *                     variantSku:
 *                       type: string
 *     responses:
 *       200:
 *         description: Variants persisted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductSuccessResponse'
 */
router.post(
  '/:id/variants',
  auth(),
  can(PERMISSIONS.PRODUCT_UPDATE),
  validate(saveProductVariantsSchema),
  controller.saveVariants
);

/**
 * @swagger
 * /products/{id}/variant-resolve:
 *   post:
 *     tags: [Products, Variants]
 *     summary: Resolve variant by selected attributes
 *     description: |
 *       Access: developer, super_admin, admin, customer.
 *       Returns the exact active variant for selected attribute values.
 *       Required permission: product.read
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
 *             required: [attributeValues]
 *             properties:
 *               attributeValues:
 *                 type: array
 *                 items:
 *                   oneOf:
 *                     - type: string
 *                       example: color:black
 *                     - type: object
 *                       properties:
 *                         code:
 *                           type: string
 *                         value:
 *                           type: string
 *     responses:
 *       200:
 *         description: Variant resolved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VariantResolveSuccessResponse'
 */
router.post(
  '/:id/variant-resolve',
  auth(),
  can(PERMISSIONS.PRODUCT_READ),
  validate(resolveVariantSchema),
  controller.resolveVariant
);

/**
 * @swagger
 * /products/{id}/related:
 *   get:
 *     tags: [Products]
 *     summary: Fetch related product recommendations
 *     description: |
 *       Rule-based related product engine.
 *       Ranking priority: same category, same brand, shared dynamic attributes, then popular fallback.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 24
 *         example: 12
 *     responses:
 *       200:
 *         description: Related products fetched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductRelatedSuccessResponse'
 */
router.get('/:id/related', validate(relatedProductsSchema), controller.related);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Fetch product detail
 *     description: |
 *       Access: developer, super_admin, admin, customer.
 *       Required permission: product.read
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
router.get('/:id', validate(getProductByIdSchema), controller.findOne);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Update generalized product
 *     description: |
 *       Access: developer, super_admin, admin.
 *       Supports partial update of base product, categories, attributes, variants, media, and metadata.
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
 *     description: |
 *       Access: developer, super_admin, admin.
 *       Required permission: product.delete
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
