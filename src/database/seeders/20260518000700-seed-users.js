'use strict';

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { Op, QueryTypes } = require('sequelize');
const { ROLES } = require('../../constants/roles');

const DEFAULT_SEED_DEVELOPER_EMAIL = 'developer@example.com';
const DEFAULT_SEED_SUPER_ADMIN_EMAIL = 'superadmin@example.com';

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const dbRoles = await queryInterface.sequelize.query('SELECT id, name FROM roles;', {
      type: QueryTypes.SELECT,
    });

    const roleIdByName = dbRoles.reduce((acc, role) => {
      acc[role.name] = role.id;
      return acc;
    }, {});

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
    const developerEmail = process.env.SEED_DEVELOPER_EMAIL || DEFAULT_SEED_DEVELOPER_EMAIL;
    const developerPassword = process.env.SEED_DEVELOPER_PASSWORD || 'Dev!loper#2026';
    const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL || DEFAULT_SEED_SUPER_ADMIN_EMAIL;
    const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD || 'SuperAdmin!#2026X';

    const developerPasswordHash = await bcrypt.hash(developerPassword, saltRounds);
    const superAdminPasswordHash = await bcrypt.hash(superAdminPassword, saltRounds);

    const users = [
      {
        first_name: 'Developer',
        last_name: 'Engineer',
        full_name: 'Developer Engineer',
        email: developerEmail,
        password_hash: developerPasswordHash,
        role_id: roleIdByName[ROLES.DEVELOPER],
        created_at: now,
        updated_at: now,
      },
      {
        first_name: 'Super',
        last_name: 'Admin',
        full_name: 'Super Admin User',
        email: superAdminEmail,
        password_hash: superAdminPasswordHash,
        role_id: roleIdByName[ROLES.SUPER_ADMIN],
        created_at: now,
        updated_at: now,
      },
    ].filter((user) => Boolean(user.role_id));

    await queryInterface.bulkInsert('users', users, {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      'users',
      {
        [Op.or]: [
          { email: process.env.SEED_DEVELOPER_EMAIL || DEFAULT_SEED_DEVELOPER_EMAIL },
          { email: process.env.SEED_SUPER_ADMIN_EMAIL || DEFAULT_SEED_SUPER_ADMIN_EMAIL },
          { email: { [Op.like]: '%@starter.local' } },
        ],
      },
      {}
    );
  },
};
