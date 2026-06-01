const ApiError = require('../../../core/errors/ApiError');
const env = require('../../../config/env');
const { sequelize } = require('../../../database/models');
const { parsePagination, buildPaginationMeta } = require('../../../utils/pagination');
const { toInteger } = require('../../../utils/shopping');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../../../constants/order');
const {
  INVENTORY_MOVEMENT_TYPE,
  INVENTORY_RESERVATION_STATUS,
  INVENTORY_REFERENCE_TYPES,
} = require('../../../constants/inventory');
const ProductCatalogRepository = require('../../product/repositories/productCatalog.repository');
const InventoryRepository = require('../repositories/inventory.repository');
const InventoryMovementRepository = require('../repositories/inventoryMovement.repository');
const InventoryReservationRepository = require('../repositories/inventoryReservation.repository');

const RESTORE_MOVEMENT_TYPES = [
  INVENTORY_MOVEMENT_TYPE.ORDER_CANCELLED,
  INVENTORY_MOVEMENT_TYPE.RETURN_APPROVED,
  INVENTORY_MOVEMENT_TYPE.REFUND_APPROVED,
];

class InventoryService {
  static withTransaction(work, { transaction } = {}) {
    if (transaction) {
      return work(transaction);
    }

    return sequelize.transaction(work);
  }

  static resolveReservationExpiry(reservationExpiresAt) {
    if (reservationExpiresAt) {
      const parsed = new Date(reservationExpiresAt);

      if (Number.isNaN(parsed.getTime())) {
        throw ApiError.badRequest('Invalid reservation expiry date');
      }

      return parsed;
    }

    const ttlMinutes = Number(env.INVENTORY_RESERVATION_TTL_MINUTES || 20);
    const safeTtl = Number.isFinite(ttlMinutes) && ttlMinutes > 0 ? ttlMinutes : 20;

    return new Date(Date.now() + safeTtl * 60 * 1000);
  }

  static toPositiveInteger(value, fieldName = 'quantity') {
    const normalized = toInteger(value, 0);

    if (normalized <= 0) {
      throw ApiError.badRequest(`${fieldName} must be greater than zero`);
    }

    return normalized;
  }

  static normalizeReferenceId(value) {
    if (value == null || value === '') {
      return null;
    }

    return String(value);
  }

  static computeEffectiveQuantity(inventory) {
    return Math.max(toInteger(inventory?.quantity, 0) - toInteger(inventory?.reservedQuantity, 0), 0);
  }

  static async ensureInventoryTarget(
    { productId, variantId },
    { transaction, lock = true, validateStatus = false } = {}
  ) {
    if (variantId) {
      const variant = await ProductCatalogRepository.findVariantById(variantId, {
        transaction,
        lock: lock ? transaction?.LOCK.UPDATE : undefined,
      });

      if (!variant || !variant.product) {
        throw ApiError.badRequest('Variant is unavailable for inventory operation');
      }

      if (validateStatus && (variant.status !== 'active' || variant.product.status !== 'active')) {
        throw ApiError.badRequest('Variant is inactive');
      }

      let inventory = lock
        ? await InventoryRepository.findByVariantIdForUpdate(variant.id, { transaction })
        : variant.inventory;

      if (!inventory) {
        inventory = await InventoryRepository.create(
          {
            productId: null,
            variantId: variant.id,
            quantity: 0,
            reservedQuantity: 0,
            lowStockThreshold: null,
            allowBackorder: false,
          },
          { transaction }
        );
      }

      return {
        inventory,
        product: variant.product,
        variant,
      };
    }

    if (!productId) {
      throw ApiError.badRequest('productId or variantId is required for inventory operation');
    }

    const product = await ProductCatalogRepository.findProductById(productId, {
      transaction,
      lock: lock ? transaction?.LOCK.UPDATE : undefined,
    });

    if (!product) {
      throw ApiError.badRequest('Product is unavailable for inventory operation');
    }

    if (product.hasVariants) {
      throw ApiError.badRequest('Variant id is required for variant-based products');
    }

    if (validateStatus && product.status !== 'active') {
      throw ApiError.badRequest('Product is inactive');
    }

    let inventory = await InventoryRepository.findByProductIdForUpdate(product.id, { transaction });

    if (!inventory) {
      inventory = await InventoryRepository.create(
        {
          productId: product.id,
          variantId: null,
          quantity: toInteger(product.stock, 0),
          reservedQuantity: 0,
          lowStockThreshold: null,
          allowBackorder: false,
        },
        { transaction }
      );
    }

    await this.syncSimpleProductStockIfNeeded(inventory, { transaction });

    return {
      inventory,
      product,
      variant: null,
    };
  }

  static async syncSimpleProductStockIfNeeded(inventory, { transaction } = {}) {
    if (!inventory?.productId) {
      return;
    }

    const product = await ProductCatalogRepository.findProductById(inventory.productId, {
      transaction,
      lock: transaction?.LOCK.UPDATE,
    });

    if (!product) {
      return;
    }

    const nextStock = toInteger(inventory.quantity, 0);

    if (toInteger(product.stock, 0) !== nextStock) {
      await product.update({ stock: nextStock }, { transaction });
    }
  }

  static async validateAvailability(items, { transaction, lock = true } = {}) {
    if (!Array.isArray(items) || !items.length) {
      throw ApiError.badRequest('At least one inventory item is required');
    }

    const resolved = [];

    for (const item of items) {
      const quantity = this.toPositiveInteger(item.quantity);
      const target = await this.ensureInventoryTarget(
        {
          productId: item.productId,
          variantId: item.variantId,
        },
        {
          transaction,
          lock,
          validateStatus: true,
        }
      );

      const effectiveQuantity = this.computeEffectiveQuantity(target.inventory);

      if (!target.inventory.allowBackorder && quantity > effectiveQuantity) {
        throw ApiError.badRequest('Insufficient stock for requested quantity');
      }

      resolved.push({
        ...item,
        quantity,
        effectiveQuantity,
        allowBackorder: Boolean(target.inventory.allowBackorder),
        inventory: target.inventory,
        product: target.product,
        variant: target.variant,
      });
    }

    return resolved;
  }

  static async reserveStock({
    items,
    referenceType = INVENTORY_REFERENCE_TYPES.ORDER,
    referenceId = null,
    reservationExpiresAt = null,
    reason = null,
    notes = null,
    createdBy = null,
    transaction,
  } = {}) {
    return this.withTransaction(async (activeTransaction) => {
      const validatedItems = await this.validateAvailability(items, {
        transaction: activeTransaction,
        lock: true,
      });

      const expiresAt = this.resolveReservationExpiry(reservationExpiresAt);
      const reservations = [];

      for (const entry of validatedItems) {
        const previousStock = toInteger(entry.inventory.quantity, 0);
        const nextReserved = toInteger(entry.inventory.reservedQuantity, 0) + entry.quantity;
        const resolvedReferenceType = entry.referenceType || referenceType;
        const resolvedReferenceId = this.normalizeReferenceId(entry.referenceId ?? referenceId);

        await InventoryRepository.update(
          entry.inventory,
          {
            reservedQuantity: nextReserved,
            reservationExpiresAt: expiresAt,
          },
          { transaction: activeTransaction }
        );

        const reservation = await InventoryReservationRepository.create(
          {
            inventoryId: entry.inventory.id,
            orderId: entry.orderId || null,
            orderItemId: entry.orderItemId || null,
            productId: entry.inventory.productId || entry.product?.id || entry.productId || null,
            variantId: entry.inventory.variantId || entry.variant?.id || entry.variantId || null,
            quantity: entry.quantity,
            status: INVENTORY_RESERVATION_STATUS.ACTIVE,
            reservationExpiresAt: expiresAt,
            referenceType: resolvedReferenceType,
            referenceId: resolvedReferenceId,
            reason: entry.reason || reason,
            notes: entry.notes || notes,
            createdBy: entry.createdBy || createdBy,
          },
          { transaction: activeTransaction }
        );

        await InventoryMovementRepository.create(
          {
            inventoryId: entry.inventory.id,
            productId: entry.inventory.productId || entry.product?.id || entry.productId || null,
            variantId: entry.inventory.variantId || entry.variant?.id || entry.variantId || null,
            movementType: INVENTORY_MOVEMENT_TYPE.ORDER_RESERVED,
            quantityChange: 0,
            previousStock,
            newStock: previousStock,
            reservedQuantity: nextReserved,
            referenceType: resolvedReferenceType,
            referenceId: resolvedReferenceId,
            reason: entry.reason || reason,
            notes: entry.notes || notes,
            createdBy: entry.createdBy || createdBy,
          },
          { transaction: activeTransaction }
        );

        reservations.push(reservation);
      }

      return {
        reservedCount: reservations.length,
        reservationExpiresAt: expiresAt,
        reservations: reservations.map((reservation) => this.serializeReservation(reservation)),
      };
    }, { transaction });
  }

  static async releaseReservation({
    orderId,
    reservationIds,
    movementType = INVENTORY_MOVEMENT_TYPE.PAYMENT_FAILED,
    referenceType = INVENTORY_REFERENCE_TYPES.ORDER,
    referenceId = null,
    reason = null,
    notes = null,
    createdBy = null,
    transaction,
  } = {}) {
    return this.withTransaction(async (activeTransaction) => {
      let reservations = [];

      if (Array.isArray(reservationIds) && reservationIds.length > 0) {
        reservations = await InventoryReservationRepository.findActiveByIdsForUpdate(reservationIds, {
          transaction: activeTransaction,
        });
      } else {
        reservations = await InventoryReservationRepository.findActiveByOrderIdForUpdate(orderId, {
          transaction: activeTransaction,
        });
      }

      if (!reservations.length) {
        return {
          releasedCount: 0,
          reservations: [],
        };
      }

      const released = [];

      for (const reservation of reservations) {
        const inventory = await InventoryRepository.findByIdForUpdate(reservation.inventoryId, {
          transaction: activeTransaction,
        });

        const resolvedReferenceId = this.normalizeReferenceId(referenceId ?? reservation.referenceId ?? orderId);

        if (!inventory) {
          await InventoryReservationRepository.update(
            reservation,
            {
              status: INVENTORY_RESERVATION_STATUS.RELEASED,
              releasedAt: new Date(),
              reason: reason || reservation.reason,
              notes: notes || reservation.notes,
            },
            { transaction: activeTransaction }
          );
          continue;
        }

        const previousStock = toInteger(inventory.quantity, 0);
        const previousReserved = toInteger(inventory.reservedQuantity, 0);
        const reservationQuantity = toInteger(reservation.quantity, 0);
        const nextReserved = Math.max(previousReserved - reservationQuantity, 0);

        await InventoryRepository.update(
          inventory,
          {
            reservedQuantity: nextReserved,
            reservationExpiresAt: nextReserved === 0 ? null : inventory.reservationExpiresAt,
          },
          { transaction: activeTransaction }
        );

        await InventoryReservationRepository.update(
          reservation,
          {
            status: INVENTORY_RESERVATION_STATUS.RELEASED,
            releasedAt: new Date(),
            reason: reason || reservation.reason,
            notes: notes || reservation.notes,
          },
          { transaction: activeTransaction }
        );

        await InventoryMovementRepository.create(
          {
            inventoryId: inventory.id,
            productId: inventory.productId || reservation.productId || null,
            variantId: inventory.variantId || reservation.variantId || null,
            movementType,
            quantityChange: 0,
            previousStock,
            newStock: previousStock,
            reservedQuantity: nextReserved,
            referenceType: reservation.referenceType || referenceType,
            referenceId: resolvedReferenceId,
            reason,
            notes,
            createdBy,
          },
          { transaction: activeTransaction }
        );

        released.push(reservation);
      }

      return {
        releasedCount: released.length,
        reservations: released.map((reservation) => this.serializeReservation(reservation)),
      };
    }, { transaction });
  }

  static async commitReservedStock({
    orderId,
    referenceType = INVENTORY_REFERENCE_TYPES.ORDER,
    referenceId = null,
    reason = null,
    notes = null,
    createdBy = null,
    fallbackItems = [],
    transaction,
  } = {}) {
    return this.withTransaction(async (activeTransaction) => {
      const reservations = await InventoryReservationRepository.findActiveByOrderIdForUpdate(orderId, {
        transaction: activeTransaction,
      });

      if (!reservations.length) {
        if (Array.isArray(fallbackItems) && fallbackItems.length > 0) {
          const fallbackResult = await this.reduceStock({
            items: fallbackItems,
            movementType: INVENTORY_MOVEMENT_TYPE.ORDER_COMMITTED,
            referenceType,
            referenceId: this.normalizeReferenceId(referenceId ?? orderId),
            reason: reason || 'Committed without prior reservation (legacy fallback)',
            notes,
            createdBy,
            transaction: activeTransaction,
          });

          return {
            committedCount: fallbackResult.updatedItems.length,
            committedReservations: [],
            usedFallback: true,
          };
        }

        return {
          committedCount: 0,
          committedReservations: [],
          usedFallback: false,
        };
      }

      const committed = [];

      for (const reservation of reservations) {
        const inventory = await InventoryRepository.findByIdForUpdate(reservation.inventoryId, {
          transaction: activeTransaction,
        });

        if (!inventory) {
          throw ApiError.badRequest('Inventory record is missing for reserved item');
        }

        const commitQuantity = toInteger(reservation.quantity, 0);

        if (commitQuantity <= 0) {
          throw ApiError.badRequest('Reserved quantity is invalid for commit');
        }

        const previousStock = toInteger(inventory.quantity, 0);
        const previousReserved = toInteger(inventory.reservedQuantity, 0);

        if (previousReserved < commitQuantity) {
          throw ApiError.badRequest('Reserved inventory is inconsistent for commit');
        }

        const nextStock = previousStock - commitQuantity;

        if (!inventory.allowBackorder && nextStock < 0) {
          throw ApiError.badRequest('Insufficient stock to commit reserved inventory');
        }

        const nextReserved = previousReserved - commitQuantity;

        await InventoryRepository.update(
          inventory,
          {
            quantity: nextStock,
            reservedQuantity: nextReserved,
            reservationExpiresAt: nextReserved === 0 ? null : inventory.reservationExpiresAt,
          },
          { transaction: activeTransaction }
        );

        await this.syncSimpleProductStockIfNeeded(inventory, { transaction: activeTransaction });

        await InventoryReservationRepository.update(
          reservation,
          {
            status: INVENTORY_RESERVATION_STATUS.COMMITTED,
            committedAt: new Date(),
            reason: reason || reservation.reason,
            notes: notes || reservation.notes,
          },
          { transaction: activeTransaction }
        );

        await InventoryMovementRepository.create(
          {
            inventoryId: inventory.id,
            productId: inventory.productId || reservation.productId || null,
            variantId: inventory.variantId || reservation.variantId || null,
            movementType: INVENTORY_MOVEMENT_TYPE.ORDER_COMMITTED,
            quantityChange: -commitQuantity,
            previousStock,
            newStock: nextStock,
            reservedQuantity: nextReserved,
            referenceType: reservation.referenceType || referenceType,
            referenceId: this.normalizeReferenceId(referenceId ?? reservation.referenceId ?? orderId),
            reason,
            notes,
            createdBy,
          },
          { transaction: activeTransaction }
        );

        committed.push(reservation);
      }

      return {
        committedCount: committed.length,
        committedReservations: committed.map((reservation) => this.serializeReservation(reservation)),
        usedFallback: false,
      };
    }, { transaction });
  }

  static async increaseStock({
    items,
    movementType = INVENTORY_MOVEMENT_TYPE.RESTOCK,
    referenceType = INVENTORY_REFERENCE_TYPES.ADMIN,
    referenceId = null,
    reason = null,
    notes = null,
    createdBy = null,
    transaction,
  } = {}) {
    return this.withTransaction(async (activeTransaction) => {
      if (!Array.isArray(items) || !items.length) {
        throw ApiError.badRequest('At least one inventory item is required');
      }

      const updatedItems = [];

      for (const item of items) {
        const quantity = this.toPositiveInteger(item.quantity);
        const target = await this.ensureInventoryTarget(
          {
            productId: item.productId,
            variantId: item.variantId,
          },
          {
            transaction: activeTransaction,
            lock: true,
            validateStatus: false,
          }
        );

        const previousStock = toInteger(target.inventory.quantity, 0);
        const nextStock = previousStock + quantity;

        await InventoryRepository.update(
          target.inventory,
          {
            quantity: nextStock,
          },
          { transaction: activeTransaction }
        );

        await this.syncSimpleProductStockIfNeeded(target.inventory, { transaction: activeTransaction });

        await InventoryMovementRepository.create(
          {
            inventoryId: target.inventory.id,
            productId: target.inventory.productId || target.product?.id || item.productId || null,
            variantId: target.inventory.variantId || target.variant?.id || item.variantId || null,
            movementType,
            quantityChange: quantity,
            previousStock,
            newStock: nextStock,
            reservedQuantity: toInteger(target.inventory.reservedQuantity, 0),
            referenceType: item.referenceType || referenceType,
            referenceId: this.normalizeReferenceId(item.referenceId ?? referenceId),
            reason: item.reason || reason,
            notes: item.notes || notes,
            createdBy: item.createdBy || createdBy,
          },
          { transaction: activeTransaction }
        );

        updatedItems.push(target.inventory);
      }

      return {
        updatedItems: updatedItems.map((inventory) => this.serializeInventory(inventory)),
      };
    }, { transaction });
  }

  static async reduceStock({
    items,
    movementType = INVENTORY_MOVEMENT_TYPE.STOCK_CORRECTION,
    referenceType = INVENTORY_REFERENCE_TYPES.ADMIN,
    referenceId = null,
    reason = null,
    notes = null,
    createdBy = null,
    transaction,
  } = {}) {
    return this.withTransaction(async (activeTransaction) => {
      if (!Array.isArray(items) || !items.length) {
        throw ApiError.badRequest('At least one inventory item is required');
      }

      const updatedItems = [];

      for (const item of items) {
        const quantity = this.toPositiveInteger(item.quantity);
        const target = await this.ensureInventoryTarget(
          {
            productId: item.productId,
            variantId: item.variantId,
          },
          {
            transaction: activeTransaction,
            lock: true,
            validateStatus: false,
          }
        );

        const previousStock = toInteger(target.inventory.quantity, 0);
        const nextStock = previousStock - quantity;

        if (!target.inventory.allowBackorder && nextStock < 0) {
          throw ApiError.badRequest('Stock cannot go negative for this item');
        }

        await InventoryRepository.update(
          target.inventory,
          {
            quantity: nextStock,
          },
          { transaction: activeTransaction }
        );

        await this.syncSimpleProductStockIfNeeded(target.inventory, { transaction: activeTransaction });

        await InventoryMovementRepository.create(
          {
            inventoryId: target.inventory.id,
            productId: target.inventory.productId || target.product?.id || item.productId || null,
            variantId: target.inventory.variantId || target.variant?.id || item.variantId || null,
            movementType,
            quantityChange: -quantity,
            previousStock,
            newStock: nextStock,
            reservedQuantity: toInteger(target.inventory.reservedQuantity, 0),
            referenceType: item.referenceType || referenceType,
            referenceId: this.normalizeReferenceId(item.referenceId ?? referenceId),
            reason: item.reason || reason,
            notes: item.notes || notes,
            createdBy: item.createdBy || createdBy,
          },
          { transaction: activeTransaction }
        );

        updatedItems.push(target.inventory);
      }

      return {
        updatedItems: updatedItems.map((inventory) => this.serializeInventory(inventory)),
      };
    }, { transaction });
  }

  static async restoreStock({
    items,
    movementType = INVENTORY_MOVEMENT_TYPE.ORDER_CANCELLED,
    referenceType = INVENTORY_REFERENCE_TYPES.ORDER,
    referenceId = null,
    reason = null,
    notes = null,
    createdBy = null,
    skipIfAlreadyRestored = false,
    transaction,
  } = {}) {
    return this.withTransaction(async (activeTransaction) => {
      const resolvedReferenceId = this.normalizeReferenceId(referenceId);

      if (skipIfAlreadyRestored && referenceType && resolvedReferenceId) {
        const alreadyRestored = await InventoryMovementRepository.hasRestoreMovement(
          referenceType,
          resolvedReferenceId,
          RESTORE_MOVEMENT_TYPES,
          { transaction: activeTransaction }
        );

        if (alreadyRestored) {
          return {
            restoredCount: 0,
            alreadyRestored: true,
            updatedItems: [],
          };
        }
      }

      const result = await this.increaseStock({
        items,
        movementType,
        referenceType,
        referenceId: resolvedReferenceId,
        reason,
        notes,
        createdBy,
        transaction: activeTransaction,
      });

      return {
        restoredCount: result.updatedItems.length,
        alreadyRestored: false,
        updatedItems: result.updatedItems,
      };
    }, { transaction });
  }

  static async adjustStock({
    inventoryId,
    quantityDelta,
    movementType = INVENTORY_MOVEMENT_TYPE.MANUAL_ADJUSTMENT,
    referenceType = INVENTORY_REFERENCE_TYPES.ADMIN,
    referenceId = null,
    reason = null,
    notes = null,
    createdBy = null,
    transaction,
  } = {}) {
    return this.withTransaction(async (activeTransaction) => {
      const inventory = await InventoryRepository.findByIdForUpdate(inventoryId, {
        transaction: activeTransaction,
      });

      if (!inventory) {
        throw ApiError.notFound('Inventory item not found');
      }

      const delta = toInteger(quantityDelta, 0);

      if (delta === 0) {
        throw ApiError.badRequest('quantityDelta must not be zero');
      }

      const previousStock = toInteger(inventory.quantity, 0);
      const nextStock = previousStock + delta;

      if (!inventory.allowBackorder && nextStock < 0) {
        throw ApiError.badRequest('Stock cannot go negative for this item');
      }

      await InventoryRepository.update(
        inventory,
        {
          quantity: nextStock,
        },
        { transaction: activeTransaction }
      );

      await this.syncSimpleProductStockIfNeeded(inventory, { transaction: activeTransaction });

      await InventoryMovementRepository.create(
        {
          inventoryId: inventory.id,
          productId: inventory.productId,
          variantId: inventory.variantId,
          movementType,
          quantityChange: delta,
          previousStock,
          newStock: nextStock,
          reservedQuantity: toInteger(inventory.reservedQuantity, 0),
          referenceType,
          referenceId: this.normalizeReferenceId(referenceId),
          reason,
          notes,
          createdBy,
        },
        { transaction: activeTransaction }
      );

      const updated = await InventoryRepository.findById(inventory.id, {
        transaction: activeTransaction,
      });

      return this.serializeInventory(updated);
    }, { transaction });
  }

  static async markDamaged({ inventoryId, quantity, reason, notes, createdBy, transaction } = {}) {
    return this.adjustStock({
      inventoryId,
      quantityDelta: -this.toPositiveInteger(quantity),
      movementType: INVENTORY_MOVEMENT_TYPE.DAMAGED,
      reason: reason || 'Damaged stock recorded',
      notes,
      createdBy,
      transaction,
    });
  }

  static async upsertInventoryRecord({
    productId,
    variantId,
    quantity,
    reservedQuantity,
    lowStockThreshold,
    allowBackorder,
    reservationExpiresAt,
    transaction,
  } = {}) {
    return this.withTransaction(async (activeTransaction) => {
      const target = await this.ensureInventoryTarget(
        { productId, variantId },
        {
          transaction: activeTransaction,
          lock: true,
          validateStatus: false,
        }
      );

      const payload = {};

      if (quantity !== undefined) {
        payload.quantity = toInteger(quantity, 0);
      }

      if (reservedQuantity !== undefined) {
        payload.reservedQuantity = Math.max(toInteger(reservedQuantity, 0), 0);
      }

      if (lowStockThreshold !== undefined) {
        payload.lowStockThreshold = lowStockThreshold == null ? null : Math.max(toInteger(lowStockThreshold, 0), 0);
      }

      if (allowBackorder !== undefined) {
        payload.allowBackorder = Boolean(allowBackorder);
      }

      if (reservationExpiresAt !== undefined) {
        payload.reservationExpiresAt = reservationExpiresAt || null;
      }

      if (Object.keys(payload).length > 0) {
        await InventoryRepository.update(target.inventory, payload, { transaction: activeTransaction });
      }

      await this.syncSimpleProductStockIfNeeded(target.inventory, { transaction: activeTransaction });

      const updated = await InventoryRepository.findById(target.inventory.id, {
        transaction: activeTransaction,
      });

      return this.serializeInventory(updated);
    }, { transaction });
  }

  static async listInventory(query = {}) {
    const { page, limit, offset } = parsePagination(query);

    const { rows, count } = await InventoryRepository.list({
      page,
      limit,
      offset,
      search: query.search,
      productId: query.productId,
      variantId: query.variantId,
      includeLowStockOnly: query.lowStock === true,
      includeOutOfStockOnly: query.outOfStock === true,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return {
      items: rows.map((row) => this.serializeInventory(row)),
      meta: buildPaginationMeta({
        page,
        limit,
        totalItems: count,
      }),
    };
  }

  static async getInventoryById(id) {
    const inventory = await InventoryRepository.findById(id);

    if (!inventory) {
      throw ApiError.notFound('Inventory item not found');
    }

    return this.serializeInventory(inventory);
  }

  static async getInventoryHistory(query = {}) {
    const { page, limit, offset } = parsePagination(query);

    const { rows, count } = await InventoryMovementRepository.list({
      page,
      limit,
      offset,
      movementType: query.movementType,
      productId: query.productId,
      variantId: query.variantId,
      referenceType: query.referenceType,
      referenceId: query.referenceId,
      from: query.from,
      to: query.to,
      sortOrder: query.sortOrder,
    });

    return {
      items: rows.map((row) => this.serializeMovement(row)),
      meta: buildPaginationMeta({
        page,
        limit,
        totalItems: count,
      }),
    };
  }

  static async getLowStockProducts({ limit = 50 } = {}) {
    const rows = await InventoryRepository.listLowStock({ limit });

    return rows.map((row) => this.serializeInventory(row));
  }

  static async bulkAdjustStock({ updates, createdBy, transaction } = {}) {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw ApiError.badRequest('updates array is required for bulk update');
    }

    return this.withTransaction(async (activeTransaction) => {
      const results = [];

      for (const update of updates) {
        const result = await this.adjustStock({
          inventoryId: update.inventoryId,
          quantityDelta: update.quantityDelta,
          movementType: update.movementType || INVENTORY_MOVEMENT_TYPE.MANUAL_ADJUSTMENT,
          referenceType: update.referenceType || INVENTORY_REFERENCE_TYPES.ADMIN,
          referenceId: update.referenceId || null,
          reason: update.reason || null,
          notes: update.notes || null,
          createdBy: update.createdBy || createdBy,
          transaction: activeTransaction,
        });

        results.push(result);
      }

      return results;
    }, { transaction });
  }

  static async releaseExpiredReservations({ now = new Date(), limit = 200, transaction } = {}) {
    return this.withTransaction(async (activeTransaction) => {
      const expiredReservations = await InventoryReservationRepository.findExpiredActiveForUpdate(now, {
        transaction: activeTransaction,
        limit,
      });

      if (!expiredReservations.length) {
        return {
          releasedCount: 0,
        };
      }

      const result = await this.releaseReservation({
        reservationIds: expiredReservations.map((row) => row.id),
        movementType: INVENTORY_MOVEMENT_TYPE.PAYMENT_FAILED,
        referenceType: INVENTORY_REFERENCE_TYPES.SYSTEM,
        reason: 'Reservation expired',
        notes: 'Automatic reservation release',
        transaction: activeTransaction,
      });

      return {
        releasedCount: result.releasedCount,
      };
    }, { transaction });
  }

  static async handleOrderStatusTransition(order, nextStatus, { actor, reason, notes, transaction } = {}) {
    if (!order?.id) {
      return;
    }

    const referenceType = INVENTORY_REFERENCE_TYPES.ORDER;
    const referenceId = this.normalizeReferenceId(order.id);
    const createdBy = actor?.userId || null;

    if (nextStatus === ORDER_STATUS.FAILED) {
      await this.releaseReservation({
        orderId: order.id,
        movementType: INVENTORY_MOVEMENT_TYPE.PAYMENT_FAILED,
        referenceType,
        referenceId,
        reason: reason || 'Payment failed',
        notes,
        createdBy,
        transaction,
      });
      return;
    }

    if (nextStatus === ORDER_STATUS.CANCELLED) {
      if (order.paymentStatus === PAYMENT_STATUS.SUCCESS) {
        await this.restoreStock({
          items: order.items || [],
          movementType: INVENTORY_MOVEMENT_TYPE.ORDER_CANCELLED,
          referenceType,
          referenceId,
          reason: reason || 'Order cancelled',
          notes,
          createdBy,
          skipIfAlreadyRestored: true,
          transaction,
        });
      } else {
        await this.releaseReservation({
          orderId: order.id,
          movementType: INVENTORY_MOVEMENT_TYPE.PAYMENT_FAILED,
          referenceType,
          referenceId,
          reason: reason || 'Order cancelled before payment capture',
          notes,
          createdBy,
          transaction,
        });
      }
      return;
    }

    if (nextStatus === ORDER_STATUS.RETURN_APPROVED) {
      if (order.paymentStatus === PAYMENT_STATUS.SUCCESS || order.paymentStatus === PAYMENT_STATUS.REFUNDED) {
        await this.restoreStock({
          items: order.items || [],
          movementType: INVENTORY_MOVEMENT_TYPE.RETURN_APPROVED,
          referenceType,
          referenceId,
          reason: reason || 'Return approved',
          notes,
          createdBy,
          skipIfAlreadyRestored: true,
          transaction,
        });
      }
      return;
    }

    if (nextStatus === ORDER_STATUS.REFUNDED) {
      if (order.paymentStatus === PAYMENT_STATUS.SUCCESS || order.paymentStatus === PAYMENT_STATUS.REFUNDED) {
        await this.restoreStock({
          items: order.items || [],
          movementType: INVENTORY_MOVEMENT_TYPE.REFUND_APPROVED,
          referenceType,
          referenceId,
          reason: reason || 'Refund approved',
          notes,
          createdBy,
          skipIfAlreadyRestored: true,
          transaction,
        });
      }
    }
  }

  static serializeInventory(inventory) {
    if (!inventory) {
      return null;
    }

    const quantity = toInteger(inventory.quantity, 0);
    const reservedQuantity = toInteger(inventory.reservedQuantity, 0);
    const effectiveQuantity = this.computeEffectiveQuantity(inventory);
    const threshold = inventory.lowStockThreshold == null ? null : toInteger(inventory.lowStockThreshold, 0);

    return {
      id: inventory.id,
      productId: inventory.productId || null,
      variantId: inventory.variantId || null,
      quantity,
      availableQuantity: quantity,
      reservedQuantity,
      effectiveQuantity,
      lowStockThreshold: threshold,
      allowBackorder: Boolean(inventory.allowBackorder),
      reservationExpiresAt: inventory.reservationExpiresAt || null,
      isLowStock: threshold != null ? effectiveQuantity <= threshold : false,
      product: inventory.product
        ? {
            id: inventory.product.id,
            title: inventory.product.title,
            slug: inventory.product.slug,
            sku: inventory.product.sku,
            status: inventory.product.status,
          }
        : inventory.variant?.product
          ? {
              id: inventory.variant.product.id,
              title: inventory.variant.product.title,
              slug: inventory.variant.product.slug,
            }
          : null,
      variant: inventory.variant
        ? {
            id: inventory.variant.id,
            sku: inventory.variant.sku,
            title: inventory.variant.title,
            status: inventory.variant.status,
            price: inventory.variant.price,
          }
        : null,
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
    };
  }

  static serializeReservation(reservation) {
    if (!reservation) {
      return null;
    }

    return {
      id: reservation.id,
      inventoryId: reservation.inventoryId,
      orderId: reservation.orderId,
      orderItemId: reservation.orderItemId,
      productId: reservation.productId,
      variantId: reservation.variantId,
      quantity: reservation.quantity,
      status: reservation.status,
      reservationExpiresAt: reservation.reservationExpiresAt,
      committedAt: reservation.committedAt,
      releasedAt: reservation.releasedAt,
      referenceType: reservation.referenceType,
      referenceId: reservation.referenceId,
      reason: reservation.reason,
      notes: reservation.notes,
      createdBy: reservation.createdBy,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
    };
  }

  static serializeMovement(movement) {
    if (!movement) {
      return null;
    }

    return {
      id: movement.id,
      inventoryId: movement.inventoryId,
      productId: movement.productId,
      variantId: movement.variantId,
      movementType: movement.movementType,
      quantityChange: toInteger(movement.quantityChange, 0),
      previousStock: toInteger(movement.previousStock, 0),
      newStock: toInteger(movement.newStock, 0),
      reservedQuantity: movement.reservedQuantity == null ? null : toInteger(movement.reservedQuantity, 0),
      referenceType: movement.referenceType,
      referenceId: movement.referenceId,
      reason: movement.reason,
      notes: movement.notes,
      createdBy: movement.createdBy,
      createdAt: movement.createdAt,
      updatedAt: movement.updatedAt,
      product: movement.product
        ? {
            id: movement.product.id,
            title: movement.product.title,
            slug: movement.product.slug,
            sku: movement.product.sku,
          }
        : null,
      variant: movement.variant
        ? {
            id: movement.variant.id,
            sku: movement.variant.sku,
            title: movement.variant.title,
          }
        : null,
    };
  }
}

module.exports = InventoryService;
