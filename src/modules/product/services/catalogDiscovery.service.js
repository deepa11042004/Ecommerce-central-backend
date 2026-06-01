const ApiError = require('../../../core/errors/ApiError');
const env = require('../../../config/env');
const { buildPaginationMeta } = require('../../../utils/pagination');
const CatalogRepository = require('../repositories/catalog.repository');
const ProductSearchRepository = require('../repositories/productSearch.repository');
const { parseCatalogQuery, parseRelatedQuery } = require('../utils/catalogQueryParser');
const SearchService = require('./search.service');

const toPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
};

class CatalogDiscoveryService {
  static getCatalogLimits() {
    return {
      defaultLimit: toPositiveInteger(env.CATALOG_DEFAULT_LIMIT, 20),
      maxLimit: toPositiveInteger(env.CATALOG_MAX_LIMIT, 60),
      facetScanLimit: toPositiveInteger(env.CATALOG_FACET_SCAN_LIMIT, 5000),
      suggestionLimit: toPositiveInteger(env.CATALOG_SUGGESTION_LIMIT, 8),
      relatedLimit: toPositiveInteger(env.CATALOG_RELATED_LIMIT, 12),
      maxAttributeFilters: toPositiveInteger(env.CATALOG_MAX_ATTRIBUTE_FILTERS, 12),
      maxValuesPerAttribute: toPositiveInteger(env.CATALOG_MAX_VALUES_PER_ATTRIBUTE, 20),
    };
  }

  static assertSortCompatibility(parsedQuery) {
    if (parsedQuery.sort.key === 'rating' && env.CATALOG_RATING_FILTER_ENABLED !== true) {
      throw ApiError.badRequest('Rating sorting/filtering is currently disabled');
    }

    if (parsedQuery.filters.ratingMin !== null && env.CATALOG_RATING_FILTER_ENABLED !== true) {
      throw ApiError.badRequest('Rating filtering is currently disabled');
    }
  }

  static async resolveCategoryScope({ categorySlug, includeChildren, strict = false }) {
    if (!categorySlug) {
      return null;
    }

    const category = await CatalogRepository.findCategoryBySlug(categorySlug);

    if (!category) {
      if (strict) {
        throw ApiError.notFound('Category not found');
      }

      return [];
    }

    if (!includeChildren) {
      return [category.id];
    }

    return CatalogRepository.findDescendantCategoryIds(category.id);
  }

  static async resolveBrandScope({ brandSlug, brandId, strict = false }) {
    if (brandId) {
      return brandId;
    }

    if (!brandSlug) {
      return null;
    }

    const brand = await CatalogRepository.findBrandBySlug(brandSlug);

    if (!brand) {
      if (strict) {
        throw ApiError.notFound('Brand not found');
      }

      return 0;
    }

    return brand.id;
  }

  static buildEmptyResult(parsedQuery) {
    const paginationMeta = buildPaginationMeta({
      page: parsedQuery.pagination.page,
      limit: parsedQuery.pagination.limit,
      totalItems: 0,
    });

    return {
      items: [],
      meta: paginationMeta,
      pagination: {
        page: paginationMeta.page,
        limit: paginationMeta.limit,
        total: 0,
        totalPages: paginationMeta.totalPages,
      },
      facets: {
        brands: [],
        priceRange: {
          min: null,
          max: null,
        },
        attributes: [],
      },
    };
  }

  static buildFacetAttributes(attributeRows = []) {
    const grouped = new Map();

    attributeRows.forEach((row) => {
      const code = String(row.code || '').trim();
      const name = String(row.name || '').trim() || code;

      if (!code) {
        return;
      }

      const bucket = grouped.get(code) || {
        code,
        name,
        values: [],
      };

      bucket.values.push({
        value: row.value,
        valueSlug: row.valueSlug,
        count: Number(row.count) || 0,
      });

      grouped.set(code, bucket);
    });

    return Array.from(grouped.values()).map((entry) => ({
      name: entry.name,
      code: entry.code,
      values: entry.values,
    }));
  }

  static buildResponse({ rows, count, parsedQuery, facets }) {
    const paginationMeta = buildPaginationMeta({
      page: parsedQuery.pagination.page,
      limit: parsedQuery.pagination.limit,
      totalItems: count,
    });

    return {
      items: rows,
      meta: paginationMeta,
      pagination: {
        page: paginationMeta.page,
        limit: paginationMeta.limit,
        total: count,
        totalPages: paginationMeta.totalPages,
      },
      facets,
    };
  }

  static async buildFacets({
    parsedQuery,
    searchPlan,
    scopedCategoryIds,
    scopedBrandId,
    forcedProductIds,
  }) {
    if (!parsedQuery.includeFacets) {
      return {
        brands: [],
        priceRange: { min: null, max: null },
        attributes: [],
      };
    }

    const limits = this.getCatalogLimits();

    const { productIds, isTruncated } = await ProductSearchRepository.findFacetProductIds({
      filters: parsedQuery.filters,
      searchPlan,
      scopedCategoryIds,
      scopedBrandId,
      forcedProductIds,
      scanLimit: limits.facetScanLimit,
    });

    if (!productIds.length) {
      return {
        brands: [],
        priceRange: { min: null, max: null },
        attributes: [],
      };
    }

    const [brandRows, priceRange, attributeRows] = await Promise.all([
      ProductSearchRepository.getBrandFacetsByProductIds(productIds),
      ProductSearchRepository.getPriceRangeByProductIds(productIds),
      ProductSearchRepository.getAttributeFacetsByProductIds(productIds),
    ]);

    return {
      brands: brandRows.map((row) => ({
        id: Number(row.id),
        name: row.name,
        slug: row.slug,
        count: Number(row.count) || 0,
      })),
      priceRange,
      attributes: this.buildFacetAttributes(attributeRows),
      meta: {
        sampledProducts: productIds.length,
        isSampled: isTruncated,
      },
    };
  }

  static async listCatalog(query = {}, options = {}) {
    const limits = this.getCatalogLimits();
    const parsedQuery = parseCatalogQuery(query, {
      defaultLimit: limits.defaultLimit,
      maxLimit: limits.maxLimit,
      maxAttributes: limits.maxAttributeFilters,
      maxValuesPerAttribute: limits.maxValuesPerAttribute,
    });

    if (options.categorySlug) {
      parsedQuery.filters.categorySlug = String(options.categorySlug).trim().toLowerCase();

      if (typeof query.includeChildren === 'undefined' && options.defaultIncludeChildren === true) {
        parsedQuery.filters.includeChildren = true;
      }
    }

    if (options.brandSlug) {
      parsedQuery.filters.brandSlug = String(options.brandSlug).trim().toLowerCase();
      parsedQuery.filters.brandId = null;
    }

    this.assertSortCompatibility(parsedQuery);

    if (parsedQuery.filters.search) {
      SearchService.assertSearchEnabled();
    }

    const [scopedCategoryIds, scopedBrandId, forcedProductIds] = await Promise.all([
      this.resolveCategoryScope({
        categorySlug: parsedQuery.filters.categorySlug,
        includeChildren: parsedQuery.filters.includeChildren,
        strict: Boolean(options.strictCategory),
      }),
      this.resolveBrandScope({
        brandSlug: parsedQuery.filters.brandSlug,
        brandId: parsedQuery.filters.brandId,
        strict: Boolean(options.strictBrand),
      }),
      ProductSearchRepository.findProductIdsByAttributeGroups(parsedQuery.filters.attributes),
    ]);

    if (Array.isArray(scopedCategoryIds) && scopedCategoryIds.length === 0) {
      return this.buildEmptyResult(parsedQuery);
    }

    if (scopedBrandId === 0) {
      return this.buildEmptyResult(parsedQuery);
    }

    if (Array.isArray(forcedProductIds) && forcedProductIds.length === 0) {
      return this.buildEmptyResult(parsedQuery);
    }

    const searchPlan = SearchService.buildKeywordPlan(parsedQuery.filters.search);

    const [{ rows, count }, facets] = await Promise.all([
      ProductSearchRepository.searchCatalog({
        filters: parsedQuery.filters,
        sort: parsedQuery.sort,
        pagination: parsedQuery.pagination,
        searchPlan,
        scopedCategoryIds,
        scopedBrandId: scopedBrandId || null,
        forcedProductIds,
      }),
      this.buildFacets({
        parsedQuery,
        searchPlan,
        scopedCategoryIds,
        scopedBrandId: scopedBrandId || null,
        forcedProductIds,
      }),
    ]);

    return this.buildResponse({
      rows,
      count,
      parsedQuery,
      facets,
    });
  }

  static async searchProducts(query = {}) {
    SearchService.assertSearchEnabled();
    return this.listCatalog(query);
  }

  static async listByCategorySlug(slug, query = {}) {
    return this.listCatalog(query, {
      categorySlug: slug,
      strictCategory: true,
      defaultIncludeChildren: true,
    });
  }

  static async listByBrandSlug(slug, query = {}) {
    return this.listCatalog(query, {
      brandSlug: slug,
      strictBrand: true,
    });
  }

  static async getRelatedProducts(productId, query = {}) {
    if (env.CATALOG_RECOMMENDATIONS_ENABLED === false) {
      throw ApiError.forbidden('Recommendations are currently disabled');
    }

    const limits = this.getCatalogLimits();
    const { limit } = parseRelatedQuery(query, {
      defaultLimit: limits.relatedLimit,
      maxLimit: limits.relatedLimit,
    });

    const numericProductId = Number(productId);

    if (!Number.isFinite(numericProductId)) {
      throw ApiError.badRequest('Invalid product id');
    }

    const product = await CatalogRepository.findProductBaseById(numericProductId);

    if (!product || product.status !== 'active') {
      throw ApiError.notFound('Product not found');
    }

    const [categoryIds, attributeValueIds] = await Promise.all([
      CatalogRepository.findCategoryIdsByProductId(product.id),
      CatalogRepository.findAttributeValueIdsByProductId(product.id),
    ]);

    const candidateBatchLimit = Math.max(limit * 3, limit);

    const [categoryMatches, brandMatches, attributeMatches] = await Promise.all([
      CatalogRepository.findRelatedByCategory({
        categoryIds,
        excludeProductId: product.id,
        limit: candidateBatchLimit,
      }),
      CatalogRepository.findRelatedByBrand({
        brandId: product.brandId,
        excludeProductId: product.id,
        limit: candidateBatchLimit,
      }),
      CatalogRepository.findRelatedByAttributes({
        attributeValueIds,
        excludeProductId: product.id,
        limit: candidateBatchLimit,
      }),
    ]);

    const scoreByProduct = new Map();

    const applyScore = (rows, scoreResolver) => {
      rows.forEach((row) => {
        const id = Number(row.productId);

        if (!Number.isFinite(id) || id === product.id) {
          return;
        }

        const nextScore = Number(scoreResolver(row)) || 0;
        scoreByProduct.set(id, (scoreByProduct.get(id) || 0) + nextScore);
      });
    };

    applyScore(categoryMatches, () => 40);
    applyScore(brandMatches, () => 30);
    applyScore(attributeMatches, (row) => (Number(row.sharedCount) || 1) * 12);

    if (scoreByProduct.size < limit) {
      const fallbackRows = await CatalogRepository.findPopularFallback({
        excludeProductId: product.id,
        limit: candidateBatchLimit,
      });

      applyScore(fallbackRows, (row) => {
        const popularity = Number(row.popularityScore) || 0;
        return popularity > 0 ? Math.min(20, popularity) : 1;
      });
    }

    const rankedIds = [...scoreByProduct.entries()]
      .sort((left, right) => {
        if (right[1] !== left[1]) {
          return right[1] - left[1];
        }

        return right[0] - left[0];
      })
      .slice(0, limit)
      .map(([id]) => id);

    return ProductSearchRepository.findProductsByIds(rankedIds);
  }
}

module.exports = CatalogDiscoveryService;
