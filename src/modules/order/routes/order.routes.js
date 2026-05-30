const express = require('express');
const validate = require('../../../middleware/validate.middleware');
const { requireCustomerRole } = require('../../../middleware/shoppingActor.middleware');
const controller = require('../controllers/order.controller');
const {
  listOrdersSchema,
  orderParamsSchema,
  orderActionSchema,
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
 * /orders/{id}/timeline:
 *   get:
 *     tags: [Orders]
 *     summary: Get order timeline
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Order timeline fetched
 */
router.get('/:id/timeline', requireCustomerRole(), validate(orderParamsSchema), controller.timeline);

/**
 * @swagger
 * /orders/{id}/cancel:
 *   post:
 *     tags: [Orders]
 *     summary: Cancel an order
 */
router.post('/:id/cancel', requireCustomerRole(), validate(orderActionSchema), controller.cancel);

/**
 * @swagger
 * /orders/{id}/return-request:
 *   post:
 *     tags: [Orders]
 *     summary: Request a return for an order
 */
router.post('/:id/return-request', requireCustomerRole(), validate(orderActionSchema), controller.requestReturn);

/**
 * @swagger
 * /orders/{id}/refund:
 *   post:
 *     tags: [Orders]
 *     summary: Request a refund for an order
 */
router.post('/:id/refund', requireCustomerRole(), validate(orderActionSchema), controller.requestRefund);

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
