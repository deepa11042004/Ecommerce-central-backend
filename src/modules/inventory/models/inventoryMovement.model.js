const { INVENTORY_MOVEMENT_TYPE_LIST } = require('../../../constants/inventory');

const defineInventoryMovementModel = (sequelize, DataTypes) => {
  const InventoryMovement = sequelize.define(
    'InventoryMovement',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      inventoryId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'inventory_id',
      },
      productId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'product_id',
      },
      variantId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'variant_id',
      },
      movementType: {
        type: DataTypes.ENUM(...INVENTORY_MOVEMENT_TYPE_LIST),
        allowNull: false,
        field: 'movement_type',
      },
      quantityChange: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'quantity_change',
      },
      previousStock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'previous_stock',
      },
      newStock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'new_stock',
      },
      reservedQuantity: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'reserved_quantity',
      },
      referenceType: {
        type: DataTypes.STRING(60),
        allowNull: true,
        field: 'reference_type',
      },
      referenceId: {
        type: DataTypes.STRING(120),
        allowNull: true,
        field: 'reference_id',
      },
      reason: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdBy: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'created_by',
      },
    },
    {
      tableName: 'inventory_movements',
      timestamps: true,
      indexes: [
        {
          fields: ['inventory_id'],
        },
        {
          fields: ['product_id'],
        },
        {
          fields: ['variant_id'],
        },
        {
          fields: ['movement_type'],
        },
        {
          fields: ['created_at'],
        },
      ],
    }
  );

  InventoryMovement.associate = (models) => {
    InventoryMovement.belongsTo(models.Inventory, {
      foreignKey: 'inventoryId',
      as: 'inventory',
    });

    InventoryMovement.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });

    InventoryMovement.belongsTo(models.ProductVariant, {
      foreignKey: 'variantId',
      as: 'variant',
    });

    InventoryMovement.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'createdByUser',
    });
  };

  return InventoryMovement;
};

module.exports = defineInventoryMovementModel;
