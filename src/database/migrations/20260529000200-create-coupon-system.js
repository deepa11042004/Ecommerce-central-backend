'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.addColumn(
        'orders',
        'coupon_code_snapshot',
        {
          type: Sequelize.STRING(80),
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'orders',
        'coupon_discount_snapshot',
        {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'orders',
        'coupon_type_snapshot',
        {
          type: Sequelize.ENUM('PERCENTAGE', 'FIXED_AMOUNT'),
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.createTable(
        'coupons',
        {
          id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          code: {
            type: Sequelize.STRING(80),
            allowNull: false,
          },
          title: {
            type: Sequelize.STRING(160),
            allowNull: false,
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          coupon_type: {
            type: Sequelize.ENUM('PERCENTAGE', 'FIXED_AMOUNT'),
            allowNull: false,
          },
          discount_value: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
          },
          minimum_order_amount: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
          },
          maximum_discount_amount: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: true,
          },
          usage_limit: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: true,
          },
          per_user_usage_limit: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: true,
          },
          used_count: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 0,
          },
          starts_at: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          expires_at: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          stackable: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          created_by: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: true,
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
        },
        { transaction }
      );

      await queryInterface.addIndex('coupons', ['code'], {
        unique: true,
        name: 'idx_coupons_code_unique',
        transaction,
      });
      await queryInterface.addIndex('coupons', ['coupon_type'], {
        name: 'idx_coupons_coupon_type',
        transaction,
      });
      await queryInterface.addIndex('coupons', ['is_active', 'starts_at', 'expires_at'], {
        name: 'idx_coupons_active_dates',
        transaction,
      });
      await queryInterface.addIndex('coupons', ['used_count'], {
        name: 'idx_coupons_used_count',
        transaction,
      });

      await queryInterface.createTable(
        'coupon_products',
        {
          id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          coupon_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: {
              model: 'coupons',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
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
        },
        { transaction }
      );

      await queryInterface.addIndex('coupon_products', ['coupon_id', 'product_id'], {
        unique: true,
        name: 'idx_coupon_products_coupon_product_unique',
        transaction,
      });
      await queryInterface.addIndex('coupon_products', ['product_id'], {
        name: 'idx_coupon_products_product_id',
        transaction,
      });

      await queryInterface.createTable(
        'coupon_categories',
        {
          id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          coupon_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: {
              model: 'coupons',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          category_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: {
              model: 'categories',
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
        },
        { transaction }
      );

      await queryInterface.addIndex('coupon_categories', ['coupon_id', 'category_id'], {
        unique: true,
        name: 'idx_coupon_categories_coupon_category_unique',
        transaction,
      });
      await queryInterface.addIndex('coupon_categories', ['category_id'], {
        name: 'idx_coupon_categories_category_id',
        transaction,
      });

      await queryInterface.createTable(
        'coupon_usages',
        {
          id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          coupon_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: {
              model: 'coupons',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          user_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
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
          used_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          discount_amount: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
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
        },
        { transaction }
      );

      await queryInterface.addIndex('coupon_usages', ['coupon_id'], {
        name: 'idx_coupon_usages_coupon_id',
        transaction,
      });
      await queryInterface.addIndex('coupon_usages', ['user_id'], {
        name: 'idx_coupon_usages_user_id',
        transaction,
      });
      await queryInterface.addIndex('coupon_usages', ['order_id'], {
        unique: true,
        name: 'idx_coupon_usages_order_id_unique',
        transaction,
      });
      await queryInterface.addIndex('coupon_usages', ['used_at'], {
        name: 'idx_coupon_usages_used_at',
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.dropTable('coupon_usages', { transaction });
      await queryInterface.dropTable('coupon_categories', { transaction });
      await queryInterface.dropTable('coupon_products', { transaction });
      await queryInterface.dropTable('coupons', { transaction });

      await queryInterface.removeColumn('orders', 'coupon_type_snapshot', { transaction });
      await queryInterface.removeColumn('orders', 'coupon_discount_snapshot', { transaction });
      await queryInterface.removeColumn('orders', 'coupon_code_snapshot', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
