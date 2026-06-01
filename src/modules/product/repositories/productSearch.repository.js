const { Op, QueryTypes, literal, where: sequelizeWhere } = require('sequelize');
const { sequelize, Product, Brand, Category } = require('../../../database/models');

const MIN_PRICE_SQL = `
  COALESCE(
    (
      SELECT MIN(pv.price)
      FROM product_variants pv
      WHERE pv.product_id = Product.id
        AND pv.status = 'active'
    ),
    Product.base_price,
    0
  )
`;

const MAX_PRICE_SQL = `
  COALESCE(
    (
      SELECT MAX(pv.price)
      FROM product_variants pv
      WHERE pv.product_id = Product.id
        AND pv.status = 'active'
    ),
    Product.base_price,
    0
  )
`;

const TOTAL_STOCK_SQL = `
  COALESCE(
    (
      SELECT SUM(
        CASE
          WHEN COALESCE(inv.allow_backorder, 0) = 1 THEN GREATEST(COALESCE(inv.available_quantity, 0), 1)
          ELSE COALESCE(inv.available_quantity, 0)
        END
      )
      FROM product_variants pv
      LEFT JOIN inventories inv ON inv.variant_id = pv.id
      WHERE pv.product_id = Product.id
        AND pv.status = 'active'
    ),
    Product.stock,
    0
  )
`;

const DISCOUNT_PERCENT_SQL = `
  GREATEST(
    COALESCE(
      CASE
        WHEN Product.compare_price IS NOT NULL
          AND Product.base_price IS NOT NULL
          AND Product.compare_price > Product.base_price
          AND Product.compare_price > 0
        THEN ((Product.compare_price - Product.base_price) / Product.compare_price) * 100
        ELSE 0
      END,
      0
    ),
    COALESCE(
      (
        SELECT MAX(
          CASE
            WHEN pv.compare_price IS NOT NULL
              AND pv.compare_price > pv.price
              AND pv.compare_price > 0
            THEN ((pv.compare_price - pv.price) / pv.compare_price) * 100
            ELSE 0
          END
        )
        FROM product_variants pv
        WHERE pv.product_id = Product.id
          AND pv.status = 'active'
      ),
      0
    )
  )
`;

const DEFAULT_VARIANT_SQL = `
  (
    SELECT pv.id
    FROM product_variants pv
    LEFT JOIN inventories inv ON inv.variant_id = pv.id
    WHERE pv.product_id = Product.id
      AND pv.status = 'active'
    ORDER BY
      CASE
        WHEN COALESCE(inv.available_quantity, 0) > 0 OR COALESCE(inv.allow_backorder, 0) = 1 THEN 0
        ELSE 1
      END,
      pv.id ASC
    LIMIT 1
  )
`;

class ProductSearchRepository {
  static async findProductIdsByAttributeGroups(attributeGroups = []) {
    if (!attributeGroups.length) {
      return null;
    }

    const orClauses = [];
    const replacements = {
      expectedAttributeCount: attributeGroups.length,
    };

    attributeGroups.forEach((group, index) => {
      replacements[`code${index}`] = group.code;
      replacements[`values${index}`] = group.values;
      orClauses.push(`(a.code = :code${index} AND av.value_slug IN (:values${index}))`);
    });

    const rows = await sequelize.query(
      `
        SELECT DISTINCT pv.product_id AS productId
        FROM product_variants pv
        INNER JOIN variant_attribute_values vav ON vav.variant_id = pv.id
        INNER JOIN attributes a ON a.id = vav.attribute_id
        INNER JOIN attribute_values av ON av.id = vav.attribute_value_id
        WHERE pv.status = 'active'
          AND (${orClauses.join(' OR ')})
        GROUP BY pv.id, pv.product_id
        HAVING COUNT(DISTINCT a.code) = :expectedAttributeCount
      `,
      {
        replacements,
        type: QueryTypes.SELECT,
      }
    );

    return [...new Set(rows.map((row) => Number(row.productId)).filter((id) => Number.isFinite(id)))];
  }

  static buildCatalogQueryParts({
    filters,
    searchPlan,
    scopedCategoryIds,
    scopedBrandId,
    forcedProductIds,
  }) {
    const where = {};
    const whereAnd = [];

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.productType) {
      where.productType = filters.productType;
    }

    if (typeof filters.hasVariants === 'boolean') {
      where.hasVariants = filters.hasVariants;
    }

    const resolvedBrandId = scopedBrandId || filters.brandId || null;

    if (resolvedBrandId) {
      where.brandId = resolvedBrandId;
    }

    if (Array.isArray(forcedProductIds)) {
      where.id = forcedProductIds.length
        ? {
            [Op.in]: forcedProductIds,
          }
        : {
            [Op.eq]: null,
          };
    }

    if (filters.priceRange?.min !== null) {
      whereAnd.push(sequelizeWhere(literal(`(${MIN_PRICE_SQL})`), { [Op.gte]: filters.priceRange.min }));
    }

    if (filters.priceRange?.max !== null) {
      whereAnd.push(sequelizeWhere(literal(`(${MIN_PRICE_SQL})`), { [Op.lte]: filters.priceRange.max }));
    }

    if (filters.availability === 'in_stock') {
      whereAnd.push(sequelizeWhere(literal(`(${TOTAL_STOCK_SQL})`), { [Op.gt]: 0 }));
    }

    if (filters.availability === 'out_of_stock') {
      whereAnd.push(sequelizeWhere(literal(`(${TOTAL_STOCK_SQL})`), { [Op.lte]: 0 }));
    }

    if (filters.discountedOnly) {
      whereAnd.push(sequelizeWhere(literal(`(${DISCOUNT_PERCENT_SQL})`), { [Op.gt]: 0 }));
    }

    if (searchPlan?.whereSql) {
      whereAnd.push(sequelizeWhere(literal(`(${searchPlan.whereSql})`), { [Op.eq]: 1 }));
    }

    if (whereAnd.length) {
      where[Op.and] = whereAnd;
    }

    const include = [
      {
        model: Brand,
        as: 'brand',
        attributes: ['id', 'name', 'slug'],
        required: Boolean(filters.brandSlug && !resolvedBrandId),
        where: filters.brandSlug && !resolvedBrandId
          ? {
              slug: filters.brandSlug,
              status: 'active',
            }
          : undefined,
      },
      {
        model: Category,
        as: 'categories',
        through: { attributes: [] },
        required: Array.isArray(scopedCategoryIds) && scopedCategoryIds.length > 0,
        where: Array.isArray(scopedCategoryIds) && scopedCategoryIds.length > 0
          ? {
              id: {
                [Op.in]: scopedCategoryIds,
              },
            }
          : undefined,
        attributes: ['id', 'name', 'slug'],
      },
    ];

    return {
      where,
      include,
    };
  }

  static buildCatalogOrder(sort, { hasSearch = false } = {}) {
    if (sort.key === 'relevance' && hasSearch) {
      return [
        [literal('relevanceScore'), 'DESC'],
        ['createdAt', 'DESC'],
      ];
    }

    if (sort.key === 'price') {
      return [
        [literal(`(${MIN_PRICE_SQL})`), sort.direction],
        ['id', 'DESC'],
      ];
    }

    if (sort.key === 'discount') {
      return [
        [literal(`(${DISCOUNT_PERCENT_SQL})`), sort.direction],
        ['id', 'DESC'],
      ];
    }

    if (sort.key === 'popular') {
      return [
        [
          literal(`(
            SELECT COUNT(oi.id)
            FROM order_items oi
            WHERE oi.product_id = Product.id
          )`),
          sort.direction,
        ],
        ['createdAt', 'DESC'],
      ];
    }

    if (sort.key === 'rating') {
      return [
        ['createdAt', 'DESC'],
      ];
    }

    if (sort.key === 'title') {
      return [[sort.key, sort.direction], ['id', 'DESC']];
    }

    return [[sort.key, sort.direction], ['id', 'DESC']];
  }

  static buildCatalogProjection(searchPlan) {
    const attributes = [
      [literal(`(${MIN_PRICE_SQL})`), 'minPrice'],
      [literal(`(${MAX_PRICE_SQL})`), 'maxPrice'],
      [literal(`(${TOTAL_STOCK_SQL})`), 'totalStock'],
      [literal(`(${DEFAULT_VARIANT_SQL})`), 'defaultVariantId'],
      [literal(`(${DISCOUNT_PERCENT_SQL})`), 'discountPercent'],
    ];

    if (searchPlan?.scoreSql) {
      attributes.push([literal(`(${searchPlan.scoreSql})`), 'relevanceScore']);
    } else {
      attributes.push([literal('0'), 'relevanceScore']);
    }

    return attributes;
  }

  static async searchCatalog({
    filters,
    sort,
    pagination,
    searchPlan,
    scopedCategoryIds,
    scopedBrandId,
    forcedProductIds,
  }) {
    const { where, include } = this.buildCatalogQueryParts({
      filters,
      searchPlan,
      scopedCategoryIds,
      scopedBrandId,
      forcedProductIds,
    });

    return Product.findAndCountAll({
      where,
      include,
      distinct: true,
      subQuery: false,
      order: this.buildCatalogOrder(sort, { hasSearch: Boolean(filters.search) }),
      limit: pagination.limit,
      offset: pagination.offset,
      attributes: {
        include: this.buildCatalogProjection(searchPlan),
      },
    });
  }

  static async findFacetProductIds({
    filters,
    searchPlan,
    scopedCategoryIds,
    scopedBrandId,
    forcedProductIds,
    scanLimit,
  }) {
    const { where, include } = this.buildCatalogQueryParts({
      filters,
      searchPlan,
      scopedCategoryIds,
      scopedBrandId,
      forcedProductIds,
    });

    const rows = await Product.findAll({
      where,
      include,
      attributes: ['id'],
      order: [['id', 'DESC']],
      subQuery: false,
      limit: scanLimit + 1,
      raw: true,
    });

    const uniqueProductIds = [...new Set(
      rows
        .map((row) => Number(row.id ?? row['Product.id']))
        .filter((id) => Number.isFinite(id))
    )];

    return {
      productIds: uniqueProductIds.slice(0, scanLimit),
      isTruncated: uniqueProductIds.length > scanLimit,
    };
  }

  static async getBrandFacetsByProductIds(productIds = []) {
    if (!productIds.length) {
      return [];
    }

    return sequelize.query(
      `
        SELECT
          b.id,
          b.name,
          b.slug,
          COUNT(DISTINCT p.id) AS count
        FROM products p
        INNER JOIN brands b ON b.id = p.brand_id
        WHERE p.id IN (:productIds)
        GROUP BY b.id, b.name, b.slug
        ORDER BY count DESC, b.name ASC
      `,
      {
        replacements: { productIds },
        type: QueryTypes.SELECT,
      }
    );
  }

  static async getPriceRangeByProductIds(productIds = []) {
    if (!productIds.length) {
      return {
        min: null,
        max: null,
      };
    }

    const [row] = await sequelize.query(
      `
        SELECT
          MIN(${MIN_PRICE_SQL.replace(/Product\./g, 'p.')}) AS minPrice,
          MAX(${MAX_PRICE_SQL.replace(/Product\./g, 'p.')}) AS maxPrice
        FROM products p
        WHERE p.id IN (:productIds)
      `,
      {
        replacements: { productIds },
        type: QueryTypes.SELECT,
      }
    );

    return {
      min: row?.minPrice !== null && typeof row?.minPrice !== 'undefined' ? Number(row.minPrice) : null,
      max: row?.maxPrice !== null && typeof row?.maxPrice !== 'undefined' ? Number(row.maxPrice) : null,
    };
  }

  static async getAttributeFacetsByProductIds(productIds = []) {
    if (!productIds.length) {
      return [];
    }

    return sequelize.query(
      `
        SELECT
          a.code,
          a.name,
          av.value,
          av.value_slug AS valueSlug,
          COUNT(DISTINCT pv.product_id) AS count
        FROM product_variants pv
        INNER JOIN variant_attribute_values vav ON vav.variant_id = pv.id
        INNER JOIN attributes a ON a.id = vav.attribute_id
        INNER JOIN attribute_values av ON av.id = vav.attribute_value_id
        WHERE pv.product_id IN (:productIds)
          AND pv.status = 'active'
          AND a.status = 'active'
          AND a.is_filterable = 1
        GROUP BY a.code, a.name, av.value, av.value_slug, av.sort_order
        ORDER BY a.name ASC, av.sort_order ASC, av.value ASC
      `,
      {
        replacements: { productIds },
        type: QueryTypes.SELECT,
      }
    );
  }

  static async findProductsByIds(productIds = []) {
    if (!productIds.length) {
      return [];
    }

    const rows = await Product.findAll({
      where: {
        id: {
          [Op.in]: productIds,
        },
      },
      include: [
        {
          model: Brand,
          as: 'brand',
          attributes: ['id', 'name', 'slug'],
          required: false,
        },
        {
          model: Category,
          as: 'categories',
          through: { attributes: [] },
          attributes: ['id', 'name', 'slug'],
          required: false,
        },
      ],
      attributes: {
        include: this.buildCatalogProjection(null),
      },
      order: [['id', 'DESC']],
    });

    const orderMap = new Map(productIds.map((id, index) => [Number(id), index]));

    return rows.sort((left, right) => {
      return (orderMap.get(Number(left.id)) ?? Number.MAX_SAFE_INTEGER)
        - (orderMap.get(Number(right.id)) ?? Number.MAX_SAFE_INTEGER);
    });
  }

}

module.exports = ProductSearchRepository;
