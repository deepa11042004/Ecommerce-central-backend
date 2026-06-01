'use strict';

const { QueryTypes } = require('sequelize');
const { ROLES } = require('../../constants/roles');
const { PERMISSIONS } = require('../../constants/permissions');

const INVENTORY_PERMISSION_KEYS = [
  PERMISSIONS.INVENTORY_READ,
  PERMISSIONS.INVENTORY_ADJUST,
  PERMISSIONS.INVENTORY_MANAGE,
];

const TARGET_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

const PERMISSION_DESCRIPTIONS = {
  [PERMISSIONS.INVENTORY_READ]: 'Read inventory and stock history',
  [PERMISSIONS.INVENTORY_ADJUST]: 'Adjust inventory quantities',
  [PERMISSIONS.INVENTORY_MANAGE]: 'Manage inventory operations and bulk updates',
};

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const existingPermissions = await queryInterface.sequelize.query(
      'SELECT id, `key` FROM permissions WHERE `key` IN (:keys);',
      {
        replacements: { keys: INVENTORY_PERMISSION_KEYS },
        type: QueryTypes.SELECT,
      }
    );

    const permissionIdByKey = existingPermissions.reduce((acc, permission) => {
      acc[permission.key] = permission.id;
      return acc;
    }, {});

    const missingPermissionRows = INVENTORY_PERMISSION_KEYS
      .filter((key) => !permissionIdByKey[key])
      .map((key) => ({
        key,
        description: PERMISSION_DESCRIPTIONS[key] || 'Inventory permission',
        created_at: now,
        updated_at: now,
      }));

    if (missingPermissionRows.length > 0) {
      await queryInterface.bulkInsert('permissions', missingPermissionRows, {});
    }

    const refreshedPermissions = await queryInterface.sequelize.query(
      'SELECT id, `key` FROM permissions WHERE `key` IN (:keys);',
      {
        replacements: { keys: INVENTORY_PERMISSION_KEYS },
        type: QueryTypes.SELECT,
      }
    );

    const refreshedPermissionIdByKey = refreshedPermissions.reduce((acc, permission) => {
      acc[permission.key] = permission.id;
      return acc;
    }, {});

    const dbRoles = await queryInterface.sequelize.query(
      'SELECT id, name FROM roles WHERE name IN (:roles);',
      {
        replacements: { roles: TARGET_ROLES },
        type: QueryTypes.SELECT,
      }
    );

    const roleIdByName = dbRoles.reduce((acc, role) => {
      acc[role.name] = role.id;
      return acc;
    }, {});

    const roleIds = Object.values(roleIdByName);
    const permissionIds = INVENTORY_PERMISSION_KEYS
      .map((key) => refreshedPermissionIdByKey[key])
      .filter(Boolean);

    if (roleIds.length === 0 || permissionIds.length === 0) {
      return;
    }

    const existingRolePermissions = await queryInterface.sequelize.query(
      'SELECT role_id, permission_id FROM role_permissions WHERE role_id IN (:roleIds) AND permission_id IN (:permissionIds);',
      {
        replacements: { roleIds, permissionIds },
        type: QueryTypes.SELECT,
      }
    );

    const existingPairs = new Set(existingRolePermissions.map((entry) => `${entry.role_id}:${entry.permission_id}`));

    const rolePermissionRows = [];

    TARGET_ROLES.forEach((roleName) => {
      const roleId = roleIdByName[roleName];

      if (!roleId) {
        return;
      }

      INVENTORY_PERMISSION_KEYS.forEach((permissionKey) => {
        const permissionId = refreshedPermissionIdByKey[permissionKey];

        if (!permissionId) {
          return;
        }

        const pairKey = `${roleId}:${permissionId}`;

        if (!existingPairs.has(pairKey)) {
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
    const permissionRows = await queryInterface.sequelize.query(
      'SELECT id FROM permissions WHERE `key` IN (:keys);',
      {
        replacements: { keys: INVENTORY_PERMISSION_KEYS },
        type: QueryTypes.SELECT,
      }
    );

    const permissionIds = permissionRows.map((permission) => permission.id);

    const roleRows = await queryInterface.sequelize.query(
      'SELECT id FROM roles WHERE name IN (:roles);',
      {
        replacements: { roles: TARGET_ROLES },
        type: QueryTypes.SELECT,
      }
    );

    const roleIds = roleRows.map((role) => role.id);

    if (roleIds.length > 0 && permissionIds.length > 0) {
      await queryInterface.bulkDelete(
        'role_permissions',
        {
          role_id: roleIds,
          permission_id: permissionIds,
        },
        {}
      );
    }
  },
};
