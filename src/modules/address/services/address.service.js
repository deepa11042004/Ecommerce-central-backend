const ApiError = require('../../../core/errors/ApiError');
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

    const address = await AddressRepository.create({
      userId: actor.userId || null,
      guestId: actor.guestId || null,
      fullName: payload.fullName,
      phone: payload.phone,
      addressLine1: payload.addressLine1,
      addressLine2: payload.addressLine2 || null,
      city: payload.city,
      state: payload.state,
      country: payload.country,
      postalCode: payload.postalCode,
      landmark: payload.landmark || null,
      type: payload.type || 'shipping',
    });

    return this.serialize(address);
  }

  static async update(actor, id, payload) {
    this.ensureActor(actor);

    const address = await AddressRepository.findByIdForActor(id, actor);

    if (!address) {
      throw ApiError.notFound('Address not found');
    }

    const updated = await AddressRepository.update(address, {
      fullName: payload.fullName,
      phone: payload.phone,
      addressLine1: payload.addressLine1,
      addressLine2: payload.addressLine2,
      city: payload.city,
      state: payload.state,
      country: payload.country,
      postalCode: payload.postalCode,
      landmark: payload.landmark,
      type: payload.type,
    });

    return this.serialize(updated);
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
      type: address.type,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }
}

module.exports = AddressService;
