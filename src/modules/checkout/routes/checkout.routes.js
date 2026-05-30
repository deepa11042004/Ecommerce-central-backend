const express = require('express');
const validate = require('../../../middleware/validate.middleware');
const { requireCustomerRole } = require('../../../middleware/shoppingActor.middleware');
const controller = require('../controllers/checkout.controller');
const { checkoutSchema } = require('../validators/checkout.validator');

const router = express.Router();

/**
 * @swagger
 * /checkout:
 *   post:
 *     tags: [Checkout]
 *     summary: Create order and initialize Razorpay payment
 *     description: |
 *       Revalidates cart prices, stock, and optional coupon before creating order.
 *       Coupon validation is always server-side and repeated at checkout for tamper safety.
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckoutRequest'
 *           examples:
 *             withCoupon:
 *               value:
 *                 shippingAddressId: 1
 *                 billingAddressId: 1
 *                 paymentMethod: razorpay
 *                 couponCode: WELCOME10
 *     responses:
 *       201:
 *         description: Checkout created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckoutSuccessResponse'
 */
router.post('/', requireCustomerRole(), validate(checkoutSchema), controller.checkout);

module.exports = router;
