'use strict';

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { Op, QueryTypes } = require('sequelize');
const { ROLES } = require('../../constants/roles');

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
    const passwordHash = await bcrypt.hash('Password@123', saltRounds);

    const users = [
      {
        first_name: 'Developer',
        last_name: 'User',
        full_name: 'Developer User',
        email: 'developer@starter.local',
        password_hash: passwordHash,
        role_id: roleIdByName[ROLES.DEVELOPER],
        created_at: now,
        updated_at: now,
      },
      {
        first_name: 'Super',
        last_name: 'Admin',
        full_name: 'Super Admin User',
        email: 'superadmin@starter.local',
        password_hash: passwordHash,
        role_id: roleIdByName[ROLES.SUPER_ADMIN],
        created_at: now,
        updated_at: now,
      },
      {
        first_name: 'Admin',
        last_name: 'User',
        full_name: 'Admin User',
        email: 'admin@starter.local',
        password_hash: passwordHash,
        role_id: roleIdByName[ROLES.ADMIN],
        created_at: now,
        updated_at: now,
      },
      {
        first_name: 'Customer',
        last_name: 'User',
        full_name: 'Customer User',
        email: 'customer@starter.local',
        password_hash: passwordHash,
        role_id: roleIdByName[ROLES.CUSTOMER],
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
        email: {
          [Op.in]: [
            'developer@starter.local',
            'superadmin@starter.local',
            'admin@starter.local',
            'customer@starter.local',
          ],
        },
      },
      {}
    );
  },
};
