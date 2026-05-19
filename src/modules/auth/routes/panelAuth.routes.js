const express = require('express');
const controller = require('../controllers/auth.controller');
const validate = require('../../../middleware/validate.middleware');
const { loginSchema } = require('../validators/auth.validator');

const router = express.Router();

/**
 * @swagger
 * /auth/admin:
 *   post:
 *     tags: [Auth]
 *     summary: Admin panel login
 *     description: |
 *       Login endpoint restricted to admin and super_admin roles only.
 *       Returns 403 if the account role is not admin or super_admin.
 *       Seeded credential — superadmin@peltown.local / SuperAdmin!Peltown#2026X9
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: superadmin@peltown.local
 *             password: SuperAdmin!Peltown#2026X9
 *     responses:
 *       200:
 *         description: Admin panel login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginSuccessResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Account role cannot access the admin panel
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/admin', validate(loginSchema), controller.loginAdminPanel);

/**
 * @swagger
 * /auth/developer:
 *   post:
 *     tags: [Auth]
 *     summary: Developer panel login
 *     description: |
 *       Login endpoint restricted to the developer role only.
 *       Returns 403 if the account role is not developer.
 *       Seeded credential — developer@peltown.local / Dev!Peltown#2026X9
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: developer@peltown.local
 *             password: Dev!Peltown#2026X9
 *     responses:
 *       200:
 *         description: Developer panel login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginSuccessResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Account role cannot access the developer panel
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/developer', validate(loginSchema), controller.loginDeveloperPanel);

module.exports = router;
