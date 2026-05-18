const slugify = require('slugify');
const ApiError = require('../../../core/errors/ApiError');
const { parsePagination, buildPaginationMeta } = require('../../../utils/pagination');
const ProductRepository = require('../repositories/product.repository');

const DEFAULT_SORT = {
  sortBy: 'createdAt',
  sortOrder: 'DESC',
};

const ALLOWED_SORT_FIELDS = new Set(['price', 'createdAt', 'stock', 'title']);
const ALLOWED_SORT_ORDERS = new Set(['ASC', 'DESC']);

const normalizeSortField = (field) => {
  if (!field) {
    return null;
  }

  if (field.toLowerCase() === 'createdat') {
    return 'createdAt';
  }

  return field;
};

class ProductService {
  static async create(payload) {
    await this.ensureSkuAvailable(payload.sku);

    const slug = await this.generateUniqueSlug(payload.slug || payload.title);

    return ProductRepository.create({
      ...payload,
      slug,
    });
  }

  static async list(query) {
    const { page, limit, offset } = parsePagination(query);
    const { sortBy, sortOrder } = this.parseSort(query.sort);

    const { rows, count } = await ProductRepository.list({
      search: query.search,
      status: query.status,
      sortBy,
      sortOrder,
      limit,
      offset,
    });

    return {
      items: rows,
      meta: buildPaginationMeta({
        page,
        limit,
        totalItems: count,
      }),
    };
  }

  static async getById(id) {
    const product = await ProductRepository.findById(id);

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    return product;
  }

  static async update(id, payload) {
    const product = await this.getById(id);

    if (payload.sku && payload.sku !== product.sku) {
      await this.ensureSkuAvailable(payload.sku, product.id);
    }

    const nextPayload = { ...payload };

    if (payload.slug) {
      nextPayload.slug = await this.generateUniqueSlug(payload.slug, product.id);
    } else if (payload.title && payload.title !== product.title) {
      nextPayload.slug = await this.generateUniqueSlug(payload.title, product.id);
    }

    return ProductRepository.update(product, nextPayload);
  }

  static async delete(id) {
    const product = await this.getById(id);
    await ProductRepository.delete(product);
  }

  static parseSort(sort) {
    if (!sort) {
      return DEFAULT_SORT;
    }

    const [rawField, rawOrder] = String(sort).split('_');
    const normalizedField = normalizeSortField(rawField);
    const sortOrder = (rawOrder || 'desc').toUpperCase();

    if (!ALLOWED_SORT_FIELDS.has(normalizedField)) {
      return DEFAULT_SORT;
    }

    if (!ALLOWED_SORT_ORDERS.has(sortOrder)) {
      return DEFAULT_SORT;
    }

    return {
      sortBy: normalizedField,
      sortOrder,
    };
  }

  static async ensureSkuAvailable(sku, excludeId = null) {
    const existing = await ProductRepository.findOneBySku(sku, excludeId);

    if (existing) {
      throw ApiError.badRequest('SKU already exists');
    }
  }

  static async generateUniqueSlug(seed, excludeId = null) {
    let baseSlug = slugify(String(seed || ''), {
      lower: true,
      strict: true,
      trim: true,
    });

    if (!baseSlug) {
      baseSlug = `product-${Date.now()}`;
    }

    let candidateSlug = baseSlug;
    let counter = 1;

    while (await ProductRepository.findOneBySlug(candidateSlug, excludeId)) {
      candidateSlug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    return candidateSlug;
  }
}

module.exports = ProductService;
