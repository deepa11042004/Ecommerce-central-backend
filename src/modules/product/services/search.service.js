const ApiError = require('../../../core/errors/ApiError');
const env = require('../../../config/env');
const { sequelize } = require('../../../database/models');
const SearchRepository = require('../repositories/search.repository');

const escapeLike = (value = '') => {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
};

class SearchService {
  static assertSearchEnabled() {
    if (env.CATALOG_SEARCH_ENABLED === false) {
      throw ApiError.forbidden('Search is currently disabled');
    }
  }

  static buildKeywordPlan(searchKeyword) {
    const keyword = String(searchKeyword || '').trim().toLowerCase();

    if (!keyword) {
      return null;
    }

    const escapedKeyword = escapeLike(keyword);
    const containsPattern = sequelize.escape(`%${escapedKeyword}%`);
    const prefixPattern = sequelize.escape(`${escapedKeyword}%`);

    const brandExistsSql = `
      EXISTS (
        SELECT 1
        FROM brands b
        WHERE b.id = Product.brand_id
          AND LOWER(b.name) LIKE ${containsPattern} ESCAPE '\\\\'
      )
    `;

    const categoryExistsSql = `
      EXISTS (
        SELECT 1
        FROM product_categories pc
        INNER JOIN categories c ON c.id = pc.category_id
        WHERE pc.product_id = Product.id
          AND LOWER(c.name) LIKE ${containsPattern} ESCAPE '\\\\'
      )
    `;

    const keywordMetaExistsSql = `
      EXISTS (
        SELECT 1
        FROM product_meta pm
        WHERE pm.product_id = Product.id
          AND pm.meta_key IN ('keywords', 'search_keywords')
          AND LOWER(COALESCE(pm.meta_value, '')) LIKE ${containsPattern} ESCAPE '\\\\'
      )
    `;

    const whereSql = `
      (
        LOWER(Product.title) LIKE ${containsPattern} ESCAPE '\\\\'
        OR LOWER(Product.slug) LIKE ${containsPattern} ESCAPE '\\\\'
        OR LOWER(COALESCE(Product.short_description, '')) LIKE ${containsPattern} ESCAPE '\\\\'
        OR LOWER(COALESCE(Product.description, '')) LIKE ${containsPattern} ESCAPE '\\\\'
        OR ${brandExistsSql}
        OR ${categoryExistsSql}
        OR ${keywordMetaExistsSql}
      )
    `;

    const scoreSql = `
      (
        (CASE
          WHEN LOWER(Product.title) LIKE ${prefixPattern} ESCAPE '\\\\' THEN 180
          WHEN LOWER(Product.title) LIKE ${containsPattern} ESCAPE '\\\\' THEN 120
          ELSE 0
        END)
        +
        (CASE
          WHEN LOWER(Product.slug) LIKE ${prefixPattern} ESCAPE '\\\\' THEN 90
          WHEN LOWER(Product.slug) LIKE ${containsPattern} ESCAPE '\\\\' THEN 70
          ELSE 0
        END)
        +
        (CASE
          WHEN LOWER(COALESCE(Product.short_description, '')) LIKE ${containsPattern} ESCAPE '\\\\' THEN 40
          ELSE 0
        END)
        +
        (CASE
          WHEN LOWER(COALESCE(Product.description, '')) LIKE ${containsPattern} ESCAPE '\\\\' THEN 20
          ELSE 0
        END)
        +
        (CASE
          WHEN ${brandExistsSql} THEN 25
          ELSE 0
        END)
        +
        (CASE
          WHEN ${categoryExistsSql} THEN 15
          ELSE 0
        END)
        +
        (CASE
          WHEN ${keywordMetaExistsSql} THEN 10
          ELSE 0
        END)
      )
    `;

    return {
      keyword,
      whereSql,
      scoreSql,
      mode: 'mysql_like',
    };
  }

  static async getSuggestions({ q, limit }) {
    this.assertSearchEnabled();

    const keyword = String(q || '').trim();

    if (!keyword) {
      return {
        products: [],
        categories: [],
        brands: [],
      };
    }

    const [productRows, categoryRows, brandRows] = await Promise.all([
      SearchRepository.findProductSuggestions({ keyword, limit }),
      SearchRepository.findCategorySuggestions({ keyword, limit }),
      SearchRepository.findBrandSuggestions({ keyword, limit }),
    ]);

    const dedupe = (values) => {
      return [...new Set(values.map((item) => String(item || '').trim()).filter(Boolean))].slice(0, limit);
    };

    return {
      products: dedupe(productRows.map((row) => row.title)),
      categories: dedupe(categoryRows.map((row) => row.name)),
      brands: dedupe(brandRows.map((row) => row.name)),
    };
  }
}

module.exports = SearchService;
