const { sequelize } = require('../../../database/models');
const { QueryTypes } = require('sequelize');

class ReviewAggregationService {
  static async recalculate(productId, { transaction } = {}) {
    const [result] = await sequelize.query(
      `SELECT
        COUNT(*) AS total,
        COALESCE(AVG(rating), 0) AS average,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS r1,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS r2,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS r3,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS r4,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS r5
       FROM reviews
       WHERE product_id = :productId AND status = 'APPROVED'`,
      { replacements: { productId }, type: QueryTypes.SELECT, transaction }
    );

    const total = Number(result.total) || 0;
    const average = total > 0 ? parseFloat(Number(result.average).toFixed(2)) : 0;

    await sequelize.query(
      `UPDATE products SET
        average_rating = :average,
        total_reviews = :total,
        rating_1_count = :r1,
        rating_2_count = :r2,
        rating_3_count = :r3,
        rating_4_count = :r4,
        rating_5_count = :r5
       WHERE id = :productId`,
      {
        replacements: {
          productId,
          average,
          total,
          r1: Number(result.r1) || 0,
          r2: Number(result.r2) || 0,
          r3: Number(result.r3) || 0,
          r4: Number(result.r4) || 0,
          r5: Number(result.r5) || 0,
        },
        type: QueryTypes.UPDATE,
        transaction,
      }
    );

    return { productId, average, total };
  }

  // Non-blocking fire-and-forget version. Use when aggregation does not need to be in the same transaction.
  static recalculateAsync(productId) {
    this.recalculate(productId).catch((err) => {
      console.error(`[ReviewAggregationService] Failed to recalculate for product ${productId}:`, err.message);
    });
  }
}

module.exports = ReviewAggregationService;
