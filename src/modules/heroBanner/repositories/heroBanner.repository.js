const { HeroBanner } = require('../../../database/models');

class HeroBannerRepository {
  static create(payload, { transaction } = {}) {
    return HeroBanner.create(payload, { transaction });
  }

  static update(banner, payload, { transaction } = {}) {
    return banner.update(payload, { transaction });
  }

  static delete(banner, { transaction } = {}) {
    return banner.destroy({ transaction });
  }

  static findById(id, { transaction } = {}) {
    return HeroBanner.findByPk(id, { transaction });
  }

  static list({ includeInactive = false } = {}) {
    const where = includeInactive ? {} : { isActive: true };

    return HeroBanner.findAll({
      where,
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'DESC'],
      ],
    });
  }
}

module.exports = HeroBannerRepository;
