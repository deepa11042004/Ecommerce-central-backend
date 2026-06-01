const Joi = require('joi');
const { INVENTORY_MOVEMENT_TYPE_LIST } = require('../../../constants/inventory');

const listInventorySchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().trim().allow('').optional(),
    productId: Joi.number().integer().positive().optional(),
    variantId: Joi.number().integer().positive().optional(),
    lowStock: Joi.boolean().optional(),
    outOfStock: Joi.boolean().optional(),
    sortBy: Joi.string().valid('updatedAt', 'createdAt', 'quantity', 'reservedQuantity', 'effectiveQuantity', 'lowStockThreshold').optional(),
    sortOrder: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').optional(),
  }).optional(),
});

const inventoryIdSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

const historySchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    movementType: Joi.string().valid(...INVENTORY_MOVEMENT_TYPE_LIST).optional(),
    productId: Joi.number().integer().positive().optional(),
    variantId: Joi.number().integer().positive().optional(),
    referenceType: Joi.string().trim().max(60).optional(),
    referenceId: Joi.string().trim().max(120).optional(),
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
    sortOrder: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').optional(),
  }).optional(),
});

const adjustInventorySchema = Joi.object({
  body: Joi.object({
    quantityDelta: Joi.number().integer().invalid(0).required(),
    reason: Joi.string().trim().max(255).optional().allow('', null),
    notes: Joi.string().trim().max(2000).optional().allow('', null),
  }).required(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

const restockInventorySchema = Joi.object({
  body: Joi.object({
    quantity: Joi.number().integer().positive().required(),
    reason: Joi.string().trim().max(255).optional().allow('', null),
    notes: Joi.string().trim().max(2000).optional().allow('', null),
  }).required(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

const damagedInventorySchema = Joi.object({
  body: Joi.object({
    quantity: Joi.number().integer().positive().required(),
    reason: Joi.string().trim().max(255).optional().allow('', null),
    notes: Joi.string().trim().max(2000).optional().allow('', null),
  }).required(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

const lowStockSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(200).optional(),
  }).optional(),
});

const bulkUpdateSchema = Joi.object({
  body: Joi.object({
    updates: Joi.array()
      .items(
        Joi.object({
          inventoryId: Joi.number().integer().positive().required(),
          quantityDelta: Joi.number().integer().invalid(0).required(),
          movementType: Joi.string().valid(...INVENTORY_MOVEMENT_TYPE_LIST).optional(),
          referenceType: Joi.string().trim().max(60).optional(),
          referenceId: Joi.string().trim().max(120).optional(),
          reason: Joi.string().trim().max(255).optional().allow('', null),
          notes: Joi.string().trim().max(2000).optional().allow('', null),
        })
      )
      .min(1)
      .required(),
  }).required(),
  params: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
});

module.exports = {
  listInventorySchema,
  inventoryIdSchema,
  historySchema,
  adjustInventorySchema,
  restockInventorySchema,
  damagedInventorySchema,
  lowStockSchema,
  bulkUpdateSchema,
};
