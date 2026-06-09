'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('media_files', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      section: {
        type: Sequelize.STRING(50),
        allowNull: false,
        field: 'section',
      },
      url: {
        type: Sequelize.STRING(1000),
        allowNull: false,
        field: 'url',
      },
      filename: {
        type: Sequelize.STRING(255),
        allowNull: false,
        field: 'filename',
      },
      original_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        field: 'original_name',
      },
      size: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'size',
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
        field: 'mime_type',
      },
      uploaded_by: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'uploaded_by',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('media_files', ['section'], {
      name: 'idx_media_files_section',
    });

    await queryInterface.addIndex('media_files', ['uploaded_by'], {
      name: 'idx_media_files_uploaded_by',
    });

    await queryInterface.addIndex('media_files', ['created_at'], {
      name: 'idx_media_files_created_at',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('media_files');
  },
};
