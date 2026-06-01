const express = require('express');
const validate = require('../../../middleware/validate.middleware');
const controller = require('../controllers/search.controller');
const { searchSuggestionsSchema } = require('../validators/product.validator');

const router = express.Router();

/**
 * @swagger
 * /search/suggestions:
 *   get:
 *     tags: [Products]
 *     summary: Fetch lightweight search suggestions
 *     description: |
 *       Fast autocomplete endpoint for storefront search bars.
 *       Returns product, category, and brand suggestions.
 *       Debounce-friendly response for real-time typing UX.
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         example: iph
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *         example: 8
 *     responses:
 *       200:
 *         description: Suggestions fetched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchSuggestionSuccessResponse'
 */
router.get('/suggestions', validate(searchSuggestionsSchema), controller.suggestions);

module.exports = router;
