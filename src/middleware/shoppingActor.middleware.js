const ApiError = require('../core/errors/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES } = require('../constants/roles');
const { verifyAccessToken } = require('../utils/jwt');
const UserRepository = require('../modules/auth/repositories/user.repository');
const AuthService = require('../modules/auth/services/auth.service');
const { getCookie, setAuthCookies, clearAuthCookies } = require('../modules/auth/utils/auth.cookies');
const { ensureGuestIdentity } = require('../utils/guestIdentity');

const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7).trim();
};

const toRequestUser = (user) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  role: user.role?.name || null,
  permissions: user.role?.permissions?.map((permission) => permission.key) || [],
});

const ensureCustomerUser = (user) => {
  if (user.role !== ROLES.CUSTOMER) {
    throw ApiError.forbidden('Only customer accounts can access this resource');
  }
};

const resolveAuthenticatedUser = async (req, res) => {
  const bearerToken = extractBearerToken(req);
  const accessToken = bearerToken || getCookie(req, 'accessToken');
  let payload = null;

  if (accessToken) {
    try {
      payload = verifyAccessToken(accessToken);
    } catch (error) {
      payload = null;
    }
  }

  if (!payload) {
    const refreshToken = getCookie(req, 'refreshToken');

    if (refreshToken) {
      try {
        const data = await AuthService.refreshToken(refreshToken);

        setAuthCookies(res, data);
        payload = { sub: data.user.id };
      } catch (error) {
        clearAuthCookies(res);

        if (bearerToken) {
          throw ApiError.unauthorized('Invalid or expired access token');
        }
      }
    } else if (bearerToken) {
      throw ApiError.unauthorized('Invalid or expired access token');
    }
  }

  if (!payload) {
    return null;
  }

  const user = await UserRepository.findById(payload.sub);

  if (!user) {
    if (bearerToken) {
      throw ApiError.unauthorized('User not found');
    }

    clearAuthCookies(res);
    return null;
  }

  return user;
};

const resolveShoppingActor = () => {
  return asyncHandler(async (req, res, next) => {
    const authenticatedUser = await resolveAuthenticatedUser(req, res);

    if (authenticatedUser) {
      req.user = toRequestUser(authenticatedUser);
      ensureCustomerUser(req.user);
      req.actor = {
        type: 'user',
        userId: authenticatedUser.id,
        guestId: null,
      };

      return next();
    }

    const { guestId } = ensureGuestIdentity(req, res);

    req.actor = {
      type: 'guest',
      userId: null,
      guestId,
    };

    return next();
  });
};

const requireCustomerRole = () => {
  return asyncHandler(async (req, res, next) => {
    const authenticatedUser = await resolveAuthenticatedUser(req, res);

    if (!authenticatedUser) {
      throw ApiError.unauthorized('Authentication required');
    }

    req.user = toRequestUser(authenticatedUser);
    ensureCustomerUser(req.user);
    req.actor = {
      type: 'user',
      userId: authenticatedUser.id,
      guestId: null,
    };

    return next();
  });
};

module.exports = {
  resolveShoppingActor,
  requireCustomerRole,
};