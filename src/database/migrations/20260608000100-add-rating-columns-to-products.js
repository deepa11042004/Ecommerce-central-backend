'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'average_rating', {
      type: Sequelize.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 0.00,
    });

    await queryInterface.addColumn('products', 'total_reviews', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('products', 'rating_1_count', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('products', 'rating_2_count', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('products', 'rating_3_count', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('products', 'rating_4_count', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('products', 'rating_5_count', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addIndex('products', ['average_rating'], {
      name: 'idx_products_average_rating',
    });

    await queryInterface.addIndex('products', ['total_reviews'], {
      name: 'idx_products_total_reviews',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('products', 'idx_products_average_rating');
    await queryInterface.removeIndex('products', 'idx_products_total_reviews');

    await queryInterface.removeColumn('products', 'average_rating');
    await queryInterface.removeColumn('products', 'total_reviews');
    await queryInterface.removeColumn('products', 'rating_1_count');
    await queryInterface.removeColumn('products', 'rating_2_count');
    await queryInterface.removeColumn('products', 'rating_3_count');
    await queryInterface.removeColumn('products', 'rating_4_count');
    await queryInterface.removeColumn('products', 'rating_5_count');
  },
};
