'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const now = new Date();
      const permissions = [
        { key: 'admin.manage', description: 'Manage administrator accounts' },
        { key: 'product.create', description: 'Create products' },
        { key: 'product.update', description: 'Update products' },
        { key: 'product.delete', description: 'Delete products' },
        { key: 'product.read', description: 'Fetch products' },
      ];

      for (const permission of permissions) {
        await queryInterface.sequelize.query(
          `
          INSERT INTO permissions (
            \`key\`,
            description,
            created_at,
            updated_at
          )
          VALUES (:key, :description, :createdAt, :updatedAt)
          ON DUPLICATE KEY UPDATE
            description = VALUES(description),
            updated_at = VALUES(updated_at);
          `,
          {
            replacements: {
              key: permission.key,
              description: permission.description,
              createdAt: now,
              updatedAt: now,
            },
            type: Sequelize.QueryTypes.INSERT,
            transaction,
          }
        );
      }

      const roles = await queryInterface.sequelize.query(
        'SELECT id, name FROM roles WHERE name IN (:names);',
        {
          replacements: {
            names: ['super_admin', 'admin', 'customer'],
          },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      const dbPermissions = await queryInterface.sequelize.query(
        'SELECT id, `key` FROM permissions WHERE `key` IN (:keys);',
        {
          replacements: {
            keys: permissions.map((permission) => permission.key),
          },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      const roleIdByName = roles.reduce((acc, role) => {
        acc[role.name] = role.id;
        return acc;
      }, {});

      const permissionIdByKey = dbPermissions.reduce((acc, permission) => {
        acc[permission.key] = permission.id;
        return acc;
      }, {});

      const rolePermissionMatrix = {
        super_admin: ['admin.manage', 'product.create', 'product.update', 'product.delete', 'product.read'],
        admin: ['product.create', 'product.update', 'product.delete', 'product.read'],
        customer: ['product.read'],
      };

      for (const [roleName, permissionKeys] of Object.entries(rolePermissionMatrix)) {
        const roleId = roleIdByName[roleName];

        if (!roleId) {
          continue;
        }

        for (const permissionKey of permissionKeys) {
          const permissionId = permissionIdByKey[permissionKey];

          if (!permissionId) {
            continue;
          }

          await queryInterface.sequelize.query(
            `
            INSERT INTO role_permissions (
              role_id,
              permission_id,
              created_at,
              updated_at
            )
            SELECT :roleId, :permissionId, :createdAt, :updatedAt
            FROM DUAL
            WHERE NOT EXISTS (
              SELECT 1
              FROM role_permissions
              WHERE role_id = :roleId
                AND permission_id = :permissionId
            );
            `,
            {
              replacements: {
                roleId,
                permissionId,
                createdAt: now,
                updatedAt: now,
              },
              type: Sequelize.QueryTypes.INSERT,
              transaction,
            }
          );
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const targetPermissionKeys = ['admin.manage', 'product.create', 'product.update', 'product.delete', 'product.read'];

      await queryInterface.sequelize.query(
        `
        DELETE rp
        FROM role_permissions rp
        INNER JOIN roles r ON r.id = rp.role_id
        INNER JOIN permissions p ON p.id = rp.permission_id
        WHERE r.name IN ('super_admin', 'admin', 'customer')
          AND p.\`key\` IN (:keys);
        `,
        {
          replacements: {
            keys: targetPermissionKeys,
          },
          type: Sequelize.QueryTypes.DELETE,
          transaction,
        }
      );

      await queryInterface.sequelize.query(
        'DELETE FROM permissions WHERE `key` IN (:keys);',
        {
          replacements: {
            keys: targetPermissionKeys,
          },
          type: Sequelize.QueryTypes.DELETE,
          transaction,
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
