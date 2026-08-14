import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft, ArrowRight, BarChart3, Bell, Check, CheckCircle2, ChevronRight,
  CircleUserRound, Clock3, CreditCard, Headphones, Heart, Keyboard, LampDesk,
  Menu, Minus, MousePointer2, Package, Plus, RefreshCw, Search, ShieldCheck,
  ShoppingBag, Speaker, Star, Truck, X, XCircle
} from 'lucide-react';
import { addToCart, cartTotal, type CartLine, updateQuantity } from './cart';
import './styles.css';

const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

type Product = { id: string; sku: string; name: string; description: string; price: number; active: boolean };
type InventoryItem = { sku: string; available: number; reserved: number };
type Order = {
  id: string;
  customerEmail: string;
  items: Array<{ sku: string; quantity: number; unitPrice: number }>;
  total: number;
  status: string;
  paymentId?: string;
  createdAt: string;
};
type Delivery = { id: string; recipient: string; subject: string; status: string; sentAt: string };
type AnalyticsSummary = { totalEvents: number; capturedRevenue: number; eventsByType: Array<{ event_type: string; count: number }> };
type AuthState = { token: string; email: string; name: string };
type RequestOptions = { method?: string; body?: unknown; token?: string };
type AuthMode = 'login' | 'register';

const productDetails: Record<string, { category: string; tone: string; rating: string; features: string[] }> = {
  'KEYBOARD-001': { category: 'Workspace', tone: 'sand', rating: '4.9', features: ['Hot-swappable switches', 'Wireless and USB-C', 'Mac and Windows ready'] },
  'HEADPHONES-001': { category: 'Audio', tone: 'ink', rating: '4.8', features: ['40mm studio drivers', 'Memory foam cushions', '32-hour battery'] },
  'SPEAKER-001': { category: 'Audio', tone: 'clay', rating: '4.7', features: ['Room-filling sound', 'AirPlay and Bluetooth', '12-hour battery'] },
  'MOUSE-001': { category: 'Workspace', tone: 'sage', rating: '4.9', features: ['Silent magnetic clicks', 'Glass-ready tracking', 'USB-C charging'] },
  'LAMP-001': { category: 'Lighting', tone: 'brass', rating: '4.8', features: ['Warm-to-cool dimming', 'Touch controls', 'Low-glare diffuser'] },
  'DESKMAT-001': { category: 'Workspace', tone: 'stone', rating: '4.6', features: ['Recycled wool felt', 'Natural cork backing', 'Easy-clean finish'] }
};

async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    method: options.method ?? 'GET',
    headers: { 'content-type': 'application/json', ...(options.token ? { authorization: `Bearer ${options.token}` } : {}) },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message ?? `Request failed with ${response.status}`);
  return data as T;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
}

function routeFromHash(): string {
  return window.location.hash.replace(/^#/, '') || '/';
}

function ProductArt({ product, large = false }: { product: Product; large?: boolean }) {
  const detail = productDetails[product.sku] ?? { tone: 'sand' };
  const Icon = product.sku.includes('HEADPHONES') ? Headphones
    : product.sku.includes('KEYBOARD') ? Keyboard
      : product.sku.includes('SPEAKER') ? Speaker
        : product.sku.includes('MOUSE') ? MousePointer2
          : product.sku.includes('LAMP') ? LampDesk
            : Package;
  return (
    <div className={`product-art ${detail.tone} ${large ? 'large' : ''}`} role="img" aria-label={`${product.name} product view`}>
      <span className="art-shadow" />
      <Icon aria-hidden="true" strokeWidth={1.15} />
      <span className="art-number">{product.sku.slice(-3)}</span>
    </div>
  );
}

function App() {
  const [route, setRoute] = useState(routeFromHash);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [cart, setCart] = useState<CartLine[]>(() => {
    const stored = localStorage.getItem('atelier-cart');
    return stored ? JSON.parse(stored) as CartLine[] : [];
  });
  const [auth, setAuth] = useState<AuthState | null>(() => {
    const stored = localStorage.getItem('commerce-auth');
    return stored ? JSON.parse(stored) as AuthState : null;
  });
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('demo-card');
  const [shipping, setShipping] = useState({ firstName: '', lastName: '', address: '', city: '', postcode: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('featured');
  const [wishlist, setWishlist] = useState<string[]>(() => {
    const stored = localStorage.getItem('atelier-wishlist');
    return stored ? JSON.parse(stored) as string[] : [];
  });
  const [checkoutComplete, setCheckoutComplete] = useState<Order | null>(null);

  const total = useMemo(() => cartTotal(cart), [cart]);
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const activeProducts = products.filter(product => product.active);
  const categories = ['All', ...new Set(activeProducts.map(product => productDetails[product.sku]?.category ?? 'Essentials'))];
  const filteredProducts = activeProducts
    .filter(product => category === 'All' || productDetails[product.sku]?.category === category)
    .filter(product => `${product.name} ${product.description}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === 'price-low' ? a.price - b.price : sort === 'price-high' ? b.price - a.price : a.name.localeCompare(b.name));

  useEffect(() => {
    const onHashChange = () => { setRoute(routeFromHash()); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => { localStorage.setItem('atelier-cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('atelier-wishlist', JSON.stringify(wishlist)); }, [wishlist]);

  async function refresh() {
    const [nextProducts, nextInventory, nextDeliveries, nextAnalytics] = await Promise.all([
      api<Product[]>('/api/catalog/products'), api<InventoryItem[]>('/api/inventory'),
      api<Delivery[]>('/api/notifications/deliveries'), api<AnalyticsSummary>('/api/analytics/summary')
    ]);
    setProducts(nextProducts);
    setInventory(nextInventory);
    setDeliveries(nextDeliveries);
    setAnalytics(nextAnalytics);
    if (auth?.token) setOrders(await api<Order[]>('/api/orders', { token: auth.token }));
  }

  useEffect(() => { refresh().catch(error => setMessage(error.message)); }, [auth?.token]);

  function navigate(path: string) {
    if (route === path) window.scrollTo({ top: 0, behavior: 'smooth' });
    else window.location.hash = path;
  }

  function inventoryFor(sku: string) { return inventory.find(item => item.sku === sku); }

  function addProduct(product: Product, quantity = 1) {
    setCart(current => {
      let next = current;
      for (let index = 0; index < quantity; index += 1) next = addToCart(next, product);
      return next;
    });
    setMessage(`${product.name} added to your bag.`);
  }

  async function authenticate(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const result = await api<{ accessToken: string; user: { email: string; name: string } }>(`/api/auth/${authMode}`, {
        method: 'POST', body: authMode === 'register' ? { email, password, name } : { email, password }
      });
      const nextAuth = { token: result.accessToken, email: result.user.email, name: result.user.name };
      localStorage.setItem('commerce-auth', JSON.stringify(nextAuth));
      setAuth(nextAuth);
      setMessage(`Welcome${nextAuth.name ? `, ${nextAuth.name.split(' ')[0]}` : ''}.`);
      navigate(route === '/checkout' ? '/checkout' : '/account');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'We could not sign you in.');
    } finally { setLoading(false); }
  }

  function signOut() {
    localStorage.removeItem('commerce-auth');
    setAuth(null); setOrders([]); setMessage('You have signed out.'); navigate('/');
  }

  async function checkout(event: React.FormEvent) {
    event.preventDefault();
    if (!auth) { setMessage('Sign in or create an account to complete checkout.'); navigate('/account'); return; }
    if (!cart.length) { setMessage('Your bag is empty.'); navigate('/shop'); return; }
    setLoading(true); setMessage('');
    try {
      const order = await api<Order>('/api/orders', {
        method: 'POST', token: auth.token,
        body: { items: cart.map(item => ({ sku: item.sku, quantity: item.quantity, unitPrice: item.price })), paymentMethod }
      });
      setCart([]); setCheckoutComplete(order); setMessage('Order placed successfully.');
      await new Promise(resolve => window.setTimeout(resolve, 500));
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Checkout failed. Please try again.');
      await refresh().catch(() => undefined);
    } finally { setLoading(false); }
  }

  async function cancelOrder(orderId: string) {
    if (!auth) return;
    setLoading(true);
    try {
      await api<Order>(`/api/orders/${orderId}/cancel`, { method: 'POST', token: auth.token });
      setMessage('Order cancelled. Your simulated refund has been issued.');
      await new Promise(resolve => window.setTimeout(resolve, 500)); await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not cancel order.'); }
    finally { setLoading(false); }
  }

  function ProductCard({ product }: { product: Product }) {
    const stock = inventoryFor(product.sku)?.available ?? 0;
    const detail = productDetails[product.sku];
    return (
      <article className="product-card">
        <button className="product-image-button" onClick={() => navigate(`/product/${product.id}`)} aria-label={`View ${product.name}`}>
          <ProductArt product={product} />
        </button>
        <button
          className={`wishlist ${wishlist.includes(product.id) ? 'selected' : ''}`}
          onClick={() => setWishlist(current => current.includes(product.id) ? current.filter(id => id !== product.id) : [...current, product.id])}
          aria-label={`${wishlist.includes(product.id) ? 'Remove' : 'Add'} ${product.name} ${wishlist.includes(product.id) ? 'from' : 'to'} favourites`}
        >
          <Heart size={18} fill={wishlist.includes(product.id) ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
        <div className="product-copy">
          <span>{detail?.category ?? 'Essentials'}</span>
          <button className="product-name" onClick={() => navigate(`/product/${product.id}`)}>{product.name}</button>
          <div className="rating"><Star size={13} fill="currentColor" aria-hidden="true" /> {detail?.rating ?? '4.8'} <small>· {stock > 0 ? 'In stock' : 'Sold out'}</small></div>
          <div className="product-bottom">
            <strong>{formatCurrency(product.price)}</strong>
            <button className="quick-add" onClick={() => addProduct(product)} disabled={stock < 1} aria-label={`Add ${product.name} to bag`}>
              <Plus size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </article>
    );
  }

  function HomePage() {
    return <>
      <section className="hero">
        <div className="hero-image" aria-hidden="true" />
        <div className="hero-copy reveal">
          <p className="kicker light">The considered workspace</p>
          <h1>Objects for<br />better focus.</h1>
          <p>Thoughtful technology for spaces where ideas take shape.</p>
          <div className="hero-actions">
            <button className="button light-button" onClick={() => navigate('/shop')}>Shop the collection <ArrowRight size={17} /></button>
            <button className="text-link light-link" onClick={() => navigate('/shop')}>Explore the desk edit</button>
          </div>
        </div>
        <div className="hero-caption"><span>01</span> Workspace collection · 2026</div>
      </section>

      <section className="service-strip" aria-label="Shopping benefits">
        <div><Truck aria-hidden="true" /><span><strong>Complimentary delivery</strong><small>On orders over £75</small></span></div>
        <div><RefreshCw aria-hidden="true" /><span><strong>30-day returns</strong><small>Simple, no-stress returns</small></span></div>
        <div><ShieldCheck aria-hidden="true" /><span><strong>Two-year care</strong><small>Support from real people</small></span></div>
      </section>

      <section className="section featured-section">
        <div className="section-heading">
          <div><p className="kicker">The essentials</p><h2>Made to earn its place.</h2></div>
          <button className="text-link" onClick={() => navigate('/shop')}>View all products <ArrowRight size={15} /></button>
        </div>
        <div className="product-grid">{activeProducts.slice(0, 4).map(product => <ProductCard product={product} key={product.id} />)}</div>
      </section>

      <section className="editorial-section section">
        <div className="editorial-art"><div className="editorial-orbit"><Speaker strokeWidth={1} aria-hidden="true" /></div></div>
        <div className="editorial-copy">
          <p className="kicker light">Sound, shaped for home</p>
          <h2>Presence without the noise.</h2>
          <p>The Arc speaker brings a rich, room-filling sound to a form quiet enough to live anywhere.</p>
          <button className="button light-button" onClick={() => {
            const speaker = activeProducts.find(product => product.sku === 'SPEAKER-001');
            navigate(speaker ? `/product/${speaker.id}` : '/shop');
          }}>Discover Arc <ArrowRight size={17} /></button>
        </div>
      </section>

      <section className="section journal-section">
        <p className="kicker">Atelier journal</p>
        <div className="journal-grid">
          <article><span>01</span><h3>The rituals that make a workspace work</h3><p>Four small ways to build a calmer, more intentional desk.</p><button className="text-link">Read the story <ArrowRight size={15} /></button></article>
          <article><span>02</span><h3>How we choose materials that last</h3><p>From recycled aluminium to wool felt, every finish has a reason.</p><button className="text-link">Read the story <ArrowRight size={15} /></button></article>
          <article><span>03</span><h3>A field guide to better listening</h3><p>Set up your space for detail, depth and long listening sessions.</p><button className="text-link">Read the story <ArrowRight size={15} /></button></article>
        </div>
      </section>
    </>;
  }

  function ShopPage() {
    return <section className="section page-section shop-page">
      <div className="page-intro"><p className="kicker">Shop</p><h1>The collection</h1><p>Useful objects, chosen for how well they work and how quietly they live with you.</p></div>
      <div className="shop-tools">
        <div className="category-tabs">{categories.map(item => <button className={category === item ? 'active' : ''} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div>
        <div className="shop-controls">
          <label className="search-field"><Search size={17} aria-hidden="true" /><span className="sr-only">Search products</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search collection" /></label>
          <label><span className="sr-only">Sort products</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label>
        </div>
      </div>
      <div className="results-line"><span>{filteredProducts.length} products</span><span>Designed in London · Made responsibly</span></div>
      {filteredProducts.length ? <div className="product-grid shop-grid">{filteredProducts.map(product => <ProductCard product={product} key={product.id} />)}</div> : <div className="empty-state"><Search size={28} /><h3>No products found</h3><p>Try another search or category.</p></div>}
    </section>;
  }

  function ProductPage({ product }: { product: Product }) {
    const [quantity, setQuantity] = useState(1);
    const stock = inventoryFor(product.sku)?.available ?? 0;
    const detail = productDetails[product.sku] ?? { category: 'Essentials', rating: '4.8', features: [] };
    return <section className="section page-section product-page">
      <button className="back-link" onClick={() => navigate('/shop')}><ArrowLeft size={16} /> Back to collection</button>
      <div className="product-detail-grid">
        <div className="product-gallery">
          <ProductArt product={product} large />
          <div className="thumbnail-row"><button className="active"><ProductArt product={product} /></button><button><span className="material-swatch dark" /></button><button><span className="material-swatch light" /></button></div>
        </div>
        <div className="product-info">
          <p className="kicker">{detail.category}</p>
          <h1>{product.name}</h1>
          <div className="product-rating"><span><Star size={15} fill="currentColor" /> {detail.rating}</span><button>Read 48 reviews</button></div>
          <strong className="detail-price">{formatCurrency(product.price)}</strong>
          <p className="detail-description">{product.description}. Designed to feel intuitive from the first use and considered enough to keep for years.</p>
          <div className="finish-picker"><span>Finish</span><strong>Charcoal / Walnut</strong><div><button className="finish dark selected" aria-label="Charcoal and walnut finish" /><button className="finish light" aria-label="Sand and silver finish" /></div></div>
          <div className="purchase-row">
            <div className="quantity-control"><button onClick={() => setQuantity(value => Math.max(1, value - 1))} aria-label="Decrease quantity"><Minus size={15} /></button><span>{quantity}</span><button onClick={() => setQuantity(value => Math.min(stock || 1, value + 1))} aria-label="Increase quantity"><Plus size={15} /></button></div>
            <button className="button add-bag" onClick={() => addProduct(product, quantity)} disabled={stock < 1}>Add to bag · {formatCurrency(product.price * quantity)}</button>
          </div>
          <p className="stock-message"><span className={stock > 0 ? 'stock-dot' : 'stock-dot unavailable'} /> {stock > 0 ? `In stock · ${stock} available` : 'Temporarily unavailable'}</p>
          <div className="product-promises">
            <div><Truck /><span><strong>Free delivery</strong><small>Arrives in 2–4 working days</small></span></div>
            <div><RefreshCw /><span><strong>30-day returns</strong><small>Try it at home, without pressure</small></span></div>
            <div><ShieldCheck /><span><strong>Two-year warranty</strong><small>Repair and support included</small></span></div>
          </div>
          <details open><summary>Details <Plus size={16} /></summary><ul>{detail.features.map(feature => <li key={feature}><Check size={15} /> {feature}</li>)}</ul></details>
          <details><summary>Materials & care <Plus size={16} /></summary><p>Wipe with a soft, slightly damp cloth. Designed with replaceable parts where possible.</p></details>
        </div>
      </div>
      <div className="related"><div className="section-heading"><div><p className="kicker">Complete the space</p><h2>Pairs well with</h2></div></div><div className="product-grid">{activeProducts.filter(item => item.id !== product.id).slice(0, 3).map(item => <ProductCard product={item} key={item.id} />)}</div></div>
    </section>;
  }

  function CartPage() {
    return <section className="section page-section cart-page">
      <div className="page-intro compact"><p className="kicker">Your selection</p><h1>Shopping bag</h1><p>{cartCount ? `${cartCount} ${cartCount === 1 ? 'item' : 'items'} reserved for checkout.` : 'Your bag is ready for something considered.'}</p></div>
      {!cart.length ? <div className="empty-state large"><ShoppingBag size={34} /><h2>Your bag is empty</h2><p>Explore objects designed for better work and better listening.</p><button className="button" onClick={() => navigate('/shop')}>Shop the collection</button></div> :
        <div className="cart-layout">
          <div className="cart-items">{cart.map(item => {
            const product = products.find(entry => entry.sku === item.sku);
            return <article className="cart-item" key={item.sku}>
              {product && <ProductArt product={product} />}
              <div className="cart-item-copy"><span>{productDetails[item.sku]?.category ?? 'Essentials'}</span><h3>{item.name}</h3><small>Charcoal / Walnut</small><button onClick={() => setCart(current => updateQuantity(current, item.sku, 0))}>Remove</button></div>
              <div className="cart-item-actions"><strong>{formatCurrency(item.price * item.quantity)}</strong><div className="quantity-control"><button onClick={() => setCart(current => updateQuantity(current, item.sku, item.quantity - 1))}><Minus size={14} /></button><span>{item.quantity}</span><button onClick={() => setCart(current => updateQuantity(current, item.sku, item.quantity + 1))}><Plus size={14} /></button></div></div>
            </article>;
          })}</div>
          <aside className="order-summary"><h2>Order summary</h2><div><span>Subtotal</span><strong>{formatCurrency(total)}</strong></div><div><span>Delivery</span><strong>{total >= 75 ? 'Complimentary' : formatCurrency(6)}</strong></div><div className="summary-total"><span>Total</span><strong>{formatCurrency(total + (total >= 75 ? 0 : 6))}</strong></div><small>Taxes included where applicable.</small><button className="button" onClick={() => navigate('/checkout')}>Continue to checkout <ArrowRight size={16} /></button><p><ShieldCheck size={15} /> Secure simulated checkout</p></aside>
        </div>}
    </section>;
  }

  function CheckoutPage() {
    if (checkoutComplete) return <section className="section page-section confirmation-page"><div className="confirmation-mark"><Check size={34} /></div><p className="kicker">Order confirmed</p><h1>Thank you, {auth?.name?.split(' ')[0] || 'there'}.</h1><p>Your order <strong>#{checkoutComplete.id.slice(0, 8).toUpperCase()}</strong> is confirmed. A simulated receipt is on its way to {auth?.email}.</p><div className="confirmation-actions"><button className="button" onClick={() => { setCheckoutComplete(null); navigate('/orders'); }}>Track your order</button><button className="text-link" onClick={() => { setCheckoutComplete(null); navigate('/shop'); }}>Continue shopping</button></div></section>;
    return <section className="section page-section checkout-page">
      <button className="back-link" onClick={() => navigate('/cart')}><ArrowLeft size={16} /> Back to bag</button>
      <div className="checkout-header"><p className="kicker">Secure checkout</p><h1>Complete your order</h1></div>
      <form className="checkout-layout" onSubmit={checkout}>
        <div className="checkout-form">
          {!auth && <div className="account-notice"><CircleUserRound /><span><strong>Already have an account?</strong><small>Sign in to continue with your saved details.</small></span><button type="button" className="text-link" onClick={() => navigate('/account')}>Sign in</button></div>}
          <fieldset><legend><span>1</span> Contact</legend><label>Email address<input type="email" defaultValue={auth?.email ?? ''} required placeholder="you@example.com" /></label></fieldset>
          <fieldset><legend><span>2</span> Delivery</legend><div className="form-grid"><label>First name<input required value={shipping.firstName} onChange={event => setShipping(current => ({ ...current, firstName: event.target.value }))} /></label><label>Last name<input required value={shipping.lastName} onChange={event => setShipping(current => ({ ...current, lastName: event.target.value }))} /></label><label className="full">Address<input required value={shipping.address} onChange={event => setShipping(current => ({ ...current, address: event.target.value }))} /></label><label>City<input required value={shipping.city} onChange={event => setShipping(current => ({ ...current, city: event.target.value }))} /></label><label>Postcode<input required value={shipping.postcode} onChange={event => setShipping(current => ({ ...current, postcode: event.target.value }))} /></label></div><label className="delivery-option"><input type="radio" checked readOnly name="delivery" /><Truck /><span><strong>Standard delivery</strong><small>2–4 working days</small></span><b>{total >= 75 ? 'Free' : '£6.00'}</b></label></fieldset>
          <fieldset><legend><span>3</span> Payment</legend><label className="payment-option"><input type="radio" name="payment" checked={paymentMethod === 'demo-card'} onChange={() => setPaymentMethod('demo-card')} /><CreditCard /><span><strong>Demo card</strong><small>Payment is authorised and captured safely</small></span></label><label className="payment-option"><input type="radio" name="payment" checked={paymentMethod === 'decline'} onChange={() => setPaymentMethod('decline')} /><XCircle /><span><strong>Test a declined payment</strong><small>Shows inventory release and error handling</small></span></label></fieldset>
        </div>
        <aside className="order-summary checkout-summary"><h2>Your order</h2>{cart.map(item => <div className="mini-line" key={item.sku}><span>{item.name}<small>Qty {item.quantity}</small></span><strong>{formatCurrency(item.price * item.quantity)}</strong></div>)}<div><span>Subtotal</span><strong>{formatCurrency(total)}</strong></div><div><span>Delivery</span><strong>{total >= 75 ? 'Complimentary' : '£6.00'}</strong></div><div className="summary-total"><span>Total</span><strong>{formatCurrency(total + (total >= 75 ? 0 : 6))}</strong></div>{!auth && <p className="checkout-warning">Sign in before placing your order.</p>}<button className="button" type="submit" disabled={loading || !cart.length}>{loading ? 'Processing…' : 'Place order'} <ArrowRight size={16} /></button><p><ShieldCheck size={15} /> This is a portfolio demo. No real payment is taken.</p></aside>
      </form>
    </section>;
  }

  function AccountPage() {
    if (auth) return <section className="section page-section account-page"><div className="account-header"><div className="avatar">{auth.name.slice(0, 1).toUpperCase()}</div><div><p className="kicker">Your account</p><h1>Good to see you, {auth.name.split(' ')[0]}.</h1><p>{auth.email}</p></div><button className="text-link" onClick={signOut}>Sign out</button></div><div className="account-links"><button onClick={() => navigate('/orders')}><Package /><span><strong>Orders</strong><small>{orders.length} recent orders</small></span><ChevronRight /></button><button onClick={() => navigate('/wishlist')}><Heart /><span><strong>Saved items</strong><small>{wishlist.length} products saved</small></span><ChevronRight /></button><button><CircleUserRound /><span><strong>Personal details</strong><small>Profile and delivery addresses</small></span><ChevronRight /></button></div><div className="account-order-preview"><div className="section-heading"><div><p className="kicker">Recent activity</p><h2>Your latest orders</h2></div><button className="text-link" onClick={() => navigate('/orders')}>View all <ArrowRight size={15} /></button></div>{orders.slice(0, 2).map(order => <OrderRow order={order} key={order.id} />)}{!orders.length && <p className="empty-inline">No orders yet. Your first considered object is waiting.</p>}</div></section>;
    return <section className="auth-page"><div className="auth-visual"><div><p className="kicker light">Atelier membership</p><h1>Keep the things you choose close.</h1><p>Track orders, save favourites and move through checkout with less friction.</p></div></div><div className="auth-form-wrap"><div className="auth-tabs"><button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Sign in</button><button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Create account</button></div><form className="auth-form" onSubmit={authenticate}><p className="kicker">{authMode === 'login' ? 'Welcome back' : 'Join Atelier'}</p><h2>{authMode === 'login' ? 'Sign in to your account' : 'Create your account'}</h2>{authMode === 'register' && <label>Full name<input value={name} onChange={event => setName(event.target.value)} autoComplete="name" required placeholder="Alex Morgan" /></label>}<label>Email address<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required placeholder="alex@example.com" /></label><label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} minLength={8} required placeholder="Minimum 8 characters" /></label>{authMode === 'login' && <button type="button" className="forgot">Forgot password?</button>}<button className="button" type="submit" disabled={loading}>{loading ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></button><small>For this portfolio demo, create an account with any valid email and an 8+ character password.</small></form></div></section>;
  }

  function OrderRow({ order }: { order: Order }) {
    const statusClass = order.status.toLowerCase();
    return <article className="order-card"><div className="order-top"><span>Order #{order.id.slice(0, 8).toUpperCase()}<small>{new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</small></span><span className={`status ${statusClass}`}>{order.status === 'CONFIRMED' ? <CheckCircle2 /> : order.status === 'PENDING' ? <Clock3 /> : <XCircle />}{order.status}</span></div><div className="order-body"><div><strong>{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</strong><small>{order.items.map(item => item.sku.replace('-001', '').toLowerCase()).join(' · ')}</small></div><strong>{formatCurrency(order.total)}</strong></div><div className="order-progress"><span className="done" /><span className={order.status === 'CONFIRMED' ? 'done' : ''} /><span /><small>Order placed</small><small>Confirmed</small><small>On its way</small></div><div className="order-actions"><button className="text-link">View details</button>{order.status === 'CONFIRMED' && <button className="text-link danger" onClick={() => cancelOrder(order.id)} disabled={loading}>Cancel & refund</button>}</div></article>;
  }

  function OrdersPage() {
    if (!auth) return <section className="section page-section orders-page"><div className="empty-state large"><Package /><h1>Sign in to see your orders</h1><p>Your purchases, delivery progress and receipts will live here.</p><button className="button" onClick={() => navigate('/account')}>Sign in or create account</button></div></section>;
    return <section className="section page-section orders-page"><div className="page-intro compact"><p className="kicker">Your account</p><h1>Orders</h1><p>Track deliveries, view details or manage a recent purchase.</p></div><div className="orders-list">{orders.map(order => <OrderRow order={order} key={order.id} />)}{!orders.length && <div className="empty-state"><Package /><h2>No orders yet</h2><p>When you find something you love, it will appear here.</p><button className="button" onClick={() => navigate('/shop')}>Start shopping</button></div>}</div></section>;
  }

  function WishlistPage() {
    const savedProducts = activeProducts.filter(product => wishlist.includes(product.id));
    return <section className="section page-section wishlist-page"><div className="page-intro compact"><p className="kicker">Your collection</p><h1>Saved items</h1><p>Keep considered objects close while you decide.</p></div>{savedProducts.length ? <div className="product-grid shop-grid wishlist-grid">{savedProducts.map(product => <ProductCard product={product} key={product.id} />)}</div> : <div className="empty-state large"><Heart size={34} /><h2>Nothing saved yet</h2><p>Use the heart on any product to keep it here.</p><button className="button" onClick={() => navigate('/shop')}>Explore the collection</button></div>}</section>;
  }

  function SystemPage() {
    return <section className="section page-section system-page"><div className="system-heading"><div><p className="kicker">Live platform</p><h1>Everything connected.</h1><p>A customer-friendly view of the services responding behind the storefront.</p></div><button className="button secondary-button" onClick={() => refresh().catch(error => setMessage(error.message))}><RefreshCw size={16} /> Refresh live data</button></div><div className="system-stats"><div><span>Captured revenue</span><strong>{formatCurrency(analytics?.capturedRevenue ?? 0)}</strong><small>Payment events processed</small></div><div><span>Domain events</span><strong>{analytics?.totalEvents ?? 0}</strong><small>Consumed by analytics</small></div><div><span>Services online</span><strong>8 / 8</strong><small>Gateway health verified</small></div></div><div className="system-columns"><div><h2>Inventory</h2>{inventory.map(item => <div className="data-row" key={item.sku}><span>{item.sku}<small>{item.reserved} reserved</small></span><strong>{item.available} available</strong></div>)}</div><div><h2>Recent notifications</h2>{deliveries.slice(0, 5).map(delivery => <div className="data-row" key={delivery.id}><span>{delivery.subject}<small>{delivery.recipient}</small></span><strong>{delivery.status}</strong></div>)}{!deliveries.length && <p className="empty-inline">Notifications appear after checkout.</p>}</div><div><h2>Event stream</h2>{(analytics?.eventsByType ?? []).slice(0, 8).map(event => <div className="data-row" key={event.event_type}><span>{event.event_type}</span><strong>{event.count}</strong></div>)}</div></div></section>;
  }

  const productId = route.startsWith('/product/') ? route.split('/')[2] : null;
  const selectedProduct = products.find(product => product.id === productId);
  const content = route === '/' ? <HomePage /> : route === '/shop' ? <ShopPage /> : route === '/cart' ? <CartPage /> : route === '/checkout' ? <CheckoutPage /> : route === '/account' ? <AccountPage /> : route === '/orders' ? <OrdersPage /> : route === '/wishlist' ? <WishlistPage /> : route === '/system' ? <SystemPage /> : selectedProduct ? <ProductPage product={selectedProduct} /> : <ShopPage />;

  return <div className="app-shell">
    <div className="announcement">Complimentary delivery on orders over £75 <button onClick={() => navigate('/shop')}>Shop now</button></div>
    <header className="site-header">
      <button className="mobile-menu" onClick={() => setMenuOpen(value => !value)} aria-label="Open navigation">{menuOpen ? <X /> : <Menu />}</button>
      <button className="wordmark" onClick={() => navigate('/')}>ATELIER<span>Objects for focus</span></button>
      <nav className={menuOpen ? 'open' : ''} aria-label="Primary navigation"><button className={route === '/' ? 'active' : ''} onClick={() => navigate('/')}>Home</button><button className={route === '/shop' || route.startsWith('/product') ? 'active' : ''} onClick={() => navigate('/shop')}>Shop</button><button className={route === '/orders' ? 'active' : ''} onClick={() => navigate('/orders')}>Orders</button><button className={route === '/system' ? 'active' : ''} onClick={() => navigate('/system')}>Live system</button></nav>
      <div className="header-actions"><button onClick={() => navigate('/shop')} aria-label="Search"><Search /></button><button onClick={() => navigate('/account')} aria-label="Account"><CircleUserRound /></button><button className="cart-button" onClick={() => navigate('/cart')} aria-label={`Shopping bag with ${cartCount} items`}><ShoppingBag /><span>{cartCount}</span></button></div>
    </header>
    <main>{content}</main>
    {message && <div className="toast" role="status" aria-live="polite"><span>{message}</span><button onClick={() => setMessage('')} aria-label="Dismiss message"><X size={16} /></button></div>}
    <footer className="site-footer"><div className="footer-lead"><span className="footer-wordmark">ATELIER</span><h2>Thoughtful technology.<br />Quieter spaces.</h2></div><div className="footer-links"><div><strong>Shop</strong><button onClick={() => navigate('/shop')}>All products</button><button onClick={() => { setCategory('Workspace'); navigate('/shop'); }}>Workspace</button><button onClick={() => { setCategory('Audio'); navigate('/shop'); }}>Audio</button></div><div><strong>Help</strong><button>Delivery & returns</button><button>Product care</button><button>Contact</button></div><div><strong>Account</strong><button onClick={() => navigate('/account')}>Profile</button><button onClick={() => navigate('/orders')}>Orders</button><button onClick={() => navigate('/system')}>Live system</button></div></div><div className="footer-bottom"><span>© 2026 Atelier Objects</span><span>Portfolio demo · No real payments</span><span>London, UK</span></div></footer>
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
