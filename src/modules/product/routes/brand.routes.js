const express = require('express');
const controller = require('../controllers/brand.controller');
const auth = require('../../../middleware/auth.middleware');
const can = require('../../../middleware/permission.middleware');
const validate = require('../../../middleware/validate.middleware');
const { PERMISSIONS } = require('../../../constants/permissions');
const { listBrandsSchema } = require('../validators/product.validator');

const router = express.Router();

router.get('/', auth(), can(PERMISSIONS.PRODUCT_READ), validate(listBrandsSchema), controller.list);

module.exports = router;
