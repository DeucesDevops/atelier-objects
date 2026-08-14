export const publicServiceNames = ['auth', 'catalog', 'orders', 'inventory', 'payments', 'notifications', 'analytics'] as const;

export const gatewayRoutePatterns = {
  collection: 'api/:service',
  nested: 'api/:service/*path'
} as const;

export function serviceRoutes(env: NodeJS.ProcessEnv = process.env): Record<string, string> {
  return {
    auth: env.AUTH_SERVICE_URL ?? 'http://localhost:3001',
    catalog: env.CATALOG_SERVICE_URL ?? 'http://localhost:3002',
    orders: env.ORDER_SERVICE_URL ?? 'http://localhost:3003',
    inventory: env.INVENTORY_SERVICE_URL ?? 'http://localhost:3004',
    payments: env.PAYMENT_SERVICE_URL ?? 'http://localhost:8085',
    notifications: env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:8001',
    analytics: env.ANALYTICS_SERVICE_URL ?? 'http://localhost:8002'
  };
}
