const { ReviewVote } = require('../../../database/models');

class ReviewVoteRepository {
  static findByReviewAndUser(reviewId, userId, { transaction } = {}) {
    return ReviewVote.findOne({
      where: { reviewId, userId },
      transaction,
    });
  }

  static create(reviewId, userId, { transaction } = {}) {
    return ReviewVote.create({ reviewId, userId }, { transaction });
  }

  static destroy(vote, { transaction } = {}) {
    return vote.destroy({ transaction });
  }

  static countByReview(reviewId, { transaction } = {}) {
    return ReviewVote.count({ where: { reviewId }, transaction });
  }
}

module.exports = ReviewVoteRepository;
