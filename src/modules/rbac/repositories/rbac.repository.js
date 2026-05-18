const { Role, Permission } = require('../../../database/models');

class RbacRepository {
  static findRoleWithPermissionsByName(roleName) {
    return Role.findOne({
      where: { name: roleName },
      include: [
        {
          model: Permission,
          as: 'permissions',
          through: { attributes: [] },
        },
      ],
    });
  }
}

module.exports = RbacRepository;
