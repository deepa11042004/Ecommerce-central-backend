const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../sequelize');

const defineRoleModel = require('../../modules/rbac/models/role.model');
const definePermissionModel = require('../../modules/rbac/models/permission.model');
const defineRolePermissionModel = require('../../modules/rbac/models/rolePermission.model');
const defineRoleFeatureToggleModel = require('../../modules/rbac/models/roleFeatureToggle.model');
const defineUserModel = require('../../modules/auth/models/user.model');
const defineProductModel = require('../../modules/product/models/product.model');
const defineBrandModel = require('../../modules/product/models/brand.model');
const defineCategoryModel = require('../../modules/product/models/category.model');
const defineProductCategoryModel = require('../../modules/product/models/productCategory.model');
const defineAttributeModel = require('../../modules/product/models/attribute.model');
const defineAttributeValueModel = require('../../modules/product/models/attributeValue.model');
const defineProductAttributeModel = require('../../modules/product/models/productAttribute.model');
const defineProductVariantModel = require('../../modules/product/models/productVariant.model');
const defineVariantAttributeValueModel = require('../../modules/product/models/variantAttributeValue.model');
const defineProductMediaModel = require('../../modules/product/models/productMedia.model');
const defineInventoryModel = require('../../modules/product/models/inventory.model');
const defineProductMetaModel = require('../../modules/product/models/productMeta.model');
const defineCartModel = require('../../modules/cart/models/cart.model');
const defineCartItemModel = require('../../modules/cart/models/cartItem.model');
const defineWishlistModel = require('../../modules/wishlist/models/wishlist.model');
const defineWishlistItemModel = require('../../modules/wishlist/models/wishlistItem.model');
const defineAddressModel = require('../../modules/address/models/address.model');
const defineOrderModel = require('../../modules/order/models/order.model');
const defineOrderItemModel = require('../../modules/order/models/orderItem.model');
const defineOrderStatusHistoryModel = require('../../modules/order/models/orderStatusHistory.model');
const definePaymentModel = require('../../modules/payment/models/payment.model');
const defineHeroBannerModel = require('../../modules/heroBanner/models/heroBanner.model');
const defineCouponModel = require('../../modules/coupon/models/coupon.model');
const defineCouponProductModel = require('../../modules/coupon/models/couponProduct.model');
const defineCouponCategoryModel = require('../../modules/coupon/models/couponCategory.model');
const defineCouponUsageModel = require('../../modules/coupon/models/couponUsage.model');

const db = {};

db.Role = defineRoleModel(sequelize, DataTypes);
db.Permission = definePermissionModel(sequelize, DataTypes);
db.RolePermission = defineRolePermissionModel(sequelize, DataTypes);
db.RoleFeatureToggle = defineRoleFeatureToggleModel(sequelize, DataTypes);
db.User = defineUserModel(sequelize, DataTypes);
db.Brand = defineBrandModel(sequelize, DataTypes);
db.Category = defineCategoryModel(sequelize, DataTypes);
db.Product = defineProductModel(sequelize, DataTypes);
db.ProductCategory = defineProductCategoryModel(sequelize, DataTypes);
db.Attribute = defineAttributeModel(sequelize, DataTypes);
db.AttributeValue = defineAttributeValueModel(sequelize, DataTypes);
db.ProductAttribute = defineProductAttributeModel(sequelize, DataTypes);
db.ProductVariant = defineProductVariantModel(sequelize, DataTypes);
db.VariantAttributeValue = defineVariantAttributeValueModel(sequelize, DataTypes);
db.ProductMedia = defineProductMediaModel(sequelize, DataTypes);
db.Inventory = defineInventoryModel(sequelize, DataTypes);
db.ProductMeta = defineProductMetaModel(sequelize, DataTypes);
db.Cart = defineCartModel(sequelize, DataTypes);
db.CartItem = defineCartItemModel(sequelize, DataTypes);
db.Wishlist = defineWishlistModel(sequelize, DataTypes);
db.WishlistItem = defineWishlistItemModel(sequelize, DataTypes);
db.Address = defineAddressModel(sequelize, DataTypes);
db.Order = defineOrderModel(sequelize, DataTypes);
db.OrderItem = defineOrderItemModel(sequelize, DataTypes);
db.OrderStatusHistory = defineOrderStatusHistoryModel(sequelize, DataTypes);
db.Payment = definePaymentModel(sequelize, DataTypes);
db.HeroBanner = defineHeroBannerModel(sequelize, DataTypes);
db.Coupon = defineCouponModel(sequelize, DataTypes);
db.CouponProduct = defineCouponProductModel(sequelize, DataTypes);
db.CouponCategory = defineCouponCategoryModel(sequelize, DataTypes);
db.CouponUsage = defineCouponUsageModel(sequelize, DataTypes);

Object.values(db).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
