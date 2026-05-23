'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.addColumn(
        'products',
        'has_variants',
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          after: 'product_type',
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'products',
        'base_price',
        {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true,
          after: 'has_variants',
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'products',
        'compare_price',
        {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true,
          after: 'base_price',
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'products',
        'stock',
        {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true,
          after: 'compare_price',
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'products',
        'sku',
        {
          type: Sequelize.STRING(80),
          allowNull: true,
          after: 'stock',
        },
        { transaction }
      );

      await queryInterface.addIndex('products', ['sku'], {
        unique: true,
        name: 'idx_products_sku_unique_nullable',
        transaction,
      });

      await queryInterface.addIndex('products', ['has_variants'], {
        name: 'idx_products_has_variants',
        transaction,
      });

      await queryInterface.addIndex('products', ['base_price'], {
        name: 'idx_products_base_price',
        transaction,
      });

      await queryInterface.addIndex('products', ['stock'], {
        name: 'idx_products_stock',
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
      await queryInterface.removeIndex('products', 'idx_products_stock', { transaction }).catch(() => {});
      await queryInterface.removeIndex('products', 'idx_products_base_price', { transaction }).catch(() => {});
      await queryInterface.removeIndex('products', 'idx_products_has_variants', { transaction }).catch(() => {});
      await queryInterface.removeIndex('products', 'idx_products_sku_unique_nullable', { transaction }).catch(() => {});

      await queryInterface.removeColumn('products', 'sku', { transaction });
      await queryInterface.removeColumn('products', 'stock', { transaction });
      await queryInterface.removeColumn('products', 'compare_price', { transaction });
      await queryInterface.removeColumn('products', 'base_price', { transaction });
      await queryInterface.removeColumn('products', 'has_variants', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
