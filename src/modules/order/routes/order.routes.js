const express = require('express');
const validate = require('../../../middleware/validate.middleware');
const { requireCustomerRole } = require('../../../middleware/shoppingActor.middleware');
const controller = require('../controllers/order.controller');
const {
  listOrdersSchema,
  orderParamsSchema,
} = require('../validators/order.validator');

const router = express.Router();

/**
 * @swagger
 * /orders:
 *   get:
 *     tags: [Orders]
 *     summary: List shopper orders
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
 *     responses:
 *       200:
 *         description: Order list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderListSuccessResponse'
 */
router.get('/', requireCustomerRole(), validate(listOrdersSchema), controller.list);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get order details
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Order fetched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderSuccessResponse'
 */
router.get('/:id', requireCustomerRole(), validate(orderParamsSchema), controller.getById);

/**
 * @swagger
 * /orders/{id}/items:
 *   get:
 *     tags: [Orders]
 *     summary: List order items
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Order items fetched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderItemsSuccessResponse'
 */
router.get('/:id/items', requireCustomerRole(), validate(orderParamsSchema), controller.listItems);

/**
 * @swagger
 * /orders/{id}/retry-payment:
 *   post:
 *     tags: [Orders]
 *     summary: Retry payment for a pending order
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payment retry initialized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckoutSuccessResponse'
 */
router.post('/:id/retry-payment', requireCustomerRole(), validate(orderParamsSchema), controller.retryPayment);

module.exports = router;
