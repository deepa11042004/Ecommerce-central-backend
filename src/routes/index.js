const express = require('express');
const { routes: authRoutes, panelRoutes: panelAuthRoutes } = require('../modules/auth');
const { routes: productRoutes, categoryRoutes } = require('../modules/product');
const { routes: rbacRoutes } = require('../modules/rbac');

const router = express.Router();

router.get('/', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'API base route',
    data: {
      health: `${req.baseUrl}/health`,
      docs: '/api-docs',
    },
  });
});

router.get('/health', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'API is healthy',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

router.use('/auth', authRoutes);
router.use('/auth', panelAuthRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/rbac', rbacRoutes);

module.exports = router;
