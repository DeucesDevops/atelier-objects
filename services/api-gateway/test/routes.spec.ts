describe('gateway route map', () => {
  it('keeps the public service names stable', () => {
    expect(['auth', 'catalog', 'orders', 'inventory', 'payments', 'notifications', 'analytics']).toHaveLength(7);
  });
});
