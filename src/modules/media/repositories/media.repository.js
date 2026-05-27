const { Product, ProductVariant, Category, Brand, User } = require('../../../database/models');
const ApiError = require('../../../core/errors/ApiError');
const { SECTION_KEYS } = require('../constants/media.constants');

const ENTITY_DEFINITIONS = Object.freeze({
  [SECTION_KEYS.PRODUCT]: {
    model: Product,
    field: 'thumbnail',
    label: 'Product',
  },
  [SECTION_KEYS.VARIANT]: {
    model: ProductVariant,
    field: 'image',
    label: 'Variant',
  },
  [SECTION_KEYS.CATEGORY]: {
    model: Category,
    field: 'image',
    label: 'Category',
  },
  [SECTION_KEYS.BRAND]: {
    model: Brand,
    field: 'logo',
    label: 'Brand',
  },
  [SECTION_KEYS.USER]: {
    model: User,
    field: 'avatar',
    label: 'User',
  },
});

class MediaRepository {
  static getEntityDefinition(section) {
    const definition = ENTITY_DEFINITIONS[section];

    if (!definition) {
      throw ApiError.badRequest(`Section does not support entity assignment: ${section}`);
    }

    return definition;
  }

  static async findEntityBySectionAndId(section, id, { transaction, lock } = {}) {
    const definition = this.getEntityDefinition(section);
    const options = { transaction };

    if (lock) {
      options.lock = lock;
    }

    return definition.model.findByPk(id, options);
  }

  static async updateEntityPath(section, entity, pathValue, { transaction } = {}) {
    const definition = this.getEntityDefinition(section);

    return entity.update(
      {
        [definition.field]: pathValue,
      },
      { transaction }
    );
  }

  static getEntityPath(section, entity) {
    const definition = this.getEntityDefinition(section);

    return entity[definition.field] || null;
  }

  static getEntityLabel(section) {
    return this.getEntityDefinition(section).label;
  }
}

module.exports = MediaRepository;
