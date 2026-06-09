'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const now = new Date();

      const permissions = [
        { key: 'review.create',   description: 'Submit product reviews' },
        { key: 'review.update',   description: 'Update own reviews' },
        { key: 'review.delete',   description: 'Delete own reviews' },
        { key: 'review.read',     description: 'Read reviews and vote helpful' },
        { key: 'review.moderate', description: 'Approve, reject, hide, and delete any review' },
        { key: 'review.reply',    description: 'Add admin reply to a review' },
      ];

      for (const permission of permissions) {
        await queryInterface.sequelize.query(
          `
          INSERT INTO permissions (\`key\`, description, created_at, updated_at)
          VALUES (:key, :description, :createdAt, :updatedAt)
          ON DUPLICATE KEY UPDATE
            description = VALUES(description),
            updated_at  = VALUES(updated_at);
          `,
          {
            replacements: { key: permission.key, description: permission.description, createdAt: now, updatedAt: now },
            type: Sequelize.QueryTypes.INSERT,
            transaction,
          }
        );
      }

      const roles = await queryInterface.sequelize.query(
        'SELECT id, name FROM roles WHERE name IN (:names);',
        {
          replacements: { names: ['super_admin', 'admin', 'customer'] },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      const dbPermissions = await queryInterface.sequelize.query(
        'SELECT id, `key` FROM permissions WHERE `key` IN (:keys);',
        {
          replacements: { keys: permissions.map((p) => p.key) },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      const roleIdByName = roles.reduce((acc, r) => { acc[r.name] = r.id; return acc; }, {});
      const permIdByKey  = dbPermissions.reduce((acc, p) => { acc[p.key] = p.id; return acc; }, {});

      const matrix = {
        super_admin: ['review.create', 'review.update', 'review.delete', 'review.read', 'review.moderate', 'review.reply'],
        admin:       ['review.read',   'review.moderate', 'review.reply'],
        customer:    ['review.create', 'review.update',   'review.delete', 'review.read'],
      };

      for (const [roleName, keys] of Object.entries(matrix)) {
        const roleId = roleIdByName[roleName];
        if (!roleId) continue;

        for (const key of keys) {
          const permissionId = permIdByKey[key];
          if (!permissionId) continue;

          await queryInterface.sequelize.query(
            `
            INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
            SELECT :roleId, :permissionId, :createdAt, :updatedAt
            FROM DUAL
            WHERE NOT EXISTS (
              SELECT 1 FROM role_permissions
              WHERE role_id = :roleId AND permission_id = :permissionId
            );
            `,
            {
              replacements: { roleId, permissionId, createdAt: now, updatedAt: now },
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
      const keys = ['review.create', 'review.update', 'review.delete', 'review.read', 'review.moderate', 'review.reply'];

      await queryInterface.sequelize.query(
        `
        DELETE rp FROM role_permissions rp
        INNER JOIN permissions p ON p.id = rp.permission_id
        WHERE p.\`key\` IN (:keys);
        `,
        { replacements: { keys }, type: Sequelize.QueryTypes.DELETE, transaction }
      );

      await queryInterface.sequelize.query(
        'DELETE FROM permissions WHERE `key` IN (:keys);',
        { replacements: { keys }, type: Sequelize.QueryTypes.DELETE, transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
