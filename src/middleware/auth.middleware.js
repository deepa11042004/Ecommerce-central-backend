const ApiError = require('../core/errors/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../utils/jwt');
const UserRepository = require('../modules/auth/repositories/user.repository');
const AuthService = require('../modules/auth/services/auth.service');
const { getCookie, setAuthCookies, clearAuthCookies } = require('../modules/auth/utils/auth.cookies');

const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7).trim();
};

const auth = () => {
  return asyncHandler(async (req, res, next) => {
    const token = extractBearerToken(req) || getCookie(req, 'accessToken');
    let payload;

    if (token) {
      try {
        payload = verifyAccessToken(token);
      } catch (error) {
        payload = null;
      }
    }

    if (!payload) {
      const refreshToken = getCookie(req, 'refreshToken');

      if (!refreshToken) {
        throw ApiError.unauthorized('Access token is required');
      }

      try {
        const data = await AuthService.refreshToken(refreshToken);

        setAuthCookies(res, data);
        payload = { sub: data.user.id };
      } catch (error) {
        clearAuthCookies(res);
        throw ApiError.unauthorized('Invalid or expired access token');
      }
    }

    const user = await UserRepository.findById(payload.sub);

    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    req.user = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role?.name || null,
      permissions: user.role?.permissions?.map((permission) => permission.key) || [],
    };

    next();
  });
};

module.exports = auth;
