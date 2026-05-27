const express = require('express');
const auth = require('../../../middleware/auth.middleware');
const can = require('../../../middleware/permission.middleware');
const validate = require('../../../middleware/validate.middleware');
const { PERMISSIONS } = require('../../../constants/permissions');
const controller = require('../controllers/adminOrder.controller');
const {
  listOrdersSchema,
  updateOrderStatusSchema,
} = require('../validators/order.validator');

const router = express.Router();

/**
 * @swagger
 * /admin/orders:
 *   get:
 *     tags: [Admin Orders]
 *     summary: List all orders (admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin order list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminOrderListSuccessResponse'
 */
router.get('/', auth(), can(PERMISSIONS.ORDER_READ), validate(listOrdersSchema), controller.list);

/**
 * @swagger
 * /admin/orders/{id}/status:
 *   patch:
 *     tags: [Admin Orders]
 *     summary: Update order status (admin)
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
 *             $ref: '#/components/schemas/OrderStatusUpdateRequest'
 *     responses:
 *       200:
 *         description: Order status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderSuccessResponse'
 */
router.patch('/:id/status', auth(), can(PERMISSIONS.ORDER_UPDATE), validate(updateOrderStatusSchema), controller.updateStatus);

module.exports = router;
