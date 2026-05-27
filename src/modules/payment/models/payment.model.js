const { PAYMENT_STATUS_LIST } = require('../../../constants/order');

const definePaymentModel = (sequelize, DataTypes) => {
  const Payment = sequelize.define(
    'Payment',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      orderId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'order_id',
      },
      razorpayOrderId: {
        type: DataTypes.STRING(120),
        allowNull: true,
        field: 'razorpay_order_id',
      },
      razorpayPaymentId: {
        type: DataTypes.STRING(120),
        allowNull: true,
        field: 'razorpay_payment_id',
      },
      razorpaySignature: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'razorpay_signature',
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
      },
      paymentMethod: {
        type: DataTypes.STRING(30),
        allowNull: false,
        field: 'payment_method',
      },
      provider: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      paymentStatus: {
        type: DataTypes.ENUM(...PAYMENT_STATUS_LIST),
        allowNull: false,
        defaultValue: 'PENDING',
        field: 'payment_status',
      },
      rawResponseJson: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'raw_response_json',
      },
    },
    {
      tableName: 'payments',
      timestamps: true,
      indexes: [
        {
          fields: ['order_id'],
        },
        {
          unique: true,
          fields: ['razorpay_order_id'],
        },
        {
          fields: ['razorpay_payment_id'],
        },
        {
          fields: ['payment_status'],
        },
      ],
    }
  );

  Payment.associate = (models) => {
    Payment.belongsTo(models.Order, {
      foreignKey: 'orderId',
      as: 'order',
    });
  };

  return Payment;
};

module.exports = definePaymentModel;
