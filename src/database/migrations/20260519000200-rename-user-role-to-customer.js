'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `
      UPDATE roles
      SET name = :toName
      WHERE name = :fromName;
      `,
      {
        replacements: {
          fromName: 'user',
          toName: 'customer',
        },
        type: Sequelize.QueryTypes.UPDATE,
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `
      UPDATE roles
      SET name = :toName
      WHERE name = :fromName;
      `,
      {
        replacements: {
          fromName: 'customer',
          toName: 'user',
        },
        type: Sequelize.QueryTypes.UPDATE,
      }
    );
  },
};
