const ApiError = require('../../../core/errors/ApiError');
const { sequelize } = require('../../../database/models');
const { isOrderStatusTransitionAllowed } = require('../../../utils/orderStatus');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../../../constants/order');
const OrderRepository = require('../repositories/order.repository');
const OrderStatusHistoryRepository = require('../repositories/orderStatusHistory.repository');
const InventoryService = require('../../inventory/services/inventory.service');

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

    const execute = async (activeTransaction) => {
      const lockedOrder = await OrderRepository.findById(order.id, {
        transaction: activeTransaction,
        lock: activeTransaction.LOCK.UPDATE,
        includeItems: true,
        includeAddresses: true,
        includePayments: true,
        includeStatusHistory: true,
      });

      if (!lockedOrder) {
        throw ApiError.notFound('Order not found');
      }

      if (lockedOrder.orderStatus === nextStatus) {
        return lockedOrder;
      }

      if (!isOrderStatusTransitionAllowed(lockedOrder.orderStatus, nextStatus)) {
        throw ApiError.badRequest('Order status transition is not allowed');
      }

      const previousStatus = lockedOrder.orderStatus;
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

      await InventoryService.handleOrderStatusTransition(lockedOrder, nextStatus, {
        actor,
        reason,
        notes,
        transaction: activeTransaction,
      });

      await OrderRepository.update(lockedOrder, payload, { transaction: activeTransaction });

      await OrderStatusHistoryRepository.create(
        {
          orderId: lockedOrder.id,
          oldStatus: previousStatus,
          newStatus: nextStatus,
          changedBy: this.buildActorLabel(actor),
          reason: reason || null,
          notes: notes || null,
        },
        { transaction: activeTransaction }
      );

      return OrderRepository.findById(lockedOrder.id, {
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
}

module.exports = OrderLifecycleService;