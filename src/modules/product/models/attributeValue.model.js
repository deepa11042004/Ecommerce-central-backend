const defineAttributeValueModel = (sequelize, DataTypes) => {
  const AttributeValue = sequelize.define(
    'AttributeValue',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      attributeId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'attribute_id',
      },
      value: {
        type: DataTypes.STRING(190),
        allowNull: false,
      },
      valueSlug: {
        type: DataTypes.STRING(190),
        allowNull: false,
        field: 'value_slug',
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'sort_order',
      },
    },
    {
      tableName: 'attribute_values',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['attribute_id', 'value_slug'],
        },
        {
          fields: ['attribute_id'],
        },
      ],
    }
  );

  AttributeValue.associate = (models) => {
    AttributeValue.belongsTo(models.Attribute, {
      foreignKey: 'attributeId',
      as: 'attribute',
    });

    AttributeValue.hasMany(models.VariantAttributeValue, {
      foreignKey: 'attributeValueId',
      as: 'variantAttributeValues',
    });
  };

  return AttributeValue;
};

module.exports = defineAttributeValueModel;
