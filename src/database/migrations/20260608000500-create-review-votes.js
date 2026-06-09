'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('review_votes', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      review_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'reviews',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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

    await queryInterface.addIndex('review_votes', ['review_id'], {
      name: 'idx_review_votes_review_id',
    });

    await queryInterface.addIndex('review_votes', ['user_id'], {
      name: 'idx_review_votes_user_id',
    });

    await queryInterface.addIndex('review_votes', ['review_id', 'user_id'], {
      unique: true,
      name: 'idx_review_votes_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('review_votes');
  },
};
