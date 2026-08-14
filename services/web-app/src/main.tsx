import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BarChart3, Bell, CheckCircle2, CreditCard, LogIn, Package, RefreshCw, ShoppingCart, UserPlus, XCircle } from 'lucide-react';
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

function App() {
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

  const total = useMemo(() => cartTotal(cart), [cart]);

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

  return (
    <main className="shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Commerce Platform</p>
          <h1>Storefront control room</h1>
          <p className="lede">Browse, sign in, check out, and watch the platform react across services.</p>
        </div>

        <section className="auth-panel" aria-label="Account">
          <div className="section-title">
            <LogIn size={18} aria-hidden="true" />
            <span>Account</span>
          </div>
          {auth ? (
            <div className="signed-in">
              <span>{auth.name}</span>
              <small>{auth.email}</small>
              <button className="quiet" onClick={() => { localStorage.removeItem('commerce-auth'); setAuth(null); setOrders([]); }}>
                Sign out
              </button>
            </div>
          ) : (
            <form onSubmit={event => event.preventDefault()}>
              <label>
                Name
                <input value={name} onChange={event => setName(event.target.value)} />
              </label>
              <label>
                Email
                <input value={email} onChange={event => setEmail(event.target.value)} />
              </label>
              <label>
                Password
                <input type="password" value={password} onChange={event => setPassword(event.target.value)} />
              </label>
              <div className="button-row">
                <button type="button" onClick={() => authenticate('register')} disabled={loading}>
                  <UserPlus size={16} aria-hidden="true" />
                  Register
                </button>
                <button type="button" className="secondary" onClick={() => authenticate('login')} disabled={loading}>
                  <LogIn size={16} aria-hidden="true" />
                  Login
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="status-panel" aria-label="Platform status">
          <div className="section-title">
            <BarChart3 size={18} aria-hidden="true" />
            <span>Platform status</span>
          </div>
          <div className="metric">
            <span>Captured revenue</span>
            <strong>{formatCurrency(analytics?.capturedRevenue ?? 0)}</strong>
          </div>
          <div className="metric">
            <span>Events consumed</span>
            <strong>{analytics?.totalEvents ?? 0}</strong>
          </div>
          <button className="quiet" onClick={() => refresh().catch(error => setMessage(error.message))} title="Refresh live data">
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </button>
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="live-dot" />
            Live workload via {apiBase}
          </div>
          <p>{message}</p>
        </header>

        <section className="catalog-section" aria-label="Product catalog">
          <div className="workspace-heading">
            <div>
              <p className="eyebrow">Catalog</p>
              <h2>Products ready for checkout</h2>
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
                  <button onClick={() => setCart(current => addToCart(current, product))}>
                    <ShoppingCart size={16} aria-hidden="true" />
                    Add
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="flow-grid">
          <div className="checkout-panel">
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
                    <input
                      aria-label={`${item.name} quantity`}
                      min="0"
                      type="number"
                      value={item.quantity}
                      onChange={event => setCart(current => updateQuantity(current, item.sku, Number(event.target.value)))}
                    />
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

          <div className="activity-panel">
            <div className="section-title">
              <Package size={18} aria-hidden="true" />
              <span>Orders</span>
            </div>
            <div className="order-list">
              {orders.length ? orders.slice(0, 4).map(order => (
                <article className="order-row" key={order.id}>
                  <div>
                    <strong>{formatCurrency(order.total)}</strong>
                    <small>{order.id.slice(0, 8)} · {new Date(order.createdAt).toLocaleTimeString()}</small>
                  </div>
                  <span className={`badge ${order.status.toLowerCase()}`}>
                    {order.status === 'CONFIRMED' ? <CheckCircle2 size={14} aria-hidden="true" /> : <XCircle size={14} aria-hidden="true" />}
                    {order.status}
                  </span>
                  {order.status === 'CONFIRMED' && (
                    <button className="icon-button" onClick={() => cancelOrder(order.id)} title="Cancel and refund order">
                      <XCircle size={16} aria-hidden="true" />
                    </button>
                  )}
                </article>
              )) : <p className="empty">Orders will appear after checkout.</p>}
            </div>
          </div>
        </section>

        <section className="insight-grid" aria-label="Service outputs">
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
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
