const express = require('express');
const controller = require('../controllers/auth.controller');
const validate = require('../../../middleware/validate.middleware');
const { loginSchema } = require('../validators/auth.validator');

const router = express.Router();

/**
 * @swagger
 * /admin:
 *   post:
 *     tags: [Auth]
 *     summary: Admin panel login
 *     description: "Allows only admin and super_admin users to login for the admin panel."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: admin@starter.local
 *             password: Password@123
 *     responses:
 *       200:
 *         description: Admin panel login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginSuccessResponse'
 *       403:
 *         description: Account cannot access admin panel
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/admin', validate(loginSchema), controller.loginAdminPanel);

/**
 * @swagger
 * /developer:
 *   post:
 *     tags: [Auth]
 *     summary: Developer panel login
 *     description: "Allows only developer users to login for the developer panel."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: developer@starter.local
 *             password: Password@123
 *     responses:
 *       200:
 *         description: Developer panel login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginSuccessResponse'
 *       403:
 *         description: Account cannot access developer panel
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/developer', validate(loginSchema), controller.loginDeveloperPanel);

module.exports = router;
