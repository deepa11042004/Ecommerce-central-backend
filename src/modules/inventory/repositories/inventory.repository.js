const { Op, literal } = require('sequelize');
const { Inventory, Product, ProductVariant } = require('../../../database/models');

const PRODUCT_ATTRIBUTES = ['id', 'title', 'slug', 'sku', 'status', 'stock'];
const VARIANT_ATTRIBUTES = ['id', 'productId', 'sku', 'title', 'status', 'price'];

class InventoryRepository {
  static buildAdminIncludes() {
    return [
      {
        model: Product,
        as: 'product',
        attributes: PRODUCT_ATTRIBUTES,
        required: false,
      },
      {
        model: ProductVariant,
        as: 'variant',
        attributes: VARIANT_ATTRIBUTES,
        required: false,
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'title', 'slug'],
            required: false,
          },
        ],
      },
    ];
  }

  static findById(id, { transaction, lock, includeAssociations = true } = {}) {
    const options = {
      transaction,
      include: includeAssociations ? this.buildAdminIncludes() : undefined,
      attributes: {
        include: [
          [literal('GREATEST(`Inventory`.`available_quantity` - `Inventory`.`reserved_quantity`, 0)'), 'effectiveQuantity'],
        ],
      },
    };

    if (lock) {
      options.lock = lock;
    }

    return Inventory.findByPk(id, options);
  }

  static findByIdForUpdate(id, { transaction } = {}) {
    return Inventory.findByPk(id, {
      transaction,
      lock: transaction?.LOCK.UPDATE,
    });
  }

  static findByProductIdForUpdate(productId, { transaction } = {}) {
    return Inventory.findOne({
      where: { productId },
      transaction,
      lock: transaction?.LOCK.UPDATE,
    });
  }

  static findByVariantIdForUpdate(variantId, { transaction } = {}) {
    return Inventory.findOne({
      where: { variantId },
      transaction,
      lock: transaction?.LOCK.UPDATE,
    });
  }

  static findByIdsForUpdate(ids, { transaction } = {}) {
    return Inventory.findAll({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
      transaction,
      lock: transaction?.LOCK.UPDATE,
    });
  }

  static create(payload, { transaction } = {}) {
    return Inventory.create(payload, { transaction });
  }

  static update(inventory, payload, { transaction } = {}) {
    return inventory.update(payload, { transaction });
  }

  static list({
    page,
    limit,
    offset,
    search,
    productId,
    variantId,
    includeLowStockOnly = false,
    includeOutOfStockOnly = false,
    sortBy = 'updatedAt',
    sortOrder = 'DESC',
    transaction,
  } = {}) {
    const where = {};

    if (productId) {
      where.productId = productId;
    }

    if (variantId) {
      where.variantId = variantId;
    }

    if (search) {
      const likeSearch = `%${String(search).trim()}%`;
      where[Op.or] = [
        { '$product.title$': { [Op.like]: likeSearch } },
        { '$product.slug$': { [Op.like]: likeSearch } },
        { '$product.sku$': { [Op.like]: likeSearch } },
        { '$variant.sku$': { [Op.like]: likeSearch } },
        { '$variant.title$': { [Op.like]: likeSearch } },
        { '$variant.product.title$': { [Op.like]: likeSearch } },
      ];
    }

    if (includeLowStockOnly) {
      where.lowStockThreshold = {
        [Op.not]: null,
      };

      where[Op.and] = [
        literal('GREATEST(`Inventory`.`available_quantity` - `Inventory`.`reserved_quantity`, 0) <= `Inventory`.`low_stock_threshold`'),
      ];
    }

    if (includeOutOfStockOnly) {
      const outOfStockCondition = literal('GREATEST(`Inventory`.`available_quantity` - `Inventory`.`reserved_quantity`, 0) <= 0');
      where[Op.and] = where[Op.and] ? [...where[Op.and], outOfStockCondition] : [outOfStockCondition];
    }

    const resolvedSortOrder = String(sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const order = this.buildOrder(sortBy, resolvedSortOrder);

    return Inventory.findAndCountAll({
      where,
      include: this.buildAdminIncludes(),
      distinct: true,
      subQuery: false,
      limit,
      offset,
      transaction,
      order,
      attributes: {
        include: [
          [literal('GREATEST(`Inventory`.`available_quantity` - `Inventory`.`reserved_quantity`, 0)'), 'effectiveQuantity'],
        ],
      },
    });
  }

  static buildOrder(sortBy, sortOrder) {
    if (sortBy === 'quantity') {
      return [['quantity', sortOrder], ['id', 'DESC']];
    }

    if (sortBy === 'reservedQuantity') {
      return [['reservedQuantity', sortOrder], ['id', 'DESC']];
    }

    if (sortBy === 'effectiveQuantity') {
      return [[literal('GREATEST(`Inventory`.`available_quantity` - `Inventory`.`reserved_quantity`, 0)'), sortOrder], ['id', 'DESC']];
    }

    if (sortBy === 'lowStockThreshold') {
      return [['lowStockThreshold', sortOrder], ['id', 'DESC']];
    }

    return [[sortBy || 'updatedAt', sortOrder], ['id', 'DESC']];
  }

  static listLowStock({ limit = 50, transaction } = {}) {
    return Inventory.findAll({
      where: {
        lowStockThreshold: {
          [Op.not]: null,
        },
        [Op.and]: [
          literal('GREATEST(`Inventory`.`available_quantity` - `Inventory`.`reserved_quantity`, 0) <= `Inventory`.`low_stock_threshold`'),
        ],
      },
      include: this.buildAdminIncludes(),
      limit,
      order: [[literal('GREATEST(`Inventory`.`available_quantity` - `Inventory`.`reserved_quantity`, 0)'), 'ASC'], ['updatedAt', 'DESC']],
      transaction,
      attributes: {
        include: [
          [literal('GREATEST(`Inventory`.`available_quantity` - `Inventory`.`reserved_quantity`, 0)'), 'effectiveQuantity'],
        ],
      },
    });
  }
}

module.exports = InventoryRepository;
