// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/main';

const product = {
  id: 'product-1',
  sku: 'KEYBOARD-001',
  name: 'Mechanical Keyboard',
  description: 'Hot-swappable 75% keyboard',
  price: 129.99,
  active: true
};

function json(data: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response);
}

describe('storefront interactions', () => {
  beforeEach(() => {
    window.location.hash = '#/shop';
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/catalog/products')) return json([product]);
      if (url.endsWith('/api/inventory')) return json([{ sku: product.sku, available: 5, reserved: 0 }]);
      if (url.endsWith('/api/notifications/deliveries')) return json([]);
      if (url.endsWith('/api/analytics/summary')) return json({ totalEvents: 0, capturedRevenue: 0, eventsByType: [] });
      return json([]);
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('adds products, updates quantities, and exposes immediate bag feedback', async () => {
    const user = userEvent.setup();
    render(<App />);

    const addButton = await screen.findByRole('button', { name: /add to bag/i });
    await user.click(addButton);

    expect(screen.getByRole('button', { name: /shopping bag with 1 items/i })).toBeTruthy();
    expect(screen.getByText('Mechanical Keyboard added to your bag.')).toBeTruthy();
    expect((screen.getByRole('button', { name: /place order/i }) as HTMLButtonElement).disabled).toBe(false);

    await user.click(screen.getByRole('button', { name: /increase mechanical keyboard quantity/i }));
    expect(screen.getByRole('button', { name: /shopping bag with 2 items/i })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /decrease mechanical keyboard quantity/i }));
    expect(screen.getByRole('button', { name: /shopping bag with 1 items/i })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /shopping bag with 1 items/i }));
    expect(window.location.hash).toBe('#/shop');

    await user.click(screen.getByRole('button', { name: /refresh storefront data/i }));
    expect(await screen.findByText('Storefront data is up to date.')).toBeTruthy();
  });

  it('navigates every page and renders working account controls', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Mechanical Keyboard');

    await user.click(screen.getByRole('link', { name: /^orders/i }));
    expect(await screen.findByRole('heading', { name: 'Your purchases.' })).toBeTruthy();

    await user.click(screen.getByRole('link', { name: /^operations/i }));
    expect(await screen.findByRole('heading', { name: 'Behind every order.' })).toBeTruthy();

    await user.click(screen.getByRole('link', { name: /^account/i }));
    expect(await screen.findByRole('heading', { name: 'Welcome back.' })).toBeTruthy();
    expect((screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: /create account/i }) as HTMLButtonElement).disabled).toBe(false);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
  });
});
