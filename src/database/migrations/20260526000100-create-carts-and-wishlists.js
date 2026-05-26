'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable(
        'wishlists',
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
            onDelete: 'CASCADE',
          },
          guest_id: {
            type: Sequelize.STRING(80),
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

      await queryInterface.addIndex('wishlists', ['user_id'], {
        unique: true,
        name: 'idx_wishlists_user_id_unique',
        transaction,
      });
      await queryInterface.addIndex('wishlists', ['guest_id'], {
        unique: true,
        name: 'idx_wishlists_guest_id_unique',
        transaction,
      });

      await queryInterface.createTable(
        'wishlist_items',
        {
          id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          wishlist_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: {
              model: 'wishlists',
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
          variant_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: true,
            references: {
              model: 'product_variants',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          item_key: {
            type: Sequelize.STRING(120),
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

      await queryInterface.addIndex('wishlist_items', ['wishlist_id', 'item_key'], {
        unique: true,
        name: 'idx_wishlist_items_wishlist_item_key_unique',
        transaction,
      });
      await queryInterface.addIndex('wishlist_items', ['product_id'], {
        name: 'idx_wishlist_items_product_id',
        transaction,
      });
      await queryInterface.addIndex('wishlist_items', ['variant_id'], {
        name: 'idx_wishlist_items_variant_id',
        transaction,
      });

      await queryInterface.createTable(
        'carts',
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
            onDelete: 'CASCADE',
          },
          guest_id: {
            type: Sequelize.STRING(80),
            allowNull: true,
          },
          currency: {
            type: Sequelize.STRING(3),
            allowNull: false,
            defaultValue: 'USD',
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

      await queryInterface.addIndex('carts', ['user_id'], {
        unique: true,
        name: 'idx_carts_user_id_unique',
        transaction,
      });
      await queryInterface.addIndex('carts', ['guest_id'], {
        unique: true,
        name: 'idx_carts_guest_id_unique',
        transaction,
      });
      await queryInterface.addIndex('carts', ['currency'], {
        name: 'idx_carts_currency',
        transaction,
      });

      await queryInterface.createTable(
        'cart_items',
        {
          id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          cart_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: {
              model: 'carts',
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
          variant_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: true,
            references: {
              model: 'product_variants',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          item_key: {
            type: Sequelize.STRING(120),
            allowNull: false,
          },
          quantity: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
          },
          unit_price: {
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

      await queryInterface.addIndex('cart_items', ['cart_id', 'item_key'], {
        unique: true,
        name: 'idx_cart_items_cart_item_key_unique',
        transaction,
      });
      await queryInterface.addIndex('cart_items', ['product_id'], {
        name: 'idx_cart_items_product_id',
        transaction,
      });
      await queryInterface.addIndex('cart_items', ['variant_id'], {
        name: 'idx_cart_items_variant_id',
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
      await queryInterface.dropTable('cart_items', { transaction });
      await queryInterface.dropTable('carts', { transaction });
      await queryInterface.dropTable('wishlist_items', { transaction });
      await queryInterface.dropTable('wishlists', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};