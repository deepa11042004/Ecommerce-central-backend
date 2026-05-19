const ROLES = Object.freeze({
  DEVELOPER: 'developer',
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  CUSTOMER: 'customer',
});

const ROLE_LIST = Object.freeze(Object.values(ROLES));

module.exports = {
  ROLES,
  ROLE_LIST,
};
