const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../sequelize');

const defineRoleModel = require('../../modules/rbac/models/role.model');
const definePermissionModel = require('../../modules/rbac/models/permission.model');
const defineRolePermissionModel = require('../../modules/rbac/models/rolePermission.model');
const defineUserModel = require('../../modules/auth/models/user.model');
const defineProductModel = require('../../modules/product/models/product.model');

const db = {};

db.Role = defineRoleModel(sequelize, DataTypes);
db.Permission = definePermissionModel(sequelize, DataTypes);
db.RolePermission = defineRolePermissionModel(sequelize, DataTypes);
db.User = defineUserModel(sequelize, DataTypes);
db.Product = defineProductModel(sequelize, DataTypes);

Object.values(db).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
