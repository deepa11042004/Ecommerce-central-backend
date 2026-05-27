const { ORDER_STATUS_TRANSITIONS } = require('../constants/order');

const isOrderStatusTransitionAllowed = (currentStatus, nextStatus) => {
  if (!currentStatus || !nextStatus) {
    return false;
  }

  const allowed = ORDER_STATUS_TRANSITIONS[currentStatus] || [];

  return allowed.includes(nextStatus);
};

module.exports = {
  isOrderStatusTransitionAllowed,
};
