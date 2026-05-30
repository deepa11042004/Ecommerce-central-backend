const ApiError = require('../../../core/errors/ApiError');
const { sequelize } = require('../../../database/models');
const AddressRepository = require('../repositories/address.repository');

class AddressService {
  static ensureActor(actor) {
    if (!actor?.userId && !actor?.guestId) {
      throw ApiError.badRequest('Shopping actor context is required');
    }
  }

  static async list(actor) {
    this.ensureActor(actor);

    const addresses = await AddressRepository.listByActor(actor);

    return addresses.map((address) => this.serialize(address));
  }

  static async getById(actor, id) {
    this.ensureActor(actor);

    const address = await AddressRepository.findByIdForActor(id, actor);

    if (!address) {
      throw ApiError.notFound('Address not found');
    }

    return this.serialize(address);
  }

  static async create(actor, payload) {
    this.ensureActor(actor);

    return sequelize.transaction(async (transaction) => {
      const address = await AddressRepository.create(
        this.buildAddressPayload(actor, payload),
        { transaction }
      );

      await this.syncDefaultFlags(actor, address, payload, { transaction });

      const reloaded = await AddressRepository.findById(address.id, { transaction });

      return this.serialize(reloaded);
    });
  }

  static async update(actor, id, payload) {
    this.ensureActor(actor);

    return sequelize.transaction(async (transaction) => {
      const address = await AddressRepository.findByIdForActor(id, actor, { transaction });

      if (!address) {
        throw ApiError.notFound('Address not found');
      }

      const updated = await AddressRepository.update(address, this.buildAddressPayload(actor, payload, address), {
        transaction,
      });

      await this.syncDefaultFlags(actor, updated, payload, { transaction });

      const reloaded = await AddressRepository.findById(updated.id, { transaction });

      return this.serialize(reloaded);
    });
  }

  static async remove(actor, id) {
    this.ensureActor(actor);

    const address = await AddressRepository.findByIdForActor(id, actor);

    if (!address) {
      throw ApiError.notFound('Address not found');
    }

    const usageCount = await AddressRepository.countOrdersUsingAddress(address.id);

    if (usageCount > 0) {
      throw ApiError.badRequest('Address is linked to existing orders and cannot be removed');
    }

    await AddressRepository.delete(address);

    return { id: address.id };
  }

  static serialize(address) {
    if (!address) {
      return null;
    }

    return {
      id: address.id,
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      state: address.state,
      country: address.country,
      postalCode: address.postalCode,
      landmark: address.landmark,
      label: address.label,
      type: address.type,
      isDefaultShipping: Boolean(address.isDefaultShipping),
      isDefaultBilling: Boolean(address.isDefaultBilling),
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }

  static buildAddressPayload(actor, payload, currentAddress = null) {
    const nextPayload = {
      userId: currentAddress?.userId || actor.userId || null,
      guestId: currentAddress?.guestId || actor.guestId || null,
    };

    const fields = [
      'fullName',
      'phone',
      'addressLine1',
      'addressLine2',
      'city',
      'state',
      'country',
      'postalCode',
      'landmark',
      'label',
      'type',
      'isDefaultShipping',
      'isDefaultBilling',
    ];

    for (const field of fields) {
      if (payload[field] !== undefined) {
        nextPayload[field] = payload[field];
      }
    }

    if (nextPayload.addressLine2 === '') {
      nextPayload.addressLine2 = null;
    }

    if (nextPayload.landmark === '') {
      nextPayload.landmark = null;
    }

    if (nextPayload.label === '') {
      nextPayload.label = null;
    }

    if (!nextPayload.type) {
      nextPayload.type = currentAddress?.type || 'shipping';
    }

    return nextPayload;
  }

  static async syncDefaultFlags(actor, address, payload, { transaction } = {}) {
    const updatePayload = {};

    if (payload.isDefaultShipping === true) {
      updatePayload.isDefaultShipping = true;
      await AddressRepository.clearDefaultFlagsForActor(actor, { isDefaultShipping: false }, {
        excludeAddressId: address.id,
        transaction,
      });
    }

    if (payload.isDefaultBilling === true) {
      updatePayload.isDefaultBilling = true;
      await AddressRepository.clearDefaultFlagsForActor(actor, { isDefaultBilling: false }, {
        excludeAddressId: address.id,
        transaction,
      });
    }

    if (Object.keys(updatePayload).length) {
      await AddressRepository.update(address, updatePayload, { transaction });
    }
  }
}

module.exports = AddressService;
