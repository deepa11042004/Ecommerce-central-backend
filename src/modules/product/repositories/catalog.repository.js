const { QueryTypes } = require('sequelize');
const { sequelize, Category, Brand, Product } = require('../../../database/models');

class CatalogRepository {
  static findCategoryBySlug(slug) {
    return Category.findOne({
      where: { slug },
      attributes: ['id', 'name', 'slug', 'status'],
    });
  }

  static findBrandBySlug(slug) {
    return Brand.findOne({
      where: { slug },
      attributes: ['id', 'name', 'slug', 'status'],
    });
  }

  static async findDescendantCategoryIds(categoryId) {
    const rows = await sequelize.query(
      `
        WITH RECURSIVE category_tree AS (
          SELECT c.id, c.parent_id
          FROM categories c
          WHERE c.id = :categoryId
          UNION ALL
          SELECT child.id, child.parent_id
          FROM categories child
          INNER JOIN category_tree ct ON ct.id = child.parent_id
        )
        SELECT id
        FROM category_tree
      `,
      {
        replacements: { categoryId },
        type: QueryTypes.SELECT,
      }
    );

    return rows.map((row) => Number(row.id)).filter((id) => Number.isFinite(id));
  }

  static async findAttributeValueIdsByProductId(productId) {
    const rows = await sequelize.query(
      `
        SELECT DISTINCT vav.attribute_value_id AS attributeValueId
        FROM product_variants pv
        INNER JOIN variant_attribute_values vav ON vav.variant_id = pv.id
        WHERE pv.product_id = :productId
          AND pv.status = 'active'
      `,
      {
        replacements: { productId },
        type: QueryTypes.SELECT,
      }
    );

    return rows
      .map((row) => Number(row.attributeValueId))
      .filter((id) => Number.isFinite(id));
  }

  static async findCategoryIdsByProductId(productId) {
    const rows = await sequelize.query(
      `
        SELECT DISTINCT pc.category_id AS categoryId
        FROM product_categories pc
        WHERE pc.product_id = :productId
      `,
      {
        replacements: { productId },
        type: QueryTypes.SELECT,
      }
    );

    return rows
      .map((row) => Number(row.categoryId))
      .filter((id) => Number.isFinite(id));
  }

  static findProductBaseById(productId) {
    return Product.findByPk(productId, {
      attributes: ['id', 'brandId', 'status'],
    });
  }

  static async findRelatedByCategory({ categoryIds = [], excludeProductId, limit }) {
    if (!categoryIds.length) {
      return [];
    }

    return sequelize.query(
      `
        SELECT DISTINCT p.id AS productId
        FROM products p
        INNER JOIN product_categories pc ON pc.product_id = p.id
        WHERE p.status = 'active'
          AND p.id <> :excludeProductId
          AND pc.category_id IN (:categoryIds)
        ORDER BY p.created_at DESC
        LIMIT :limit
      `,
      {
        replacements: {
          categoryIds,
          excludeProductId,
          limit,
        },
        type: QueryTypes.SELECT,
      }
    );
  }

  static async findRelatedByBrand({ brandId, excludeProductId, limit }) {
    if (!brandId) {
      return [];
    }

    return sequelize.query(
      `
        SELECT p.id AS productId
        FROM products p
        WHERE p.status = 'active'
          AND p.id <> :excludeProductId
          AND p.brand_id = :brandId
        ORDER BY p.created_at DESC
        LIMIT :limit
      `,
      {
        replacements: {
          brandId,
          excludeProductId,
          limit,
        },
        type: QueryTypes.SELECT,
      }
    );
  }

  static async findRelatedByAttributes({ attributeValueIds = [], excludeProductId, limit }) {
    if (!attributeValueIds.length) {
      return [];
    }

    return sequelize.query(
      `
        SELECT
          pv.product_id AS productId,
          COUNT(DISTINCT vav.attribute_value_id) AS sharedCount
        FROM product_variants pv
        INNER JOIN variant_attribute_values vav ON vav.variant_id = pv.id
        INNER JOIN products p ON p.id = pv.product_id
        WHERE p.status = 'active'
          AND pv.status = 'active'
          AND pv.product_id <> :excludeProductId
          AND vav.attribute_value_id IN (:attributeValueIds)
        GROUP BY pv.product_id
        ORDER BY sharedCount DESC, pv.product_id DESC
        LIMIT :limit
      `,
      {
        replacements: {
          attributeValueIds,
          excludeProductId,
          limit,
        },
        type: QueryTypes.SELECT,
      }
    );
  }

  static async findPopularFallback({ excludeProductId, limit }) {
    return sequelize.query(
      `
        SELECT
          p.id AS productId,
          COUNT(oi.id) AS popularityScore
        FROM products p
        LEFT JOIN order_items oi ON oi.product_id = p.id
        WHERE p.status = 'active'
          AND p.id <> :excludeProductId
        GROUP BY p.id
        ORDER BY popularityScore DESC, p.created_at DESC
        LIMIT :limit
      `,
      {
        replacements: {
          excludeProductId,
          limit,
        },
        type: QueryTypes.SELECT,
      }
    );
  }
}

module.exports = CatalogRepository;
