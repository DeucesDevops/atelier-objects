import { describe, expect, it } from 'vitest';
import { addToCart, cartTotal } from '../src/cart';

describe('cart helpers', () => {
  it('increments existing cart lines and totals them', () => {
    const cart = addToCart([], { sku: 'KEYBOARD-001', name: 'Mechanical Keyboard', price: 129.99 });
    const updated = addToCart(cart, { sku: 'KEYBOARD-001', name: 'Mechanical Keyboard', price: 129.99 });

    expect(updated).toEqual([{ sku: 'KEYBOARD-001', name: 'Mechanical Keyboard', price: 129.99, quantity: 2 }]);
    expect(cartTotal(updated)).toBe(259.98);
  });
});
