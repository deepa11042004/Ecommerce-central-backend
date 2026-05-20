const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ApiError = require('../../../core/errors/ApiError');

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const sanitizeBaseName = (name) => {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const destinationDir = path.join(process.cwd(), 'uploads', 'products');
    fs.mkdirSync(destinationDir, { recursive: true });
    cb(null, destinationDir);
  },
  filename: (req, file, cb) => {
    const originalBaseName = path.parse(file.originalname || '').name || 'product-image';
    const safeBaseName = sanitizeBaseName(originalBaseName) || 'product-image';
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const extension = path.extname(file.originalname || '').toLowerCase() || '.jpg';

    cb(null, `${safeBaseName}-${uniqueSuffix}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      cb(ApiError.badRequest('Only JPG, PNG, WEBP, and GIF images are allowed'));
      return;
    }

    cb(null, true);
  },
});

const uploadProductImage = (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (error) {
      if (error.name === 'MulterError' && error.code === 'LIMIT_FILE_SIZE') {
        next(ApiError.badRequest('Image size must be less than 5MB'));
        return;
      }

      next(error);
      return;
    }

    next();
  });
};

module.exports = {
  uploadProductImage,
};
