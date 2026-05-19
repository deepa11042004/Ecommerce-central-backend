const defineInventoryModel = (sequelize, DataTypes) => {
  const Inventory = sequelize.define(
    'Inventory',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      variantId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        unique: true,
        field: 'variant_id',
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
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
    },
    {
      tableName: 'inventory',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['variant_id'],
        },
        {
          fields: ['quantity'],
        },
      ],
    }
  );

  Inventory.associate = (models) => {
    Inventory.belongsTo(models.ProductVariant, {
      foreignKey: 'variantId',
      as: 'variant',
    });
  };

  return Inventory;
};

module.exports = defineInventoryModel;
