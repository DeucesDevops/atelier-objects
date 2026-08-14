describe('order totals', () => {
  it('calculates and rounds the payable total', () => {
    const items = [{ quantity: 2, unitPrice: 12.35 }, { quantity: 1, unitPrice: 5.10 }];
    expect(Number(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2))).toBe(29.8);
  });
});
