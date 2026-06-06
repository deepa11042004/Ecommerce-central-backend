const SECTION_KEYS = Object.freeze({
  PRODUCT: 'products',
  VARIANT: 'variants',
  CATEGORY: 'categories',
  BRAND: 'brands',
  USER: 'users',
  HERO_BANNER: 'hero-banners',
  TEMP: 'temp',
});

const DEFAULT_ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DEFAULT_ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const parseNumber = (value, fallback) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const parseCsv = (value, fallback) => {
  if (!value || typeof value !== 'string') {
    return fallback;
  }

  const parsed = value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return parsed.length ? parsed : fallback;
};

const ALLOWED_IMAGE_MIME_TYPES = Object.freeze(parseCsv(process.env.ALLOWED_IMAGE_TYPES, DEFAULT_ALLOWED_IMAGE_TYPES));
const ALLOWED_IMAGE_EXTENSIONS = Object.freeze(parseCsv(process.env.ALLOWED_IMAGE_EXTENSIONS, DEFAULT_ALLOWED_IMAGE_EXTENSIONS));

const MAX_FILE_SIZE_BY_SECTION = Object.freeze({
  [SECTION_KEYS.PRODUCT]: parseNumber(process.env.MAX_PRODUCT_IMAGE_SIZE, 5 * 1024 * 1024),
  [SECTION_KEYS.VARIANT]: parseNumber(process.env.MAX_VARIANT_IMAGE_SIZE, 5 * 1024 * 1024),
  [SECTION_KEYS.CATEGORY]: parseNumber(process.env.MAX_CATEGORY_IMAGE_SIZE, 3 * 1024 * 1024),
  [SECTION_KEYS.BRAND]: parseNumber(process.env.MAX_BRAND_IMAGE_SIZE, 3 * 1024 * 1024),
  [SECTION_KEYS.USER]: parseNumber(process.env.MAX_AVATAR_SIZE, 2 * 1024 * 1024),
  [SECTION_KEYS.HERO_BANNER]: parseNumber(process.env.MAX_HERO_BANNER_IMAGE_SIZE, 5 * 1024 * 1024),
  [SECTION_KEYS.TEMP]: parseNumber(process.env.MAX_TEMP_IMAGE_SIZE, 5 * 1024 * 1024),
});

const MAX_FILE_SIZE_ANY_SECTION = Math.max(...Object.values(MAX_FILE_SIZE_BY_SECTION));

module.exports = {
  SECTION_KEYS,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
  MAX_FILE_SIZE_BY_SECTION,
  MAX_FILE_SIZE_ANY_SECTION,
};
