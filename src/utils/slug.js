const slugify = require('slugify');

const generateSlug = (seed, fallbackPrefix = 'item') => {
  const base = slugify(String(seed || ''), {
    lower: true,
    strict: true,
    trim: true,
  });

  if (base) {
    return base;
  }

  return `${fallbackPrefix}-${Date.now()}`;
};

module.exports = {
  generateSlug,
};
