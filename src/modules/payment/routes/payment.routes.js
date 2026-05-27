const express = require('express');
const validate = require('../../../middleware/validate.middleware');
const { requireCustomerRole } = require('../../../middleware/shoppingActor.middleware');
const controller = require('../controllers/payment.controller');
const { verifyPaymentSchema } = require('../validators/payment.validator');

const router = express.Router();

/**
 * @swagger
 * /payments/verify:
 *   post:
 *     tags: [Payments]
 *     summary: Verify Razorpay payment signature
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentVerifyRequest'
 *     responses:
 *       200:
 *         description: Payment verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentVerifySuccessResponse'
 */
router.post('/verify', requireCustomerRole(), validate(verifyPaymentSchema), controller.verify);

/**
 * @swagger
 * /payments/webhook/razorpay:
 *   post:
 *     tags: [Payments, Webhooks]
 *     summary: Razorpay webhook handler
 *     responses:
 *       200:
 *         description: Webhook acknowledged
 */
router.post('/webhook/razorpay', controller.handleRazorpayWebhook);

module.exports = router;
