const ApiError = require('../../../core/errors/ApiError');
const { sequelize } = require('../../../database/models');
const { toInteger } = require('../../../utils/shopping');
const { isOrderStatusTransitionAllowed } = require('../../../utils/orderStatus');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../../../constants/order');
const OrderRepository = require('../repositories/order.repository');
const OrderStatusHistoryRepository = require('../repositories/orderStatusHistory.repository');
const InventoryRepository = require('../../product/repositories/inventory.repository');

const INVENTORY_RESTORE_STATUSES = new Set([
  ORDER_STATUS.REFUNDED,
]);

class OrderLifecycleService {
  static buildActorLabel(actor) {
    if (actor?.userId) {
      return `user:${actor.userId}`;
    }

    if (actor?.guestId) {
      return `guest:${actor.guestId}`;
    }

    return 'system';
  }

  static async transition(order, nextStatus, { actor, reason, notes, transaction } = {}) {
    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    if (!nextStatus) {
      throw ApiError.badRequest('Order status is required');
    }

    if (order.orderStatus === nextStatus) {
      return order;
    }

    if (!isOrderStatusTransitionAllowed(order.orderStatus, nextStatus)) {
      throw ApiError.badRequest('Order status transition is not allowed');
    }

    const execute = async (activeTransaction) => {
      const payload = {
        orderStatus: nextStatus,
      };

      if (nextStatus === ORDER_STATUS.REFUNDED) {
        payload.paymentStatus = PAYMENT_STATUS.REFUNDED;
      }

      if (nextStatus === ORDER_STATUS.FAILED) {
        payload.paymentStatus = PAYMENT_STATUS.FAILED;
      }

      if (nextStatus === ORDER_STATUS.CONFIRMED) {
        payload.paymentStatus = PAYMENT_STATUS.SUCCESS;
      }

      const shouldRestoreInventory = Boolean(
        order.paymentStatus === PAYMENT_STATUS.SUCCESS && INVENTORY_RESTORE_STATUSES.has(nextStatus)
      );

      if (shouldRestoreInventory) {
        await this.restoreInventory(order, { transaction: activeTransaction });
      }

      await OrderRepository.update(order, payload, { transaction: activeTransaction });

      await OrderStatusHistoryRepository.create(
        {
          orderId: order.id,
          oldStatus: order.orderStatus,
          newStatus: nextStatus,
          changedBy: this.buildActorLabel(actor),
          reason: reason || null,
          notes: notes || null,
        },
        { transaction: activeTransaction }
      );

      return OrderRepository.findById(order.id, {
        transaction: activeTransaction,
        includeItems: true,
        includeAddresses: true,
        includePayments: true,
        includeStatusHistory: true,
      });
    };

    if (transaction) {
      return execute(transaction);
    }

    return sequelize.transaction((activeTransaction) => execute(activeTransaction));
  }

  static async restoreInventory(order, { transaction } = {}) {
    if (!order?.items?.length) {
      return;
    }

    for (const item of order.items) {
      const quantity = toInteger(item.quantity, 0);

      if (quantity <= 0) {
        continue;
      }

      if (item.variantId) {
        const inventory = await InventoryRepository.findInventoryByVariantIdForUpdate(item.variantId, { transaction });

        if (!inventory) {
          continue;
        }

        const nextQuantity = toInteger(inventory.quantity, 0) + quantity;
        await InventoryRepository.updateInventoryQuantity(inventory, nextQuantity, { transaction });
        continue;
      }

      const product = await InventoryRepository.findProductByIdForUpdate(item.productId, { transaction });

      if (!product) {
        continue;
      }

      const nextStock = toInteger(product.stock, 0) + quantity;
      await InventoryRepository.updateProductStock(product, nextStock, { transaction });
    }
  }
}

module.exports = OrderLifecycleService;