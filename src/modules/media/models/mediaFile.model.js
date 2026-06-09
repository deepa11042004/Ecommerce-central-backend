const defineMediaFileModel = (sequelize, DataTypes) => {
  const MediaFile = sequelize.define(
    'MediaFile',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      section: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      url: {
        type: DataTypes.STRING(1000),
        allowNull: false,
      },
      filename: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      originalName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'original_name',
      },
      size: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      mimeType: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'mime_type',
      },
      uploadedBy: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'uploaded_by',
      },
    },
    {
      tableName: 'media_files',
      timestamps: true,
      indexes: [
        { fields: ['section'] },
        { fields: ['uploaded_by'] },
        { fields: ['created_at'] },
      ],
    }
  );

  MediaFile.associate = (models) => {
    MediaFile.belongsTo(models.User, {
      foreignKey: 'uploadedBy',
      as: 'uploader',
    });

    MediaFile.hasMany(models.ReviewMedia, {
      foreignKey: 'mediaId',
      as: 'reviewMediaLinks',
    });
  };

  return MediaFile;
};

module.exports = defineMediaFileModel;
