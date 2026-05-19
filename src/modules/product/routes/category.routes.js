const express = require('express');
const controller = require('../controllers/category.controller');
const auth = require('../../../middleware/auth.middleware');
const can = require('../../../middleware/permission.middleware');
const validate = require('../../../middleware/validate.middleware');
const { PERMISSIONS } = require('../../../constants/permissions');
const { categoryTreeSchema } = require('../validators/product.validator');

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

module.exports = router;
