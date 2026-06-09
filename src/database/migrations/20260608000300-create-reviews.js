'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reviews', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      product_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'products',
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
      order_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: {
          model: 'orders',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      rating: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(160),
        allowNull: true,
      },
      comment: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_verified_purchase: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      helpful_count: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      admin_reply: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      replied_by: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      replied_at: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addIndex('reviews', ['product_id'], {
      name: 'idx_reviews_product_id',
    });

    await queryInterface.addIndex('reviews', ['user_id'], {
      name: 'idx_reviews_user_id',
    });

    await queryInterface.addIndex('reviews', ['order_id'], {
      name: 'idx_reviews_order_id',
    });

    await queryInterface.addIndex('reviews', ['status'], {
      name: 'idx_reviews_status',
    });

    await queryInterface.addIndex('reviews', ['rating'], {
      name: 'idx_reviews_rating',
    });

    await queryInterface.addIndex('reviews', ['created_at'], {
      name: 'idx_reviews_created_at',
    });

    await queryInterface.addIndex('reviews', ['helpful_count'], {
      name: 'idx_reviews_helpful_count',
    });

    await queryInterface.addIndex('reviews', ['is_verified_purchase'], {
      name: 'idx_reviews_is_verified_purchase',
    });

    await queryInterface.addIndex('reviews', ['product_id', 'status'], {
      name: 'idx_reviews_product_status',
    });

    await queryInterface.addIndex('reviews', ['product_id', 'user_id'], {
      name: 'idx_reviews_product_user',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('reviews');
  },
};
