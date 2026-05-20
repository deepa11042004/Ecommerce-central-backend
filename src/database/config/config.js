require('dotenv').config();

const baseConfig = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecommerce_starter',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  dialect: 'mysql',
  logging: process.env.DB_LOGGING === 'true',
  seederStorage: 'sequelize',
  seederStorageTableName: 'sequelize_seed_meta',
  migrationStorageTableName: 'sequelize_meta',
  define: {
    underscored: true,
    freezeTableName: true,
  },
};

module.exports = {
  development: {
    ...baseConfig,
  },
  test: {
    ...baseConfig,
    database: `${baseConfig.database}_test`,
  },
  production: {
    ...baseConfig,
  },
};
