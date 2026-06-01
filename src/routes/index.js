const express = require('express');
const { routes: authRoutes, panelRoutes: panelAuthRoutes } = require('../modules/auth');
const { routes: cartRoutes } = require('../modules/cart');
const { routes: checkoutRoutes } = require('../modules/checkout');
const { routes: orderRoutes, adminRoutes: adminOrderRoutes } = require('../modules/order');
const { routes: paymentRoutes } = require('../modules/payment');
const { routes: addressRoutes } = require('../modules/address');
const { routes: mediaRoutes } = require('../modules/media');
const { routes: productRoutes, categoryRoutes, brandRoutes, searchRoutes } = require('../modules/product');
const { routes: rbacRoutes } = require('../modules/rbac');
const { routes: wishlistRoutes } = require('../modules/wishlist');
const { routes: heroBannerRoutes } = require('../modules/heroBanner');
const { adminRoutes: adminCouponRoutes } = require('../modules/coupon');
const { adminRoutes: adminInventoryRoutes } = require('../modules/inventory');

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
router.use('/cart', cartRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/addresses', addressRoutes);
router.use('/admin/orders', adminOrderRoutes);
router.use('/media', mediaRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/search', searchRoutes);
router.use('/rbac', rbacRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/hero-banners', heroBannerRoutes);
router.use('/admin/coupons', adminCouponRoutes);
router.use('/admin/inventory', adminInventoryRoutes);

module.exports = router;
