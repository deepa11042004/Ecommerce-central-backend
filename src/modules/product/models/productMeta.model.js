const defineProductMetaModel = (sequelize, DataTypes) => {
  const ProductMeta = sequelize.define(
    'ProductMeta',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      productId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'product_id',
      },
      metaKey: {
        type: DataTypes.STRING(140),
        allowNull: false,
        field: 'meta_key',
      },
      metaValue: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'meta_value',
      },
      valueType: {
        type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
        allowNull: false,
        defaultValue: 'string',
        field: 'value_type',
      },
    },
    {
      tableName: 'product_meta',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['product_id', 'meta_key'],
        },
        {
          fields: ['meta_key'],
        },
      ],
    }
  );

  ProductMeta.associate = (models) => {
    ProductMeta.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });
  };

  return ProductMeta;
};

module.exports = defineProductMetaModel;
