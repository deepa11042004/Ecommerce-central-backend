const Joi = require('joi');

const addressFields = {
  fullName: Joi.string().trim().min(2).max(160),
  phone: Joi.string().trim().min(5).max(30),
  addressLine1: Joi.string().trim().min(2).max(255),
  addressLine2: Joi.string().trim().max(255).allow(null, ''),
  city: Joi.string().trim().min(2).max(120),
  state: Joi.string().trim().min(2).max(120),
  country: Joi.string().trim().min(2).max(120),
  postalCode: Joi.string().trim().min(2).max(30),
  landmark: Joi.string().trim().max(190).allow(null, ''),
  type: Joi.string().valid('shipping', 'billing', 'both'),
};

const createAddressSchema = Joi.object({
  body: Joi.object({
    fullName: addressFields.fullName.required(),
    phone: addressFields.phone.required(),
    addressLine1: addressFields.addressLine1.required(),
    addressLine2: addressFields.addressLine2.optional(),
    city: addressFields.city.required(),
    state: addressFields.state.required(),
    country: addressFields.country.required(),
    postalCode: addressFields.postalCode.required(),
    landmark: addressFields.landmark.optional(),
    type: addressFields.type.default('shipping'),
  }).required(),
  params: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
});

const updateAddressSchema = Joi.object({
  body: Joi.object({
    fullName: addressFields.fullName.optional(),
    phone: addressFields.phone.optional(),
    addressLine1: addressFields.addressLine1.optional(),
    addressLine2: addressFields.addressLine2.optional(),
    city: addressFields.city.optional(),
    state: addressFields.state.optional(),
    country: addressFields.country.optional(),
    postalCode: addressFields.postalCode.optional(),
    landmark: addressFields.landmark.optional(),
    type: addressFields.type.optional(),
  }).min(1).required(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

const addressParamsSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }).required(),
  query: Joi.object({}).optional(),
});

const listAddressesSchema = Joi.object({
  body: Joi.object({}).optional(),
  params: Joi.object({}).optional(),
  query: Joi.object({}).optional(),
});

module.exports = {
  createAddressSchema,
  updateAddressSchema,
  addressParamsSchema,
  listAddressesSchema,
};
