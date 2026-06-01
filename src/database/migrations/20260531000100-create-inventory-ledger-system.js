'use strict';

const { INVENTORY_MOVEMENT_TYPE_LIST, INVENTORY_RESERVATION_STATUS_LIST } = require('../../constants/inventory');

const normalizeTableName = (entry) => {
  if (typeof entry === 'string') {
    return entry;
  }

  if (entry && typeof entry === 'object') {
    return Object.values(entry)[0] || null;
  }

  return null;
};

const tableExists = async (queryInterface, tableName, transaction) => {
  const tables = await queryInterface.showAllTables({ transaction });
  return tables.map(normalizeTableName).includes(tableName);
};

const addIndexSafe = async (queryInterface, tableName, columns, options, transaction) => {
  try {
    await queryInterface.addIndex(tableName, columns, {
      ...options,
      transaction,
    });
  } catch (error) {
    const message = String(error?.message || '').toLowerCase();

    if (message.includes('duplicate') || message.includes('already exists')) {
      return;
    }

    throw error;
  }
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const inventoriesExists = await tableExists(queryInterface, 'inventories', transaction);

      if (!inventoriesExists) {
        await queryInterface.createTable(
          'inventories',
          {
            id: {
              type: Sequelize.BIGINT.UNSIGNED,
              allowNull: false,
              autoIncrement: true,
              primaryKey: true,
            },
            product_id: {
              type: Sequelize.BIGINT.UNSIGNED,
              allowNull: true,
              references: {
                model: 'products',
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            variant_id: {
              type: Sequelize.BIGINT.UNSIGNED,
              allowNull: true,
              references: {
                model: 'product_variants',
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            available_quantity: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 0,
            },
            reserved_quantity: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 0,
            },
            low_stock_threshold: {
              type: Sequelize.INTEGER,
              allowNull: true,
            },
            allow_backorder: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            reservation_expires_at: {
              type: Sequelize.DATE,
              allowNull: true,
            },
            created_at: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
            },
          },
          { transaction }
        );
      }

      await addIndexSafe(queryInterface, 'inventories', ['product_id'], {
        name: 'idx_inventories_product_id_unique',
        unique: true,
      }, transaction);

      await addIndexSafe(queryInterface, 'inventories', ['variant_id'], {
        name: 'idx_inventories_variant_id_unique',
        unique: true,
      }, transaction);

      await addIndexSafe(queryInterface, 'inventories', ['low_stock_threshold'], {
        name: 'idx_inventories_low_stock_threshold',
      }, transaction);

      await addIndexSafe(queryInterface, 'inventories', ['reservation_expires_at'], {
        name: 'idx_inventories_reservation_expires_at',
      }, transaction);

      await addIndexSafe(queryInterface, 'inventories', ['available_quantity'], {
        name: 'idx_inventories_available_quantity',
      }, transaction);

      await addIndexSafe(queryInterface, 'inventories', ['reserved_quantity'], {
        name: 'idx_inventories_reserved_quantity',
      }, transaction);

      await addIndexSafe(queryInterface, 'inventories', ['low_stock_threshold', 'available_quantity', 'reserved_quantity'], {
        name: 'idx_inventories_low_stock_eval',
      }, transaction);

      const legacyInventoryExists = await tableExists(queryInterface, 'inventory', transaction);

      if (legacyInventoryExists) {
        await queryInterface.sequelize.query(
          `
          INSERT INTO inventories (
            product_id,
            variant_id,
            available_quantity,
            reserved_quantity,
            low_stock_threshold,
            allow_backorder,
            reservation_expires_at,
            created_at,
            updated_at
          )
          SELECT
            NULL,
            legacy.variant_id,
            legacy.quantity,
            legacy.reserved_quantity,
            legacy.low_stock_threshold,
            legacy.allow_backorder,
            NULL,
            legacy.created_at,
            legacy.updated_at
          FROM inventory legacy
          LEFT JOIN inventories current ON current.variant_id = legacy.variant_id
          WHERE current.id IS NULL;
          `,
          { transaction }
        );
      }

      await queryInterface.sequelize.query(
        `
        INSERT INTO inventories (
          product_id,
          variant_id,
          available_quantity,
          reserved_quantity,
          low_stock_threshold,
          allow_backorder,
          reservation_expires_at,
          created_at,
          updated_at
        )
        SELECT
          p.id,
          NULL,
          COALESCE(p.stock, 0),
          0,
          NULL,
          0,
          NULL,
          NOW(),
          NOW()
        FROM products p
        LEFT JOIN inventories inv ON inv.product_id = p.id
        WHERE p.has_variants = 0
          AND p.stock IS NOT NULL
          AND inv.id IS NULL;
        `,
        { transaction }
      );

      const inventoryMovementsExists = await tableExists(queryInterface, 'inventory_movements', transaction);

      if (!inventoryMovementsExists) {
        await queryInterface.createTable(
          'inventory_movements',
          {
            id: {
              type: Sequelize.BIGINT.UNSIGNED,
              allowNull: false,
              autoIncrement: true,
              primaryKey: true,
            },
            inventory_id: {
              type: Sequelize.BIGINT.UNSIGNED,
              allowNull: true,
              references: {
                model: 'inventories',
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            product_id: {
              type: Sequelize.BIGINT.UNSIGNED,
              allowNull: true,
              references: {
                model: 'products',
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            variant_id: {
              type: Sequelize.BIGINT.UNSIGNED,
              allowNull: true,
              references: {
                model: 'product_variants',
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            movement_type: {
              type: Sequelize.ENUM(...INVENTORY_MOVEMENT_TYPE_LIST),
              allowNull: false,
            },
            quantity_change: {
              type: Sequelize.INTEGER,
              allowNull: false,
            },
            previous_stock: {
              type: Sequelize.INTEGER,
              allowNull: false,
            },
            new_stock: {
              type: Sequelize.INTEGER,
              allowNull: false,
            },
            reserved_quantity: {
              type: Sequelize.INTEGER,
              allowNull: true,
            },
            reference_type: {
              type: Sequelize.STRING(60),
              allowNull: true,
            },
            reference_id: {
              type: Sequelize.STRING(120),
              allowNull: true,
            },
            reason: {
              type: Sequelize.STRING(255),
              allowNull: true,
            },
            notes: {
              type: Sequelize.TEXT,
              allowNull: true,
            },
            created_by: {
              type: Sequelize.BIGINT.UNSIGNED,
              allowNull: true,
              references: {
                model: 'users',
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            created_at: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
            },
          },
          { transaction }
        );
      }

      await addIndexSafe(queryInterface, 'inventory_movements', ['inventory_id'], {
        name: 'idx_inventory_movements_inventory_id',
      }, transaction);

      await addIndexSafe(queryInterface, 'inventory_movements', ['product_id'], {
        name: 'idx_inventory_movements_product_id',
      }, transaction);

      await addIndexSafe(queryInterface, 'inventory_movements', ['variant_id'], {
        name: 'idx_inventory_movements_variant_id',
      }, transaction);

      await addIndexSafe(queryInterface, 'inventory_movements', ['movement_type'], {
        name: 'idx_inventory_movements_type',
      }, transaction);

      await addIndexSafe(queryInterface, 'inventory_movements', ['created_at'], {
        name: 'idx_inventory_movements_created_at',
      }, transaction);

      await addIndexSafe(queryInterface, 'inventory_movements', ['reference_type', 'reference_id'], {
        name: 'idx_inventory_movements_reference',
      }, transaction);

      const inventoryReservationsExists = await tableExists(queryInterface, 'inventory_reservations', transaction);

      if (!inventoryReservationsExists) {
        await queryInterface.createTable(
          'inventory_reservations',
          {
            id: {
              type: Sequelize.BIGINT.UNSIGNED,
              allowNull: false,
              autoIncrement: true,
              primaryKey: true,
            },
            inventory_id: {
              type: Sequelize.BIGINT.UNSIGNED,
              allowNull: false,
              references: {
                model: 'inventories',
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            order_id: {
              type: Sequelize.BIGINT.UNSIGNED,
              allowNull: true,
              references: {
                model: 'orders',
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            order_item_id: {
              type: Sequelize.BIGINT.UNSIGNED,
              allowNull: true,
              references: {
                model: 'order_items',
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            product_id: {
              type: Sequelize.BIGINT.UNSIGNED,
              allowNull: true,
              references: {
                model: 'products',
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            variant_id: {
              type: Sequelize.BIGINT.UNSIGNED,
              allowNull: true,
              references: {
                model: 'product_variants',
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            quantity: {
              type: Sequelize.INTEGER.UNSIGNED,
              allowNull: false,
            },
            status: {
              type: Sequelize.ENUM(...INVENTORY_RESERVATION_STATUS_LIST),
              allowNull: false,
              defaultValue: 'ACTIVE',
            },
            reservation_expires_at: {
              type: Sequelize.DATE,
              allowNull: false,
            },
            committed_at: {
              type: Sequelize.DATE,
              allowNull: true,
            },
            released_at: {
              type: Sequelize.DATE,
              allowNull: true,
            },
            reference_type: {
              type: Sequelize.STRING(60),
              allowNull: true,
            },
            reference_id: {
              type: Sequelize.STRING(120),
              allowNull: true,
            },
            reason: {
              type: Sequelize.STRING(255),
              allowNull: true,
            },
            notes: {
              type: Sequelize.TEXT,
              allowNull: true,
            },
            created_by: {
              type: Sequelize.BIGINT.UNSIGNED,
              allowNull: true,
              references: {
                model: 'users',
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            created_at: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
            },
          },
          { transaction }
        );
      }

      await addIndexSafe(queryInterface, 'inventory_reservations', ['inventory_id'], {
        name: 'idx_inventory_reservations_inventory_id',
      }, transaction);

      await addIndexSafe(queryInterface, 'inventory_reservations', ['order_id'], {
        name: 'idx_inventory_reservations_order_id',
      }, transaction);

      await addIndexSafe(queryInterface, 'inventory_reservations', ['order_item_id'], {
        name: 'idx_inventory_reservations_order_item_id',
      }, transaction);

      await addIndexSafe(queryInterface, 'inventory_reservations', ['product_id'], {
        name: 'idx_inventory_reservations_product_id',
      }, transaction);

      await addIndexSafe(queryInterface, 'inventory_reservations', ['variant_id'], {
        name: 'idx_inventory_reservations_variant_id',
      }, transaction);

      await addIndexSafe(queryInterface, 'inventory_reservations', ['status'], {
        name: 'idx_inventory_reservations_status',
      }, transaction);

      await addIndexSafe(queryInterface, 'inventory_reservations', ['reservation_expires_at'], {
        name: 'idx_inventory_reservations_expires_at',
      }, transaction);

      await addIndexSafe(queryInterface, 'inventory_reservations', ['reference_type', 'reference_id'], {
        name: 'idx_inventory_reservations_reference',
      }, transaction);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      if (await tableExists(queryInterface, 'inventory_reservations', transaction)) {
        await queryInterface.dropTable('inventory_reservations', { transaction });
      }

      if (await tableExists(queryInterface, 'inventory_movements', transaction)) {
        await queryInterface.dropTable('inventory_movements', { transaction });
      }

      if (await tableExists(queryInterface, 'inventories', transaction)) {
        await queryInterface.dropTable('inventories', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
