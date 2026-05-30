const { ORDER_STATUS_LIST, PAYMENT_STATUS_LIST } = require('../../../constants/order');

const defineOrderModel = (sequelize, DataTypes) => {
  const Order = sequelize.define(
    'Order',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      orderNumber: {
        type: DataTypes.STRING(40),
        allowNull: false,
        field: 'order_number',
      },
      userId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'user_id',
      },
      guestId: {
        type: DataTypes.STRING(80),
        allowNull: true,
        field: 'guest_id',
      },
      subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      taxAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        field: 'tax_amount',
      },
      shippingAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        field: 'shipping_amount',
      },
      discountAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        field: 'discount_amount',
      },
      couponCodeSnapshot: {
        type: DataTypes.STRING(80),
        allowNull: true,
        field: 'coupon_code_snapshot',
      },
      couponDiscountSnapshot: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        field: 'coupon_discount_snapshot',
      },
      couponTypeSnapshot: {
        type: DataTypes.ENUM('PERCENTAGE', 'FIXED_AMOUNT'),
        allowNull: true,
        field: 'coupon_type_snapshot',
      },
      totalAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        field: 'total_amount',
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
      },
      orderStatus: {
        type: DataTypes.ENUM(...ORDER_STATUS_LIST),
        allowNull: false,
        defaultValue: 'PENDING_PAYMENT',
        field: 'order_status',
      },
      paymentStatus: {
        type: DataTypes.ENUM(...PAYMENT_STATUS_LIST),
        allowNull: false,
        defaultValue: 'PENDING',
        field: 'payment_status',
      },
      paymentMethod: {
        type: DataTypes.STRING(30),
        allowNull: false,
        field: 'payment_method',
      },
      billingAddressId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'billing_address_id',
      },
      shippingAddressId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'shipping_address_id',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'orders',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['order_number'],
        },
        {
          fields: ['user_id'],
        },
        {
          fields: ['guest_id'],
        },
        {
          fields: ['order_status'],
        },
        {
          fields: ['payment_status'],
        },
        {
          fields: ['created_at'],
        },
      ],
    }
  );

  Order.associate = (models) => {
    Order.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    Order.belongsTo(models.Address, {
      foreignKey: 'billingAddressId',
      as: 'billingAddress',
    });

    Order.belongsTo(models.Address, {
      foreignKey: 'shippingAddressId',
      as: 'shippingAddress',
    });

    Order.hasMany(models.OrderItem, {
      foreignKey: 'orderId',
      as: 'items',
    });

    Order.hasMany(models.Payment, {
      foreignKey: 'orderId',
      as: 'payments',
    });

    Order.hasMany(models.CouponUsage, {
      foreignKey: 'orderId',
      as: 'couponUsages',
    });
  };

  return Order;
};

module.exports = defineOrderModel;
