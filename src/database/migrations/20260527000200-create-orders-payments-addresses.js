'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable(
        'addresses',
        {
          id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
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
          guest_id: {
            type: Sequelize.STRING(80),
            allowNull: true,
          },
          full_name: {
            type: Sequelize.STRING(160),
            allowNull: false,
          },
          phone: {
            type: Sequelize.STRING(30),
            allowNull: false,
          },
          address_line_1: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          address_line_2: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          city: {
            type: Sequelize.STRING(120),
            allowNull: false,
          },
          state: {
            type: Sequelize.STRING(120),
            allowNull: false,
          },
          country: {
            type: Sequelize.STRING(120),
            allowNull: false,
          },
          postal_code: {
            type: Sequelize.STRING(30),
            allowNull: false,
          },
          landmark: {
            type: Sequelize.STRING(190),
            allowNull: true,
          },
          type: {
            type: Sequelize.ENUM('shipping', 'billing', 'both'),
            allowNull: false,
            defaultValue: 'shipping',
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

      await queryInterface.addIndex('addresses', ['user_id'], {
        name: 'idx_addresses_user_id',
        transaction,
      });
      await queryInterface.addIndex('addresses', ['guest_id'], {
        name: 'idx_addresses_guest_id',
        transaction,
      });
      await queryInterface.addIndex('addresses', ['type'], {
        name: 'idx_addresses_type',
        transaction,
      });

      await queryInterface.createTable(
        'orders',
        {
          id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          order_number: {
            type: Sequelize.STRING(40),
            allowNull: false,
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
          guest_id: {
            type: Sequelize.STRING(80),
            allowNull: true,
          },
          subtotal: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
          },
          tax_amount: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
          },
          shipping_amount: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
          },
          discount_amount: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
          },
          total_amount: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
          },
          currency: {
            type: Sequelize.STRING(3),
            allowNull: false,
          },
          order_status: {
            type: Sequelize.ENUM(
              'PENDING_PAYMENT',
              'CONFIRMED',
              'PROCESSING',
              'SHIPPED',
              'DELIVERED',
              'CANCELLED',
              'REFUNDED',
              'FAILED'
            ),
            allowNull: false,
            defaultValue: 'PENDING_PAYMENT',
          },
          payment_status: {
            type: Sequelize.ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'),
            allowNull: false,
            defaultValue: 'PENDING',
          },
          payment_method: {
            type: Sequelize.STRING(30),
            allowNull: false,
          },
          billing_address_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: true,
            references: {
              model: 'addresses',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          shipping_address_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: true,
            references: {
              model: 'addresses',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          notes: {
            type: Sequelize.TEXT,
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
        },
        { transaction }
      );

      await queryInterface.addIndex('orders', ['order_number'], {
        unique: true,
        name: 'idx_orders_order_number_unique',
        transaction,
      });
      await queryInterface.addIndex('orders', ['user_id'], {
        name: 'idx_orders_user_id',
        transaction,
      });
      await queryInterface.addIndex('orders', ['guest_id'], {
        name: 'idx_orders_guest_id',
        transaction,
      });
      await queryInterface.addIndex('orders', ['order_status'], {
        name: 'idx_orders_order_status',
        transaction,
      });
      await queryInterface.addIndex('orders', ['payment_status'], {
        name: 'idx_orders_payment_status',
        transaction,
      });
      await queryInterface.addIndex('orders', ['created_at'], {
        name: 'idx_orders_created_at',
        transaction,
      });

      await queryInterface.createTable(
        'order_items',
        {
          id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          order_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: {
              model: 'orders',
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
          },
          variant_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: true,
            references: {
              model: 'product_variants',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          product_name_snapshot: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          sku_snapshot: {
            type: Sequelize.STRING(80),
            allowNull: true,
          },
          image_snapshot: {
            type: Sequelize.STRING(500),
            allowNull: true,
          },
          unit_price: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
          },
          quantity: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
          },
          total_price: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
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

      await queryInterface.addIndex('order_items', ['order_id'], {
        name: 'idx_order_items_order_id',
        transaction,
      });
      await queryInterface.addIndex('order_items', ['product_id'], {
        name: 'idx_order_items_product_id',
        transaction,
      });
      await queryInterface.addIndex('order_items', ['variant_id'], {
        name: 'idx_order_items_variant_id',
        transaction,
      });

      await queryInterface.createTable(
        'payments',
        {
          id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          order_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: {
              model: 'orders',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          razorpay_order_id: {
            type: Sequelize.STRING(120),
            allowNull: true,
          },
          razorpay_payment_id: {
            type: Sequelize.STRING(120),
            allowNull: true,
          },
          razorpay_signature: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          amount: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
          },
          currency: {
            type: Sequelize.STRING(3),
            allowNull: false,
          },
          payment_method: {
            type: Sequelize.STRING(30),
            allowNull: false,
          },
          provider: {
            type: Sequelize.STRING(30),
            allowNull: false,
          },
          payment_status: {
            type: Sequelize.ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'),
            allowNull: false,
            defaultValue: 'PENDING',
          },
          raw_response_json: {
            type: Sequelize.JSON,
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
        },
        { transaction }
      );

      await queryInterface.addIndex('payments', ['order_id'], {
        name: 'idx_payments_order_id',
        transaction,
      });
      await queryInterface.addIndex('payments', ['razorpay_order_id'], {
        unique: true,
        name: 'idx_payments_razorpay_order_id_unique',
        transaction,
      });
      await queryInterface.addIndex('payments', ['razorpay_payment_id'], {
        name: 'idx_payments_razorpay_payment_id',
        transaction,
      });
      await queryInterface.addIndex('payments', ['payment_status'], {
        name: 'idx_payments_payment_status',
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
      await queryInterface.dropTable('payments', { transaction });
      await queryInterface.dropTable('order_items', { transaction });
      await queryInterface.dropTable('orders', { transaction });
      await queryInterface.dropTable('addresses', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
