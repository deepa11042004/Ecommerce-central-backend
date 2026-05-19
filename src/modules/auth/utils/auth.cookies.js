const env = require('../../../config/env');

const ACCESS_COOKIE_NAME = 'accessToken';
const REFRESH_COOKIE_NAME = 'refreshToken';

const parseDurationToMs = (value) => {
  if (typeof value === 'number') {
    return value;
  }

  const normalizedValue = String(value || '').trim();
  const match = normalizedValue.match(/^(\d+)([smhd])$/i);

  if (!match) {
    return undefined;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
};

const getCookie = (req, name) => {
  const cookieHeader = req.headers.cookie || '';
  const cookies = cookieHeader.split(';').reduce((accumulator, pair) => {
    const [rawKey, ...rawValue] = pair.split('=');

    if (!rawKey) {
      return accumulator;
    }

    const key = rawKey.trim();
    const value = rawValue.join('=').trim();

    if (key) {
      accumulator[key] = decodeURIComponent(value || '');
    }

    return accumulator;
  }, {});

  return cookies[name];
};

const getCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
});

const setAuthCookies = (res, { accessToken, refreshToken }) => {
  const accessMaxAge = parseDurationToMs(env.JWT_ACCESS_EXPIRES_IN);
  const refreshMaxAge = parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN);
  const cookieOptions = getCookieOptions();

  if (accessToken) {
    res.cookie(ACCESS_COOKIE_NAME, accessToken, {
      ...cookieOptions,
      maxAge: accessMaxAge,
    });
  }

  if (refreshToken) {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      ...cookieOptions,
      maxAge: refreshMaxAge,
    });
  }
};

const clearAuthCookies = (res) => {
  const cookieOptions = getCookieOptions();

  res.clearCookie(ACCESS_COOKIE_NAME, cookieOptions);
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions);
};

module.exports = {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  getCookie,
  setAuthCookies,
  clearAuthCookies,
};