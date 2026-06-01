'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.addIndex('products', ['status', 'product_type', 'brand_id'], {
        name: 'idx_products_status_type_brand',
        transaction,
      });

      await queryInterface.addIndex('products', ['created_at'], {
        name: 'idx_products_created_at',
        transaction,
      });

      await queryInterface.addIndex('products', ['title', 'slug', 'short_description', 'description'], {
        name: 'idx_products_fulltext_search',
        type: 'FULLTEXT',
        transaction,
      });

      await queryInterface.addIndex('product_categories', ['category_id', 'product_id'], {
        name: 'idx_product_categories_category_product',
        transaction,
      });

      await queryInterface.addIndex('product_variants', ['product_id', 'status', 'price'], {
        name: 'idx_product_variants_product_status_price',
        transaction,
      });

      await queryInterface.addIndex('variant_attribute_values', ['attribute_id', 'attribute_value_id', 'variant_id'], {
        name: 'idx_variant_attribute_values_attr_value_variant',
        transaction,
      });

      await queryInterface.addIndex('inventory', ['variant_id', 'quantity', 'allow_backorder'], {
        name: 'idx_inventory_variant_qty_backorder',
        transaction,
      });

      await queryInterface.addIndex('categories', ['name', 'slug'], {
        name: 'idx_categories_fulltext_name_slug',
        type: 'FULLTEXT',
        transaction,
      });

      await queryInterface.addIndex('brands', ['name', 'slug'], {
        name: 'idx_brands_fulltext_name_slug',
        type: 'FULLTEXT',
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.removeIndex('brands', 'idx_brands_fulltext_name_slug', { transaction });
      await queryInterface.removeIndex('categories', 'idx_categories_fulltext_name_slug', { transaction });
      await queryInterface.removeIndex('inventory', 'idx_inventory_variant_qty_backorder', { transaction });
      await queryInterface.removeIndex('variant_attribute_values', 'idx_variant_attribute_values_attr_value_variant', { transaction });
      await queryInterface.removeIndex('product_variants', 'idx_product_variants_product_status_price', { transaction });
      await queryInterface.removeIndex('product_categories', 'idx_product_categories_category_product', { transaction });
      await queryInterface.removeIndex('products', 'idx_products_fulltext_search', { transaction });
      await queryInterface.removeIndex('products', 'idx_products_created_at', { transaction });
      await queryInterface.removeIndex('products', 'idx_products_status_type_brand', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
