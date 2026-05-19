const defineVariantAttributeValueModel = (sequelize, DataTypes) => {
  const VariantAttributeValue = sequelize.define(
    'VariantAttributeValue',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      variantId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'variant_id',
      },
      attributeId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'attribute_id',
      },
      attributeValueId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'attribute_value_id',
      },
    },
    {
      tableName: 'variant_attribute_values',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['variant_id', 'attribute_id'],
        },
        {
          fields: ['attribute_value_id'],
        },
        {
          fields: ['attribute_id'],
        },
      ],
    }
  );

  VariantAttributeValue.associate = (models) => {
    VariantAttributeValue.belongsTo(models.ProductVariant, {
      foreignKey: 'variantId',
      as: 'variant',
    });

    VariantAttributeValue.belongsTo(models.Attribute, {
      foreignKey: 'attributeId',
      as: 'attribute',
    });

    VariantAttributeValue.belongsTo(models.AttributeValue, {
      foreignKey: 'attributeValueId',
      as: 'attributeValue',
    });
  };

  return VariantAttributeValue;
};

module.exports = defineVariantAttributeValueModel;
