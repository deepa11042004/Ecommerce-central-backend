const app = require('./app');
const env = require('./config/env');
const { sequelize } = require('./database/models');

const startServer = async () => {
  try {
    await sequelize.authenticate();
    const server = app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
      console.log(`API docs available at http://localhost:${env.PORT}/api-docs`);
    });

    const gracefulShutdown = (signal) => {
      console.log(`${signal} received. Closing server gracefully...`);

      server.close(async () => {
        await sequelize.close();
        console.log('Database connection closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
