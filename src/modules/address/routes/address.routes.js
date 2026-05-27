const express = require('express');
const validate = require('../../../middleware/validate.middleware');
const { requireCustomerRole } = require('../../../middleware/shoppingActor.middleware');
const controller = require('../controllers/address.controller');
const {
  createAddressSchema,
  updateAddressSchema,
  addressParamsSchema,
  listAddressesSchema,
} = require('../validators/address.validator');

const router = express.Router();

/**
 * @swagger
 * /addresses:
 *   get:
 *     tags: [Addresses]
 *     summary: List shopper addresses
 *     description: Returns addresses for the authenticated customer or the current guest shopper.
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
 *     responses:
 *       200:
 *         description: Address list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AddressListSuccessResponse'
 */
router.get('/', requireCustomerRole(), validate(listAddressesSchema), controller.list);

/**
 * @swagger
 * /addresses:
 *   post:
 *     tags: [Addresses]
 *     summary: Create a shopper address
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddressRequest'
 *     responses:
 *       201:
 *         description: Address created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AddressSuccessResponse'
 */
router.post('/', requireCustomerRole(), validate(createAddressSchema), controller.create);

/**
 * @swagger
 * /addresses/{id}:
 *   get:
 *     tags: [Addresses]
 *     summary: Get a shopper address
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Address fetched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AddressSuccessResponse'
 */
router.get('/:id', requireCustomerRole(), validate(addressParamsSchema), controller.getById);

/**
 * @swagger
 * /addresses/{id}:
 *   patch:
 *     tags: [Addresses]
 *     summary: Update a shopper address
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
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
 *             $ref: '#/components/schemas/AddressUpdateRequest'
 *     responses:
 *       200:
 *         description: Address updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AddressSuccessResponse'
 */
router.patch('/:id', requireCustomerRole(), validate(updateAddressSchema), controller.update);

/**
 * @swagger
 * /addresses/{id}:
 *   delete:
 *     tags: [Addresses]
 *     summary: Delete a shopper address
 *     parameters:
 *       - $ref: '#/components/parameters/GuestIdentityHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Address deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeleteSuccessResponse'
 */
router.delete('/:id', requireCustomerRole(), validate(addressParamsSchema), controller.remove);

module.exports = router;
