export type CartLine = {
  sku: string;
  name: string;
  price: number;
  quantity: number;
};

export type CartProduct = {
  sku: string;
  name: string;
  price: number;
};

export function addToCart(cart: CartLine[], product: CartProduct): CartLine[] {
  const existing = cart.find(item => item.sku === product.sku);
  if (existing) {
    return cart.map(item => item.sku === product.sku ? { ...item, quantity: item.quantity + 1 } : item);
  }

  return [...cart, { ...product, quantity: 1 }];
}

export function updateQuantity(cart: CartLine[], sku: string, quantity: number): CartLine[] {
  if (quantity <= 0) {
    return cart.filter(item => item.sku !== sku);
  }

  return cart.map(item => item.sku === sku ? { ...item, quantity } : item);
}

export function cartTotal(cart: CartLine[]): number {
  return Number(cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2));
}
