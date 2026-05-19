'use strict';

const { Op, QueryTypes } = require('sequelize');

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert('brands', [
      {
        name: 'Generic Supply Co',
        slug: 'generic-supply-co',
        description: 'Reusable demo brand for starter catalog data.',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert('categories', [
      {
        name: 'Electronics',
        slug: 'electronics',
        description: 'General electronics and smart devices.',
        parent_id: null,
        status: 'active',
        sort_order: 0,
        created_at: now,
        updated_at: now,
      },
      {
        name: 'Books',
        slug: 'books',
        description: 'Books and publications.',
        parent_id: null,
        status: 'active',
        sort_order: 1,
        created_at: now,
        updated_at: now,
      },
    ]);

    const electronicsCategory = await queryInterface.sequelize.query(
      'SELECT id FROM categories WHERE slug = :slug LIMIT 1;',
      {
        replacements: { slug: 'electronics' },
        type: QueryTypes.SELECT,
      }
    );

    await queryInterface.bulkInsert('categories', [
      {
        name: 'Audio',
        slug: 'audio',
        description: 'Audio accessories and devices.',
        parent_id: electronicsCategory[0]?.id || null,
        status: 'active',
        sort_order: 0,
        created_at: now,
        updated_at: now,
      },
    ]);

    const brand = await queryInterface.sequelize.query(
      'SELECT id FROM brands WHERE slug = :slug LIMIT 1;',
      {
        replacements: { slug: 'generic-supply-co' },
        type: QueryTypes.SELECT,
      }
    );

    await queryInterface.bulkInsert('products', [
      {
        title: 'Wireless Headphones',
        slug: 'wireless-headphones',
        description: 'Generalized product demo with dynamic variants.',
        short_description: 'Reusable variant product example.',
        sku_prefix: 'WH',
        brand_id: brand[0]?.id || null,
        product_type: 'variant',
        status: 'active',
        thumbnail: 'https://cdn.example.com/products/wireless-headphones.jpg',
        seo_title: 'Wireless Headphones',
        seo_description: 'Wireless headphones with configurable options.',
        created_at: now,
        updated_at: now,
      },
      {
        title: 'Software License',
        slug: 'software-license',
        description: 'Digital product example with one sellable variant.',
        short_description: 'Simple digital product sample.',
        sku_prefix: 'LIC',
        brand_id: brand[0]?.id || null,
        product_type: 'simple',
        status: 'active',
        thumbnail: 'https://cdn.example.com/products/software-license.jpg',
        seo_title: 'Software License',
        seo_description: 'Reusable digital product sample.',
        created_at: now,
        updated_at: now,
      },
    ]);

    const categories = await queryInterface.sequelize.query('SELECT id, slug FROM categories;', {
      type: QueryTypes.SELECT,
    });

    const products = await queryInterface.sequelize.query('SELECT id, slug FROM products;', {
      type: QueryTypes.SELECT,
    });

    const categoryIdBySlug = categories.reduce((acc, row) => {
      acc[row.slug] = row.id;
      return acc;
    }, {});

    const productIdBySlug = products.reduce((acc, row) => {
      acc[row.slug] = row.id;
      return acc;
    }, {});

    await queryInterface.bulkInsert('product_categories', [
      {
        product_id: productIdBySlug['wireless-headphones'],
        category_id: categoryIdBySlug.electronics,
        created_at: now,
        updated_at: now,
      },
      {
        product_id: productIdBySlug['wireless-headphones'],
        category_id: categoryIdBySlug.audio,
        created_at: now,
        updated_at: now,
      },
      {
        product_id: productIdBySlug['software-license'],
        category_id: categoryIdBySlug.books,
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert('attributes', [
      {
        name: 'Color',
        code: 'color',
        input_type: 'select',
        is_filterable: true,
        is_variant_axis: true,
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      {
        name: 'Storage',
        code: 'storage',
        input_type: 'select',
        is_filterable: true,
        is_variant_axis: true,
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      {
        name: 'License Type',
        code: 'license-type',
        input_type: 'select',
        is_filterable: true,
        is_variant_axis: false,
        status: 'active',
        created_at: now,
        updated_at: now,
      },
    ]);

    const attributes = await queryInterface.sequelize.query('SELECT id, code FROM attributes;', {
      type: QueryTypes.SELECT,
    });

    const attributeIdByCode = attributes.reduce((acc, row) => {
      acc[row.code] = row.id;
      return acc;
    }, {});

    await queryInterface.bulkInsert('attribute_values', [
      {
        attribute_id: attributeIdByCode.color,
        value: 'Black',
        value_slug: 'black',
        sort_order: 0,
        created_at: now,
        updated_at: now,
      },
      {
        attribute_id: attributeIdByCode.color,
        value: 'Silver',
        value_slug: 'silver',
        sort_order: 1,
        created_at: now,
        updated_at: now,
      },
      {
        attribute_id: attributeIdByCode.storage,
        value: '128GB',
        value_slug: '128gb',
        sort_order: 0,
        created_at: now,
        updated_at: now,
      },
      {
        attribute_id: attributeIdByCode.storage,
        value: '256GB',
        value_slug: '256gb',
        sort_order: 1,
        created_at: now,
        updated_at: now,
      },
      {
        attribute_id: attributeIdByCode['license-type'],
        value: 'Standard',
        value_slug: 'standard',
        sort_order: 0,
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert('product_attributes', [
      {
        product_id: productIdBySlug['wireless-headphones'],
        attribute_id: attributeIdByCode.color,
        is_required: true,
        is_variant_axis: true,
        created_at: now,
        updated_at: now,
      },
      {
        product_id: productIdBySlug['wireless-headphones'],
        attribute_id: attributeIdByCode.storage,
        is_required: true,
        is_variant_axis: true,
        created_at: now,
        updated_at: now,
      },
      {
        product_id: productIdBySlug['software-license'],
        attribute_id: attributeIdByCode['license-type'],
        is_required: true,
        is_variant_axis: false,
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert('product_variants', [
      {
        product_id: productIdBySlug['wireless-headphones'],
        sku: 'WH-BLK-128',
        title: 'Black / 128GB',
        price: 129.99,
        compare_price: 149.99,
        cost_price: 80,
        status: 'active',
        image: 'https://cdn.example.com/products/wireless-headphones-black.jpg',
        barcode: null,
        position: 0,
        created_at: now,
        updated_at: now,
      },
      {
        product_id: productIdBySlug['wireless-headphones'],
        sku: 'WH-SIL-256',
        title: 'Silver / 256GB',
        price: 159.99,
        compare_price: 179.99,
        cost_price: 95,
        status: 'active',
        image: 'https://cdn.example.com/products/wireless-headphones-silver.jpg',
        barcode: null,
        position: 1,
        created_at: now,
        updated_at: now,
      },
      {
        product_id: productIdBySlug['software-license'],
        sku: 'LIC-STD-001',
        title: 'Standard License',
        price: 49,
        compare_price: null,
        cost_price: 0,
        status: 'active',
        image: null,
        barcode: null,
        position: 0,
        created_at: now,
        updated_at: now,
      },
    ]);

    const variants = await queryInterface.sequelize.query('SELECT id, sku FROM product_variants;', {
      type: QueryTypes.SELECT,
    });

    const attributeValues = await queryInterface.sequelize.query(
      'SELECT id, attribute_id, value_slug FROM attribute_values;',
      { type: QueryTypes.SELECT }
    );

    const variantIdBySku = variants.reduce((acc, row) => {
      acc[row.sku] = row.id;
      return acc;
    }, {});

    const attributeValueIdByKey = attributeValues.reduce((acc, row) => {
      acc[`${row.attribute_id}:${row.value_slug}`] = row.id;
      return acc;
    }, {});

    await queryInterface.bulkInsert('inventory', [
      {
        variant_id: variantIdBySku['WH-BLK-128'],
        quantity: 25,
        reserved_quantity: 0,
        low_stock_threshold: 5,
        allow_backorder: false,
        created_at: now,
        updated_at: now,
      },
      {
        variant_id: variantIdBySku['WH-SIL-256'],
        quantity: 14,
        reserved_quantity: 0,
        low_stock_threshold: 5,
        allow_backorder: false,
        created_at: now,
        updated_at: now,
      },
      {
        variant_id: variantIdBySku['LIC-STD-001'],
        quantity: 9999,
        reserved_quantity: 0,
        low_stock_threshold: null,
        allow_backorder: true,
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert('variant_attribute_values', [
      {
        variant_id: variantIdBySku['WH-BLK-128'],
        attribute_id: attributeIdByCode.color,
        attribute_value_id: attributeValueIdByKey[`${attributeIdByCode.color}:black`],
        created_at: now,
        updated_at: now,
      },
      {
        variant_id: variantIdBySku['WH-BLK-128'],
        attribute_id: attributeIdByCode.storage,
        attribute_value_id: attributeValueIdByKey[`${attributeIdByCode.storage}:128gb`],
        created_at: now,
        updated_at: now,
      },
      {
        variant_id: variantIdBySku['WH-SIL-256'],
        attribute_id: attributeIdByCode.color,
        attribute_value_id: attributeValueIdByKey[`${attributeIdByCode.color}:silver`],
        created_at: now,
        updated_at: now,
      },
      {
        variant_id: variantIdBySku['WH-SIL-256'],
        attribute_id: attributeIdByCode.storage,
        attribute_value_id: attributeValueIdByKey[`${attributeIdByCode.storage}:256gb`],
        created_at: now,
        updated_at: now,
      },
      {
        variant_id: variantIdBySku['LIC-STD-001'],
        attribute_id: attributeIdByCode['license-type'],
        attribute_value_id: attributeValueIdByKey[`${attributeIdByCode['license-type']}:standard`],
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert('product_media', [
      {
        product_id: productIdBySlug['wireless-headphones'],
        variant_id: null,
        url: 'https://cdn.example.com/products/wireless-headphones-gallery-1.jpg',
        media_type: 'image',
        alt_text: 'Wireless headphones gallery image',
        position: 0,
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert('product_meta', [
      {
        product_id: productIdBySlug['wireless-headphones'],
        meta_key: 'warrantyMonths',
        meta_value: '12',
        value_type: 'number',
        created_at: now,
        updated_at: now,
      },
      {
        product_id: productIdBySlug['software-license'],
        meta_key: 'delivery',
        meta_value: 'email',
        value_type: 'string',
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('product_meta', {
      meta_key: {
        [Op.in]: ['warrantyMonths', 'delivery'],
      },
    });

    await queryInterface.bulkDelete('product_media', {
      url: {
        [Op.in]: ['https://cdn.example.com/products/wireless-headphones-gallery-1.jpg'],
      },
    });

    await queryInterface.bulkDelete('variant_attribute_values', null, {});
    await queryInterface.bulkDelete('inventory', null, {});

    await queryInterface.bulkDelete('product_variants', {
      sku: {
        [Op.in]: ['WH-BLK-128', 'WH-SIL-256', 'LIC-STD-001'],
      },
    });

    await queryInterface.bulkDelete('product_attributes', null, {});
    await queryInterface.bulkDelete('attribute_values', null, {});

    await queryInterface.bulkDelete('attributes', {
      code: {
        [Op.in]: ['color', 'storage', 'license-type'],
      },
    });

    await queryInterface.bulkDelete('product_categories', null, {});

    await queryInterface.bulkDelete('products', {
      slug: {
        [Op.in]: ['wireless-headphones', 'software-license'],
      },
    });

    await queryInterface.bulkDelete('categories', {
      slug: {
        [Op.in]: ['audio', 'electronics', 'books'],
      },
    });

    await queryInterface.bulkDelete('brands', {
      slug: 'generic-supply-co',
    });
  },
};
