const express = require('express');
const { routes: authRoutes, panelRoutes: panelAuthRoutes } = require('../modules/auth');
const { routes: productRoutes } = require('../modules/product');

const router = express.Router();

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
router.use('/', panelAuthRoutes);
router.use('/products', productRoutes);

module.exports = router;
