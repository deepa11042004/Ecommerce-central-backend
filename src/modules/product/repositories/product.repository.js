const { Op } = require('sequelize');
const { Product } = require('../../../database/models');

class ProductRepository {
  static create(payload) {
    return Product.create(payload);
  }

  static findById(id) {
    return Product.findByPk(id);
  }

  static update(product, payload) {
    return product.update(payload);
  }

  static delete(product) {
    return product.destroy();
  }

  static findOneBySlug(slug, excludeId = null) {
    const where = { slug };

    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }

    return Product.findOne({ where });
  }

  static findOneBySku(sku, excludeId = null) {
    const where = { sku };

    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }

    return Product.findOne({ where });
  }

  static list({ search, status, sortBy, sortOrder, limit, offset }) {
    const where = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } },
      ];
    }

    return Product.findAndCountAll({
      where,
      limit,
      offset,
      order: [[sortBy, sortOrder]],
    });
  }
}

module.exports = ProductRepository;
