const path = require('path');

const sanitizeSlug = (value) => {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
};

const getFileExtension = (filename) => {
  return path.extname(String(filename || '')).toLowerCase();
};

const buildUniqueFilename = ({ baseName, originalName, extension }) => {
  const originalBase = path.parse(String(originalName || '')).name;
  const normalizedBase = sanitizeSlug(baseName || originalBase || 'file') || 'file';
  const safeExtension = String(extension || getFileExtension(originalName) || '.jpg').toLowerCase();
  const timestamp = Date.now();
  const randomSegment = Math.random().toString(36).slice(2, 7);

  return `${normalizedBase}-${timestamp}-${randomSegment}${safeExtension}`;
};

module.exports = {
  sanitizeSlug,
  getFileExtension,
  buildUniqueFilename,
};
