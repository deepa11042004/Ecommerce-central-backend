const { Op } = require('sequelize');
const { Address, Order } = require('../../../database/models');

class AddressRepository {
  static create(payload, { transaction } = {}) {
    return Address.create(payload, { transaction });
  }

  static update(address, payload, { transaction } = {}) {
    return address.update(payload, { transaction });
  }

  static delete(address, { transaction } = {}) {
    return address.destroy({ transaction });
  }

  static findById(id, { transaction } = {}) {
    return Address.findByPk(id, { transaction });
  }

  static findByIdForActor(id, actor, { transaction } = {}) {
    const where = { id };

    if (actor?.userId) {
      where.userId = actor.userId;
    } else if (actor?.guestId) {
      where.guestId = actor.guestId;
    }

    return Address.findOne({ where, transaction });
  }

  static listByActor(actor, { transaction } = {}) {
    const where = {};

    if (actor?.userId) {
      where.userId = actor.userId;
    } else if (actor?.guestId) {
      where.guestId = actor.guestId;
    }

    return Address.findAll({
      where,
      order: [['createdAt', 'DESC']],
      transaction,
    });
  }

  static countOrdersUsingAddress(addressId, { transaction } = {}) {
    return Order.count({
      where: {
        [Op.or]: [
          { billingAddressId: addressId },
          { shippingAddressId: addressId },
        ],
      },
      transaction,
    });
  }
}

module.exports = AddressRepository;
