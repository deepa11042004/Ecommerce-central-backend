const ApiError = require('../core/errors/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../utils/jwt');
const UserRepository = require('../modules/auth/repositories/user.repository');

const auth = () => {
  return asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token is required');
    }

    const token = authHeader.slice(7).trim();

    let payload;

    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      throw ApiError.unauthorized('Invalid or expired access token');
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
