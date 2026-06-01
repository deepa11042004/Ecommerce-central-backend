const { Op } = require('sequelize');
const { Product, Category, Brand } = require('../../../database/models');

class SearchRepository {
  static findProductSuggestions({ keyword, limit }) {
    const likePattern = `%${keyword}%`;

    return Product.findAll({
      where: {
        status: 'active',
        [Op.or]: [
          {
            title: {
              [Op.like]: likePattern,
            },
          },
          {
            slug: {
              [Op.like]: likePattern,
            },
          },
        ],
      },
      attributes: ['title'],
      order: [['title', 'ASC']],
      limit,
      raw: true,
    });
  }

  static findCategorySuggestions({ keyword, limit }) {
    const likePattern = `%${keyword}%`;

    return Category.findAll({
      where: {
        status: 'active',
        [Op.or]: [
          {
            name: {
              [Op.like]: likePattern,
            },
          },
          {
            slug: {
              [Op.like]: likePattern,
            },
          },
        ],
      },
      attributes: ['name'],
      order: [['name', 'ASC']],
      limit,
      raw: true,
    });
  }

  static findBrandSuggestions({ keyword, limit }) {
    const likePattern = `%${keyword}%`;

    return Brand.findAll({
      where: {
        status: 'active',
        [Op.or]: [
          {
            name: {
              [Op.like]: likePattern,
            },
          },
          {
            slug: {
              [Op.like]: likePattern,
            },
          },
        ],
      },
      attributes: ['name'],
      order: [['name', 'ASC']],
      limit,
      raw: true,
    });
  }
}

module.exports = SearchRepository;
