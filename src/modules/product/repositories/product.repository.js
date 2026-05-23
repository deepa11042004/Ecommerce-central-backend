const { Op, literal } = require('sequelize');
const {
  Product,
  Brand,
  Category,
  ProductCategory,
  Attribute,
  AttributeValue,
  ProductAttribute,
  ProductVariant,
  VariantAttributeValue,
  ProductMedia,
  ProductMeta,
  Inventory,
} = require('../../../database/models');

class ProductRepository {
  static create(payload, { transaction } = {}) {
    return Product.create(payload, { transaction });
  }

  static update(product, payload, { transaction } = {}) {
    return product.update(payload, { transaction });
  }

  static delete(product, { transaction } = {}) {
    return product.destroy({ transaction });
  }

  static findById(id, { transaction } = {}) {
    return Product.findByPk(id, {
      transaction,
      include: this.buildDetailIncludes(),
    });
  }

  static findByIdBasic(id, { transaction } = {}) {
    return Product.findByPk(id, { transaction });
  }

  static findOneBySlug(slug, excludeId = null, { transaction } = {}) {
    const where = { slug };

    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }

    return Product.findOne({ where, transaction });
  }

  static findOneByProductSku(sku, excludeId = null, { transaction } = {}) {
    const where = { sku };

    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }

    return Product.findOne({ where, transaction });
  }

  static findOneByVariantSku(sku, excludeVariantId = null, { transaction } = {}) {
    const where = { sku };

    if (excludeVariantId) {
      where.id = { [Op.ne]: excludeVariantId };
    }

    return ProductVariant.findOne({ where, transaction });
  }

  static findBrandById(id, { transaction } = {}) {
    return Brand.findByPk(id, { transaction });
  }

  static findBrandBySlug(slug, { transaction } = {}) {
    return Brand.findOne({ where: { slug }, transaction });
  }

  static findBrandByName(name, { transaction } = {}) {
    return Brand.findOne({ where: { name }, transaction });
  }

  static createBrand(payload, { transaction } = {}) {
    return Brand.create(payload, { transaction });
  }

  static findCategoriesByIds(ids, { transaction } = {}) {
    return Category.findAll({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
      transaction,
    });
  }

  static findCategoryBySlug(slug, { transaction } = {}) {
    return Category.findOne({ where: { slug }, transaction });
  }

  static listCategories({ status = null } = {}) {
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

  static findAttributeByCode(code, { transaction } = {}) {
    return Attribute.findOne({ where: { code }, transaction });
  }

  static createAttribute(payload, { transaction } = {}) {
    return Attribute.create(payload, { transaction });
  }

  static updateAttribute(attribute, payload, { transaction } = {}) {
    return attribute.update(payload, { transaction });
  }

  static findAttributeValue(attributeId, valueSlug, { transaction } = {}) {
    return AttributeValue.findOne({
      where: {
        attributeId,
        valueSlug,
      },
      transaction,
    });
  }

  static createAttributeValue(payload, { transaction } = {}) {
    return AttributeValue.create(payload, { transaction });
  }

  static replaceProductCategories(productId, categoryIds, { transaction } = {}) {
    return ProductCategory.destroy({
      where: { productId },
      transaction,
    }).then(async () => {
      if (!categoryIds?.length) {
        return [];
      }

      const rows = categoryIds.map((categoryId) => ({
        productId,
        categoryId,
      }));

      return ProductCategory.bulkCreate(rows, { transaction });
    });
  }

  static replaceProductAttributes(productId, rows, { transaction } = {}) {
    return ProductAttribute.destroy({
      where: { productId },
      transaction,
    }).then(async () => {
      if (!rows?.length) {
        return [];
      }

      return ProductAttribute.bulkCreate(rows, { transaction });
    });
  }

  static deleteVariantsByProductId(productId, { transaction } = {}) {
    return ProductVariant.destroy({
      where: { productId },
      transaction,
    });
  }

  static findVariantsByProductId(productId, { transaction } = {}) {
    return ProductVariant.findAll({
      where: { productId },
      attributes: ['id', 'sku'],
      transaction,
    });
  }

  static createVariant(payload, { transaction } = {}) {
    return ProductVariant.create(payload, { transaction });
  }

  static createInventory(payload, { transaction } = {}) {
    return Inventory.create(payload, { transaction });
  }

  static bulkCreateVariantAttributeValues(rows, { transaction } = {}) {
    if (!rows?.length) {
      return Promise.resolve([]);
    }

    return VariantAttributeValue.bulkCreate(rows, { transaction });
  }

  static replaceProductMedia(productId, rows, { transaction } = {}) {
    return ProductMedia.destroy({
      where: { productId },
      transaction,
    }).then(async () => {
      if (!rows?.length) {
        return [];
      }

      return ProductMedia.bulkCreate(rows, { transaction });
    });
  }

  static replaceProductMeta(productId, rows, { transaction } = {}) {
    return ProductMeta.destroy({
      where: { productId },
      transaction,
    }).then(async () => {
      if (!rows?.length) {
        return [];
      }

      return ProductMeta.bulkCreate(rows, { transaction });
    });
  }

  static async findProductIdsByAttributeFilters(attributeFilters, { transaction } = {}) {
    if (!attributeFilters?.length) {
      return null;
    }

    let matchedVariantIds = null;

    for (const filter of attributeFilters) {
      const rows = await VariantAttributeValue.findAll({
        attributes: ['variantId'],
        include: [
          {
            model: Attribute,
            as: 'attribute',
            required: true,
            attributes: [],
            where: {
              code: filter.code,
            },
          },
          {
            model: AttributeValue,
            as: 'attributeValue',
            required: true,
            attributes: [],
            where: {
              valueSlug: filter.value,
            },
          },
        ],
        raw: true,
        transaction,
      });

      const currentVariantIds = new Set(rows.map((row) => row.variantId));

      if (!matchedVariantIds) {
        matchedVariantIds = currentVariantIds;
      } else {
        matchedVariantIds = new Set(
          [...matchedVariantIds].filter((variantId) => currentVariantIds.has(variantId))
        );
      }

      if (!matchedVariantIds.size) {
        return [];
      }
    }

    const variants = await ProductVariant.findAll({
      where: {
        id: {
          [Op.in]: [...matchedVariantIds],
        },
      },
      attributes: ['productId'],
      raw: true,
      transaction,
    });

    return [...new Set(variants.map((variant) => Number(variant.productId)))];
  }

  static list({
    search,
    status,
    productType,
    hasVariants,
    category,
    brand,
    productIds,
    sortBy,
    sortOrder,
    limit,
    offset,
  }) {
    const where = {};

    if (status) {
      where.status = status;
    }

    if (productType) {
      where.productType = productType;
    }

    if (typeof hasVariants === 'boolean') {
      where.hasVariants = hasVariants;
    }

    if (brand) {
      where.brandId = brand;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { slug: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { shortDescription: { [Op.like]: `%${search}%` } },
      ];
    }

    if (Array.isArray(productIds)) {
      where.id = productIds.length
        ? {
            [Op.in]: productIds,
          }
        : {
            [Op.eq]: null,
          };
    }

    const include = [
      {
        model: Brand,
        as: 'brand',
        required: false,
      },
      {
        model: Category,
        as: 'categories',
        through: { attributes: [] },
        required: Boolean(category),
        where: category ? { slug: category } : undefined,
        attributes: ['id', 'name', 'slug'],
      },
    ];

    const order = this.buildListOrder(sortBy, sortOrder);

    return Product.findAndCountAll({
      where,
      include,
      distinct: true,
      subQuery: false,
      order,
      limit,
      offset,
      attributes: {
        include: [
          [
            literal(`(
              COALESCE(
                (SELECT MIN(pv.price) FROM product_variants pv WHERE pv.product_id = Product.id),
                Product.base_price
              )
            )`),
            'minPrice',
          ],
          [
            literal(`(
              COALESCE(
                (SELECT SUM(inv.quantity)
                FROM product_variants pv2
                LEFT JOIN inventory inv ON inv.variant_id = pv2.id
                WHERE pv2.product_id = Product.id),
                Product.stock,
                0
              )
            )`),
            'totalStock',
          ],
        ],
      },
    });
  }

  static buildListOrder(sortBy, sortOrder) {
    if (sortBy === 'price') {
      return [
        [
          literal(`(
            COALESCE(
              (SELECT MIN(pv.price) FROM product_variants pv WHERE pv.product_id = Product.id),
              Product.base_price,
              0
            )
          )`),
          sortOrder,
        ],
      ];
    }

    if (sortBy === 'stock') {
      return [
        [
          literal(`(
            COALESCE(
              (SELECT SUM(inv.quantity)
              FROM product_variants pv2
              LEFT JOIN inventory inv ON inv.variant_id = pv2.id
              WHERE pv2.product_id = Product.id),
              Product.stock,
              0
            )
          )`),
          sortOrder,
        ],
      ];
    }

    return [[sortBy, sortOrder]];
  }

  static buildDetailIncludes() {
    return [
      {
        model: Brand,
        as: 'brand',
      },
      {
        model: Category,
        as: 'categories',
        through: { attributes: [] },
      },
      {
        model: ProductAttribute,
        as: 'productAttributes',
        include: [
          {
            model: Attribute,
            as: 'attribute',
            include: [
              {
                model: AttributeValue,
                as: 'values',
              },
            ],
          },
        ],
      },
      {
        model: ProductVariant,
        as: 'variants',
        include: [
          {
            model: Inventory,
            as: 'inventory',
          },
          {
            model: VariantAttributeValue,
            as: 'attributeValues',
            include: [
              {
                model: Attribute,
                as: 'attribute',
              },
              {
                model: AttributeValue,
                as: 'attributeValue',
              },
            ],
          },
          {
            model: ProductMedia,
            as: 'media',
          },
        ],
      },
      {
        model: ProductMedia,
        as: 'media',
      },
      {
        model: ProductMeta,
        as: 'metaEntries',
      },
    ];
  }
}

module.exports = ProductRepository;
