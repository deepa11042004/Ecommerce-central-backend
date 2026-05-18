const { User, Role, Permission } = require('../../../database/models');

class UserRepository {
  static create(payload) {
    return User.create(payload);
  }

  static findByEmail(email) {
    return User.findOne({
      where: { email },
      include: [
        {
          model: Role,
          as: 'role',
          include: [
            {
              model: Permission,
              as: 'permissions',
              through: { attributes: [] },
            },
          ],
        },
      ],
    });
  }

  static findRoleByName(name) {
    return Role.findOne({ where: { name } });
  }

  static findById(id) {
    return User.findByPk(id, {
      include: [
        {
          model: Role,
          as: 'role',
          include: [
            {
              model: Permission,
              as: 'permissions',
              through: { attributes: [] },
            },
          ],
        },
      ],
    });
  }
}

module.exports = UserRepository;
