const defineReviewMediaModel = (sequelize, DataTypes) => {
  const ReviewMedia = sequelize.define(
    'ReviewMedia',
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
      mediaId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'media_id',
      },
    },
    {
      tableName: 'review_media',
      timestamps: true,
      indexes: [
        { fields: ['review_id'] },
        { unique: true, fields: ['review_id', 'media_id'] },
      ],
    }
  );

  ReviewMedia.associate = (models) => {
    ReviewMedia.belongsTo(models.Review, {
      foreignKey: 'reviewId',
      as: 'review',
    });

    ReviewMedia.belongsTo(models.MediaFile, {
      foreignKey: 'mediaId',
      as: 'file',
    });
  };

  return ReviewMedia;
};

module.exports = defineReviewMediaModel;
