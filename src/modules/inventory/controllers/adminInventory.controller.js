const { sendSuccess } = require('../../../core/http/response');
const asyncHandler = require('../../../utils/asyncHandler');
const InventoryService = require('../services/inventory.service');
const { INVENTORY_MOVEMENT_TYPE, INVENTORY_REFERENCE_TYPES } = require('../../../constants/inventory');

const list = asyncHandler(async (req, res) => {
  const data = await InventoryService.listInventory(req.query);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Inventory fetched successfully',
    data,
  });
});

const getById = asyncHandler(async (req, res) => {
  const data = await InventoryService.getInventoryById(req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Inventory item fetched successfully',
    data,
  });
});

const history = asyncHandler(async (req, res) => {
  const data = await InventoryService.getInventoryHistory(req.query);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Inventory history fetched successfully',
    data,
  });
});

const adjust = asyncHandler(async (req, res) => {
  const data = await InventoryService.adjustStock({
    inventoryId: req.params.id,
    quantityDelta: req.body.quantityDelta,
    movementType: INVENTORY_MOVEMENT_TYPE.MANUAL_ADJUSTMENT,
    referenceType: INVENTORY_REFERENCE_TYPES.ADMIN,
    referenceId: req.user?.id || null,
    reason: req.body.reason,
    notes: req.body.notes,
    createdBy: req.user?.id || null,
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Inventory adjusted successfully',
    data,
  });
});

const restock = asyncHandler(async (req, res) => {
  const data = await InventoryService.adjustStock({
    inventoryId: req.params.id,
    quantityDelta: req.body.quantity,
    movementType: INVENTORY_MOVEMENT_TYPE.RESTOCK,
    referenceType: INVENTORY_REFERENCE_TYPES.ADMIN,
    referenceId: req.user?.id || null,
    reason: req.body.reason || 'Manual restock',
    notes: req.body.notes,
    createdBy: req.user?.id || null,
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Inventory restocked successfully',
    data,
  });
});

const damaged = asyncHandler(async (req, res) => {
  const data = await InventoryService.markDamaged({
    inventoryId: req.params.id,
    quantity: req.body.quantity,
    reason: req.body.reason || 'Damaged stock adjustment',
    notes: req.body.notes,
    createdBy: req.user?.id || null,
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Damaged inventory marked successfully',
    data,
  });
});

const lowStock = asyncHandler(async (req, res) => {
  const data = await InventoryService.getLowStockProducts({
    limit: req.query.limit,
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Low stock inventory fetched successfully',
    data,
  });
});

const bulkUpdate = asyncHandler(async (req, res) => {
  const data = await InventoryService.bulkAdjustStock({
    updates: req.body.updates,
    createdBy: req.user?.id || null,
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Bulk inventory update completed successfully',
    data,
  });
});

module.exports = {
  list,
  getById,
  history,
  adjust,
  restock,
  damaged,
  lowStock,
  bulkUpdate,
};
