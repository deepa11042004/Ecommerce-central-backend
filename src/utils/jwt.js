const jwt = require('jsonwebtoken');
const env = require('../config/env');

const buildJwtPayload = (user) => {
  const roleName = user.role?.name || user.role || null;

  return {
    sub: user.id,
    role: roleName,
  };
};

const generateAccessToken = (user) => {
  return jwt.sign(
    { ...buildJwtPayload(user), tokenType: 'access' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { ...buildJwtPayload(user), tokenType: 'refresh' },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );
};

const verifyAccessToken = (token) => {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);

  if (payload.tokenType !== 'access') {
    throw new Error('Invalid access token type');
  }

  return payload;
};

const verifyRefreshToken = (token) => {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET);

  if (payload.tokenType !== 'refresh') {
    throw new Error('Invalid refresh token type');
  }

  return payload;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
