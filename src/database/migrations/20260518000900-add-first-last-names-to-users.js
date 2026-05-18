'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'first_name', {
      type: Sequelize.STRING(80),
      allowNull: true,
      after: 'id',
    });

    await queryInterface.addColumn('users', 'last_name', {
      type: Sequelize.STRING(80),
      allowNull: true,
      after: 'first_name',
    });

    await queryInterface.addIndex('users', ['first_name'], {
      name: 'idx_users_first_name',
    });

    await queryInterface.addIndex('users', ['last_name'], {
      name: 'idx_users_last_name',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('users', 'idx_users_last_name');
    await queryInterface.removeIndex('users', 'idx_users_first_name');
    await queryInterface.removeColumn('users', 'last_name');
    await queryInterface.removeColumn('users', 'first_name');
  },
};
