const env = require('../../../config/env');
const { parseDurationToMs, getCookie, getCookieOptions } = require('../../../utils/cookies');

const ACCESS_COOKIE_NAME = 'accessToken';
const REFRESH_COOKIE_NAME = 'refreshToken';

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