const ApiError = require('../../../core/errors/ApiError');
const { sequelize } = require('../../../database/models');
const { parsePagination, buildPaginationMeta } = require('../../../utils/pagination');
const { parseSort, parseAttributeFilters } = require('../../../utils/filtering');
const { generateSlug } = require('../../../utils/slug');
const ProductRepository = require('../repositories/product.repository');

const DEFAULT_SORT = {
  sortBy: 'createdAt',
  sortOrder: 'DESC',
};

const ALLOWED_SORT_FIELDS = ['price', 'stock', 'title', 'createdAt'];

class ProductService {
  static async create(payload) {
    return sequelize.transaction(async (transaction) => {
      await this.ensureBrandExists(payload.brandId, { transaction });
      await this.ensureCategoriesExist(payload.categoryIds || [], { transaction });

      const slug = await this.generateUniqueProductSlug(payload.slug || payload.title, null, { transaction });
      const normalizedAttributes = await this.normalizeAttributes(payload.attributes || [], { transaction });
      const normalizedVariants = await this.normalizeVariants({
        variants: payload.variants || [],
        productType: payload.productType,
        skuPrefix: payload.skuPrefix,
        normalizedAttributes,
        transaction,
      });

      const product = await ProductRepository.create(
        {
          title: payload.title,
          slug,
          description: payload.description,
          shortDescription: payload.shortDescription,
          skuPrefix: payload.skuPrefix,
          brandId: payload.brandId,
          productType: payload.productType || 'simple',
          status: payload.status || 'active',
          thumbnail: payload.thumbnail,
          seoTitle: payload.seoTitle,
          seoDescription: payload.seoDescription,
        },
        { transaction }
      );

      await ProductRepository.replaceProductCategories(product.id, payload.categoryIds || [], { transaction });
      await ProductRepository.replaceProductAttributes(product.id, this.toProductAttributeRows(product.id, normalizedAttributes), {
        transaction,
      });

      const variantIdBySku = await this.persistVariants(product.id, normalizedVariants, { transaction });
      await ProductRepository.replaceProductMedia(product.id, this.toMediaRows(product.id, payload.media || [], variantIdBySku), {
        transaction,
      });
      await ProductRepository.replaceProductMeta(product.id, this.toMetaRows(product.id, payload.meta), { transaction });

      return ProductRepository.findById(product.id, { transaction });
    });
  }

  static async list(query) {
    const { page, limit, offset } = parsePagination(query);
    const { sortBy, sortOrder } = this.resolveSort(query.sort);
    const attributeFilters = parseAttributeFilters(query.attribute);
    const productIds = await ProductRepository.findProductIdsByAttributeFilters(attributeFilters);

    const { rows, count } = await ProductRepository.list({
      search: query.search,
      status: query.status,
      productType: query.productType,
      category: query.category,
      brand: query.brand,
      productIds,
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

  static async search(query) {
    return this.list(query);
  }

  static async getById(id) {
    const product = await ProductRepository.findById(id);

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    return product;
  }

  static async update(id, payload) {
    return sequelize.transaction(async (transaction) => {
      const product = await ProductRepository.findByIdBasic(id, { transaction });

      if (!product) {
        throw ApiError.notFound('Product not found');
      }

      await this.ensureBrandExists(payload.brandId, { transaction });

      const nextPayload = {
        title: payload.title,
        description: payload.description,
        shortDescription: payload.shortDescription,
        skuPrefix: payload.skuPrefix,
        brandId: payload.brandId,
        productType: payload.productType,
        status: payload.status,
        thumbnail: payload.thumbnail,
        seoTitle: payload.seoTitle,
        seoDescription: payload.seoDescription,
      };

      if (payload.slug) {
        nextPayload.slug = await this.generateUniqueProductSlug(payload.slug, product.id, { transaction });
      } else if (payload.title && payload.title !== product.title) {
        nextPayload.slug = await this.generateUniqueProductSlug(payload.title, product.id, { transaction });
      }

      await ProductRepository.update(product, this.removeUndefined(nextPayload), { transaction });

      if (payload.categoryIds) {
        await this.ensureCategoriesExist(payload.categoryIds, { transaction });
        await ProductRepository.replaceProductCategories(product.id, payload.categoryIds, { transaction });
      }

      let normalizedAttributes = null;

      if (payload.attributes) {
        normalizedAttributes = await this.normalizeAttributes(payload.attributes, { transaction });
        await ProductRepository.replaceProductAttributes(
          product.id,
          this.toProductAttributeRows(product.id, normalizedAttributes),
          { transaction }
        );
      }

      let variantIdBySku = null;

      if (payload.variants) {
        const attributesForVariants = normalizedAttributes || await this.getExistingNormalizedAttributes(product.id, { transaction });

        await ProductRepository.deleteVariantsByProductId(product.id, { transaction });

        const normalizedVariants = await this.normalizeVariants({
          variants: payload.variants,
          productType: payload.productType || product.productType,
          skuPrefix: payload.skuPrefix || product.skuPrefix,
          normalizedAttributes: attributesForVariants,
          transaction,
        });
        variantIdBySku = await this.persistVariants(product.id, normalizedVariants, { transaction });
      }

      if (payload.media) {
        let finalVariantMap = variantIdBySku;

        if (!finalVariantMap || finalVariantMap.size === 0) {
          const existingVariants = await ProductRepository.findVariantsByProductId(product.id, { transaction });
          finalVariantMap = new Map(existingVariants.map((variant) => [variant.sku, variant.id]));
        }

        await ProductRepository.replaceProductMedia(product.id, this.toMediaRows(product.id, payload.media, finalVariantMap), {
          transaction,
        });
      }

      if (payload.meta) {
        await ProductRepository.replaceProductMeta(product.id, this.toMetaRows(product.id, payload.meta), { transaction });
      }

      return ProductRepository.findById(product.id, { transaction });
    });
  }

  static async delete(id) {
    return sequelize.transaction(async (transaction) => {
      const product = await ProductRepository.findByIdBasic(id, { transaction });

      if (!product) {
        throw ApiError.notFound('Product not found');
      }

      await ProductRepository.delete(product, { transaction });
    });
  }

  static async ensureBrandExists(brandId, { transaction } = {}) {
    if (!brandId) {
      return;
    }

    const brand = await ProductRepository.findBrandById(brandId, { transaction });

    if (!brand) {
      throw ApiError.badRequest('Brand not found');
    }
  }

  static async ensureCategoriesExist(categoryIds, { transaction } = {}) {
    if (!categoryIds?.length) {
      return;
    }

    const categories = await ProductRepository.findCategoriesByIds(categoryIds, { transaction });

    if (categories.length !== categoryIds.length) {
      throw ApiError.badRequest('One or more categories do not exist');
    }
  }

  static async normalizeAttributes(attributes, { transaction } = {}) {
    const normalized = [];

    for (const attribute of attributes) {
      const name = String(attribute.name || '').trim();

      if (!name) {
        throw ApiError.badRequest('Attribute name is required');
      }

      const code = generateSlug(attribute.code || name, 'attribute');

      let savedAttribute = await ProductRepository.findAttributeByCode(code, { transaction });

      if (!savedAttribute) {
        savedAttribute = await ProductRepository.createAttribute(
          {
            name,
            code,
            inputType: attribute.inputType || 'select',
            isFilterable: attribute.isFilterable !== false,
            isVariantAxis: Boolean(attribute.isVariantAxis),
            status: 'active',
          },
          { transaction }
        );
      } else {
        savedAttribute = await ProductRepository.updateAttribute(
          savedAttribute,
          {
            name,
            inputType: attribute.inputType || savedAttribute.inputType,
            isFilterable: attribute.isFilterable ?? savedAttribute.isFilterable,
            isVariantAxis: attribute.isVariantAxis ?? savedAttribute.isVariantAxis,
          },
          { transaction }
        );
      }

      const values = await this.normalizeAttributeValues(savedAttribute.id, attribute.values || [], { transaction });

      normalized.push({
        attributeId: savedAttribute.id,
        attributeCode: savedAttribute.code,
        isRequired: Boolean(attribute.isRequired),
        isVariantAxis: Boolean(attribute.isVariantAxis),
        values,
      });
    }

    return normalized;
  }

  static async normalizeAttributeValues(attributeId, values, { transaction } = {}) {
    const normalizedValues = [];

    for (const entry of values) {
      const valueLabel = typeof entry === 'string' ? entry : entry.value;
      const cleanValue = String(valueLabel || '').trim();

      if (!cleanValue) {
        continue;
      }

      const valueSlug = generateSlug(typeof entry === 'string' ? entry : entry.slug || cleanValue, 'value');
      let savedValue = await ProductRepository.findAttributeValue(attributeId, valueSlug, { transaction });

      if (!savedValue) {
        savedValue = await ProductRepository.createAttributeValue(
          {
            attributeId,
            value: cleanValue,
            valueSlug,
            sortOrder: typeof entry === 'object' && Number.isInteger(entry.sortOrder) ? entry.sortOrder : 0,
          },
          { transaction }
        );
      }

      normalizedValues.push({
        id: savedValue.id,
        value: savedValue.value,
        valueSlug: savedValue.valueSlug,
      });
    }

    return normalizedValues;
  }

  static async normalizeVariants({ variants, productType, skuPrefix, normalizedAttributes, transaction }) {
    const resolvedType = productType || 'simple';

    if (resolvedType === 'simple' && variants.length !== 1) {
      throw ApiError.badRequest('Simple products must contain exactly one variant');
    }

    if (resolvedType === 'variant' && variants.length < 1) {
      throw ApiError.badRequest('Variant products must contain at least one variant');
    }

    const valueIndex = this.buildAttributeValueIndex(normalizedAttributes);
    const localSkuSet = new Set();
    const normalizedVariants = [];

    for (let i = 0; i < variants.length; i += 1) {
      const variant = variants[i];
      const fallbackSku = `${skuPrefix || 'SKU'}-${String(i + 1).padStart(3, '0')}`;
      const sku = String(variant.sku || fallbackSku).trim();

      if (!sku) {
        throw ApiError.badRequest('Variant sku is required');
      }

      if (localSkuSet.has(sku)) {
        throw ApiError.badRequest(`Duplicate variant sku detected: ${sku}`);
      }

      await this.ensureVariantSkuAvailable(sku, { transaction });
      localSkuSet.add(sku);

      const attributeValueLinks = this.resolveVariantAttributeValues(variant.attributeValues || [], valueIndex);
      const quantity = Number.isFinite(Number(variant.stock))
        ? Number(variant.stock)
        : Number.isFinite(Number(variant.inventory?.quantity))
          ? Number(variant.inventory.quantity)
          : 0;

      normalizedVariants.push({
        sku,
        title: variant.title || null,
        price: Number(variant.price),
        comparePrice: variant.comparePrice ?? null,
        costPrice: variant.costPrice ?? null,
        status: variant.status || 'active',
        image: variant.image || null,
        barcode: variant.barcode || null,
        position: Number.isInteger(variant.position) ? variant.position : i,
        quantity,
        reservedQuantity: Number.isFinite(Number(variant.inventory?.reservedQuantity))
          ? Number(variant.inventory.reservedQuantity)
          : 0,
        lowStockThreshold: Number.isFinite(Number(variant.inventory?.lowStockThreshold))
          ? Number(variant.inventory.lowStockThreshold)
          : null,
        allowBackorder: Boolean(variant.inventory?.allowBackorder),
        attributeValueLinks,
      });
    }

    return normalizedVariants;
  }

  static buildAttributeValueIndex(normalizedAttributes) {
    const byAttributeCode = new Map();
    const byGlobalValue = new Map();

    normalizedAttributes.forEach((attribute) => {
      const valueMap = new Map();

      attribute.values.forEach((value) => {
        const node = {
          attributeId: attribute.attributeId,
          attributeCode: attribute.attributeCode,
          attributeValueId: value.id,
          valueSlug: value.valueSlug,
          value: value.value,
        };

        valueMap.set(value.valueSlug.toLowerCase(), node);
        valueMap.set(String(value.value).toLowerCase(), node);

        const globalKey = String(value.value).toLowerCase();
        const bucket = byGlobalValue.get(globalKey) || [];
        bucket.push(node);
        byGlobalValue.set(globalKey, bucket);
      });

      byAttributeCode.set(attribute.attributeCode.toLowerCase(), valueMap);
    });

    return {
      byAttributeCode,
      byGlobalValue,
    };
  }

  static resolveVariantAttributeValues(attributeValues, valueIndex) {
    const resolved = [];
    const uniqueAttributeIds = new Set();

    for (const rawValue of attributeValues) {
      const resolvedValue = this.resolveSingleVariantAttributeValue(rawValue, valueIndex);

      if (!resolvedValue) {
        continue;
      }

      if (uniqueAttributeIds.has(resolvedValue.attributeId)) {
        throw ApiError.badRequest(
          `Duplicate variant attribute value for attribute: ${resolvedValue.attributeCode}`
        );
      }

      uniqueAttributeIds.add(resolvedValue.attributeId);
      resolved.push(resolvedValue);
    }

    return resolved;
  }

  static resolveSingleVariantAttributeValue(rawValue, valueIndex) {
    if (typeof rawValue === 'string') {
      const text = rawValue.trim();

      if (!text) {
        return null;
      }

      if (text.includes(':')) {
        const [rawCode, rawActualValue] = text.split(':');
        return this.resolveByAttributeCode(rawCode, rawActualValue, valueIndex);
      }

      const candidates = valueIndex.byGlobalValue.get(text.toLowerCase()) || [];

      if (candidates.length === 0) {
        throw ApiError.badRequest(`Unknown variant attribute value: ${text}`);
      }

      if (candidates.length > 1) {
        throw ApiError.badRequest(`Ambiguous variant attribute value: ${text}. Use attribute:value format.`);
      }

      return candidates[0];
    }

    if (typeof rawValue === 'object' && rawValue) {
      const code = rawValue.attribute || rawValue.code || rawValue.name;
      const value = rawValue.value || rawValue.slug;

      return this.resolveByAttributeCode(code, value, valueIndex);
    }

    return null;
  }

  static resolveByAttributeCode(code, value, valueIndex) {
    const normalizedCode = String(code || '').trim().toLowerCase();
    const normalizedValue = String(value || '').trim().toLowerCase();

    if (!normalizedCode || !normalizedValue) {
      throw ApiError.badRequest('Invalid variant attribute value reference');
    }

    const attributeValues = valueIndex.byAttributeCode.get(normalizedCode);

    if (!attributeValues) {
      throw ApiError.badRequest(`Unknown attribute in variant: ${code}`);
    }

    const resolved = attributeValues.get(normalizedValue);

    if (!resolved) {
      throw ApiError.badRequest(`Unknown value '${value}' for attribute '${code}'`);
    }

    return resolved;
  }

  static async persistVariants(productId, normalizedVariants, { transaction } = {}) {
    const variantIdBySku = new Map();

    for (const variant of normalizedVariants) {
      const savedVariant = await ProductRepository.createVariant(
        {
          productId,
          sku: variant.sku,
          title: variant.title,
          price: variant.price,
          comparePrice: variant.comparePrice,
          costPrice: variant.costPrice,
          status: variant.status,
          image: variant.image,
          barcode: variant.barcode,
          position: variant.position,
        },
        { transaction }
      );

      await ProductRepository.createInventory(
        {
          variantId: savedVariant.id,
          quantity: variant.quantity,
          reservedQuantity: variant.reservedQuantity,
          lowStockThreshold: variant.lowStockThreshold,
          allowBackorder: variant.allowBackorder,
        },
        { transaction }
      );

      await ProductRepository.bulkCreateVariantAttributeValues(
        variant.attributeValueLinks.map((entry) => ({
          variantId: savedVariant.id,
          attributeId: entry.attributeId,
          attributeValueId: entry.attributeValueId,
        })),
        { transaction }
      );

      variantIdBySku.set(savedVariant.sku, savedVariant.id);
    }

    return variantIdBySku;
  }

  static toProductAttributeRows(productId, normalizedAttributes) {
    return normalizedAttributes.map((attribute) => ({
      productId,
      attributeId: attribute.attributeId,
      isRequired: attribute.isRequired,
      isVariantAxis: attribute.isVariantAxis,
    }));
  }

  static toMediaRows(productId, mediaItems, variantIdBySku = new Map()) {
    return mediaItems.map((item, index) => {
      if (item.variantSku && !variantIdBySku.has(item.variantSku)) {
        throw ApiError.badRequest(`Unknown variant sku in media payload: ${item.variantSku}`);
      }

      const variantId = item.variantSku ? variantIdBySku.get(item.variantSku) || null : null;

      return {
        productId,
        variantId,
        url: item.url,
        mediaType: item.mediaType || 'image',
        altText: item.altText || null,
        position: Number.isInteger(item.position) ? item.position : index,
      };
    });
  }

  static toMetaRows(productId, meta) {
    if (!meta || (typeof meta === 'object' && Object.keys(meta).length === 0)) {
      return [];
    }

    if (Array.isArray(meta)) {
      return meta.map((entry) => ({
        productId,
        metaKey: entry.key,
        metaValue: this.serializeMetaValue(entry.value),
        valueType: this.detectMetaType(entry.value),
      }));
    }

    return Object.entries(meta).map(([key, value]) => ({
      productId,
      metaKey: key,
      metaValue: this.serializeMetaValue(value),
      valueType: this.detectMetaType(value),
    }));
  }

  static detectMetaType(value) {
    if (typeof value === 'number') {
      return 'number';
    }

    if (typeof value === 'boolean') {
      return 'boolean';
    }

    if (value && typeof value === 'object') {
      return 'json';
    }

    return 'string';
  }

  static serializeMetaValue(value) {
    if (value === null || typeof value === 'undefined') {
      return null;
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  static resolveSort(sort) {
    const normalizedSort = String(sort || '').replace(/^createdat_/i, 'createdAt_');

    return parseSort(normalizedSort, {
      allowedFields: ALLOWED_SORT_FIELDS,
      defaultSort: DEFAULT_SORT,
    });
  }

  static async ensureVariantSkuAvailable(sku, { transaction } = {}) {
    const existingVariant = await ProductRepository.findOneByVariantSku(sku, null, { transaction });

    if (existingVariant) {
      throw ApiError.badRequest(`Variant SKU already exists: ${sku}`);
    }
  }

  static async generateUniqueProductSlug(seed, excludeId = null, { transaction } = {}) {
    const baseSlug = generateSlug(seed, 'product');
    let candidateSlug = baseSlug;
    let counter = 1;

    while (await ProductRepository.findOneBySlug(candidateSlug, excludeId, { transaction })) {
      candidateSlug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    return candidateSlug;
  }

  static async getExistingNormalizedAttributes(productId, { transaction } = {}) {
    const product = await ProductRepository.findById(productId, { transaction });

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    return (product.productAttributes || []).map((entry) => ({
      attributeId: entry.attribute?.id,
      attributeCode: entry.attribute?.code,
      isRequired: entry.isRequired,
      isVariantAxis: entry.isVariantAxis,
      values: (entry.attribute?.values || []).map((value) => ({
        id: value.id,
        value: value.value,
        valueSlug: value.valueSlug,
      })),
    }));
  }

  static removeUndefined(payload) {
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => typeof value !== 'undefined'));
  }
}

module.exports = ProductService;
