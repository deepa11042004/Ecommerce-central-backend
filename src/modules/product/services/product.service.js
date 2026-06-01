const ApiError = require('../../../core/errors/ApiError');
const { sequelize } = require('../../../database/models');
const { generateSlug } = require('../../../utils/slug');
const MediaService = require('../../media/services/media.service');
const InventoryService = require('../../inventory/services/inventory.service');
const ProductRepository = require('../repositories/product.repository');
const CatalogDiscoveryService = require('./catalogDiscovery.service');

class ProductService {
  static async create(payload) {
    return sequelize.transaction(async (transaction) => {
      const hasVariants = this.resolveHasVariants(payload);
      const productType = hasVariants ? 'variant' : 'simple';
      const brandId = await this.resolveBrandId(payload, { transaction });
      const categoryIds = await this.resolveCategoryIds(payload, { transaction, fallbackCategoryIds: [] });

      if (!hasVariants) {
        this.ensureSimpleProductPayload(payload);
      }

      const slug = await this.generateUniqueProductSlug(payload.slug || payload.title, null, { transaction });
      const normalizedAttributes = hasVariants
        ? await this.normalizeAttributes(payload.attributes || [], { transaction })
        : [];
      const normalizedVariants = hasVariants
        ? await this.normalizeVariants({
            variants: payload.variants || [],
            productType,
            skuPrefix: payload.skuPrefix,
            normalizedAttributes,
            transaction,
          })
        : [];
      const simpleSku = !hasVariants ? await this.resolveSimpleProductSku(payload.sku, slug, null, { transaction }) : null;

      const product = await ProductRepository.create(
        {
          title: payload.title,
          slug,
          description: payload.description,
          shortDescription: payload.shortDescription,
          skuPrefix: payload.skuPrefix,
          brandId,
          productType,
          hasVariants,
          basePrice: hasVariants ? null : Number(payload.basePrice),
          comparePrice: hasVariants ? null : (payload.comparePrice ?? null),
          stock: hasVariants ? null : Number(payload.quantity),
          sku: simpleSku,
          status: payload.status || 'active',
          thumbnail: payload.thumbnail,
          seoTitle: payload.seoTitle,
          seoDescription: payload.seoDescription,
        },
        { transaction }
      );

      if (!hasVariants) {
        await InventoryService.upsertInventoryRecord({
          productId: product.id,
          quantity: Number(payload.quantity),
          reservedQuantity: 0,
          allowBackorder: false,
          transaction,
        });
      }

      await ProductRepository.replaceProductCategories(product.id, categoryIds, { transaction });
      await ProductRepository.replaceProductAttributes(product.id, this.toProductAttributeRows(product.id, normalizedAttributes), {
        transaction,
      });

      const variantIdBySku = normalizedVariants.length
        ? await this.persistVariants(product.id, normalizedVariants, { transaction })
        : new Map();
      await ProductRepository.replaceProductMedia(product.id, this.toMediaRows(product.id, payload.media || [], variantIdBySku), {
        transaction,
      });
      await ProductRepository.replaceProductMeta(product.id, this.toMetaRows(product.id, payload.meta), { transaction });

      return ProductRepository.findById(product.id, { transaction });
    });
  }

  static async list(query) {
    return CatalogDiscoveryService.listCatalog(query);
  }

  static async search(query) {
    return CatalogDiscoveryService.searchProducts(query);
  }

  static async related(id, query = {}) {
    return CatalogDiscoveryService.getRelatedProducts(id, query);
  }

  static async getById(id) {
    const product = await ProductRepository.findById(id);

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    return product;
  }

  static async update(id, payload) {
    const cleanupPaths = [];

    const updatedProduct = await sequelize.transaction(async (transaction) => {
      const product = await ProductRepository.findByIdBasic(id, { transaction });

      if (!product) {
        throw ApiError.notFound('Product not found');
      }

      const nextHasVariants = this.resolveHasVariants({
        hasVariants: payload.hasVariants,
        productType: payload.productType,
      }, product.hasVariants);
      const nextProductType = nextHasVariants ? 'variant' : 'simple';
      const nextBrandId = await this.resolveBrandId(payload, { transaction, fallbackBrandId: product.brandId });

      if (!nextHasVariants) {
        this.ensureSimpleProductPayload(
          {
            basePrice: payload.basePrice ?? product.basePrice,
            comparePrice: payload.comparePrice ?? product.comparePrice,
            quantity: payload.quantity ?? product.stock,
          },
          { allowNullableComparePrice: true }
        );
      }

      const nextPayload = {
        title: payload.title,
        description: payload.description,
        shortDescription: payload.shortDescription,
        skuPrefix: payload.skuPrefix,
        brandId: nextBrandId,
        productType: nextProductType,
        hasVariants: nextHasVariants,
        basePrice: nextHasVariants ? null : (payload.basePrice ?? product.basePrice),
        comparePrice: nextHasVariants ? null : (payload.comparePrice ?? product.comparePrice ?? null),
        stock: nextHasVariants ? null : (payload.quantity ?? product.stock),
        status: payload.status,
        thumbnail: payload.thumbnail,
        seoTitle: payload.seoTitle,
        seoDescription: payload.seoDescription,
      };

      const hasThumbnailUpdate = Object.prototype.hasOwnProperty.call(payload, 'thumbnail');

      if (hasThumbnailUpdate && product.thumbnail && payload.thumbnail !== product.thumbnail) {
        cleanupPaths.push(product.thumbnail);
      }

      if (payload.slug) {
        nextPayload.slug = await this.generateUniqueProductSlug(payload.slug, product.id, { transaction });
      } else if (payload.title && payload.title !== product.title) {
        nextPayload.slug = await this.generateUniqueProductSlug(payload.title, product.id, { transaction });
      }

      if (!nextHasVariants && (payload.sku || product.sku || payload.title)) {
        const slugSeed = nextPayload.slug || product.slug;
        nextPayload.sku = await this.resolveSimpleProductSku(
          payload.sku || product.sku,
          slugSeed,
          product.id,
          { transaction }
        );
      }

      await ProductRepository.update(product, this.removeUndefined(nextPayload), { transaction });

      if (!nextHasVariants) {
        await InventoryService.upsertInventoryRecord({
          productId: product.id,
          quantity: nextPayload.stock,
          reservedQuantity: 0,
          allowBackorder: false,
          transaction,
        });
      }

      const hasCategoryUpdate = Object.prototype.hasOwnProperty.call(payload, 'categoryIds')
        || Object.prototype.hasOwnProperty.call(payload, 'categoryNames');

      if (hasCategoryUpdate) {
        const categoryIds = await this.resolveCategoryIds(payload, { transaction, fallbackCategoryIds: [] });
        await ProductRepository.replaceProductCategories(product.id, categoryIds, { transaction });
      }

      let normalizedAttributes = null;

      if (payload.attributes) {
        if (!nextHasVariants) {
          throw ApiError.badRequest('Simple products cannot define variant attributes');
        }

        normalizedAttributes = await this.normalizeAttributes(payload.attributes, { transaction });
        await ProductRepository.replaceProductAttributes(
          product.id,
          this.toProductAttributeRows(product.id, normalizedAttributes),
          { transaction }
        );
      }

      let variantIdBySku = null;

      if (payload.variants) {
        if (!nextHasVariants) {
          throw ApiError.badRequest('Simple products cannot contain variants');
        }

        const attributesForVariants = normalizedAttributes || await this.getExistingNormalizedAttributes(product.id, { transaction });

        const previousVariantImageRows = await ProductRepository.findVariantImagePathsByProductId(product.id, { transaction });

        await ProductRepository.deleteVariantsByProductId(product.id, { transaction });

        const normalizedVariants = await this.normalizeVariants({
          variants: payload.variants,
          productType: payload.productType || product.productType,
          skuPrefix: payload.skuPrefix || product.skuPrefix,
          normalizedAttributes: attributesForVariants,
          transaction,
        });

        const nextVariantImageSet = new Set(
          normalizedVariants
            .map((variant) => variant.image)
            .filter((item) => typeof item === 'string' && item.trim())
        );

        previousVariantImageRows
          .map((row) => row.image)
          .filter((item) => typeof item === 'string' && item.trim())
          .forEach((item) => {
            if (!nextVariantImageSet.has(item)) {
              cleanupPaths.push(item);
            }
          });

        variantIdBySku = await this.persistVariants(product.id, normalizedVariants, { transaction });
      }

      if (payload.media) {
        const existingMediaRows = await ProductRepository.findProductMediaPathsByProductId(product.id, { transaction });
        let finalVariantMap = variantIdBySku;

        if (!finalVariantMap || finalVariantMap.size === 0) {
          const existingVariants = await ProductRepository.findVariantsByProductId(product.id, { transaction });
          finalVariantMap = new Map(existingVariants.map((variant) => [variant.sku, variant.id]));
        }

        const nextMediaRows = this.toMediaRows(product.id, payload.media, finalVariantMap);

        await ProductRepository.replaceProductMedia(product.id, nextMediaRows, {
          transaction,
        });

        const nextPathSet = new Set(nextMediaRows.map((row) => row.url));

        existingMediaRows
          .map((row) => row.url)
          .filter((item) => typeof item === 'string' && item.trim())
          .forEach((item) => {
            if (!nextPathSet.has(item)) {
              cleanupPaths.push(item);
            }
          });
      }

      if (payload.meta) {
        await ProductRepository.replaceProductMeta(product.id, this.toMetaRows(product.id, payload.meta), { transaction });
      }

      return ProductRepository.findById(product.id, { transaction });
    });

    await MediaService.deleteFiles(this.uniqueNonEmptyPaths(cleanupPaths));

    return updatedProduct;
  }

  static async delete(id) {
    const cleanupPaths = [];

    await sequelize.transaction(async (transaction) => {
      const product = await ProductRepository.findById(id, { transaction });

      if (!product) {
        throw ApiError.notFound('Product not found');
      }

      cleanupPaths.push(product.thumbnail);

      (product.media || []).forEach((entry) => cleanupPaths.push(entry.url));
      (product.variants || []).forEach((variant) => {
        cleanupPaths.push(variant.image);
        (variant.media || []).forEach((entry) => cleanupPaths.push(entry.url));
      });

      await ProductRepository.delete(product, { transaction });
    });

    await MediaService.deleteFiles(this.uniqueNonEmptyPaths(cleanupPaths));
  }

  static async generateVariantsFromAttributes(payload = {}) {
    const axisAttributes = this.normalizePreviewAttributes(payload.attributes || []);

    if (!axisAttributes.length) {
      throw ApiError.badRequest('At least one attribute with values is required to generate variants');
    }

    const maxCombinations = Number.isFinite(Number(payload.maxCombinations))
      ? Math.min(Math.max(Number(payload.maxCombinations), 1), 5000)
      : 500;
    const { combinations, totalPossible, truncated } = this.generateCombinationPreview(axisAttributes, maxCombinations);

    return {
      productId: null,
      productType: 'variant',
      axes: axisAttributes.map((attribute) => ({
        attributeId: null,
        attributeCode: attribute.attributeCode,
        attributeName: attribute.attributeName,
        values: attribute.values,
      })),
      combinations,
      totalPossible,
      generatedCount: combinations.length,
      returnedCount: combinations.length,
      truncated,
    };
  }

  static async previewVariantCombinations(id, payload = {}) {
    const product = await ProductRepository.findById(id);

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    const maxCombinations = Number.isFinite(Number(payload.maxCombinations))
      ? Math.min(Math.max(Number(payload.maxCombinations), 1), 5000)
      : 500;
    const onlyMissing = Boolean(payload.onlyMissing);
    const normalizedAttributes = this.toNormalizedAttributesFromProduct(product);
    const axisAttributes = normalizedAttributes.filter((attribute) => attribute.isVariantAxis && attribute.values.length);

    if (!axisAttributes.length) {
      return {
        productId: product.id,
        productType: product.productType,
        axes: [],
        combinations: [],
        totalPossible: 0,
        generatedCount: 0,
        returnedCount: 0,
        truncated: false,
      };
    }

    const { combinations, totalPossible, truncated } = this.generateCombinationPreview(axisAttributes, maxCombinations);
    const existingVariantKeys = new Set(
      (product.variants || [])
        .map((variant) => this.buildCombinationKey(variant.attributeValues || []))
        .filter(Boolean)
    );

    const enrichedCombinations = combinations.map((combination) => ({
      ...combination,
      isExisting: existingVariantKeys.has(combination.key),
    }));

    const finalCombinations = onlyMissing
      ? enrichedCombinations.filter((combination) => !combination.isExisting)
      : enrichedCombinations;

    return {
      productId: product.id,
      productType: product.productType,
      axes: axisAttributes.map((attribute) => ({
        attributeId: attribute.attributeId,
        attributeCode: attribute.attributeCode,
        attributeName: attribute.attributeName,
        values: attribute.values,
      })),
      combinations: finalCombinations,
      totalPossible,
      generatedCount: combinations.length,
      returnedCount: finalCombinations.length,
      truncated,
    };
  }

  static async saveVariants(id, payload) {
    const cleanupPaths = [];

    const updatedProduct = await sequelize.transaction(async (transaction) => {
      const product = await ProductRepository.findByIdBasic(id, { transaction });

      if (!product) {
        throw ApiError.notFound('Product not found');
      }

      if (!product.hasVariants) {
        throw ApiError.badRequest('Variant operations are disabled for this simple product');
      }

      const normalizedAttributes = await this.getExistingNormalizedAttributes(product.id, { transaction });

      if (payload.replaceExisting !== false) {
        const previousVariantImageRows = await ProductRepository.findVariantImagePathsByProductId(product.id, { transaction });
        previousVariantImageRows.forEach((row) => cleanupPaths.push(row.image));
        await ProductRepository.deleteVariantsByProductId(product.id, { transaction });
      }

      const normalizedVariants = await this.normalizeVariants({
        variants: payload.variants || [],
        productType: product.productType,
        skuPrefix: product.skuPrefix,
        normalizedAttributes,
        transaction,
      });

      const variantIdBySku = await this.persistVariants(product.id, normalizedVariants, { transaction });

      if (payload.media) {
        const existingMediaRows = await ProductRepository.findProductMediaPathsByProductId(product.id, { transaction });
        let variantMap = variantIdBySku;

        if (!variantMap.size || payload.replaceExisting === false) {
          const allVariants = await ProductRepository.findVariantsByProductId(product.id, { transaction });
          variantMap = new Map(allVariants.map((variant) => [variant.sku, variant.id]));
        }

        const nextMediaRows = this.toMediaRows(product.id, payload.media, variantMap);

        await ProductRepository.replaceProductMedia(product.id, nextMediaRows, {
          transaction,
        });

        const nextPathSet = new Set(nextMediaRows.map((row) => row.url));

        existingMediaRows
          .map((row) => row.url)
          .filter((item) => typeof item === 'string' && item.trim())
          .forEach((item) => {
            if (!nextPathSet.has(item)) {
              cleanupPaths.push(item);
            }
          });
      }

      return ProductRepository.findById(product.id, { transaction });
    });

    const nextVariantImageSet = new Set(
      (payload.variants || [])
        .map((variant) => variant.image)
        .filter((item) => typeof item === 'string' && item.trim())
    );

    const filteredCleanupPaths = this.uniqueNonEmptyPaths(cleanupPaths).filter((item) => !nextVariantImageSet.has(item));

    await MediaService.deleteFiles(filteredCleanupPaths);

    return updatedProduct;
  }

  static uniqueNonEmptyPaths(values = []) {
    return [...new Set(values.filter((item) => typeof item === 'string' && item.trim()))];
  }

  static async resolveVariantByAttributes(id, payload) {
    const product = await ProductRepository.findById(id);

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    const normalizedAttributes = this.toNormalizedAttributesFromProduct(product);
    const valueIndex = this.buildAttributeValueIndex(normalizedAttributes);
    const resolvedValues = this.resolveVariantAttributeValues(payload.attributeValues || [], valueIndex);

    if (!resolvedValues.length) {
      throw ApiError.badRequest('At least one attribute value is required');
    }

    const targetKey = this.buildCombinationKey(resolvedValues);
    const matchedVariant = (product.variants || []).find((variant) => {
      if (variant.status !== 'active') {
        return false;
      }

      return this.buildCombinationKey(variant.attributeValues || []) === targetKey;
    });

    if (!matchedVariant) {
      throw ApiError.notFound('No active variant found for selected attributes');
    }

    return matchedVariant;
  }

  static resolveHasVariants(payload, fallbackHasVariants = false) {
    if (typeof payload.hasVariants === 'boolean') {
      return payload.hasVariants;
    }

    if (typeof payload.productType === 'string') {
      return payload.productType.toLowerCase() !== 'simple';
    }

    return Boolean(fallbackHasVariants);
  }

  static ensureSimpleProductPayload(payload, { allowNullableComparePrice = false } = {}) {
    const basePrice = Number(payload.basePrice);
    const quantity = Number(payload.quantity);

    if (!Number.isFinite(basePrice) || basePrice < 0) {
      throw ApiError.badRequest('Simple products require a valid basePrice');
    }

    if (!Number.isInteger(quantity) || quantity < 0) {
      throw ApiError.badRequest('Simple products require a valid quantity');
    }

    if (!allowNullableComparePrice && typeof payload.comparePrice === 'undefined') {
      throw ApiError.badRequest('Simple products require comparePrice (can be null)');
    }
  }

  static async resolveSimpleProductSku(rawSku, slugSeed, excludeId, { transaction } = {}) {
    const candidate = String(rawSku || `${slugSeed}-simple`).trim().toUpperCase();

    if (!candidate) {
      throw ApiError.badRequest('SKU generation failed for simple product');
    }

    let sku = candidate;
    let counter = 1;

    while (await ProductRepository.findOneByProductSku(sku, excludeId, { transaction })) {
      sku = `${candidate}-${counter}`;
      counter += 1;
    }

    return sku;
  }

  static async resolveBrandId(payload, { transaction, fallbackBrandId = null } = {}) {
    if (payload.brandId) {
      const brand = await ProductRepository.findBrandById(payload.brandId, { transaction });

      if (!brand) {
        throw ApiError.badRequest('Brand not found');
      }

      return brand.id;
    }

    if (payload.brandName) {
      const name = String(payload.brandName).trim();

      if (!name) {
        throw ApiError.badRequest('brandName cannot be empty');
      }

      const slug = generateSlug(name, 'brand');
      const existingBrand = await ProductRepository.findBrandBySlug(slug, { transaction })
        || await ProductRepository.findBrandByName(name, { transaction });

      if (existingBrand) {
        return existingBrand.id;
      }

      const createdBrand = await ProductRepository.createBrand(
        {
          name,
          slug,
          status: 'active',
        },
        { transaction }
      );

      return createdBrand.id;
    }

    return fallbackBrandId;
  }

  static normalizePreviewAttributes(attributes) {
    return attributes
      .map((attribute) => {
        const attributeName = String(attribute.name || '').trim();
        const attributeCode = generateSlug(attribute.code || attributeName, 'attribute');

        const values = (attribute.values || [])
          .map((entry) => {
            const valueLabel = typeof entry === 'string' ? entry : entry.value;
            const cleanValue = String(valueLabel || '').trim();

            if (!cleanValue) {
              return null;
            }

            return {
              id: null,
              value: cleanValue,
              valueSlug: generateSlug(typeof entry === 'string' ? cleanValue : entry.slug || cleanValue, 'value'),
            };
          })
          .filter(Boolean);

        if (!attributeName || !attributeCode || !values.length) {
          return null;
        }

        return {
          attributeId: null,
          attributeCode,
          attributeName,
          values,
        };
      })
      .filter(Boolean);
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

  static async resolveCategoryIds(payload, { transaction, fallbackCategoryIds = null } = {}) {
    const hasCategoryIds = Array.isArray(payload.categoryIds);
    const hasCategoryNames = Array.isArray(payload.categoryNames);

    if (!hasCategoryIds && !hasCategoryNames) {
      return fallbackCategoryIds;
    }

    const resolvedIds = new Set(hasCategoryIds ? payload.categoryIds : []);

    await this.ensureCategoriesExist(Array.from(resolvedIds), { transaction });

    const normalizedNames = (hasCategoryNames ? payload.categoryNames : [])
      .map((entry) => String(entry || '').trim())
      .filter(Boolean);

    const seenNameKeys = new Set();

    for (const name of normalizedNames) {
      const key = name.toLowerCase();

      if (seenNameKeys.has(key)) {
        continue;
      }

      seenNameKeys.add(key);

      const slug = generateSlug(name, 'category');
      const existingCategory = await ProductRepository.findCategoryBySlug(slug, { transaction })
        || await ProductRepository.findCategoryByName(name, { transaction });

      if (existingCategory) {
        resolvedIds.add(existingCategory.id);
        continue;
      }

      const createdCategory = await ProductRepository.createCategory(
        {
          name,
          slug,
          status: 'active',
        },
        { transaction }
      );

      resolvedIds.add(createdCategory.id);
    }

    return Array.from(resolvedIds);
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
    if (!Array.isArray(variants) || variants.length === 0) {
      return [];
    }

    const resolvedType = productType || 'simple';

    if (resolvedType === 'simple' && variants.length !== 1) {
      throw ApiError.badRequest('Simple products must contain exactly one variant');
    }

    if ((resolvedType === 'variant' || resolvedType === 'configurable') && variants.length < 1) {
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
      const hasSalePrice = Number.isFinite(Number(variant.salePrice));
      const price = hasSalePrice ? Number(variant.salePrice) : Number(variant.price);

      if (!Number.isFinite(price)) {
        throw ApiError.badRequest(`Variant price is required for sku: ${sku}`);
      }

      const comparePrice = variant.comparePrice ?? (
        hasSalePrice && Number.isFinite(Number(variant.price))
          ? Number(variant.price)
          : null
      );
      const quantity = Number.isFinite(Number(variant.stock))
        ? Number(variant.stock)
        : Number.isFinite(Number(variant.inventory?.quantity))
          ? Number(variant.inventory.quantity)
          : 0;

      normalizedVariants.push({
        sku,
        title: variant.title || null,
        price,
        comparePrice,
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

      await InventoryService.upsertInventoryRecord({
        variantId: savedVariant.id,
        quantity: variant.quantity,
        reservedQuantity: variant.reservedQuantity,
        lowStockThreshold: variant.lowStockThreshold,
        allowBackorder: variant.allowBackorder,
        transaction,
      });

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

  static generateCombinationPreview(axisAttributes, maxCombinations) {
    const limit = Number.isFinite(Number(maxCombinations))
      ? Math.min(Math.max(Number(maxCombinations), 1), 5000)
      : 500;
    const combinations = [];
    const totalPossible = axisAttributes.reduce((acc, attribute) => acc * attribute.values.length, 1);
    let truncated = false;

    const walk = (index, selection) => {
      if (combinations.length >= limit) {
        truncated = true;
        return;
      }

      if (index === axisAttributes.length) {
        const snapshot = selection.map((entry) => ({ ...entry }));
        combinations.push({
          key: this.buildCombinationKey(snapshot),
          label: this.buildCombinationLabel(snapshot),
          selections: snapshot,
        });
        return;
      }

      const attribute = axisAttributes[index];

      for (const value of attribute.values) {
        selection.push({
          attributeId: attribute.attributeId,
          attributeCode: attribute.attributeCode,
          attributeName: attribute.attributeName,
          attributeValueId: value.id,
          value: value.value,
          valueSlug: value.valueSlug,
        });

        walk(index + 1, selection);
        selection.pop();

        if (truncated) {
          break;
        }
      }
    };

    walk(0, []);

    return {
      combinations,
      totalPossible,
      truncated,
    };
  }

  static buildCombinationLabel(selection) {
    return selection.map((entry) => entry.value || entry.valueSlug).join(' / ');
  }

  static buildCombinationKey(selection) {
    return selection
      .map((entry) => {
        const attributeCode = String(entry.attributeCode || entry.attribute?.code || '').trim().toLowerCase();
        const valueSlug = String(entry.valueSlug || entry.attributeValue?.valueSlug || '').trim().toLowerCase();

        if (!attributeCode || !valueSlug) {
          return null;
        }

        return `${attributeCode}:${valueSlug}`;
      })
      .filter(Boolean)
      .sort()
      .join('|');
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

    return this.toNormalizedAttributesFromProduct(product);
  }

  static toNormalizedAttributesFromProduct(product) {
    return (product.productAttributes || [])
      .map((entry) => ({
        attributeId: entry.attribute?.id,
        attributeCode: entry.attribute?.code,
        attributeName: entry.attribute?.name,
        isRequired: entry.isRequired,
        isVariantAxis: entry.isVariantAxis,
        values: (entry.attribute?.values || []).map((value) => ({
          id: value.id,
          value: value.value,
          valueSlug: value.valueSlug,
        })),
      }))
      .filter((entry) => entry.attributeId && entry.attributeCode);
  }

  static removeUndefined(payload) {
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => typeof value !== 'undefined'));
  }
}

module.exports = ProductService;
