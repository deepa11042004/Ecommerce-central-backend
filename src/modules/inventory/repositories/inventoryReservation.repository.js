const { Op } = require('sequelize');
const { InventoryReservation, Inventory } = require('../../../database/models');
const { INVENTORY_RESERVATION_STATUS } = require('../../../constants/inventory');

class InventoryReservationRepository {
  static create(payload, { transaction } = {}) {
    return InventoryReservation.create(payload, { transaction });
  }

  static bulkCreate(rows, { transaction } = {}) {
    if (!rows?.length) {
      return Promise.resolve([]);
    }

    return InventoryReservation.bulkCreate(rows, { transaction });
  }

  static update(reservation, payload, { transaction } = {}) {
    return reservation.update(payload, { transaction });
  }

  static findActiveByOrderIdForUpdate(orderId, { transaction } = {}) {
    if (!orderId) {
      return Promise.resolve([]);
    }

    return InventoryReservation.findAll({
      where: {
        orderId,
        status: INVENTORY_RESERVATION_STATUS.ACTIVE,
      },
      include: [
        {
          model: Inventory,
          as: 'inventory',
          required: false,
        },
      ],
      transaction,
      lock: transaction?.LOCK.UPDATE,
      order: [['id', 'ASC']],
    });
  }

  static findActiveByIdsForUpdate(ids, { transaction } = {}) {
    if (!ids?.length) {
      return Promise.resolve([]);
    }

    return InventoryReservation.findAll({
      where: {
        id: {
          [Op.in]: ids,
        },
        status: INVENTORY_RESERVATION_STATUS.ACTIVE,
      },
      include: [
        {
          model: Inventory,
          as: 'inventory',
          required: false,
        },
      ],
      transaction,
      lock: transaction?.LOCK.UPDATE,
      order: [['id', 'ASC']],
    });
  }

  static findExpiredActiveForUpdate(now = new Date(), { transaction, limit = 200 } = {}) {
    return InventoryReservation.findAll({
      where: {
        status: INVENTORY_RESERVATION_STATUS.ACTIVE,
        reservationExpiresAt: {
          [Op.lt]: now,
        },
      },
      include: [
        {
          model: Inventory,
          as: 'inventory',
          required: false,
        },
      ],
      transaction,
      lock: transaction?.LOCK.UPDATE,
      order: [['reservationExpiresAt', 'ASC']],
      limit,
    });
  }
}

module.exports = InventoryReservationRepository;
