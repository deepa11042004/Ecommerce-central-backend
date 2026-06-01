const { sendSuccess } = require('../../../core/http/response');
const asyncHandler = require('../../../utils/asyncHandler');
const SearchService = require('../services/search.service');
const { parseSuggestionQuery } = require('../utils/catalogQueryParser');
const env = require('../../../config/env');

const toPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
};

const suggestions = asyncHandler(async (req, res) => {
  const parsed = parseSuggestionQuery(req.query, {
    defaultLimit: toPositiveInteger(env.CATALOG_SUGGESTION_LIMIT, 8),
    maxLimit: toPositiveInteger(env.CATALOG_SUGGESTION_LIMIT, 8),
  });

  const data = await SearchService.getSuggestions(parsed);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Search suggestions fetched successfully',
    data,
  });
});

module.exports = {
  suggestions,
};
