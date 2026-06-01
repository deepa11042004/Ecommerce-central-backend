const express = require('express');
const auth = require('../../../middleware/auth.middleware');
const can = require('../../../middleware/permission.middleware');
const validate = require('../../../middleware/validate.middleware');
const { PERMISSIONS } = require('../../../constants/permissions');
const controller = require('../controllers/adminInventory.controller');
const {
  listInventorySchema,
  inventoryIdSchema,
  historySchema,
  adjustInventorySchema,
  restockInventorySchema,
  damagedInventorySchema,
  lowStockSchema,
  bulkUpdateSchema,
} = require('../validators/inventory.validator');

const router = express.Router();

/**
 * @swagger
 * /admin/inventory:
 *   get:
 *     tags: [Inventory]
 *     summary: List inventory records with product and variant context
 *     security:
 *       - bearerAuth: []
 */
router.get('/', auth(), can(PERMISSIONS.INVENTORY_READ), validate(listInventorySchema), controller.list);

/**
 * @swagger
 * /admin/inventory/history:
 *   get:
 *     tags: [Inventory]
 *     summary: List inventory movement ledger history
 *     security:
 *       - bearerAuth: []
 */
router.get('/history', auth(), can(PERMISSIONS.INVENTORY_READ), validate(historySchema), controller.history);

/**
 * @swagger
 * /admin/inventory/low-stock:
 *   get:
 *     tags: [Inventory]
 *     summary: Get low-stock and near out-of-stock inventory records
 *     security:
 *       - bearerAuth: []
 */
router.get('/low-stock', auth(), can(PERMISSIONS.INVENTORY_READ), validate(lowStockSchema), controller.lowStock);

/**
 * @swagger
 * /admin/inventory/bulk-update:
 *   post:
 *     tags: [Inventory]
 *     summary: Bulk adjust inventory quantities
 *     security:
 *       - bearerAuth: []
 */
router.post('/bulk-update', auth(), can(PERMISSIONS.INVENTORY_MANAGE), validate(bulkUpdateSchema), controller.bulkUpdate);

/**
 * @swagger
 * /admin/inventory/{id}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get one inventory record
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', auth(), can(PERMISSIONS.INVENTORY_READ), validate(inventoryIdSchema), controller.getById);

/**
 * @swagger
 * /admin/inventory/{id}/adjust:
 *   patch:
 *     tags: [Inventory]
 *     summary: Manual stock adjustment (+/-)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/adjust', auth(), can(PERMISSIONS.INVENTORY_ADJUST), validate(adjustInventorySchema), controller.adjust);

/**
 * @swagger
 * /admin/inventory/{id}/restock:
 *   patch:
 *     tags: [Inventory]
 *     summary: Restock inventory quantity
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/restock', auth(), can(PERMISSIONS.INVENTORY_ADJUST), validate(restockInventorySchema), controller.restock);

/**
 * @swagger
 * /admin/inventory/{id}/damaged:
 *   patch:
 *     tags: [Inventory]
 *     summary: Mark inventory as damaged (stock deduction)
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/damaged', auth(), can(PERMISSIONS.INVENTORY_ADJUST), validate(damagedInventorySchema), controller.damaged);

module.exports = router;
