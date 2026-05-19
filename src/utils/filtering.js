const parseSort = (sort, { allowedFields = [], defaultSort = { sortBy: 'createdAt', sortOrder: 'DESC' } } = {}) => {
  if (!sort) {
    return defaultSort;
  }

  const [sortByRaw, sortOrderRaw] = String(sort).split('_');
  const normalizedSortBy = String(sortByRaw || '').trim();
  const normalizedSortOrder = String(sortOrderRaw || 'desc').toUpperCase();

  if (!allowedFields.includes(normalizedSortBy)) {
    return defaultSort;
  }

  if (!['ASC', 'DESC'].includes(normalizedSortOrder)) {
    return defaultSort;
  }

  return {
    sortBy: normalizedSortBy,
    sortOrder: normalizedSortOrder,
  };
};

const parseAttributeFilters = (attributeQuery) => {
  if (!attributeQuery) {
    return [];
  }

  const entries = Array.isArray(attributeQuery) ? attributeQuery : [attributeQuery];

  return entries
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
    .map((entry) => {
      const dividerIndex = entry.indexOf(':');

      if (dividerIndex === -1) {
        return null;
      }

      const code = entry.slice(0, dividerIndex).trim().toLowerCase();
      const value = entry.slice(dividerIndex + 1).trim().toLowerCase();

      if (!code || !value) {
        return null;
      }

      return { code, value };
    })
    .filter(Boolean);
};

module.exports = {
  parseSort,
  parseAttributeFilters,
};
