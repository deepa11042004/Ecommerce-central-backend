const SIMPLE_ITEM_SEGMENT = 'simple';

const buildItemKey = (productId, variantId = null) => {
  return `${productId}:${variantId || SIMPLE_ITEM_SEGMENT}`;
};

const normalizeCurrency = (value, fallback = 'USD') => {
  const normalizedValue = String(value || fallback).trim().toUpperCase();

  return normalizedValue.slice(0, 3) || fallback;
};

const toInteger = (value, fallback = 0) => {
  const normalizedValue = Number(value);

  return Number.isFinite(normalizedValue) ? Math.trunc(normalizedValue) : fallback;
};

const toMoney = (value, fallback = 0) => {
  const normalizedValue = Number(value);

  if (!Number.isFinite(normalizedValue)) {
    return fallback;
  }

  return Number(normalizedValue.toFixed(2));
};

module.exports = {
  buildItemKey,
  normalizeCurrency,
  toInteger,
  toMoney,
};