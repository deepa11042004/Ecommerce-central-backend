const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const env = require('../config/env');

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
      version: '1.0.0',
      description:
        'Production-grade reusable ecommerce backend starter. Architecture: Route -> Controller -> Service -> Repository -> Sequelize Model. RBAC roles: developer, super_admin, admin, customer.',
    },
    servers,
    tags: [
      {
        name: 'Auth',
        description: 'Authentication endpoints',
      },
      {
        name: 'Products',
        description: 'Product management endpoints with RBAC',
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
                    example: 'email',
                  },
                  message: {
                    type: 'string',
                    example: '"email" must be a valid email',
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
              example: 'Password@123',
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
              example: 'John',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
            },
            fullName: {
              type: 'string',
              example: 'Developer User',
            },
            email: {
              type: 'string',
              example: 'developer@starter.local',
            },
            role: {
              type: 'string',
              example: 'developer',
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: ['*'],
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
              },
            },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            title: {
              type: 'string',
              example: 'iPhone 15 Pro',
            },
            slug: {
              type: 'string',
              example: 'iphone-15-pro',
            },
            description: {
              type: 'string',
              example: 'Latest iPhone model with improved camera and performance.',
            },
            sku: {
              type: 'string',
              example: 'IP15P-256-BLK',
            },
            price: {
              type: 'number',
              format: 'float',
              example: 1299.99,
            },
            stock: {
              type: 'integer',
              example: 20,
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive'],
              example: 'active',
            },
            thumbnail: {
              type: 'string',
              nullable: true,
              example: 'https://cdn.example.com/products/iphone-15-pro.jpg',
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
          required: ['title', 'description', 'sku', 'price', 'stock'],
          properties: {
            title: {
              type: 'string',
            },
            slug: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            sku: {
              type: 'string',
            },
            price: {
              type: 'number',
              format: 'float',
            },
            stock: {
              type: 'integer',
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive'],
              default: 'active',
            },
            thumbnail: {
              type: 'string',
            },
          },
        },
        ProductUpdateRequest: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
            },
            slug: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            sku: {
              type: 'string',
            },
            price: {
              type: 'number',
              format: 'float',
            },
            stock: {
              type: 'integer',
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive'],
            },
            thumbnail: {
              type: 'string',
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
                      example: 10,
                    },
                    totalItems: {
                      type: 'integer',
                      example: 45,
                    },
                    totalPages: {
                      type: 'integer',
                      example: 5,
                    },
                  },
                },
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
