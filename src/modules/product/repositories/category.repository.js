const { Category } = require('../../../database/models');

class CategoryRepository {
  static list({ status = null } = {}) {
    const where = {};

    if (status) {
      where.status = status;
    }

    return Category.findAll({
      where,
      order: [
        ['sortOrder', 'ASC'],
        ['name', 'ASC'],
      ],
    });
  }
}

module.exports = CategoryRepository;
