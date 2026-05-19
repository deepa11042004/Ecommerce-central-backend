'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable(
        'brands',
        {
          id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          name: {
            type: Sequelize.STRING(120),
            allowNull: false,
            unique: true,
          },
          slug: {
            type: Sequelize.STRING(140),
            allowNull: false,
            unique: true,
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          status: {
            type: Sequelize.ENUM('active', 'inactive'),
            allowNull: false,
            defaultValue: 'active',
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

      await queryInterface.addIndex('brands', ['name'], {
        unique: true,
        name: 'idx_brands_name_unique',
        transaction,
      });
      await queryInterface.addIndex('brands', ['slug'], {
        unique: true,
        name: 'idx_brands_slug_unique',
        transaction,
      });
      await queryInterface.addIndex('brands', ['status'], {
        name: 'idx_brands_status',
        transaction,
      });

      await queryInterface.createTable(
        'categories',
        {
          id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          name: {
            type: Sequelize.STRING(140),
            allowNull: false,
          },
          slug: {
            type: Sequelize.STRING(160),
            allowNull: false,
            unique: true,
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          parent_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: true,
            references: {
              model: 'categories',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          status: {
            type: Sequelize.ENUM('active', 'inactive'),
            allowNull: false,
            defaultValue: 'active',
          },
          sort_order: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
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

      await queryInterface.addIndex('categories', ['slug'], {
        unique: true,
        name: 'idx_categories_slug_unique',
        transaction,
      });
      await queryInterface.addIndex('categories', ['parent_id'], {
        name: 'idx_categories_parent_id',
        transaction,
      });
      await queryInterface.addIndex('categories', ['status'], {
        name: 'idx_categories_status',
        transaction,
      });

      await queryInterface.addColumn(
        'products',
        'short_description',
        {
          type: Sequelize.STRING(500),
          allowNull: true,
          after: 'description',
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'products',
        'sku_prefix',
        {
          type: Sequelize.STRING(80),
          allowNull: true,
          after: 'short_description',
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'products',
        'brand_id',
        {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          after: 'sku_prefix',
          references: {
            model: 'brands',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'products',
        'product_type',
        {
          type: Sequelize.ENUM('simple', 'configurable', 'variant'),
          allowNull: false,
          defaultValue: 'simple',
          after: 'brand_id',
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'products',
        'seo_title',
        {
          type: Sequelize.STRING(255),
          allowNull: true,
          after: 'thumbnail',
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'products',
        'seo_description',
        {
          type: Sequelize.STRING(500),
          allowNull: true,
          after: 'seo_title',
        },
        { transaction }
      );

      await queryInterface.addIndex('products', ['brand_id'], {
        name: 'idx_products_brand_id',
        transaction,
      });
      await queryInterface.addIndex('products', ['product_type'], {
        name: 'idx_products_product_type',
        transaction,
      });

      await queryInterface.createTable(
        'product_categories',
        {
          id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          product_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: {
              model: 'products',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          category_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: {
              model: 'categories',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
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

      await queryInterface.addIndex('product_categories', ['product_id', 'category_id'], {
        unique: true,
        name: 'idx_product_categories_product_category_unique',
        transaction,
      });
      await queryInterface.addIndex('product_categories', ['category_id'], {
        name: 'idx_product_categories_category_id',
        transaction,
      });

      await queryInterface.createTable(
        'attributes',
        {
          id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          name: {
            type: Sequelize.STRING(120),
            allowNull: false,
          },
          code: {
            type: Sequelize.STRING(140),
            allowNull: false,
            unique: true,
          },
          input_type: {
            type: Sequelize.ENUM('select', 'text', 'number', 'boolean'),
            allowNull: false,
            defaultValue: 'select',
          },
          is_filterable: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          is_variant_axis: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          status: {
            type: Sequelize.ENUM('active', 'inactive'),
            allowNull: false,
            defaultValue: 'active',
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

      await queryInterface.addIndex('attributes', ['code'], {
        unique: true,
        name: 'idx_attributes_code_unique',
        transaction,
      });
      await queryInterface.addIndex('attributes', ['status'], {
        name: 'idx_attributes_status',
        transaction,
      });

      await queryInterface.createTable(
        'attribute_values',
        {
          id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          attribute_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: {
              model: 'attributes',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          value: {
            type: Sequelize.STRING(190),
            allowNull: false,
          },
          value_slug: {
            type: Sequelize.STRING(190),
            allowNull: false,
          },
          sort_order: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
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

      await queryInterface.addIndex('attribute_values', ['attribute_id', 'value_slug'], {
        unique: true,
        name: 'idx_attribute_values_attribute_value_slug_unique',
        transaction,
      });
      await queryInterface.addIndex('attribute_values', ['attribute_id'], {
        name: 'idx_attribute_values_attribute_id',
        transaction,
      });

      await queryInterface.createTable(
        'product_attributes',
        {
          id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          product_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: {
              model: 'products',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          attribute_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: {
              model: 'attributes',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          is_required: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          is_variant_axis: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
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

      await queryInterface.addIndex('product_attributes', ['product_id', 'attribute_id'], {
        unique: true,
        name: 'idx_product_attributes_product_attribute_unique',
        transaction,
      });
      await queryInterface.addIndex('product_attributes', ['attribute_id'], {
        name: 'idx_product_attributes_attribute_id',
        transaction,
      });

      await queryInterface.createTable(
        'product_variants',
        {
          id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          product_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: {
              model: 'products',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          sku: {
            type: Sequelize.STRING(80),
            allowNull: false,
            unique: true,
          },
          title: {
            type: Sequelize.STRING(160),
            allowNull: true,
          },
          price: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
          },
          compare_price: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: true,
          },
          cost_price: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: true,
          },
          status: {
            type: Sequelize.ENUM('active', 'inactive'),
            allowNull: false,
            defaultValue: 'active',
          },
          image: {
            type: Sequelize.STRING(500),
            allowNull: true,
          },
          barcode: {
            type: Sequelize.STRING(120),
            allowNull: true,
            unique: true,
          },
          position: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 0,
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

      await queryInterface.addIndex('product_variants', ['sku'], {
        unique: true,
        name: 'idx_product_variants_sku_unique',
        transaction,
      });
      await queryInterface.addIndex('product_variants', ['product_id'], {
        name: 'idx_product_variants_product_id',
        transaction,
      });
      await queryInterface.addIndex('product_variants', ['status'], {
        name: 'idx_product_variants_status',
        transaction,
      });
      await queryInterface.addIndex('product_variants', ['price'], {
        name: 'idx_product_variants_price',
        transaction,
      });

      await queryInterface.createTable(
        'inventory',
        {
          id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          variant_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: {
              model: 'product_variants',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            unique: true,
          },
          quantity: {
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

      await queryInterface.addIndex('inventory', ['variant_id'], {
        unique: true,
        name: 'idx_inventory_variant_id_unique',
        transaction,
      });
      await queryInterface.addIndex('inventory', ['quantity'], {
        name: 'idx_inventory_quantity',
        transaction,
      });

      await queryInterface.createTable(
        'variant_attribute_values',
        {
          id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          variant_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: {
              model: 'product_variants',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          attribute_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: {
              model: 'attributes',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          attribute_value_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: {
              model: 'attribute_values',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
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

      await queryInterface.addIndex('variant_attribute_values', ['variant_id', 'attribute_id'], {
        unique: true,
        name: 'idx_variant_attribute_values_variant_attribute_unique',
        transaction,
      });
      await queryInterface.addIndex('variant_attribute_values', ['attribute_value_id'], {
        name: 'idx_variant_attribute_values_attribute_value_id',
        transaction,
      });
      await queryInterface.addIndex('variant_attribute_values', ['attribute_id'], {
        name: 'idx_variant_attribute_values_attribute_id',
        transaction,
      });

      await queryInterface.createTable(
        'product_media',
        {
          id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          product_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
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
            onDelete: 'SET NULL',
          },
          url: {
            type: Sequelize.STRING(500),
            allowNull: false,
          },
          media_type: {
            type: Sequelize.ENUM('image', 'video', 'document', 'external'),
            allowNull: false,
            defaultValue: 'image',
          },
          alt_text: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          position: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 0,
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

      await queryInterface.addIndex('product_media', ['product_id'], {
        name: 'idx_product_media_product_id',
        transaction,
      });
      await queryInterface.addIndex('product_media', ['variant_id'], {
        name: 'idx_product_media_variant_id',
        transaction,
      });

      await queryInterface.createTable(
        'product_meta',
        {
          id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          product_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: {
              model: 'products',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          meta_key: {
            type: Sequelize.STRING(140),
            allowNull: false,
          },
          meta_value: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          value_type: {
            type: Sequelize.ENUM('string', 'number', 'boolean', 'json'),
            allowNull: false,
            defaultValue: 'string',
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

      await queryInterface.addIndex('product_meta', ['product_id', 'meta_key'], {
        unique: true,
        name: 'idx_product_meta_product_meta_key_unique',
        transaction,
      });
      await queryInterface.addIndex('product_meta', ['meta_key'], {
        name: 'idx_product_meta_meta_key',
        transaction,
      });

      const legacyProducts = await queryInterface.sequelize.query(
        'SELECT id, sku, price, stock, status, thumbnail FROM products;',
        {
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      if (legacyProducts.length > 0) {
        const now = new Date();

        const variantRows = legacyProducts.map((product) => ({
          product_id: product.id,
          sku: product.sku || `PRODUCT-${product.id}-001`,
          title: null,
          price: product.price || 0,
          compare_price: null,
          cost_price: null,
          status: product.status || 'active',
          image: product.thumbnail || null,
          barcode: null,
          position: 0,
          created_at: now,
          updated_at: now,
        }));

        await queryInterface.bulkInsert('product_variants', variantRows, { transaction });

        const createdVariants = await queryInterface.sequelize.query(
          'SELECT id, product_id FROM product_variants WHERE product_id IN (:productIds);',
          {
            replacements: {
              productIds: legacyProducts.map((product) => product.id),
            },
            type: Sequelize.QueryTypes.SELECT,
            transaction,
          }
        );

        const variantIdByProductId = createdVariants.reduce((acc, row) => {
          if (!acc[row.product_id]) {
            acc[row.product_id] = row.id;
          }

          return acc;
        }, {});

        const inventoryRows = legacyProducts
          .map((product) => {
            const variantId = variantIdByProductId[product.id];

            if (!variantId) {
              return null;
            }

            return {
              variant_id: variantId,
              quantity: Number.isFinite(Number(product.stock)) ? Number(product.stock) : 0,
              reserved_quantity: 0,
              low_stock_threshold: null,
              allow_backorder: false,
              created_at: now,
              updated_at: now,
            };
          })
          .filter(Boolean);

        if (inventoryRows.length > 0) {
          await queryInterface.bulkInsert('inventory', inventoryRows, { transaction });
        }
      }

      await queryInterface.removeIndex('products', 'idx_products_sku_unique', { transaction }).catch(() => {});
      await queryInterface.removeColumn('products', 'sku', { transaction });
      await queryInterface.removeColumn('products', 'price', { transaction });
      await queryInterface.removeColumn('products', 'stock', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.addColumn(
        'products',
        'sku',
        {
          type: Sequelize.STRING(80),
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'products',
        'price',
        {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'products',
        'stock',
        {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true,
        },
        { transaction }
      );

      const products = await queryInterface.sequelize.query('SELECT id FROM products;', {
        type: Sequelize.QueryTypes.SELECT,
        transaction,
      });

      for (const product of products) {
        const variant = await queryInterface.sequelize.query(
          `
          SELECT pv.sku, pv.price,
          COALESCE(inv.quantity, 0) AS stock
          FROM product_variants pv
          LEFT JOIN inventory inv ON inv.variant_id = pv.id
          WHERE pv.product_id = :productId
          ORDER BY pv.id ASC
          LIMIT 1;
          `,
          {
            replacements: { productId: product.id },
            type: Sequelize.QueryTypes.SELECT,
            transaction,
          }
        );

        const firstVariant = variant[0] || {};

        await queryInterface.sequelize.query(
          `
          UPDATE products
          SET sku = :sku,
              price = :price,
              stock = :stock
          WHERE id = :productId;
          `,
          {
            replacements: {
              productId: product.id,
              sku: firstVariant.sku || `PRODUCT-${product.id}-001`,
              price: firstVariant.price || 0,
              stock: Number.isFinite(Number(firstVariant.stock)) ? Number(firstVariant.stock) : 0,
            },
            type: Sequelize.QueryTypes.UPDATE,
            transaction,
          }
        );
      }

      await queryInterface.changeColumn(
        'products',
        'sku',
        {
          type: Sequelize.STRING(80),
          allowNull: false,
          unique: true,
        },
        { transaction }
      );

      await queryInterface.changeColumn(
        'products',
        'price',
        {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
        },
        { transaction }
      );

      await queryInterface.changeColumn(
        'products',
        'stock',
        {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
        },
        { transaction }
      );

      await queryInterface.addIndex('products', ['sku'], {
        unique: true,
        name: 'idx_products_sku_unique',
        transaction,
      });

      await queryInterface.removeIndex('products', 'idx_products_product_type', { transaction }).catch(() => {});
      await queryInterface.removeIndex('products', 'idx_products_brand_id', { transaction }).catch(() => {});

      await queryInterface.removeColumn('products', 'seo_description', { transaction });
      await queryInterface.removeColumn('products', 'seo_title', { transaction });
      await queryInterface.removeColumn('products', 'product_type', { transaction });
      await queryInterface.removeColumn('products', 'brand_id', { transaction });
      await queryInterface.removeColumn('products', 'sku_prefix', { transaction });
      await queryInterface.removeColumn('products', 'short_description', { transaction });

      await queryInterface.dropTable('product_meta', { transaction });
      await queryInterface.dropTable('product_media', { transaction });
      await queryInterface.dropTable('variant_attribute_values', { transaction });
      await queryInterface.dropTable('inventory', { transaction });
      await queryInterface.dropTable('product_variants', { transaction });
      await queryInterface.dropTable('product_attributes', { transaction });
      await queryInterface.dropTable('attribute_values', { transaction });
      await queryInterface.dropTable('attributes', { transaction });
      await queryInterface.dropTable('product_categories', { transaction });
      await queryInterface.dropTable('categories', { transaction });
      await queryInterface.dropTable('brands', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
