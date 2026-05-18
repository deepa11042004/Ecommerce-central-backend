'use strict';

const { QueryTypes } = require('sequelize');
const { ROLES } = require('../../constants/roles');
const { PERMISSIONS, ROLE_PERMISSION_MATRIX } = require('../../constants/permissions');

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const roleRows = Object.values(ROLES).map((name) => ({
      name,
      created_at: now,
      updated_at: now,
    }));

    const permissionRows = [
      {
        key: PERMISSIONS.ADMIN_MANAGE,
        description: 'Manage administrator accounts',
        created_at: now,
        updated_at: now,
      },
      {
        key: PERMISSIONS.PRODUCT_CREATE,
        description: 'Create products',
        created_at: now,
        updated_at: now,
      },
      {
        key: PERMISSIONS.PRODUCT_UPDATE,
        description: 'Update products',
        created_at: now,
        updated_at: now,
      },
      {
        key: PERMISSIONS.PRODUCT_DELETE,
        description: 'Delete products',
        created_at: now,
        updated_at: now,
      },
      {
        key: PERMISSIONS.PRODUCT_READ,
        description: 'Fetch products',
        created_at: now,
        updated_at: now,
      },
    ];

    await queryInterface.bulkInsert('roles', roleRows, {});
    await queryInterface.bulkInsert('permissions', permissionRows, {});

    const dbRoles = await queryInterface.sequelize.query('SELECT id, name FROM roles;', {
      type: QueryTypes.SELECT,
    });

    const dbPermissions = await queryInterface.sequelize.query('SELECT id, `key` FROM permissions;', {
      type: QueryTypes.SELECT,
    });

    const roleIdByName = dbRoles.reduce((acc, role) => {
      acc[role.name] = role.id;
      return acc;
    }, {});

    const permissionIdByKey = dbPermissions.reduce((acc, permission) => {
      acc[permission.key] = permission.id;
      return acc;
    }, {});

    const rolePermissionRows = [];

    Object.entries(ROLE_PERMISSION_MATRIX).forEach(([roleName, permissions]) => {
      if (permissions.includes('*')) {
        return;
      }

      permissions.forEach((permissionKey) => {
        const roleId = roleIdByName[roleName];
        const permissionId = permissionIdByKey[permissionKey];

        if (roleId && permissionId) {
          rolePermissionRows.push({
            role_id: roleId,
            permission_id: permissionId,
            created_at: now,
            updated_at: now,
          });
        }
      });
    });

    if (rolePermissionRows.length > 0) {
      await queryInterface.bulkInsert('role_permissions', rolePermissionRows, {});
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('role_permissions', null, {});
    await queryInterface.bulkDelete('permissions', null, {});
    await queryInterface.bulkDelete('roles', null, {});
  },
};
