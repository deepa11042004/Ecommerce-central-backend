const defineInventoryModel = (sequelize, DataTypes) => {
  const Inventory = sequelize.define(
    'Inventory',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      productId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        unique: true,
        field: 'product_id',
      },
      variantId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        unique: true,
        field: 'variant_id',
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'available_quantity',
      },
      availableQuantity: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.getDataValue('quantity');
        },
        set(value) {
          this.setDataValue('quantity', value);
        },
      },
      reservedQuantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'reserved_quantity',
      },
      lowStockThreshold: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'low_stock_threshold',
      },
      allowBackorder: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'allow_backorder',
      },
      reservationExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'reservation_expires_at',
      },
    },
    {
      tableName: 'inventories',
      timestamps: true,
      indexes: [
        {
          fields: ['product_id'],
        },
        {
          fields: ['variant_id'],
        },
        {
          fields: ['available_quantity'],
        },
        {
          fields: ['low_stock_threshold'],
        },
        {
          fields: ['reservation_expires_at'],
        },
      ],
    }
  );

  Inventory.associate = (models) => {
    Inventory.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });

    Inventory.belongsTo(models.ProductVariant, {
      foreignKey: 'variantId',
      as: 'variant',
    });

    Inventory.hasMany(models.InventoryMovement, {
      foreignKey: 'inventoryId',
      as: 'movements',
    });

    Inventory.hasMany(models.InventoryReservation, {
      foreignKey: 'inventoryId',
      as: 'reservations',
    });
  };

  return Inventory;
};

module.exports = defineInventoryModel;
