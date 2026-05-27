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

  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(8).max(15).default(10),
  CORS_ORIGIN: Joi.string().default('*'),
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(1000).default(900000),
  RATE_LIMIT_MAX: Joi.number().integer().min(1).default(150),

  UPLOAD_BASE_PATH: Joi.string().trim().default('uploads'),
  ALLOWED_IMAGE_TYPES: Joi.string().trim().default('image/jpeg,image/png,image/webp'),
  ALLOWED_IMAGE_EXTENSIONS: Joi.string().trim().default('.jpg,.jpeg,.png,.webp'),
  MAX_PRODUCT_IMAGE_SIZE: Joi.number().integer().min(1024).default(5 * 1024 * 1024),
  MAX_VARIANT_IMAGE_SIZE: Joi.number().integer().min(1024).default(5 * 1024 * 1024),
  MAX_CATEGORY_IMAGE_SIZE: Joi.number().integer().min(1024).default(3 * 1024 * 1024),
  MAX_BRAND_IMAGE_SIZE: Joi.number().integer().min(1024).default(3 * 1024 * 1024),
  MAX_AVATAR_SIZE: Joi.number().integer().min(1024).default(2 * 1024 * 1024),
  MAX_TEMP_IMAGE_SIZE: Joi.number().integer().min(1024).default(5 * 1024 * 1024),
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
