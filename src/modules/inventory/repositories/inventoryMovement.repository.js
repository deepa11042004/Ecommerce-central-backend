const { Op } = require('sequelize');
const { InventoryMovement, Inventory, Product, ProductVariant } = require('../../../database/models');

class InventoryMovementRepository {
  static create(payload, { transaction } = {}) {
    return InventoryMovement.create(payload, { transaction });
  }

  static bulkCreate(rows, { transaction } = {}) {
    if (!rows?.length) {
      return Promise.resolve([]);
    }

    return InventoryMovement.bulkCreate(rows, { transaction });
  }

  static list({
    page,
    limit,
    offset,
    movementType,
    productId,
    variantId,
    referenceType,
    referenceId,
    from,
    to,
    sortOrder = 'DESC',
    transaction,
  } = {}) {
    const where = {};

    if (movementType) {
      where.movementType = movementType;
    }

    if (productId) {
      where.productId = productId;
    }

    if (variantId) {
      where.variantId = variantId;
    }

    if (referenceType) {
      where.referenceType = referenceType;
    }

    if (referenceId) {
      where.referenceId = String(referenceId);
    }

    if (from || to) {
      where.createdAt = {};

      if (from) {
        where.createdAt[Op.gte] = from;
      }

      if (to) {
        where.createdAt[Op.lte] = to;
      }
    }

    return InventoryMovement.findAndCountAll({
      where,
      limit,
      offset,
      transaction,
      include: [
        {
          model: Inventory,
          as: 'inventory',
          attributes: ['id', 'productId', 'variantId', 'quantity', 'reservedQuantity', 'allowBackorder'],
          required: false,
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'title', 'slug', 'sku'],
          required: false,
        },
        {
          model: ProductVariant,
          as: 'variant',
          attributes: ['id', 'sku', 'title'],
          required: false,
        },
      ],
      order: [['createdAt', String(sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC'], ['id', 'DESC']],
    });
  }

  static async hasRestoreMovement(referenceType, referenceId, movementTypes, { transaction } = {}) {
    if (!referenceType || referenceId == null || !movementTypes?.length) {
      return false;
    }

    const count = await InventoryMovement.count({
      where: {
        referenceType,
        referenceId: String(referenceId),
        movementType: {
          [Op.in]: movementTypes,
        },
      },
      transaction,
    });

    return count > 0;
  }
}

module.exports = InventoryMovementRepository;
