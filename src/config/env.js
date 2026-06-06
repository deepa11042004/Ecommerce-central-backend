const dotenv = require('dotenv');
const Joi = require('joi');

dotenv.config();

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(5000),
  API_PREFIX: Joi.string().default('/api/v1'),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(3306),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_LOGGING: Joi.boolean().truthy('true').falsy('false').default(false),

  JWT_ACCESS_SECRET: Joi.string().min(24).required(),
  JWT_REFRESH_SECRET: Joi.string().min(24).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  DEFAULT_CURRENCY: Joi.string().trim().length(3).default('USD'),

  RAZORPAY_KEY_ID: Joi.string().trim().required(),
  RAZORPAY_SECRET: Joi.string().trim().required(),
  RAZORPAY_WEBHOOK_SECRET: Joi.string().trim().required(),

  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(8).max(15).default(10),
  CORS_ORIGIN: Joi.string().default('*'),
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(1000).default(900000),
  RATE_LIMIT_MAX: Joi.number().integer().min(1).default(150),
  INVENTORY_RESERVATION_TTL_MINUTES: Joi.number().integer().min(1).default(20),
  INVENTORY_LOW_STOCK_DEFAULT_THRESHOLD: Joi.number().integer().min(0).default(5),

  CATALOG_DEFAULT_LIMIT: Joi.number().integer().min(1).max(200).default(20),
  CATALOG_MAX_LIMIT: Joi.number().integer().min(1).max(200).default(60),
  CATALOG_FACET_SCAN_LIMIT: Joi.number().integer().min(100).max(20000).default(5000),
  CATALOG_SUGGESTION_LIMIT: Joi.number().integer().min(1).max(20).default(8),
  CATALOG_RELATED_LIMIT: Joi.number().integer().min(1).max(24).default(12),
  CATALOG_MAX_ATTRIBUTE_FILTERS: Joi.number().integer().min(1).max(30).default(12),
  CATALOG_MAX_VALUES_PER_ATTRIBUTE: Joi.number().integer().min(1).max(50).default(20),
  CATALOG_SEARCH_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
  CATALOG_RECOMMENDATIONS_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
  CATALOG_RATING_FILTER_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),

  ALLOWED_IMAGE_TYPES: Joi.string().trim().default('image/jpeg,image/png,image/webp'),
  ALLOWED_IMAGE_EXTENSIONS: Joi.string().trim().default('.jpg,.jpeg,.png,.webp'),
  MAX_PRODUCT_IMAGE_SIZE: Joi.number().integer().min(1024).default(5 * 1024 * 1024),
  MAX_VARIANT_IMAGE_SIZE: Joi.number().integer().min(1024).default(5 * 1024 * 1024),
  MAX_CATEGORY_IMAGE_SIZE: Joi.number().integer().min(1024).default(3 * 1024 * 1024),
  MAX_BRAND_IMAGE_SIZE: Joi.number().integer().min(1024).default(3 * 1024 * 1024),
  MAX_AVATAR_SIZE: Joi.number().integer().min(1024).default(2 * 1024 * 1024),
  MAX_TEMP_IMAGE_SIZE: Joi.number().integer().min(1024).default(5 * 1024 * 1024),

  STORAGE_PROVIDER: Joi.string().valid('s3', 'local').default('s3'),
  AWS_ACCESS_KEY_ID: Joi.string().trim().when('STORAGE_PROVIDER', {
    is: 's3',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  AWS_SECRET_ACCESS_KEY: Joi.string().trim().when('STORAGE_PROVIDER', {
    is: 's3',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  AWS_REGION: Joi.string().trim().when('STORAGE_PROVIDER', {
    is: 's3',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  AWS_S3_BUCKET: Joi.string().trim().when('STORAGE_PROVIDER', {
    is: 's3',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
}).unknown();

const { value, error } = schema.validate(process.env, { abortEarly: false });

if (error) {
  throw new Error(`Environment validation failed: ${error.message}`);
}

const normalizedApiPrefix = value.API_PREFIX
  ? `/${String(value.API_PREFIX).replace(/^\/+/, '').replace(/\/+$/, '')}`
  : '/api/v1';

value.API_PREFIX = normalizedApiPrefix === '/' ? '/api/v1' : normalizedApiPrefix;
value.DEFAULT_CURRENCY = String(value.DEFAULT_CURRENCY || 'USD').trim().toUpperCase();

module.exports = value;
