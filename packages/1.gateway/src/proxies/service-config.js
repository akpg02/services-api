const versions = ['v1']; // later ['v1', 'v2']

function expandPaths(basePaths, versions) {
  const list = Array.isArray(basePaths) ? basePaths : [basePaths];
  return list.flatMap((p) =>
    versions.map((v) => `/${v}/${p.replace(/^\/+/, '')}`)
  );
}

module.exports = [
  {
    name: 'auth',
    basePath: ['auth'],
    versions,
    target: process.env.IDENTITY_SERVICE_URL,
    secure: false,
    isMultipart: false,
  },
  {
    name: 'users',
    basePath: ['users'],
    versions,
    target: process.env.IDENTITY_SERVICE_URL,
    secure: true,
  },
  {
    name: 'products',
    basePath: ['products', 'product/categories'],
    versions,
    target: process.env.COMBINED_SERVICE_URL,
    secure: true,
  },
  {
    name: 'reviews',
    basePath: ['reviews'],
    versions,
    target: process.env.REVIEW_SERVICE_URL,
    secure: true,
  },
  {
    name: 'inventory',
    basePath: ['inventory'],
    versions,
    target: process.env.INVENTORY_SERVICE_URL,
    secure: true,
  },
  {
    name: 'media',
    basePath: ['media'],
    versions,
    target: process.env.MEDIA_SERVICE_URL,
    secure: true,
    isMultipart: true,
  },
  {
    name: 'audit-logs',
    basePath: ['audit-logs'],
    versions,
    target: process.env.AUDIT_LOG_SERVICE_URL,
    secure: true,
  },
  {
    name: 'carts',
    basePath: ['carts'],
    versions,
    target: process.env.CART_SERVICE_URL,
    secure: true,
  },
  {
    name: 'orders',
    basePath: ['orders', 'returns'],
    versions,
    target: process.env.ORDER_SERVICE_URL,
    secure: true,
  },
  {
    name: 'payments',
    basePath: ['payments'],
    versions,
    target: process.env.PAYMENT_SERVICE_URL,
    secure: true,
  },
  {
    name: 'shipments',
    basePath: ['shipments'],
    versions,
    target: process.env.SHIPMENT_SERVICE_URL,
    secure: true,
  },
  {
    name: 'notifications',
    basePath: ['notifications', 'preferences', 'templates'],
    versions,
    target: process.env.NOTIFICATION_SERVICE_URL,
    secure: true,
  },
  {
    name: 'analytics',
    basePath: ['analytics'],
    versions,
    target: process.env.ANALYTICS_SERVICE_URL,
    secure: true,
  },
  {
    name: 'promotions',
    basePath: ['promotions'],
    versions,
    target: process.env.PROMOTION_SERVICE_URL,
    secure: true,
  },
].map((svc) => ({
  ...svc,
  versions: svc.versions || versions,
  paths: expandPaths(svc.basePath, svc.versions || versions),
}));
