const { OrderStatusHistory } = require('../../../database/models');

class OrderStatusHistoryRepository {
  static create(payload, { transaction } = {}) {
    return OrderStatusHistory.create(payload, { transaction });
  }

  static listByOrderId(orderId, { transaction } = {}) {
    return OrderStatusHistory.findAll({
      where: { orderId },
      order: [['createdAt', 'ASC']],
      transaction,
    });
  }
}

module.exports = OrderStatusHistoryRepository;