const env = require('../config/env');

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

const parseCookieHeader = (cookieHeader = '') => {
  return cookieHeader.split(';').reduce((accumulator, pair) => {
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
};

const getCookie = (req, name) => {
  const cookies = parseCookieHeader(req.headers.cookie || '');

  return cookies[name];
};

const getCookieOptions = ({ httpOnly = true } = {}) => ({
  httpOnly,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
});

module.exports = {
  parseDurationToMs,
  parseCookieHeader,
  getCookie,
  getCookieOptions,
};