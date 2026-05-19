const defineAttributeModel = (sequelize, DataTypes) => {
  const Attribute = sequelize.define(
    'Attribute',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(140),
        allowNull: false,
        unique: true,
      },
      inputType: {
        type: DataTypes.ENUM('select', 'text', 'number', 'boolean'),
        allowNull: false,
        defaultValue: 'select',
        field: 'input_type',
      },
      isFilterable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_filterable',
      },
      isVariantAxis: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_variant_axis',
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
    },
    {
      tableName: 'attributes',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['code'],
        },
        {
          fields: ['status'],
        },
      ],
    }
  );

  Attribute.associate = (models) => {
    Attribute.hasMany(models.AttributeValue, {
      foreignKey: 'attributeId',
      as: 'values',
    });

    Attribute.hasMany(models.ProductAttribute, {
      foreignKey: 'attributeId',
      as: 'productAttributes',
    });

    Attribute.hasMany(models.VariantAttributeValue, {
      foreignKey: 'attributeId',
      as: 'variantAttributeValues',
    });

    Attribute.belongsToMany(models.Product, {
      through: models.ProductAttribute,
      foreignKey: 'attributeId',
      otherKey: 'productId',
      as: 'products',
    });
  };

  return Attribute;
};

module.exports = defineAttributeModel;
