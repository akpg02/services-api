const services = {
  Gateway: process.env.API_GATEWAY,
  Identity: process.env.IDENTITY_SERVICE_URL,
  Product: process.env.COMBINED_SERVICE_URL,
  Media: process.env.MEDIA_SERVICE_URL,
  Inventory: process.env.INVENTORY_SERVICE_URL,
  Search: process.env.SEARCH_SERVICE_URL,
  Carts: process.env.CART_SERVICE_URL,
  Orders: process.env.ORDER_SERVICE_URL,
  Payments: process.env.PAYMENT_SERVICE_URL,
  Shipment: process.env.SHIPMENT_SERVICE_URL,
  Notifications: process.env.NOTIFICATION_SERVICE_URL,
  Analytics: process.env.ANALYTICS_SERVICE_URL,
  Promotions: process.env.PROMOTION_SERVICE_URL,
  'Audit Log': process.env.AUDIT_LOG_SERVICE_URL,
};

module.exports = { services };
