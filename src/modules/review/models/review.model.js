const { REVIEW_STATUS_LIST } = require('../../../constants/review');

const defineReviewModel = (sequelize, DataTypes) => {
  const Review = sequelize.define(
    'Review',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      productId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'product_id',
      },
      userId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'user_id',
      },
      orderId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'order_id',
      },
      rating: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        validate: { min: 1, max: 5 },
      },
      title: {
        type: DataTypes.STRING(160),
        allowNull: true,
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isVerifiedPurchase: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_verified_purchase',
      },
      status: {
        type: DataTypes.ENUM(...REVIEW_STATUS_LIST),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      helpfulCount: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        field: 'helpful_count',
      },
      adminReply: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'admin_reply',
      },
      repliedBy: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'replied_by',
      },
      repliedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'replied_at',
      },
    },
    {
      tableName: 'reviews',
      timestamps: true,
      indexes: [
        { fields: ['product_id'] },
        { fields: ['user_id'] },
        { fields: ['order_id'] },
        { fields: ['status'] },
        { fields: ['rating'] },
        { fields: ['created_at'] },
        { fields: ['helpful_count'] },
        { fields: ['is_verified_purchase'] },
        { fields: ['product_id', 'status'] },
        { fields: ['product_id', 'user_id'] },
      ],
    }
  );

  Review.associate = (models) => {
    Review.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });

    Review.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    Review.belongsTo(models.Order, {
      foreignKey: 'orderId',
      as: 'order',
    });

    Review.belongsTo(models.User, {
      foreignKey: 'repliedBy',
      as: 'replier',
    });

    Review.hasMany(models.ReviewMedia, {
      foreignKey: 'reviewId',
      as: 'media',
    });

    Review.hasMany(models.ReviewVote, {
      foreignKey: 'reviewId',
      as: 'votes',
    });
  };

  return Review;
};

module.exports = defineReviewModel;
