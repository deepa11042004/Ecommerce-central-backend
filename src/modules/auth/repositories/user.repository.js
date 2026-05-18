const { User, Role, Permission } = require('../../../database/models');

class UserRepository {
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
