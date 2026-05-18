const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const env = require('./config/env');
const routes = require('./routes');
const swaggerSpec = require('./swagger/swagger');
const notFoundMiddleware = require('./middleware/notFound.middleware');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();

const corsOrigin = env.CORS_ORIGIN === '*'
  ? true
  : env.CORS_ORIGIN.split(',').map((origin) => origin.trim());

const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    errors: [],
  },
});

app.use(helmet());
app.use(cors({ origin: corsOrigin }));
app.use(limiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV !== 'test') {
  app.use(
    morgan('dev', {
      skip: (req, res) => {
        const isSwaggerAsset = req.path.startsWith('/api-docs/') &&
          (req.path.endsWith('.js') || req.path.endsWith('.css'));
        const isCachedAsset = res.statusCode === 304;

        return isSwaggerAsset || isCachedAsset;
      },
    })
  );
}

app.get('/', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Ecommerce backend is running',
    data: {
      docs: '/api-docs',
      health: '/health',
      apiBase: env.API_PREFIX,
    },
  });
});

app.get('/favicon.ico', (req, res) => {
  return res.status(204).end();
});

app.get('/health', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Server is up',
    data: {
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(env.API_PREFIX, routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
