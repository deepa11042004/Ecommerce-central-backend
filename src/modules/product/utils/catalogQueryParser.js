const ApiError = require('../../../core/errors/ApiError');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const DEFAULT_MAX_LIMIT = 60;
const DEFAULT_MAX_ATTRIBUTE_FILTERS = 12;
const DEFAULT_MAX_VALUES_PER_ATTRIBUTE = 20;
const DEFAULT_SUGGESTION_LIMIT = 8;
const DEFAULT_RELATED_LIMIT = 12;

const SORT_MAP = Object.freeze({
  relevance: { key: 'relevance', direction: 'DESC' },
  price_asc: { key: 'price', direction: 'ASC' },
  price_desc: { key: 'price', direction: 'DESC' },
  newest: { key: 'createdAt', direction: 'DESC' },
  oldest: { key: 'createdAt', direction: 'ASC' },
  name_asc: { key: 'title', direction: 'ASC' },
  name_desc: { key: 'title', direction: 'DESC' },
  discount_desc: { key: 'discount', direction: 'DESC' },
  popular: { key: 'popular', direction: 'DESC' },
  rating: { key: 'rating', direction: 'DESC' },
  title_asc: { key: 'title', direction: 'ASC' },
  title_desc: { key: 'title', direction: 'DESC' },
  createdat_asc: { key: 'createdAt', direction: 'ASC' },
  createdat_desc: { key: 'createdAt', direction: 'DESC' },
});

const BOOLEAN_TRUE_SET = new Set(['true', '1', 'yes', 'on']);
const BOOLEAN_FALSE_SET = new Set(['false', '0', 'no', 'off']);

const toInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseBoolean = (value, fallback = null) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (BOOLEAN_TRUE_SET.has(normalized)) {
    return true;
  }

  if (BOOLEAN_FALSE_SET.has(normalized)) {
    return false;
  }

  return fallback;
};

const normalizeToken = (value, { maxLength = 160 } = {}) => {
  const raw = String(value || '').trim();

  if (!raw) {
    return '';
  }

  if (raw.length > maxLength) {
    throw ApiError.badRequest(`Filter token length exceeds ${maxLength} characters`);
  }

  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const normalizeSearchText = (value, { maxLength = 120 } = {}) => {
  const text = String(value || '').trim();

  if (!text) {
    return '';
  }

  if (text.length > maxLength) {
    throw ApiError.badRequest(`Search keyword cannot exceed ${maxLength} characters`);
  }

  return text;
};

const parsePagination = (query = {}, options = {}) => {
  const maxLimit = Number.isFinite(Number(options.maxLimit))
    ? Math.max(Number(options.maxLimit), 1)
    : DEFAULT_MAX_LIMIT;
  const defaultLimit = Number.isFinite(Number(options.defaultLimit))
    ? Math.min(Math.max(Number(options.defaultLimit), 1), maxLimit)
    : DEFAULT_LIMIT;

  const page = Math.max(toInteger(query.page, DEFAULT_PAGE), 1);
  const rawLimit = Math.max(toInteger(query.limit, defaultLimit), 1);
  const limit = Math.min(rawLimit, maxLimit);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

const parseSort = ({ sort, hasSearch }) => {
  const normalizedSort = String(sort || '').trim().toLowerCase();

  if (!normalizedSort) {
    return hasSearch ? SORT_MAP.relevance : SORT_MAP.newest;
  }

  const mapped = SORT_MAP[normalizedSort];

  if (!mapped) {
    throw ApiError.badRequest('Invalid sort parameter');
  }

  if (mapped.key === 'relevance' && !hasSearch) {
    return SORT_MAP.newest;
  }

  return mapped;
};

const parseAttributeFilters = (
  attributeQuery,
  {
    maxAttributes = DEFAULT_MAX_ATTRIBUTE_FILTERS,
    maxValuesPerAttribute = DEFAULT_MAX_VALUES_PER_ATTRIBUTE,
  } = {}
) => {
  if (!attributeQuery) {
    return [];
  }

  const entries = Array.isArray(attributeQuery) ? attributeQuery : [attributeQuery];
  const groupedValues = new Map();

  entries.forEach((entry) => {
    const rawEntry = String(entry || '').trim();

    if (!rawEntry) {
      return;
    }

    const dividerIndex = rawEntry.indexOf(':');

    if (dividerIndex === -1) {
      throw ApiError.badRequest(`Invalid attribute filter format: ${rawEntry}`);
    }

    const rawCode = rawEntry.slice(0, dividerIndex).trim();
    const rawValues = rawEntry.slice(dividerIndex + 1).trim();

    const code = normalizeToken(rawCode, { maxLength: 140 });

    if (!code) {
      throw ApiError.badRequest('Attribute code is required in attribute filter');
    }

    const values = rawValues
      .split(',')
      .map((value) => normalizeToken(value, { maxLength: 190 }))
      .filter(Boolean);

    if (!values.length) {
      throw ApiError.badRequest(`Attribute values are required for: ${rawCode}`);
    }

    const targetSet = groupedValues.get(code) || new Set();

    values.forEach((value) => {
      if (targetSet.size >= maxValuesPerAttribute) {
        throw ApiError.badRequest(`Too many values for attribute '${code}'`);
      }

      targetSet.add(value);
    });

    groupedValues.set(code, targetSet);
  });

  if (groupedValues.size > maxAttributes) {
    throw ApiError.badRequest(`Too many attribute filters. Max allowed is ${maxAttributes}`);
  }

  return Array.from(groupedValues.entries()).map(([code, values]) => ({
    code,
    values: Array.from(values),
  }));
};

const parseAvailability = (query = {}) => {
  const inStock = parseBoolean(query.inStock, null);

  if (typeof inStock === 'boolean') {
    return inStock ? 'in_stock' : 'out_of_stock';
  }

  const availability = String(query.availability || '').trim().toLowerCase();

  if (!availability || availability === 'all') {
    return 'all';
  }

  if (availability === 'in_stock' || availability === 'out_of_stock') {
    return availability;
  }

  throw ApiError.badRequest('Invalid availability value');
};

const parsePriceRange = (query = {}) => {
  const minPrice = toNumber(query.minPrice);
  const maxPrice = toNumber(query.maxPrice);

  if (minPrice !== null && minPrice < 0) {
    throw ApiError.badRequest('minPrice cannot be negative');
  }

  if (maxPrice !== null && maxPrice < 0) {
    throw ApiError.badRequest('maxPrice cannot be negative');
  }

  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    throw ApiError.badRequest('minPrice cannot be greater than maxPrice');
  }

  return {
    min: minPrice,
    max: maxPrice,
  };
};

const parseCatalogQuery = (query = {}, options = {}) => {
  const pagination = parsePagination(query, {
    defaultLimit: options.defaultLimit || DEFAULT_LIMIT,
    maxLimit: options.maxLimit || DEFAULT_MAX_LIMIT,
  });
  const search = normalizeSearchText(query.search, { maxLength: 120 });
  const includeChildren = parseBoolean(query.includeChildren, false);
  const includeFacets = parseBoolean(query.includeFacets, true) !== false;
  const discountedOnly = parseBoolean(query.discounted, false) === true;
  const attributes = parseAttributeFilters(query.attribute, {
    maxAttributes: options.maxAttributes,
    maxValuesPerAttribute: options.maxValuesPerAttribute,
  });

  const ratingMin = toNumber(query.ratingMin);

  if (ratingMin !== null && (ratingMin < 0 || ratingMin > 5)) {
    throw ApiError.badRequest('ratingMin must be between 0 and 5');
  }

  const brandRaw = query.brand || query.brandSlug || '';
  const brandIdParsed = toInteger(query.brandId, null);
  const brandRawAsNumber = toInteger(brandRaw, null);
  const inferredBrandId = typeof brandRaw === 'number' || /^\d+$/.test(String(brandRaw || '').trim())
    ? brandRawAsNumber
    : null;
  const categorySlug = normalizeToken(query.category || query.categorySlug, { maxLength: 160 }) || null;

  return {
    pagination,
    filters: {
      search,
      categorySlug,
      includeChildren,
      brandId: Number.isInteger(brandIdParsed) && brandIdParsed > 0
        ? brandIdParsed
        : (Number.isInteger(inferredBrandId) && inferredBrandId > 0 ? inferredBrandId : null),
      brandSlug: Number.isInteger(inferredBrandId) && inferredBrandId > 0
        ? null
        : (normalizeToken(brandRaw, { maxLength: 140 }) || null),
      priceRange: parsePriceRange(query),
      availability: parseAvailability(query),
      discountedOnly,
      status: query.status ? String(query.status).trim().toLowerCase() : null,
      productType: query.productType ? String(query.productType).trim().toLowerCase() : null,
      hasVariants: parseBoolean(query.hasVariants, null),
      attributes,
      ratingMin,
    },
    sort: parseSort({
      sort: query.sort,
      hasSearch: Boolean(search),
    }),
    includeFacets,
  };
};

const parseSuggestionQuery = (query = {}, options = {}) => {
  const defaultLimit = Number.isInteger(options.defaultLimit) ? options.defaultLimit : DEFAULT_SUGGESTION_LIMIT;
  const maxLimit = Number.isInteger(options.maxLimit) ? options.maxLimit : DEFAULT_SUGGESTION_LIMIT;
  const q = normalizeSearchText(query.q || query.search, { maxLength: 100 });

  if (!q) {
    throw ApiError.badRequest('q query parameter is required');
  }

  const limit = Math.min(Math.max(toInteger(query.limit, defaultLimit), 1), Math.max(maxLimit, 1));

  return {
    q,
    limit,
  };
};

const parseRelatedQuery = (query = {}, options = {}) => {
  const defaultLimit = Number.isInteger(options.defaultLimit) ? options.defaultLimit : DEFAULT_RELATED_LIMIT;
  const maxLimit = Number.isInteger(options.maxLimit) ? options.maxLimit : DEFAULT_RELATED_LIMIT;

  return {
    limit: Math.min(Math.max(toInteger(query.limit, defaultLimit), 1), Math.max(maxLimit, 1)),
  };
};

module.exports = {
  parseCatalogQuery,
  parseSuggestionQuery,
  parseRelatedQuery,
};
