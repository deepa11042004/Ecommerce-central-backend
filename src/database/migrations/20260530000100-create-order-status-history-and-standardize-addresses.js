'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable(
        'order_status_histories',
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
          old_status: {
            type: Sequelize.STRING(40),
            allowNull: true,
          },
          new_status: {
            type: Sequelize.STRING(40),
            allowNull: false,
          },
          changed_by: {
            type: Sequelize.STRING(120),
            allowNull: true,
          },
          reason: {
            type: Sequelize.STRING(255),
            allowNull: true,
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
        },
        { transaction }
      );

      await queryInterface.addIndex('order_status_histories', ['order_id'], {
        name: 'idx_order_status_histories_order_id',
        transaction,
      });
      await queryInterface.addIndex('order_status_histories', ['new_status'], {
        name: 'idx_order_status_histories_new_status',
        transaction,
      });
      await queryInterface.addIndex('order_status_histories', ['created_at'], {
        name: 'idx_order_status_histories_created_at',
        transaction,
      });

      await queryInterface.addColumn(
        'addresses',
        'label',
        {
          type: Sequelize.STRING(80),
          allowNull: true,
        },
        { transaction }
      );
      await queryInterface.addColumn(
        'addresses',
        'is_default_shipping',
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        { transaction }
      );
      await queryInterface.addColumn(
        'addresses',
        'is_default_billing',
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        { transaction }
      );

      await queryInterface.addIndex('addresses', ['is_default_shipping'], {
        name: 'idx_addresses_default_shipping',
        transaction,
      });
      await queryInterface.addIndex('addresses', ['is_default_billing'], {
        name: 'idx_addresses_default_billing',
        transaction,
      });

      await queryInterface.changeColumn(
        'orders',
        'order_status',
        {
          type: Sequelize.ENUM(
            'PENDING_PAYMENT',
            'CONFIRMED',
            'PROCESSING',
            'PACKED',
            'SHIPPED',
            'OUT_FOR_DELIVERY',
            'DELIVERED',
            'CANCELLED',
            'RETURN_REQUESTED',
            'RETURN_APPROVED',
            'RETURN_REJECTED',
            'REFUND_PENDING',
            'REFUNDED',
            'FAILED'
          ),
          allowNull: false,
          defaultValue: 'PENDING_PAYMENT',
        },
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.changeColumn(
        'orders',
        'order_status',
        {
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
        { transaction }
      );

      await queryInterface.removeIndex('addresses', 'idx_addresses_default_shipping', { transaction });
      await queryInterface.removeIndex('addresses', 'idx_addresses_default_billing', { transaction });
      await queryInterface.removeColumn('addresses', 'is_default_shipping', { transaction });
      await queryInterface.removeColumn('addresses', 'is_default_billing', { transaction });
      await queryInterface.removeColumn('addresses', 'label', { transaction });
      await queryInterface.dropTable('order_status_histories', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};