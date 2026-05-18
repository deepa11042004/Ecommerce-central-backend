const RbacRepository = require('../repositories/rbac.repository');

class RbacService {
  static async getPermissionsByRole(roleName) {
    const role = await RbacRepository.findRoleWithPermissionsByName(roleName);

    if (!role) {
      return [];
    }

    return role.permissions.map((permission) => permission.key);
  }
}

module.exports = RbacService;
