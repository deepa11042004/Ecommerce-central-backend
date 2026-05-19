const bcrypt = require('bcryptjs');
const ApiError = require('../../../core/errors/ApiError');
const { ROLES } = require('../../../constants/roles');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../../../utils/jwt');
const UserRepository = require('../repositories/user.repository');

class AuthService {
  static async register({ firstName, lastName, email, password }) {
    const existingUser = await UserRepository.findByEmail(email);

    if (existingUser) {
      throw ApiError.badRequest('Email already exists');
    }

    const userRole = await UserRepository.findRoleByName(ROLES.USER);

    if (!userRole) {
      throw ApiError.badRequest('User role is not configured');
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUNDS || 10));

    const createdUser = await UserRepository.create({
      firstName,
      lastName,
      fullName,
      email,
      passwordHash,
      roleId: userRole.id,
    });

    const user = await UserRepository.findById(createdUser.id);

    return this.buildAuthResponse(user);
  }

  static async login({ email, password }) {
    const user = await this.validateCredentials({ email, password });

    if (user.role?.name !== ROLES.USER) {
      throw ApiError.forbidden('Use your dedicated panel login endpoint');
    }

    return this.buildAuthResponse(user);
  }

  static async loginAdminPanel({ email, password }) {
    const user = await this.validateCredentials({ email, password });
    const allowedRoles = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

    this.ensurePanelAccess(user, allowedRoles, 'admin');

    return this.buildAuthResponse(user);
  }

  static async loginDeveloperPanel({ email, password }) {
    const user = await this.validateCredentials({ email, password });
    const allowedRoles = [ROLES.DEVELOPER];

    this.ensurePanelAccess(user, allowedRoles, 'developer');

    return this.buildAuthResponse(user);
  }

  static async refreshToken(token) {
    if (!token) {
      throw ApiError.badRequest('Refresh token is required');
    }

    let payload;

    try {
      payload = verifyRefreshToken(token);
    } catch (error) {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const user = await UserRepository.findById(payload.sub);

    if (!user) {
      throw ApiError.unauthorized('User no longer exists');
    }

    return this.buildAuthResponse(user);
  }

  static async validateCredentials({ email, password }) {
    const user = await UserRepository.findByEmail(email);

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    return user;
  }

  static ensurePanelAccess(user, allowedRoles, panelName) {
    const userRole = user.role?.name;

    if (!allowedRoles.includes(userRole)) {
      throw ApiError.forbidden(`This account cannot access the ${panelName} panel`);
    }
  }

  static buildAuthResponse(user) {
    const userData = this.toAuthUser(user);

    return {
      user: userData,
      accessToken: generateAccessToken(userData),
      refreshToken: generateRefreshToken(userData),
    };
  }

  static toAuthUser(user) {
    return {
      id: user.id,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      fullName: user.fullName,
      email: user.email,
      role: user.role?.name || null,
      permissions: user.role?.permissions?.map((permission) => permission.key) || [],
    };
  }
}

module.exports = AuthService;
