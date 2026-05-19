const Joi = require('joi');

const loginSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    password: Joi.string().min(8).max(64).required(),
  }).required(),
  params: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
});

const registerSchema = Joi.object({
  body: Joi.object({
    firstName: Joi.string().min(1).max(80).required(),
    lastName: Joi.string().min(1).max(80).required(),
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    password: Joi.string().min(8).max(64).required(),
  }).required(),
  params: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
});

const refreshTokenSchema = Joi.object({
  body: Joi.object({
    refreshToken: Joi.string().optional(),
  }).required(),
  params: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
});

module.exports = {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
};
