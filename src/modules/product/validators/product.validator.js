const Joi = require('joi');

const relativeUploadPathSchema = Joi.string()
  .pattern(/^uploads\/[a-z0-9-]+\/[0-9]{4}-[0-9]{2}\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i)
  .messages({
    'string.pattern.base': 'Media path must be a relative uploads path (e.g. uploads/products/2026-05/file.webp)',
  });

const attributeValueSchema = Joi.alternatives().try(
  Joi.string().trim().min(1).max(190),
  Joi.object({
    value: Joi.string().trim().min(1).max(190).required(),
    slug: Joi.string().trim().min(1).max(190).optional(),
    sortOrder: Joi.number().integer().min(0).optional(),
  })
);

const attributeSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  code: Joi.string().trim().min(1).max(140).optional(),
  inputType: Joi.string().valid('select', 'text', 'number', 'boolean').default('select'),
  isFilterable: Joi.boolean().optional(),
  isVariantAxis: Joi.boolean().optional(),
  isRequired: Joi.boolean().optional(),
  values: Joi.array().items(attributeValueSchema).optional().default([]),
});

const variantAttributeValueSchema = Joi.alternatives().try(
  Joi.string().trim().min(1).max(260),
  Joi.object({
    attribute: Joi.string().trim().min(1).max(140).optional(),
    code: Joi.string().trim().min(1).max(140).optional(),
    name: Joi.string().trim().min(1).max(140).optional(),
    value: Joi.string().trim().min(1).max(190).required(),
    slug: Joi.string().trim().min(1).max(190).optional(),
  }).or('attribute', 'code', 'name')
);

const variantSchema = Joi.object({
  sku: Joi.string().trim().min(2).max(80).optional(),
  title: Joi.string().trim().max(160).optional().allow(null, ''),
  price: Joi.number().min(0).precision(2).optional(),
  salePrice: Joi.number().min(0).precision(2).optional().allow(null),
  comparePrice: Joi.number().min(0).precision(2).optional().allow(null),
  costPrice: Joi.number().min(0).precision(2).optional().allow(null),
  status: Joi.string().valid('active', 'inactive').default('active'),
  image: relativeUploadPathSchema.optional().allow(null, ''),
  barcode: Joi.string().trim().max(120).optional().allow(null, ''),
  stock: Joi.number().integer().min(0).optional(),
  position: Joi.number().integer().min(0).optional(),
  attributeValues: Joi.array().items(variantAttributeValueSchema).optional().default([]),
  inventory: Joi.object({
    quantity: Joi.number().integer().min(0).optional(),
    reservedQuantity: Joi.number().integer().min(0).optional(),
    lowStockThreshold: Joi.number().integer().min(0).optional().allow(null),
    allowBackorder: Joi.boolean().optional(),
  }).optional(),
}).or('price', 'salePrice');

const mediaSchema = Joi.object({
  url: relativeUploadPathSchema.required(),
  mediaType: Joi.string().valid('image', 'video', 'document', 'external').default('image'),
  altText: Joi.string().max(255).optional().allow(null, ''),
  position: Joi.number().integer().min(0).optional(),
  variantSku: Joi.string().trim().min(2).max(80).optional(),
});

const metaObjectSchema = Joi.object()
  .pattern(
    Joi.string().trim().min(1).max(140),
    Joi.alternatives().try(
      Joi.string(),
      Joi.number(),
      Joi.boolean(),
      Joi.object(),
      Joi.array(),
      Joi.allow(null)
    )
  )
  .optional();

const metaArraySchema = Joi.array()
  .items(
    Joi.object({
      key: Joi.string().trim().min(1).max(140).required(),
      value: Joi.any().allow(null),
    })
  )
  .optional();

const createProductSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().min(2).max(160).required(),
    slug: Joi.string().min(2).max(190).optional(),
    description: Joi.string().min(1).required(),
    shortDescription: Joi.string().max(500).optional().allow(null, ''),
    skuPrefix: Joi.string().max(80).optional().allow(null, ''),
    brandId: Joi.number().integer().positive().optional().allow(null),
    brandName: Joi.string().trim().min(1).max(120).optional(),
    productType: Joi.string().valid('simple', 'configurable', 'variant').default('simple'),
    hasVariants: Joi.boolean().default(false),
    sku: Joi.string().trim().min(2).max(80).optional(),
    basePrice: Joi.number().min(0).precision(2).when('hasVariants', {
      is: false,
      then: Joi.required(),
      otherwise: Joi.optional().allow(null),
    }),
    comparePrice: Joi.number().min(0).precision(2).when('hasVariants', {
      is: false,
      then: Joi.required().allow(null),
      otherwise: Joi.optional().allow(null),
    }),
    quantity: Joi.number().integer().min(0).when('hasVariants', {
      is: false,
      then: Joi.required(),
      otherwise: Joi.optional().allow(null),
    }),
    status: Joi.string().valid('active', 'inactive').default('active'),
    thumbnail: relativeUploadPathSchema.allow(null, '').optional(),
    seoTitle: Joi.string().max(255).allow(null, '').optional(),
    seoDescription: Joi.string().max(500).allow(null, '').optional(),
    categoryIds: Joi.array().items(Joi.number().integer().positive()).unique().optional().default([]),
    categoryNames: Joi.array().items(Joi.string().trim().min(1).max(140)).unique().optional().default([]),
    attributes: Joi.array().items(attributeSchema).when('hasVariants', {
      is: true,
      then: Joi.optional().default([]),
      otherwise: Joi.forbidden(),
    }),
    variants: Joi.array().items(variantSchema).when('hasVariants', {
      is: true,
      then: Joi.optional().default([]),
      otherwise: Joi.forbidden(),
    }),
    media: Joi.array().items(mediaSchema).optional().default([]),
    meta: Joi.alternatives().try(metaObjectSchema, metaArraySchema).optional(),
  }).oxor('brandId', 'brandName').required(),
  params: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
});

const updateProductSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().min(2).max(160).optional(),
    slug: Joi.string().min(2).max(190).optional(),
    description: Joi.string().min(1).optional(),
    shortDescription: Joi.string().max(500).optional().allow(null, ''),
    skuPrefix: Joi.string().max(80).optional().allow(null, ''),
    brandId: Joi.number().integer().positive().optional().allow(null),
    brandName: Joi.string().trim().min(1).max(120).optional(),
    productType: Joi.string().valid('simple', 'configurable', 'variant').optional(),
    hasVariants: Joi.boolean().optional(),
    sku: Joi.string().trim().min(2).max(80).optional(),
    basePrice: Joi.number().min(0).precision(2).optional().allow(null),
    comparePrice: Joi.number().min(0).precision(2).optional().allow(null),
    quantity: Joi.number().integer().min(0).optional().allow(null),
    status: Joi.string().valid('active', 'inactive').optional(),
    thumbnail: relativeUploadPathSchema.allow(null, '').optional(),
    seoTitle: Joi.string().max(255).allow(null, '').optional(),
    seoDescription: Joi.string().max(500).allow(null, '').optional(),
    categoryIds: Joi.array().items(Joi.number().integer().positive()).unique().optional(),
    categoryNames: Joi.array().items(Joi.string().trim().min(1).max(140)).unique().optional(),
    attributes: Joi.array().items(attributeSchema).optional(),
    variants: Joi.array().items(variantSchema).optional(),
    media: Joi.array().items(mediaSchema).optional(),
    meta: Joi.alternatives().try(metaObjectSchema, metaArraySchema).optional(),
  })
    .min(1)
    .required(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

const getProductByIdSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

const listProductsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().allow('').optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
    productType: Joi.string().valid('simple', 'configurable', 'variant').optional(),
    hasVariants: Joi.boolean().optional(),
    category: Joi.string().trim().min(1).max(160).optional(),
    brand: Joi.number().integer().positive().optional(),
    attribute: Joi.alternatives().try(
      Joi.string().pattern(/^[^:]+:[^:]+$/),
      Joi.array().items(Joi.string().pattern(/^[^:]+:[^:]+$/))
    ).optional(),
    sort: Joi.string()
      .pattern(/^(price|stock|title|createdAt|createdat)_(asc|desc)$/i)
      .optional(),
  }).optional(),
});

const categoryTreeSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
  query: Joi.object({
    status: Joi.string().valid('active', 'inactive').optional(),
  }).optional(),
});

const listBrandsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
  query: Joi.object({
    search: Joi.string().trim().allow('').max(120).optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
    limit: Joi.number().integer().min(1).max(50).optional(),
  }).optional(),
});

const previewVariantCombinationsSchema = Joi.object({
  body: Joi.object({
    maxCombinations: Joi.number().integer().min(1).max(5000).optional(),
    onlyMissing: Joi.boolean().optional(),
  }).optional(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

const generateVariantsSchema = Joi.object({
  body: Joi.object({
    attributes: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().trim().min(1).max(120).required(),
          code: Joi.string().trim().min(1).max(140).optional(),
          values: Joi.array().items(attributeValueSchema).min(1).required(),
        })
      )
      .min(1)
      .required(),
    maxCombinations: Joi.number().integer().min(1).max(5000).optional(),
  }).required(),
  params: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
});

const saveProductVariantsSchema = Joi.object({
  body: Joi.object({
    replaceExisting: Joi.boolean().optional(),
    variants: Joi.array().items(variantSchema).min(1).required(),
    media: Joi.array().items(mediaSchema).optional(),
  }).required(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

const resolveVariantSchema = Joi.object({
  body: Joi.object({
    attributeValues: Joi.array().items(variantAttributeValueSchema).min(1).required(),
  }).required(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  getProductByIdSchema,
  listProductsSchema,
  categoryTreeSchema,
  listBrandsSchema,
  generateVariantsSchema,
  previewVariantCombinationsSchema,
  saveProductVariantsSchema,
  resolveVariantSchema,
};
