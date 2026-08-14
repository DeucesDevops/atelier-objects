describe('catalog pricing', () => {
  it('preserves two-decimal commerce values', () => expect(Number((129.99 * 2).toFixed(2))).toBe(259.98));
});
