const { sequelize } = require('../../../database/models');
const { QueryTypes } = require('sequelize');
const { REVIEW_STATUS } = require('../../../constants/review');
const { parsePagination } = require('../../../utils/pagination');

class ReviewAnalyticsService {
  static async getOverallMetrics() {
    const [totals] = await sequelize.query(
      `SELECT
        COUNT(*) AS total_reviews,
        SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_reviews,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending_reviews,
        SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_reviews,
        SUM(CASE WHEN status = 'HIDDEN' THEN 1 ELSE 0 END) AS hidden_reviews,
        SUM(CASE WHEN is_verified_purchase = 1 THEN 1 ELSE 0 END) AS verified_reviews,
        COALESCE(AVG(CASE WHEN status = 'APPROVED' THEN rating END), 0) AS average_rating,
        SUM(CASE WHEN status = 'APPROVED' AND rating = 1 THEN 1 ELSE 0 END) AS rating_1_count,
        SUM(CASE WHEN status = 'APPROVED' AND rating = 2 THEN 1 ELSE 0 END) AS rating_2_count,
        SUM(CASE WHEN status = 'APPROVED' AND rating = 3 THEN 1 ELSE 0 END) AS rating_3_count,
        SUM(CASE WHEN status = 'APPROVED' AND rating = 4 THEN 1 ELSE 0 END) AS rating_4_count,
        SUM(CASE WHEN status = 'APPROVED' AND rating = 5 THEN 1 ELSE 0 END) AS rating_5_count
       FROM reviews`,
      { type: QueryTypes.SELECT }
    );

    return {
      totalReviews: Number(totals.total_reviews) || 0,
      approvedReviews: Number(totals.approved_reviews) || 0,
      pendingReviews: Number(totals.pending_reviews) || 0,
      rejectedReviews: Number(totals.rejected_reviews) || 0,
      hiddenReviews: Number(totals.hidden_reviews) || 0,
      verifiedReviews: Number(totals.verified_reviews) || 0,
      averageRating: parseFloat(Number(totals.average_rating).toFixed(2)),
      ratingDistribution: {
        1: Number(totals.rating_1_count) || 0,
        2: Number(totals.rating_2_count) || 0,
        3: Number(totals.rating_3_count) || 0,
        4: Number(totals.rating_4_count) || 0,
        5: Number(totals.rating_5_count) || 0,
      },
    };
  }

  static async getTopRatedProducts(query = {}) {
    const { limit } = parsePagination(query);

    const rows = await sequelize.query(
      `SELECT
        p.id,
        p.title,
        p.slug,
        p.thumbnail,
        p.average_rating,
        p.total_reviews,
        p.rating_1_count,
        p.rating_2_count,
        p.rating_3_count,
        p.rating_4_count,
        p.rating_5_count
       FROM products p
       WHERE p.total_reviews > 0
       ORDER BY p.average_rating DESC, p.total_reviews DESC
       LIMIT :limit`,
      { replacements: { limit }, type: QueryTypes.SELECT }
    );

    return rows.map((r) => this.serializeProductRating(r));
  }

  static async getLowestRatedProducts(query = {}) {
    const { limit } = parsePagination(query);

    const rows = await sequelize.query(
      `SELECT
        p.id,
        p.title,
        p.slug,
        p.thumbnail,
        p.average_rating,
        p.total_reviews,
        p.rating_1_count,
        p.rating_2_count,
        p.rating_3_count,
        p.rating_4_count,
        p.rating_5_count
       FROM products p
       WHERE p.total_reviews > 0
       ORDER BY p.average_rating ASC, p.total_reviews DESC
       LIMIT :limit`,
      { replacements: { limit }, type: QueryTypes.SELECT }
    );

    return rows.map((r) => this.serializeProductRating(r));
  }

  static async getMostReviewedProducts(query = {}) {
    const { limit } = parsePagination(query);

    const rows = await sequelize.query(
      `SELECT
        p.id,
        p.title,
        p.slug,
        p.thumbnail,
        p.average_rating,
        p.total_reviews,
        p.rating_1_count,
        p.rating_2_count,
        p.rating_3_count,
        p.rating_4_count,
        p.rating_5_count
       FROM products p
       WHERE p.total_reviews > 0
       ORDER BY p.total_reviews DESC, p.average_rating DESC
       LIMIT :limit`,
      { replacements: { limit }, type: QueryTypes.SELECT }
    );

    return rows.map((r) => this.serializeProductRating(r));
  }

  static serializeProductRating(row) {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      thumbnail: row.thumbnail || null,
      averageRating: parseFloat(Number(row.average_rating).toFixed(2)),
      totalReviews: Number(row.total_reviews) || 0,
      ratingDistribution: {
        1: Number(row.rating_1_count) || 0,
        2: Number(row.rating_2_count) || 0,
        3: Number(row.rating_3_count) || 0,
        4: Number(row.rating_4_count) || 0,
        5: Number(row.rating_5_count) || 0,
      },
    };
  }
}

module.exports = ReviewAnalyticsService;
