'use strict';

const { Op } = require('sequelize');

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert('products', [
      {
        title: 'iPhone 15 Pro',
        slug: 'iphone-15-pro',
        description: 'Apple iPhone 15 Pro with A17 Pro chip and titanium design.',
        sku: 'IP15P-256-BLK',
        price: 1299.99,
        stock: 20,
        status: 'active',
        thumbnail: 'https://cdn.example.com/products/iphone-15-pro.jpg',
        created_at: now,
        updated_at: now,
      },
      {
        title: 'Samsung Galaxy S24',
        slug: 'samsung-galaxy-s24',
        description: 'Samsung flagship smartphone with advanced AI camera features.',
        sku: 'SGS24-256-GRY',
        price: 1099.5,
        stock: 30,
        status: 'active',
        thumbnail: 'https://cdn.example.com/products/samsung-galaxy-s24.jpg',
        created_at: now,
        updated_at: now,
      },
      {
        title: 'Sony WH-1000XM5',
        slug: 'sony-wh-1000xm5',
        description: 'Premium wireless noise-canceling headphones by Sony.',
        sku: 'SONY-XM5-BLK',
        price: 399.99,
        stock: 50,
        status: 'active',
        thumbnail: 'https://cdn.example.com/products/sony-wh-1000xm5.jpg',
        created_at: now,
        updated_at: now,
      },
      {
        title: 'Dell XPS 13',
        slug: 'dell-xps-13',
        description: 'Compact and powerful ultrabook for professional use.',
        sku: 'DELL-XPS13-512',
        price: 1499,
        stock: 15,
        status: 'inactive',
        thumbnail: 'https://cdn.example.com/products/dell-xps-13.jpg',
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      'products',
      {
        sku: {
          [Op.in]: ['IP15P-256-BLK', 'SGS24-256-GRY', 'SONY-XM5-BLK', 'DELL-XPS13-512'],
        },
      },
      {}
    );
  },
};
