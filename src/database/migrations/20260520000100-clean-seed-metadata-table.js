'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    const tableExists = async (tableName) => {
      const rows = await queryInterface.sequelize.query(
        `
        SELECT COUNT(*) AS count
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = :tableName;
        `,
        {
          replacements: { tableName },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      return Number(rows?.[0]?.count || 0) > 0;
    };

    try {
      await queryInterface.sequelize.query(
        `
        CREATE TABLE IF NOT EXISTS sequelize_seed_meta (
          name VARCHAR(255) NOT NULL,
          PRIMARY KEY (name),
          UNIQUE KEY idx_sequelize_seed_meta_name_unique (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
        `,
        { transaction }
      );

      if (await tableExists('SequelizeData')) {
        await queryInterface.sequelize.query(
          `
          INSERT IGNORE INTO sequelize_seed_meta (name)
          SELECT name FROM SequelizeData;
          `,
          { transaction }
        );

        await queryInterface.dropTable('SequelizeData', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    const tableExists = async (tableName) => {
      const rows = await queryInterface.sequelize.query(
        `
        SELECT COUNT(*) AS count
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = :tableName;
        `,
        {
          replacements: { tableName },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      return Number(rows?.[0]?.count || 0) > 0;
    };

    try {
      await queryInterface.sequelize.query(
        `
        CREATE TABLE IF NOT EXISTS SequelizeData (
          name VARCHAR(255) NOT NULL,
          PRIMARY KEY (name),
          UNIQUE KEY name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
        `,
        { transaction }
      );

      if (await tableExists('sequelize_seed_meta')) {
        await queryInterface.sequelize.query(
          `
          INSERT IGNORE INTO SequelizeData (name)
          SELECT name FROM sequelize_seed_meta;
          `,
          { transaction }
        );

        await queryInterface.dropTable('sequelize_seed_meta', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
