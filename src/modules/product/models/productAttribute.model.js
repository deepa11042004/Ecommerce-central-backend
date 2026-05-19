const defineProductAttributeModel = (sequelize, DataTypes) => {
  const ProductAttribute = sequelize.define(
    'ProductAttribute',
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
      attributeId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'attribute_id',
      },
      isRequired: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_required',
      },
      isVariantAxis: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_variant_axis',
      },
    },
    {
      tableName: 'product_attributes',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['product_id', 'attribute_id'],
        },
        {
          fields: ['attribute_id'],
        },
      ],
    }
  );

  ProductAttribute.associate = (models) => {
    ProductAttribute.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });

    ProductAttribute.belongsTo(models.Attribute, {
      foreignKey: 'attributeId',
      as: 'attribute',
    });
  };

  return ProductAttribute;
};

module.exports = defineProductAttributeModel;
