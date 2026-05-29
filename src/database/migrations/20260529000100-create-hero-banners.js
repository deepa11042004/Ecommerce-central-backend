'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable(
        'hero_banners',
        {
          id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          title: {
            type: Sequelize.STRING(200),
            allowNull: false,
          },
          subtitle: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          link: {
            type: Sequelize.STRING(500),
            allowNull: true,
          },
          image_path: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          sort_order: {
            type: Sequelize.INTEGER.UNSIGNED,
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

      await queryInterface.addIndex('hero_banners', ['is_active'], {
        name: 'idx_hero_banners_is_active',
        transaction,
      });

      await queryInterface.addIndex('hero_banners', ['sort_order'], {
        name: 'idx_hero_banners_sort_order',
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
      await queryInterface.dropTable('hero_banners', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
