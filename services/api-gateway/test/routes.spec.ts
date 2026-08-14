import { gatewayRoutePatterns, publicServiceNames, serviceRoutes } from '../src/routes';

describe('gateway route map', () => {
  it('keeps the public service names stable', () => {
    expect(publicServiceNames).toEqual(['auth', 'catalog', 'orders', 'inventory', 'payments', 'notifications', 'analytics']);
    expect(Object.keys(serviceRoutes())).toEqual([...publicServiceNames]);
  });

  it('supports collection and nested proxy paths', () => {
    expect(gatewayRoutePatterns).toEqual({
      collection: 'api/:service',
      nested: 'api/:service/*path'
    });
  });
});
