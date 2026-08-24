import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, BarChart3, Bell, Check, CheckCircle2, CreditCard, Grid2X2, LogIn, Minus, Package, Plus, RefreshCw, ShoppingBag, ShoppingCart, UserPlus, XCircle } from 'lucide-react';
import { addToCart, cartTotal, type CartLine, updateQuantity } from './cart';
import './styles.css';

const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

type Product = {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  active: boolean;
};

type InventoryItem = {
  sku: string;
  available: number;
  reserved: number;
};

type Order = {
  id: string;
  customerEmail: string;
  items: Array<{ sku: string; quantity: number; unitPrice: number }>;
  total: number;
  status: string;
  paymentId?: string;
  createdAt: string;
};

type Delivery = {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  sentAt: string;
};

type AnalyticsSummary = {
  totalEvents: number;
  capturedRevenue: number;
  eventsByType: Array<{ event_type: string; count: number }>;
};

type AuthState = {
  token: string;
  email: string;
  name: string;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
};

type Page = 'shop' | 'orders' | 'operations' | 'account';

function pageFromHash(): Page {
  const page = window.location.hash.replace('#/', '') as Page;
  return ['shop', 'orders', 'operations', 'account'].includes(page) ? page : 'shop';
}

async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message ?? `Request failed with ${response.status}`);
  }

  return data as T;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
}

export function App() {
  const [page, setPage] = useState<Page>(pageFromHash);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [auth, setAuth] = useState<AuthState | null>(() => {
    const stored = localStorage.getItem('commerce-auth');
    return stored ? JSON.parse(stored) as AuthState : null;
  });
  const [email, setEmail] = useState(`shopper-${Date.now()}@example.com`);
  const [password, setPassword] = useState('Portfolio123!');
  const [name, setName] = useState('Demo Shopper');
  const [paymentMethod, setPaymentMethod] = useState('demo-card');
  const [message, setMessage] = useState('Ready to browse the live catalog.');
  const [loading, setLoading] = useState(false);
  const [addedSku, setAddedSku] = useState<string | null>(null);

  const total = useMemo(() => cartTotal(cart), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  useEffect(() => {
    const onHashChange = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  async function refresh() {
    const [nextProducts, nextInventory, nextDeliveries, nextAnalytics] = await Promise.all([
      api<Product[]>('/api/catalog/products'),
      api<InventoryItem[]>('/api/inventory'),
      api<Delivery[]>('/api/notifications/deliveries'),
      api<AnalyticsSummary>('/api/analytics/summary')
    ]);

    setProducts(nextProducts);
    setInventory(nextInventory);
    setDeliveries(nextDeliveries);
    setAnalytics(nextAnalytics);

    if (auth?.token) {
      setOrders(await api<Order[]>('/api/orders', { token: auth.token }));
    }
  }

  async function refreshLiveData() {
    setLoading(true);
    setMessage('Refreshing live data…');
    try {
      await refresh();
      setMessage('Storefront data is up to date.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not refresh live data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh().catch(error => setMessage(error.message));
  }, [auth?.token]);

  async function authenticate(mode: 'register' | 'login') {
    setLoading(true);
    try {
      const result = await api<{ accessToken: string; user: { email: string; name: string } }>(`/api/auth/${mode}`, {
        method: 'POST',
        body: mode === 'register' ? { email, password, name } : { email, password }
      });
      const nextAuth = { token: result.accessToken, email: result.user.email, name: result.user.name };
      localStorage.setItem('commerce-auth', JSON.stringify(nextAuth));
      setAuth(nextAuth);
      setMessage(`${mode === 'register' ? 'Registered' : 'Signed in'} as ${result.user.email}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  async function checkout() {
    if (!auth) {
      setMessage('Register or sign in before placing an order.');
      return;
    }

    if (!cart.length) {
      setMessage('Add at least one product to the cart.');
      return;
    }

    setLoading(true);
    try {
      const order = await api<Order>('/api/orders', {
        method: 'POST',
        token: auth.token,
        body: {
          items: cart.map(item => ({ sku: item.sku, quantity: item.quantity, unitPrice: item.price })),
          paymentMethod
        }
      });
      setCart([]);
      setMessage(`Order ${order.status.toLowerCase()} for ${formatCurrency(order.total)}.`);
      await new Promise(resolve => window.setTimeout(resolve, 500));
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Checkout failed.');
      await refresh().catch(() => undefined);
    } finally {
      setLoading(false);
    }
  }

  async function cancelOrder(orderId: string) {
    if (!auth) return;
    setLoading(true);
    try {
      await api<Order>(`/api/orders/${orderId}/cancel`, { method: 'POST', token: auth.token });
      setMessage('Order cancelled, inventory released, and refund simulated.');
      await new Promise(resolve => window.setTimeout(resolve, 500));
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not cancel order.');
    } finally {
      setLoading(false);
    }
  }

  function inventoryFor(sku: string) {
    return inventory.find(item => item.sku === sku);
  }

  function addProduct(product: Product) {
    const stock = inventoryFor(product.sku);
    if (stock && stock.available <= 0) {
      setMessage(`${product.name} is currently out of stock.`);
      return;
    }
    setCart(current => addToCart(current, product));
    setAddedSku(product.sku);
    setMessage(`${product.name} added to your bag.`);
    window.setTimeout(() => setAddedSku(current => current === product.sku ? null : current), 1200);
  }

  function changeQuantity(item: CartLine, delta: number) {
    setCart(current => updateQuantity(current, item.sku, item.quantity + delta));
  }

  function openBag() {
    window.location.hash = '#/shop';
    window.setTimeout(() => document.getElementById('checkout')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 0);
  }

  return (
    <main className="shell">
      <header className="site-header">
        <div className="brand-block">
          <a className="wordmark" href="#/shop"><span className="brand-mark">AO</span><strong>Atelier Objects</strong><span className="release-mark">v2 release</span></a>
          <nav className="primary-nav" aria-label="Primary navigation">
            <a className={page === 'shop' ? 'active' : ''} href="#/shop"><Grid2X2 size={17} /> Shop <span>01</span></a>
            <a className={page === 'orders' ? 'active' : ''} href="#/orders"><Package size={17} /> Orders <span>02</span></a>
            <a className={page === 'operations' ? 'active' : ''} href="#/operations"><BarChart3 size={17} /> Operations <span>03</span></a>
            <a className={page === 'account' ? 'active' : ''} href="#/account"><LogIn size={17} /> Account <span>04</span></a>
          </nav>
        </div>
        <button className="bag-button" onClick={openBag} aria-label={`Shopping bag with ${cartCount} items`}>
          <ShoppingBag size={18} /> <span>Bag</span><strong>{cartCount}</strong>
        </button>
      </header>

      <section className="workspace">
        <header className="topbar" aria-live="polite">
          <div>
            <span className="live-dot" />
            All systems connected
          </div>
          <div className="topbar-actions"><p className="system-message">{message}</p><button className="refresh-button" onClick={refreshLiveData} disabled={loading} aria-label="Refresh storefront data"><RefreshCw className={loading ? 'spinning' : ''} size={15} /></button></div>
        </header>

        {page === 'shop' && <>
        <section className="shop-intro">
          <p className="eyebrow">Independent objects · London</p>
          <h1>Useful things,<br />beautifully considered.</h1>
          <p>Tools for work, sound and daily rituals—selected for how well they earn their place.</p>
        </section>
        <section className="catalog-section" aria-label="Product catalog">
          <div className="workspace-heading">
            <div>
              <p className="eyebrow">Catalog</p>
              <h2>New and noteworthy</h2>
            </div>
            <span>{products.length} active SKUs</span>
          </div>

          <div className="product-grid">
            {products.map(product => {
              const stock = inventoryFor(product.sku);
              return (
                <article className="product-card" key={product.id}>
                  <div className={`product-art ${product.sku.includes('HEADPHONES') ? 'audio' : 'keys'}`} aria-hidden="true">
                    <span />
                  </div>
                  <div className="product-copy">
                    <small>{product.sku}</small>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <div className="product-meta">
                      <strong>{formatCurrency(product.price)}</strong>
                      <span>{stock?.available ?? 0} available</span>
                    </div>
                  </div>
                  <button className={addedSku === product.sku ? 'added' : ''} onClick={() => addProduct(product)} disabled={(stock?.available ?? 1) <= 0}>
                    {addedSku === product.sku ? <><Check size={16} /> Added</> : <><Plus size={16} /> Add to bag</>}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="flow-grid shop-flow">
          <div className="checkout-panel" id="checkout">
            <div className="section-title">
              <ShoppingCart size={18} aria-hidden="true" />
              <span>Checkout</span>
            </div>
            {cart.length ? (
              <div className="cart-lines">
                {cart.map(item => (
                  <div className="cart-line" key={item.sku}>
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.sku}</small>
                    </div>
                    <div className="quantity-control" aria-label={`${item.name} quantity`}>
                      <button onClick={() => changeQuantity(item, -1)} aria-label={`Decrease ${item.name} quantity`}><Minus size={14} /></button>
                      <span>{item.quantity}</span>
                      <button onClick={() => changeQuantity(item, 1)} aria-label={`Increase ${item.name} quantity`}><Plus size={14} /></button>
                    </div>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty">Add products to start a checkout.</p>
            )}
            <label>
              Payment method
              <select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)}>
                <option value="demo-card">demo-card</option>
                <option value="decline">decline</option>
              </select>
            </label>
            <div className="checkout-total">
              <span>Total</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
            <button onClick={checkout} disabled={loading || !cart.length}>
              <CreditCard size={16} aria-hidden="true" />
              Place order
            </button>
          </div>

          <div className="activity-panel bag-note">
            <div className="section-title">
              <ArrowRight size={18} aria-hidden="true" />
              <span>What happens next</span>
            </div>
            <h3>One order. Six services.</h3>
            <p>Checkout reserves inventory, captures a payment, emits events, and creates a notification. Follow the transaction on the Operations page.</p>
            <a className="text-link" href="#/operations">View live operations <ArrowRight size={16} /></a>
          </div>
        </section>
        </>}

        {page === 'orders' && <section className="page-section" aria-label="Orders">
          <div className="workspace-heading"><div><p className="eyebrow">Order history</p><h2>Your purchases.</h2></div><span>{orders.length} orders</span></div>
          <div className="order-list order-page">
            {orders.length ? orders.map(order => (
              <article className="order-row" key={order.id}>
                <div><strong>{formatCurrency(order.total)}</strong><small>{order.id} · {new Date(order.createdAt).toLocaleString()}</small></div>
                <span className={`badge ${order.status.toLowerCase()}`}>{order.status === 'CONFIRMED' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}{order.status}</span>
                {order.status === 'CONFIRMED' && <button className="icon-button" onClick={() => cancelOrder(order.id)} title="Cancel and refund order"><XCircle size={16} /></button>}
              </article>
            )) : <div className="empty-state"><Package size={28} /><h3>No orders yet.</h3><p>Your completed checkouts will appear here.</p><a className="text-link" href="#/shop">Browse the shop <ArrowRight size={16} /></a></div>}
          </div>
        </section>}

        {page === 'operations' && <section className="page-section" aria-label="Service outputs">
          <div className="workspace-heading"><div><p className="eyebrow">Live system</p><h2>Behind every order.</h2></div><span>{analytics?.totalEvents ?? 0} events processed</span></div>
          <div className="insight-grid">
          <div>
            <div className="section-title">
              <Package size={18} aria-hidden="true" />
              <span>Inventory</span>
            </div>
            {inventory.map(item => (
              <div className="stock-row" key={item.sku}>
                <span>{item.sku}</span>
                <strong>{item.available} available</strong>
                <small>{item.reserved} reserved</small>
              </div>
            ))}
          </div>

          <div>
            <div className="section-title">
              <Bell size={18} aria-hidden="true" />
              <span>Notifications</span>
            </div>
            {deliveries.slice(0, 3).map(delivery => (
              <div className="delivery-row" key={delivery.id}>
                <strong>{delivery.subject}</strong>
                <span>{delivery.recipient}</span>
                <small>{delivery.status}</small>
              </div>
            ))}
            {!deliveries.length && <p className="empty">No simulated messages yet.</p>}
          </div>

          <div>
            <div className="section-title">
              <BarChart3 size={18} aria-hidden="true" />
              <span>Events</span>
            </div>
            {(analytics?.eventsByType ?? []).slice(0, 6).map(event => (
              <div className="event-row" key={event.event_type}>
                <span>{event.event_type}</span>
                <strong>{event.count}</strong>
              </div>
            ))}
          </div>
          </div>
        </section>}

        {page === 'account' && <section className="page-section account-page">
          <div className="account-copy"><p className="eyebrow">Your account</p><h2>{auth ? `Hello, ${auth.name}.` : 'Welcome back.'}</h2><p>{auth ? 'Track your purchases and manage your session.' : 'Sign in to place orders and keep your purchase history in one place.'}</p></div>
          <section className="auth-panel" aria-label="Account access">
            {auth ? <div className="signed-in"><CheckCircle2 size={26} /><strong>{auth.name}</strong><small>{auth.email}</small><button className="secondary" onClick={() => { localStorage.removeItem('commerce-auth'); setAuth(null); setOrders([]); setMessage('You have signed out.'); }}><LogIn size={16} /> Sign out</button></div> :
            <form onSubmit={event => event.preventDefault()}>
              <label>Name<input value={name} onChange={event => setName(event.target.value)} autoComplete="name" /></label>
              <label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>
              <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" /></label>
              <div className="button-row"><button type="button" onClick={() => authenticate('login')} disabled={loading}><LogIn size={16} /> Sign in</button><button type="button" className="secondary" onClick={() => authenticate('register')} disabled={loading}><UserPlus size={16} /> Create account</button></div>
            </form>}
          </section>
        </section>}
      </section>
    </main>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) createRoot(rootElement).render(<App />);
