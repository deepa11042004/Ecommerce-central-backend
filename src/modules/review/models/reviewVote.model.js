const defineReviewVoteModel = (sequelize, DataTypes) => {
  const ReviewVote = sequelize.define(
    'ReviewVote',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      reviewId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'review_id',
      },
      userId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'user_id',
      },
    },
    {
      tableName: 'review_votes',
      timestamps: true,
      indexes: [
        { fields: ['review_id'] },
        { fields: ['user_id'] },
        { unique: true, fields: ['review_id', 'user_id'] },
      ],
    }
  );

  ReviewVote.associate = (models) => {
    ReviewVote.belongsTo(models.Review, {
      foreignKey: 'reviewId',
      as: 'review',
    });

    ReviewVote.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  };

  return ReviewVote;
};

module.exports = defineReviewVoteModel;
