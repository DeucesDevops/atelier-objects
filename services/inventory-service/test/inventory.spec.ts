describe('inventory arithmetic', () => {
  it('moves units between available and reserved totals', () => {
    const before = { available: 10, reserved: 2 }; const quantity = 3;
    const after = { available: before.available - quantity, reserved: before.reserved + quantity };
    expect(after).toEqual({ available: 7, reserved: 5 });
    expect(after.available + after.reserved).toBe(before.available + before.reserved);
  });
});
