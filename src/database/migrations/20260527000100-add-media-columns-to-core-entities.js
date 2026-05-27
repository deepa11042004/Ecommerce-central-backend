'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.addColumn(
        'categories',
        'image',
        {
          type: Sequelize.STRING(500),
          allowNull: true,
          after: 'description',
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'brands',
        'logo',
        {
          type: Sequelize.STRING(500),
          allowNull: true,
          after: 'description',
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'users',
        'avatar',
        {
          type: Sequelize.STRING(500),
          allowNull: true,
          after: 'email',
        },
        { transaction }
      );

      await queryInterface.addIndex('categories', ['image'], {
        name: 'idx_categories_image',
        transaction,
      });

      await queryInterface.addIndex('brands', ['logo'], {
        name: 'idx_brands_logo',
        transaction,
      });

      await queryInterface.addIndex('users', ['avatar'], {
        name: 'idx_users_avatar',
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
      await queryInterface.removeIndex('users', 'idx_users_avatar', { transaction }).catch(() => {});
      await queryInterface.removeIndex('brands', 'idx_brands_logo', { transaction }).catch(() => {});
      await queryInterface.removeIndex('categories', 'idx_categories_image', { transaction }).catch(() => {});

      await queryInterface.removeColumn('users', 'avatar', { transaction });
      await queryInterface.removeColumn('brands', 'logo', { transaction });
      await queryInterface.removeColumn('categories', 'image', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
