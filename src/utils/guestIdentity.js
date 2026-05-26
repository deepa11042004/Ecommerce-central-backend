const { randomUUID } = require('crypto');
const { getCookie, getCookieOptions } = require('./cookies');

const GUEST_COOKIE_NAME = 'guestId';
const GUEST_HEADER_NAME = 'x-guest-id';
const GUEST_ID_PREFIX = 'guest_';
const GUEST_ID_PATTERN = /^guest_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ONE_YEAR_IN_MS = 365 * 24 * 60 * 60 * 1000;

const normalizeGuestId = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();

  if (!GUEST_ID_PATTERN.test(normalizedValue)) {
    return null;
  }

  return normalizedValue;
};

const generateGuestId = () => `${GUEST_ID_PREFIX}${randomUUID()}`;

const readGuestId = (req) => {
  const headerValue = normalizeGuestId(req.headers[GUEST_HEADER_NAME]);

  if (headerValue) {
    return headerValue;
  }

  return normalizeGuestId(getCookie(req, GUEST_COOKIE_NAME));
};

const setGuestCookie = (res, guestId) => {
  res.cookie(GUEST_COOKIE_NAME, guestId, {
    ...getCookieOptions(),
    maxAge: ONE_YEAR_IN_MS,
  });
};

const clearGuestCookie = (res) => {
  res.clearCookie(GUEST_COOKIE_NAME, getCookieOptions());
};

const ensureGuestIdentity = (req, res) => {
  let guestId = readGuestId(req);
  let isNewGuest = false;

  if (!guestId) {
    guestId = generateGuestId();
    setGuestCookie(res, guestId);
    isNewGuest = true;
  }

  return {
    guestId,
    isNewGuest,
  };
};

module.exports = {
  GUEST_COOKIE_NAME,
  GUEST_HEADER_NAME,
  generateGuestId,
  normalizeGuestId,
  readGuestId,
  setGuestCookie,
  clearGuestCookie,
  ensureGuestIdentity,
};