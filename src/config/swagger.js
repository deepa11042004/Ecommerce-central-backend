const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const env = require('./env');

const normalizedPublicServerUrl = env.PUBLIC_SERVER_URL
  ? env.PUBLIC_SERVER_URL.replace(/\/$/, '')
  : null;

const servers = [
  {
    url: env.API_PREFIX,
    description: 'Current server (dynamic)',
  },
];

if (normalizedPublicServerUrl) {
  servers.unshift({
    url: `${normalizedPublicServerUrl}${env.API_PREFIX}`,
    description: 'Configured public server',
  });
}

if (env.NODE_ENV !== 'production') {
  servers.push({
    url: `http://localhost:${env.PORT}${env.API_PREFIX}`,
    description: 'Local development server',
  });
}

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Reusable Ecommerce Backend Starter API',
      version: '2.0.0',
      description:
        'Production-grade reusable ecommerce backend. Architecture: Route -> Controller -> Service -> Repository -> Sequelize Model. RBAC roles: developer, super_admin, admin, customer.',
    },
    servers,
    tags: [
      {
        name: 'Auth',
        description: 'Authentication endpoints',
      },
      {
        name: 'Cart',
        description: 'Guest-aware and authenticated customer cart endpoints with transactional merge support',
      },
      {
        name: 'Wishlist',
        description: 'Guest-aware and authenticated customer wishlist endpoints with merge-on-login support',
      },
      {
        name: 'Products',
        description: 'Generalized product management endpoints with dynamic attributes and variants',
      },
      {
        name: 'Categories',
        description: 'Nested category tree and category assignment endpoints',
      },
      {
        name: 'Attributes',
        description: 'Dynamic reusable product attribute structures (documented in product payloads)',
      },
      {
        name: 'Variants',
        description: 'Sellable variant and inventory structures (documented in product payloads)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      parameters: {
        GuestIdentityHeader: {
          in: 'header',
          name: 'x-guest-id',
          required: false,
          schema: {
            type: 'string',
          },
          description:
            'Optional guest identity header. Browser clients can rely on the guestId cookie set by the backend instead.',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Validation failed',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    example: 'body.title',
                  },
                  message: {
                    type: 'string',
                    example: '"title" is required',
                  },
                },
              },
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
            },
            password: {
              type: 'string',
              format: 'password',
            },
          },
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'password'],
          properties: {
            firstName: {
              type: 'string',
              example: 'John',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'ChangeMe#12345',
            },
          },
        },
        AuthUser: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            firstName: {
              type: 'string',
              nullable: true,
              example: 'John',
            },
            lastName: {
              type: 'string',
              nullable: true,
              example: 'Doe',
            },
            fullName: {
              type: 'string',
              example: 'John Doe',
            },
            email: {
              type: 'string',
              example: 'john@example.com',
            },
            role: {
              type: 'string',
              example: 'customer',
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: ['product.read'],
            },
          },
        },
        LoginSuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Login successful',
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/AuthUser',
                },
                accessToken: {
                  type: 'string',
                },
                refreshToken: {
                  type: 'string',
                },
                merge: {
                  nullable: true,
                  allOf: [{ $ref: '#/components/schemas/AuthMergeSummary' }],
                },
              },
            },
          },
        },
        ShopperIdentity: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['user', 'guest'],
              example: 'guest',
            },
            userId: {
              type: 'integer',
              nullable: true,
              example: 18,
            },
            guestId: {
              type: 'string',
              nullable: true,
              example: 'guest_2f84af93-5a46-4b9b-8b0a-891b8b3d4a44',
            },
          },
        },
        CartItemRequest: {
          type: 'object',
          required: ['productId', 'quantity'],
          properties: {
            productId: {
              type: 'integer',
              example: 1,
            },
            variantId: {
              type: 'integer',
              nullable: true,
              example: 10,
            },
            quantity: {
              type: 'integer',
              minimum: 1,
              example: 2,
            },
          },
        },
        WishlistItemRequest: {
          type: 'object',
          required: ['productId'],
          properties: {
            productId: {
              type: 'integer',
              example: 1,
            },
            variantId: {
              type: 'integer',
              nullable: true,
              example: 10,
            },
          },
        },
        ShopperProductSummary: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'Wireless Headphones' },
            slug: { type: 'string', example: 'wireless-headphones' },
            thumbnail: { type: 'string', nullable: true, example: 'https://cdn.example.com/headphones.jpg' },
          },
        },
        ShopperVariantSummary: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 10 },
            sku: { type: 'string', example: 'WH-BLK-128' },
            title: { type: 'string', nullable: true, example: 'Black / 128GB' },
            image: { type: 'string', nullable: true, example: 'https://cdn.example.com/headphones-black.jpg' },
          },
        },
        CartMergeIssue: {
          type: 'object',
          properties: {
            cartItemId: { type: 'integer', example: 25 },
            productId: { type: 'integer', example: 1 },
            variantId: { type: 'integer', nullable: true, example: 10 },
            priceChanged: { type: 'boolean', example: true },
            outOfStock: { type: 'boolean', example: false },
          },
        },
        CartItem: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 25 },
            productId: { type: 'integer', example: 1 },
            variantId: { type: 'integer', nullable: true, example: 10 },
            product: {
              $ref: '#/components/schemas/ShopperProductSummary',
            },
            variant: {
              allOf: [{ $ref: '#/components/schemas/ShopperVariantSummary' }],
              nullable: true,
            },
            quantity: { type: 'integer', example: 2 },
            unitPrice: { type: 'number', format: 'float', example: 1000 },
            latestPrice: { type: 'number', format: 'float', example: 1200 },
            priceChanged: { type: 'boolean', example: true },
            outOfStock: { type: 'boolean', example: false },
            availableStock: { type: 'integer', nullable: true, example: 5 },
            allowBackorder: { type: 'boolean', example: false },
            productActive: { type: 'boolean', example: true },
            variantActive: { type: 'boolean', example: true },
            lineTotal: { type: 'number', format: 'float', example: 2000 },
            latestLineTotal: { type: 'number', format: 'float', example: 2400 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Cart: {
          type: 'object',
          properties: {
            id: { type: 'integer', nullable: true, example: 4 },
            currency: { type: 'string', example: 'USD' },
            lineCount: { type: 'integer', example: 3 },
            itemCount: { type: 'integer', example: 6 },
            subtotal: { type: 'number', format: 'float', example: 3000 },
            latestSubtotal: { type: 'number', format: 'float', example: 3400 },
            items: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/CartItem',
              },
            },
            createdAt: { type: 'string', format: 'date-time', nullable: true },
            updatedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        CartMergeSummary: {
          type: 'object',
          properties: {
            guestId: { type: 'string', nullable: true, example: 'guest_2f84af93-5a46-4b9b-8b0a-891b8b3d4a44' },
            sourceCartFound: { type: 'boolean', example: true },
            mergedItems: { type: 'integer', example: 2 },
            mergedQuantity: { type: 'integer', example: 3 },
            removedGuestCart: { type: 'boolean', example: true },
            issues: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/CartMergeIssue',
              },
            },
          },
        },
        CartSuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Cart fetched successfully' },
            data: {
              type: 'object',
              properties: {
                cart: {
                  $ref: '#/components/schemas/Cart',
                },
                identity: {
                  $ref: '#/components/schemas/ShopperIdentity',
                },
              },
            },
          },
        },
        CartMergeSuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Cart merged successfully' },
            data: {
              type: 'object',
              properties: {
                cart: {
                  $ref: '#/components/schemas/Cart',
                },
                identity: {
                  $ref: '#/components/schemas/ShopperIdentity',
                },
                merge: {
                  $ref: '#/components/schemas/CartMergeSummary',
                },
              },
            },
          },
        },
        WishlistItem: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 11 },
            productId: { type: 'integer', example: 1 },
            variantId: { type: 'integer', nullable: true, example: 10 },
            product: {
              $ref: '#/components/schemas/ShopperProductSummary',
            },
            variant: {
              allOf: [{ $ref: '#/components/schemas/ShopperVariantSummary' }],
              nullable: true,
            },
            latestPrice: { type: 'number', format: 'float', nullable: true, example: 1200 },
            availableStock: { type: 'integer', nullable: true, example: 8 },
            productActive: { type: 'boolean', example: true },
            variantActive: { type: 'boolean', example: true },
            inStock: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Wishlist: {
          type: 'object',
          properties: {
            id: { type: 'integer', nullable: true, example: 7 },
            itemCount: { type: 'integer', example: 4 },
            items: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/WishlistItem',
              },
            },
            createdAt: { type: 'string', format: 'date-time', nullable: true },
            updatedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        WishlistMergeSummary: {
          type: 'object',
          properties: {
            guestId: { type: 'string', nullable: true, example: 'guest_2f84af93-5a46-4b9b-8b0a-891b8b3d4a44' },
            sourceWishlistFound: { type: 'boolean', example: true },
            mergedItems: { type: 'integer', example: 2 },
            ignoredDuplicates: { type: 'integer', example: 1 },
            removedGuestWishlist: { type: 'boolean', example: true },
          },
        },
        WishlistSuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Wishlist fetched successfully' },
            data: {
              type: 'object',
              properties: {
                wishlist: {
                  $ref: '#/components/schemas/Wishlist',
                },
                identity: {
                  $ref: '#/components/schemas/ShopperIdentity',
                },
              },
            },
          },
        },
        WishlistMergeSuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Wishlist merged successfully' },
            data: {
              type: 'object',
              properties: {
                wishlist: {
                  $ref: '#/components/schemas/Wishlist',
                },
                identity: {
                  $ref: '#/components/schemas/ShopperIdentity',
                },
                merge: {
                  $ref: '#/components/schemas/WishlistMergeSummary',
                },
              },
            },
          },
        },
        AuthMergeSummary: {
          type: 'object',
          properties: {
            guestId: { type: 'string', nullable: true, example: 'guest_2f84af93-5a46-4b9b-8b0a-891b8b3d4a44' },
            cart: {
              allOf: [{ $ref: '#/components/schemas/CartMergeSummary' }],
              nullable: true,
            },
            wishlist: {
              allOf: [{ $ref: '#/components/schemas/WishlistMergeSummary' }],
              nullable: true,
            },
          },
        },
        BrandSummary: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Generic Supply Co' },
            slug: { type: 'string', example: 'generic-supply-co' },
          },
        },
        CategoryNode: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Electronics' },
            slug: { type: 'string', example: 'electronics' },
            description: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['active', 'inactive'] },
            parentId: { type: 'integer', nullable: true },
            sortOrder: { type: 'integer', example: 0 },
            children: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/CategoryNode',
              },
            },
          },
        },
        AttributeValue: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 11 },
            value: { type: 'string', example: 'Black' },
            valueSlug: { type: 'string', example: 'black' },
          },
        },
        AttributeDefinition: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 3 },
            name: { type: 'string', example: 'Color' },
            code: { type: 'string', example: 'color' },
            inputType: { type: 'string', enum: ['select', 'text', 'number', 'boolean'] },
            isFilterable: { type: 'boolean', example: true },
            isVariantAxis: { type: 'boolean', example: true },
            values: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/AttributeValue',
              },
            },
          },
        },
        ProductAttributeSelection: {
          type: 'object',
          properties: {
            attributeId: { type: 'integer', example: 3 },
            attributeCode: { type: 'string', example: 'color' },
            attributeName: { type: 'string', example: 'Color' },
            attributeValueId: { type: 'integer', example: 11 },
            value: { type: 'string', example: 'Black' },
            valueSlug: { type: 'string', example: 'black' },
            code: { type: 'string', example: 'color' },
            slug: { type: 'string', example: 'black' },
          },
        },
        ProductAttributeLink: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 22 },
            productId: { type: 'integer', example: 1 },
            attributeId: { type: 'integer', example: 3 },
            isRequired: { type: 'boolean', example: true },
            isVariantAxis: { type: 'boolean', example: true },
            attribute: {
              $ref: '#/components/schemas/AttributeDefinition',
            },
          },
        },
        VariantAttributeValueLink: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 91 },
            attributeId: { type: 'integer', example: 3 },
            attributeValueId: { type: 'integer', example: 11 },
            attribute: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 3 },
                name: { type: 'string', example: 'Color' },
                code: { type: 'string', example: 'color' },
              },
            },
            attributeValue: {
              $ref: '#/components/schemas/AttributeValue',
            },
          },
        },
        Inventory: {
          type: 'object',
          properties: {
            quantity: { type: 'integer', example: 25 },
            reservedQuantity: { type: 'integer', example: 0 },
            lowStockThreshold: { type: 'integer', nullable: true, example: 5 },
            allowBackorder: { type: 'boolean', example: false },
          },
        },
        ProductVariant: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 301 },
            sku: { type: 'string', example: 'WH-BLK-128' },
            title: { type: 'string', nullable: true, example: 'Black / 128GB' },
            price: { type: 'number', format: 'float', example: 129.99 },
            comparePrice: { type: 'number', format: 'float', nullable: true, example: 149.99 },
            costPrice: { type: 'number', format: 'float', nullable: true, example: 80 },
            status: { type: 'string', enum: ['active', 'inactive'], example: 'active' },
            image: { type: 'string', nullable: true, example: 'https://cdn.example.com/variant.jpg' },
            barcode: { type: 'string', nullable: true, example: null },
            inventory: {
              $ref: '#/components/schemas/Inventory',
            },
            attributeValues: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/VariantAttributeValueLink',
              },
            },
          },
        },
        ProductMedia: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            url: { type: 'string', example: 'https://cdn.example.com/products/item.jpg' },
            mediaType: { type: 'string', enum: ['image', 'video', 'document', 'external'] },
            altText: { type: 'string', nullable: true, example: 'Front image' },
            position: { type: 'integer', example: 0 },
            variantId: { type: 'integer', nullable: true, example: null },
          },
        },
        ProductMetaEntry: {
          type: 'object',
          properties: {
            metaKey: { type: 'string', example: 'warrantyMonths' },
            metaValue: { type: 'string', nullable: true, example: '12' },
            valueType: { type: 'string', enum: ['string', 'number', 'boolean', 'json'], example: 'number' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'Wireless Headphones' },
            slug: { type: 'string', example: 'wireless-headphones' },
            description: { type: 'string' },
            shortDescription: { type: 'string', nullable: true },
            skuPrefix: { type: 'string', nullable: true, example: 'WH' },
            sku: { type: 'string', nullable: true, example: 'RICE-PACKET-SIMPLE' },
            productType: { type: 'string', enum: ['simple', 'configurable', 'variant'], example: 'variant' },
            hasVariants: { type: 'boolean', example: true },
            basePrice: { type: 'number', format: 'float', nullable: true, example: 49.99 },
            comparePrice: { type: 'number', format: 'float', nullable: true, example: 59.99 },
            stock: { type: 'integer', nullable: true, example: 120 },
            status: { type: 'string', enum: ['active', 'inactive'], example: 'active' },
            thumbnail: { type: 'string', nullable: true },
            seoTitle: { type: 'string', nullable: true },
            seoDescription: { type: 'string', nullable: true },
            minPrice: { type: 'number', format: 'float', nullable: true, example: 129.99 },
            totalStock: { type: 'integer', nullable: true, example: 39 },
            brand: { $ref: '#/components/schemas/BrandSummary' },
            categories: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/CategoryNode',
              },
            },
            productAttributes: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ProductAttributeLink',
              },
            },
            variants: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ProductVariant',
              },
            },
            media: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ProductMedia',
              },
            },
            metaEntries: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ProductMetaEntry',
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        ProductCreateRequest: {
          type: 'object',
          required: ['title', 'description', 'shortDescription', 'status', 'seoTitle', 'seoDescription', 'hasVariants'],
          properties: {
            title: { type: 'string', example: 'Packet of Rice' },
            slug: { type: 'string', example: 'packet-of-rice' },
            description: { type: 'string', example: '1kg rice packet for daily use.' },
            shortDescription: { type: 'string', example: '1kg rice packet' },
            skuPrefix: { type: 'string', example: 'RICE' },
            brandId: { type: 'integer', nullable: true, example: 1 },
            brandName: { type: 'string', nullable: true, example: 'Acme Foods' },
            productType: { type: 'string', enum: ['simple', 'configurable', 'variant'], default: 'simple' },
            hasVariants: { type: 'boolean', default: false },
            sku: { type: 'string', example: 'RICE-PACKET-1KG' },
            basePrice: { type: 'number', format: 'float', example: 8.5 },
            comparePrice: { type: 'number', format: 'float', nullable: true, example: 10 },
            quantity: { type: 'integer', example: 200 },
            status: { type: 'string', enum: ['active', 'inactive'], example: 'active' },
            thumbnail: { type: 'string', example: 'https://cdn.example.com/products/generic.jpg' },
            seoTitle: { type: 'string', example: 'SEO title' },
            seoDescription: { type: 'string', example: 'SEO description' },
            categoryIds: {
              type: 'array',
              items: { type: 'integer' },
              example: [1, 2],
            },
            attributes: {
              type: 'array',
              description: 'Use when hasVariants=true',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Color' },
                  code: { type: 'string', example: 'color' },
                  inputType: { type: 'string', enum: ['select', 'text', 'number', 'boolean'] },
                  isFilterable: { type: 'boolean', example: true },
                  isVariantAxis: { type: 'boolean', example: true },
                  isRequired: { type: 'boolean', example: true },
                  values: {
                    type: 'array',
                    items: {
                      oneOf: [
                        { type: 'string', example: 'Red' },
                        {
                          type: 'object',
                          properties: {
                            value: { type: 'string', example: 'Red' },
                            slug: { type: 'string', example: 'red' },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
            variants: {
              type: 'array',
              description: 'Optional during create. Save selected combinations here or via POST /products/{id}/variants',
              items: {
                type: 'object',
                properties: {
                  sku: { type: 'string', example: 'GP-RED-001' },
                  price: { type: 'number', format: 'float', example: 1000 },
                  salePrice: { type: 'number', format: 'float', example: 950 },
                  comparePrice: { type: 'number', format: 'float', example: 1000 },
                  image: { type: 'string', example: 'https://cdn.example.com/products/generic-red.jpg' },
                  barcode: { type: 'string', example: '890000100001' },
                  stock: { type: 'integer', example: 10 },
                  status: { type: 'string', enum: ['active', 'inactive'] },
                  attributeValues: {
                    type: 'array',
                    items: {
                      oneOf: [
                        { type: 'string', example: 'color:red' },
                        {
                          type: 'object',
                          properties: {
                            code: { type: 'string', example: 'color' },
                            value: { type: 'string', example: 'Red' },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
            media: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  url: { type: 'string', example: 'https://cdn.example.com/products/generic-main.jpg' },
                  mediaType: { type: 'string', enum: ['image', 'video', 'document', 'external'] },
                  altText: { type: 'string', example: 'Main image' },
                  variantSku: { type: 'string', example: 'GP-RED-001' },
                },
              },
            },
            meta: {
              type: 'object',
              additionalProperties: true,
              example: {
                customKey1: 'value',
                customKey2: 'value',
              },
            },
          },
        },
        ProductUpdateRequest: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            shortDescription: { type: 'string' },
            brandId: { type: 'integer', nullable: true },
            brandName: { type: 'string', nullable: true },
            hasVariants: { type: 'boolean' },
            sku: { type: 'string' },
            basePrice: { type: 'number', format: 'float', nullable: true },
            comparePrice: { type: 'number', format: 'float', nullable: true },
            quantity: { type: 'integer', nullable: true },
            status: { type: 'string', enum: ['active', 'inactive'] },
            categoryIds: {
              type: 'array',
              items: { type: 'integer' },
            },
            attributes: {
              type: 'array',
              items: { type: 'object' },
            },
            variants: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  sku: { type: 'string' },
                  price: { type: 'number', format: 'float' },
                  salePrice: { type: 'number', format: 'float' },
                  comparePrice: { type: 'number', format: 'float' },
                  stock: { type: 'integer' },
                  status: { type: 'string', enum: ['active', 'inactive'] },
                  attributeValues: {
                    type: 'array',
                    items: {
                      oneOf: [
                        { type: 'string', example: 'color:black' },
                        {
                          type: 'object',
                          properties: {
                            code: { type: 'string' },
                            value: { type: 'string' },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
            media: {
              type: 'array',
              items: { type: 'object' },
            },
            meta: {
              oneOf: [
                { type: 'object', additionalProperties: true },
                {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      key: { type: 'string' },
                      value: {},
                    },
                  },
                },
              ],
            },
          },
        },
        VariantCombinationPreviewItem: {
          type: 'object',
          properties: {
            key: { type: 'string', example: 'color:black|storage:256gb' },
            label: { type: 'string', example: 'Black / 256GB' },
            isExisting: { type: 'boolean', example: false },
            selections: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ProductAttributeSelection',
              },
            },
          },
        },
        VariantCombinationPreviewSuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Variant combinations generated successfully',
            },
            data: {
              type: 'object',
              properties: {
                productId: { type: 'integer', example: 1 },
                productType: { type: 'string', example: 'variant' },
                totalPossible: { type: 'integer', example: 24 },
                generatedCount: { type: 'integer', example: 24 },
                returnedCount: { type: 'integer', example: 18 },
                truncated: { type: 'boolean', example: false },
                combinations: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/VariantCombinationPreviewItem',
                  },
                },
              },
            },
          },
        },
        VariantResolveSuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Variant resolved successfully',
            },
            data: {
              $ref: '#/components/schemas/ProductVariant',
            },
          },
        },
        ProductSuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Product fetched successfully',
            },
            data: {
              $ref: '#/components/schemas/Product',
            },
          },
        },
        ProductListSuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Products fetched successfully',
            },
            data: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Product',
                  },
                },
                meta: {
                  type: 'object',
                  properties: {
                    page: {
                      type: 'integer',
                      example: 1,
                    },
                    limit: {
                      type: 'integer',
                      example: 20,
                    },
                    totalItems: {
                      type: 'integer',
                      example: 45,
                    },
                    totalPages: {
                      type: 'integer',
                      example: 3,
                    },
                  },
                },
              },
            },
          },
        },
        CategoryTreeSuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Category tree fetched successfully',
            },
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/CategoryNode',
              },
            },
          },
        },
        DeleteSuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Product deleted successfully',
            },
            data: {
              type: 'object',
              example: {},
            },
          },
        },
      },
    },
  },
  apis: [path.join(__dirname, '../modules/**/*.routes.js')],
};

module.exports = swaggerJsdoc(options);
