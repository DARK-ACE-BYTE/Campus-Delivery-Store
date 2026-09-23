import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  FilePenLine,
  LoaderCircle,
  LogOut,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import {
  getGetDashboardSummaryQueryKey,
  getListOrdersQueryKey,
  getListProductsQueryKey,
  useCreateOrder,
  useCreateProduct,
  useDeleteProduct,
  useGetDashboardSummary,
  useHealthCheck,
  useListOrders,
  useListProducts,
  useUpdateOrderStatus,
  useUpdateProduct,
} from '@workspace/api-client-react';
import type {
  DashboardSummary,
  Order,
  OrderItem,
  Product,
  ProductInput,
} from '@workspace/api-client-react';
import { Route, Switch, Link, Router as WouterRouter, useLocation, Redirect } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import './index.css';

const queryClient = new QueryClient();
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/favicon.svg`,
  },
  variables: {
    colorPrimary: '#0f766e',
    colorForeground: '#233436',
    colorMutedForeground: '#68797a',
    colorDanger: '#b42318',
    colorBackground: '#fbfaf6',
    colorInput: '#ffffff',
  },
  elements: {
    cardBox: 'w-[440px] max-w-full rounded-[2rem] border border-border bg-background p-2 shadow-2xl',
    card: '!bg-transparent !shadow-none',
    footer: '!border-0 !bg-transparent',
    headerTitle: 'text-2xl font-bold tracking-tight',
    headerSubtitle: 'text-sm text-muted-foreground',
    formFieldLabel: 'text-xs font-bold',
    formFieldInput: 'h-12 rounded-xl border border-input bg-card text-sm',
    formButtonPrimary: 'h-12 rounded-xl bg-primary text-sm font-bold',
    socialButtonsBlockButton: 'h-12 rounded-xl border border-border bg-card text-sm font-bold',
    footerActionLink: 'font-bold text-primary',
  },
};
const money = (_amount: number | null | undefined) => '—';
const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(
    new Date(value),
  );

function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3" data-testid="link-brand">
      <span className={`grid size-10 place-items-center rounded-2xl ${dark ? 'bg-accent text-foreground' : 'bg-primary text-primary-foreground'}`}>
        <Truck size={21} strokeWidth={2.4} />
      </span>
      <span className="leading-none">
        <span className={`block text-[10px] font-bold uppercase tracking-[.22em] ${dark ? 'text-accent' : 'text-primary'}`}>Campus</span>
        <span className={`block text-lg font-bold tracking-tight ${dark ? 'text-sidebar-foreground' : 'text-foreground'}`}>Delivery</span>
      </span>
    </Link>
  );
}

function CatalogSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="animate-pulse overflow-hidden rounded-[1.4rem] border border-border bg-card">
          <div className="h-40 bg-muted" />
          <div className="space-y-3 p-4"><div className="h-4 w-2/3 rounded bg-muted" /><div className="h-3 w-full rounded bg-muted" /><div className="h-9 rounded-xl bg-muted" /></div>
        </div>
      ))}
    </div>
  );
}

function EmptyCatalog({ search }: { search: string }) {
  return (
    <div className="col-span-full flex min-h-64 flex-col items-center justify-center rounded-[1.6rem] border border-dashed border-border bg-card px-6 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground"><Search size={24} /></span>
      <h3 className="text-lg font-bold">{search ? 'Nothing matches that search' : 'No products are available yet'}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{search ? 'Try another name or browse a different category.' : 'We are stocking more everyday essentials soon.'}</p>
    </div>
  );
}

function ProductCard({ product, quantity, onAdd, onChange }: {
  product: Product;
  quantity: number;
  onAdd: () => void;
  onChange: (next: number) => void;
}) {
  const visual = product.emoji || product.name.slice(0, 1).toUpperCase();
  return (
    <article className="group rise-in overflow-hidden rounded-[1.4rem] border border-border bg-card shadow-[0_8px_30px_rgba(35,52,54,.04)] transition-transform duration-300 hover:-translate-y-1" data-testid={`card-product-${product.id}`}>
      <div className="relative grid h-40 place-items-center overflow-hidden bg-secondary/10">
        <div className="absolute -right-6 -top-9 size-28 rounded-full bg-accent/40 transition-transform duration-500 group-hover:scale-125" />
        <div className="absolute -bottom-12 -left-4 size-24 rounded-full bg-primary/10" />
        <span className="relative select-none text-6xl leading-none drop-shadow-sm" aria-label={`${product.name} product image`} data-testid={`img-product-${product.id}`}>{visual}</span>
        {!product.available && <span className="absolute left-3 top-3 rounded-full bg-foreground/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-background">Sold out</span>}
      </div>
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">{product.category}</p><h3 className="mt-1 font-bold leading-tight">{product.name}</h3></div>
        </div>
        <p className="mb-4 line-clamp-2 min-h-10 text-xs leading-relaxed text-muted-foreground">{product.description}</p>
        {quantity > 0 ? (
          <div className="flex h-10 items-center justify-between rounded-xl bg-secondary px-2 text-secondary-foreground">
            <button className="grid size-8 place-items-center rounded-lg transition hover:bg-secondary-foreground/10" onClick={() => onChange(quantity - 1)} data-testid={`button-decrease-${product.id}`} aria-label={`Remove one ${product.name}`}><Minus size={15} /></button>
            <span className="font-mono text-sm font-bold" data-testid={`text-quantity-${product.id}`}>{quantity}</span>
            <button className="grid size-8 place-items-center rounded-lg transition hover:bg-secondary-foreground/10" onClick={() => onChange(quantity + 1)} data-testid={`button-increase-${product.id}`} aria-label={`Add one ${product.name}`}><Plus size={15} /></button>
          </div>
        ) : (
          <button disabled={!product.available} onClick={onAdd} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground" data-testid={`button-add-${product.id}`}>
            <Plus size={16} /> {product.available ? 'Add to basket' : 'Unavailable'}
          </button>
        )}
      </div>
    </article>
  );
}

function CartSheet({ cart, products, onChange, onClose, onClear }: {
  cart: Record<number, number>;
  products: Product[];
  onChange: (id: number, next: number) => void;
  onClose: () => void;
  onClear: () => void;
}) {
  const items = products.filter((product) => cart[product.id]);
  const [details, setDetails] = useState({ studentName: '', phone: '', hostel: '' });
  const createOrder = useCreateOrder();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const checkout = (event: FormEvent) => {
    event.preventDefault();
    if (!details.studentName || !details.phone || !details.hostel || items.length === 0) {
      setError('Add your name, phone, and hostel to continue.');
      return;
    }
    setError('');
    const orderItems: OrderItem[] = items.map((product) => ({ productId: product.id, name: product.name, quantity: cart[product.id], price: 0 }));
    createOrder.mutate({ data: { ...details, items: orderItems } }, {
      onSuccess: () => {
        const lines = orderItems.map((item) => `${item.quantity} x ${item.name}`).join('\n');
        const message = `Hello Campus Delivery, I just placed an order.\n\nName: ${details.studentName}\nPhone: ${details.phone}\nHostel: ${details.hostel}\n\nRequested items:\n${lines}`;
        setSuccess(true);
        onClear();
        window.open(`https://wa.me/233507479153?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
      },
      onError: () => setError('We could not save the order. Please try again.'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/30 backdrop-blur-[2px]" onMouseDown={onClose}>
      <aside className="flex h-full w-full max-w-md flex-col bg-background shadow-2xl rise-in" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-5">
          <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">Your basket</p><h2 className="mt-1 text-2xl font-bold">Ready when you are.</h2></div>
          <button onClick={onClose} className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground hover:text-foreground" data-testid="button-close-cart"><X size={19} /></button>
        </div>
        {success ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <span className="grid size-16 place-items-center rounded-3xl bg-secondary text-accent"><Check size={28} /></span>
            <h3 className="mt-5 text-2xl font-bold">Order saved.</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">WhatsApp is open with your order details. Send the message to confirm delivery.</p>
            <button onClick={onClose} className="mt-7 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground" data-testid="button-finish-checkout">Back to menu</button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center"><span className="grid size-16 place-items-center rounded-3xl bg-muted text-muted-foreground"><ShoppingBag size={28} /></span><h3 className="mt-5 text-xl font-bold">Your basket is quiet.</h3><p className="mt-2 text-sm text-muted-foreground">Add a few essentials and they will show up here.</p><button onClick={onClose} className="mt-6 rounded-xl bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground" data-testid="button-browse-products">Browse products</button></div>
        ) : (
          <form onSubmit={checkout} className="flex min-h-0 flex-1 flex-col">
            <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-5">
              <div className="space-y-2">
                {items.map((product) => <div key={product.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3" data-testid={`row-cart-${product.id}`}><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary/10 text-2xl">{product.emoji || product.name.slice(0, 1)}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{product.name}</p><p className="text-xs text-muted-foreground">Quantity requested</p></div><div className="flex items-center gap-1 rounded-lg bg-muted p-1"><button type="button" className="grid size-6 place-items-center" onClick={() => onChange(product.id, cart[product.id] - 1)} data-testid={`button-cart-decrease-${product.id}`}><Minus size={13} /></button><span className="w-5 text-center font-mono text-xs">{cart[product.id]}</span><button type="button" className="grid size-6 place-items-center" onClick={() => onChange(product.id, cart[product.id] + 1)} data-testid={`button-cart-increase-${product.id}`}><Plus size={13} /></button></div></div>)}
              </div>
              <div className="border-t border-border pt-4"><p className="mb-3 text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground">Delivery details</p><div className="space-y-2"><input required value={details.studentName} onChange={(e) => setDetails({ ...details, studentName: e.target.value })} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="Your full name" data-testid="input-student-name" /><input required value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="Phone number" data-testid="input-student-phone" /><input required value={details.hostel} onChange={(e) => setDetails({ ...details, hostel: e.target.value })} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="Hostel and room" data-testid="input-student-hostel" /></div></div>
              {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive" data-testid="status-checkout-error">{error}</p>}
            </div>
            <div className="border-t border-border bg-card p-5"><p className="mb-4 text-xs leading-relaxed text-muted-foreground">Prices are confirmed separately after we receive your request.</p><button type="submit" disabled={createOrder.isPending} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground transition hover:brightness-95 disabled:opacity-60" data-testid="button-checkout">{createOrder.isPending ? <><LoaderCircle size={17} className="animate-spin" /> Saving request</> : <>Send request to WhatsApp <ArrowRight size={17} /></>}</button><button type="button" onClick={onClear} className="mt-3 w-full text-xs font-bold text-muted-foreground hover:text-destructive" data-testid="button-clear-cart">Clear basket</button></div>
          </form>
        )}
      </aside>
    </div>
  );
}

function Storefront() {
  const { data: products, isLoading, isError, refetch } = useListProducts();
  const { data: health } = useHealthCheck();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState<Record<number, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const safeProducts = products ?? [];
  const categories = ['All', ...Array.from(new Set(safeProducts.map((product) => product.category)))];
  const filtered = useMemo(() => safeProducts.filter((product) => (category === 'All' || product.category === category) && `${product.name} ${product.description}`.toLowerCase().includes(search.toLowerCase())), [safeProducts, category, search]);
  const cartCount = Object.values(cart).reduce((sum, count) => sum + count, 0);

  const changeCart = (id: number, next: number) => setCart((current) => { const updated = { ...current }; if (next <= 0) delete updated[id]; else updated[id] = next; return updated; });
  return (
    <div className="paper-noise min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl"><div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8"><Brand /><div className="hidden items-center gap-8 md:flex"><span className="text-sm font-medium text-muted-foreground">Delivered across campus</span><Link href="/admin/login" className="text-sm font-bold text-secondary hover:text-primary" data-testid="link-admin-login">Staff access <ArrowRight className="ml-1 inline" size={14} /></Link></div><button onClick={() => setCartOpen(true)} className="relative grid size-11 place-items-center rounded-2xl bg-secondary text-secondary-foreground transition hover:-translate-y-0.5" data-testid="button-open-cart"><ShoppingBag size={19} />{cartCount > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-foreground" data-testid="badge-cart-count">{cartCount}</span>}</button></div></header>
      <main className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
        <section className="relative overflow-hidden py-12 sm:py-20"><div className="absolute -right-20 top-6 size-72 rounded-full bg-accent/40 blur-[1px] drift" /><div className="absolute right-36 top-24 size-36 rounded-full border-[18px] border-primary/10" /><div className="relative max-w-3xl"><div className="rise-in inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-primary"><span className="size-1.5 rounded-full bg-primary" /> Your campus marketplace</div><h1 className="rise-in delay-1 mt-6 max-w-2xl text-[clamp(3rem,8vw,6.8rem)] font-bold leading-[.93] tracking-[-.075em] text-secondary">Good stuff.<br /><span className="text-primary">Right here.</span></h1><p className="rise-in delay-2 mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">From groceries and self-care to gadgets, home supplies, and last-minute hostel essentials, order what you need and we will bring it across campus.</p><div className="rise-in delay-3 mt-8 flex flex-wrap items-center gap-3 text-xs font-bold text-secondary"><span className="rounded-full bg-accent px-3 py-2">Everyday essentials</span><span className="rounded-full bg-secondary/10 px-3 py-2">Fast hostel drop-off</span><span className="rounded-full bg-secondary/10 px-3 py-2">Order on WhatsApp</span></div></div></section>
        <section className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">Shop across campus</p><h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Find what you need.</h2></div><div className="flex w-full max-w-sm items-center gap-2 rounded-2xl border border-input bg-card px-3 py-1.5 shadow-sm"><Search size={18} className="text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Search products" data-testid="input-product-search" /></div></section>
        <div className="scrollbar-thin mb-7 flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${category === item ? 'bg-secondary text-secondary-foreground' : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'}`} data-testid={`button-category-${item.toLowerCase().replace(/\s+/g, '-')}`}>{item}</button>)}</div>
        {isLoading ? <CatalogSkeleton /> : isError ? <div className="flex min-h-64 flex-col items-center justify-center rounded-[1.6rem] border border-destructive/20 bg-destructive/5 text-center"><CircleAlert className="text-destructive" /><h3 className="mt-3 font-bold">The shelf is taking a minute.</h3><p className="mt-1 text-sm text-muted-foreground">We could not load products right now.</p><button onClick={() => refetch()} className="mt-4 rounded-xl bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground" data-testid="button-retry-products">Try again</button></div> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{filtered.length ? filtered.map((product) => <ProductCard key={product.id} product={product} quantity={cart[product.id] || 0} onAdd={() => changeCart(product.id, 1)} onChange={(next) => changeCart(product.id, next)} />) : <EmptyCatalog search={search} />}</div>}
        <section className="mt-16 grid gap-4 rounded-[1.8rem] bg-secondary p-6 text-secondary-foreground sm:grid-cols-[1fr_auto] sm:items-center sm:p-8"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-accent">Need something else?</p><h2 className="mt-2 max-w-lg text-2xl font-bold tracking-tight">Tell us what you need and we will source it.</h2><p className="mt-2 max-w-lg text-sm leading-relaxed text-secondary-foreground/70">We save your order first, then hand you a ready-to-send WhatsApp message with every detail.</p></div><div className="flex items-center gap-2 text-xs font-bold text-accent"><span className="grid size-8 place-items-center rounded-full border border-accent/30"><Check size={15} /></span> Built for campus life</div></section>
        <footer className="flex flex-col gap-3 border-t border-border py-7 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>Campus Delivery · your campus marketplace</span><span className="flex items-center gap-2"><span className={`size-1.5 rounded-full ${health?.status === 'ok' ? 'bg-green-600' : 'bg-accent'}`} /> Service {health?.status === 'ok' ? 'online' : 'ready'}</span></footer>
      </main>
      {cartOpen && <CartSheet cart={cart} products={safeProducts} onChange={changeCart} onClose={() => setCartOpen(false)} onClear={() => setCart({})} />}
    </div>
  );
}

function SignInPage() {
  return (
    <div className="paper-noise flex min-h-[100dvh] items-center justify-center bg-secondary px-4 py-10">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        fallbackRedirectUrl={`${basePath}/admin`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="paper-noise flex min-h-[100dvh] items-center justify-center bg-secondary px-4 py-10">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl={`${basePath}/admin`}
      />
    </div>
  );
}

function AdminLoginRedirect() {
  return <Redirect to="/sign-in" />;
}

function StatCard({ label, value, accent, icon }: { label: string; value: string | number; accent: string; icon: ReactNode }) {
  return <div className={`rounded-2xl border border-border bg-card p-5 ${accent}`}><div className="mb-5 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">{label}</span><span className="text-secondary">{icon}</span></div><strong className="font-mono text-3xl tracking-tight text-secondary">{value}</strong></div>;
}

function ProductEditor({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const [form, setForm] = useState<ProductInput>({ name: product?.name || '', category: product?.category || '', description: product?.description || '', emoji: product?.emoji || '', available: product?.available ?? true });
  const [error, setError] = useState('');
  const save = (event: FormEvent) => { event.preventDefault(); if (!form.name || !form.category || !form.description) { setError('Fill every field with a valid value.'); return; } setError(''); const done = () => onSaved(); if (product) updateProduct.mutate({ id: product.id, data: form }, { onSuccess: done, onError: () => setError('Could not update this product.') }); else createProduct.mutate({ data: form }, { onSuccess: done, onError: () => setError('Could not add this product.') }); };
  const pending = createProduct.isPending || updateProduct.isPending;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 px-4 py-6 backdrop-blur-sm" onMouseDown={onClose}><form onSubmit={save} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-[1.7rem] bg-background p-6 shadow-2xl rise-in sm:p-8"><div className="mb-6 flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">{product ? 'Edit catalog item' : 'New catalog item'}</p><h2 className="mt-2 text-2xl font-bold">{product ? 'Tune the details.' : 'Put it in the catalog.'}</h2></div><button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl bg-muted text-muted-foreground" data-testid="button-close-product-editor"><X size={17} /></button></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold sm:col-span-2">Product name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-normal outline-none focus:border-primary" data-testid="input-product-name" /></label><label className="text-xs font-bold sm:col-span-2">Category<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-normal outline-none focus:border-primary" data-testid="input-product-category" /></label><label className="text-xs font-bold sm:col-span-2">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-2 min-h-20 w-full resize-none rounded-xl border border-input bg-card p-3 text-sm font-normal outline-none focus:border-primary" data-testid="input-product-description" /></label><label className="text-xs font-bold">Product mark<input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-normal outline-none focus:border-primary" placeholder="Optional visual mark" data-testid="input-product-emoji" /></label><label className="flex items-center gap-3 self-end pb-2 text-xs font-bold"><input type="checkbox" checked={Boolean(form.available)} onChange={(e) => setForm({ ...form, available: e.target.checked })} className="size-4 accent-primary" data-testid="input-product-available" /> Available to students</label></div>{error && <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}<div className="mt-7 flex gap-3"><button type="button" onClick={onClose} className="h-11 flex-1 rounded-xl bg-muted text-sm font-bold text-muted-foreground" data-testid="button-cancel-product">Cancel</button><button disabled={pending} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60" data-testid="button-save-product">{pending ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />} {product ? 'Save changes' : 'Add product'}</button></div></form></div>;
}

function OrderRow({ order, onDeliver }: { order: Order; onDeliver: (order: Order) => void }) {
  const [open, setOpen] = useState(false);
  return <div className="border-b border-border last:border-0"><div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-4 sm:grid-cols-[1.15fr_1fr_auto_auto] sm:px-5"><button onClick={() => setOpen(!open)} className="flex min-w-0 items-center gap-3 text-left" data-testid={`button-expand-order-${order.id}`}><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Package size={17} /></span><span className="min-w-0"><span className="block truncate text-sm font-bold">{order.studentName}</span><span className="block truncate text-[11px] text-muted-foreground">Request #{order.id} · {order.hostel}</span></span></button><span className="hidden text-xs text-muted-foreground sm:block">{formatDate(order.createdAt)}</span><span className={`justify-self-end rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${order.status === 'delivered' ? 'bg-secondary/10 text-secondary' : 'bg-accent text-foreground'}`}>{order.status}</span><div className="flex items-center gap-1 justify-self-end"><ChevronDown size={15} className={`ml-1 text-muted-foreground transition ${open ? 'rotate-180' : ''}`} /></div></div>{open && <div className="mx-4 mb-4 rounded-xl bg-muted/60 p-4 sm:mx-5"><div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground"><span>{order.phone}</span><span>{formatDate(order.createdAt)}</span></div><div className="mt-3 space-y-1">{order.items.map((item) => <div key={item.productId} className="text-xs"><span>{item.quantity} × {item.name}</span></div>)}</div>{order.status === 'pending' && <button onClick={() => onDeliver(order)} className="mt-4 flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground" data-testid={`button-deliver-order-${order.id}`}><Check size={14} /> Mark delivered</button>}</div>}</div>;
}

function AdminDashboard() {
  const { signOut } = useClerk();
  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useGetDashboardSummary();
  const { data: orders, isLoading: ordersLoading, isError: ordersError, refetch: refetchOrders } = useListOrders({ query: { refetchInterval: 30000, queryKey: getListOrdersQueryKey() } });
  const { data: products, isLoading: productsLoading, isError: productsError } = useListProducts();
  const updateStatus = useUpdateOrderStatus();
  const deleteProduct = useDeleteProduct();
  const client = useQueryClient();
  const [editor, setEditor] = useState<Product | null | undefined>(undefined);
  const [tab, setTab] = useState<'orders' | 'products'>('orders');
  const [filter, setFilter] = useState<'all' | 'pending' | 'delivered'>('all');
  const safeSummary: DashboardSummary = summary || { totalOrders: 0, pendingOrders: 0, deliveredOrders: 0, totalRevenue: 0, totalProducts: 0 };
  const visibleOrders = (orders || []).filter((order) => filter === 'all' || order.status === filter);
  const logout = () => signOut({ redirectUrl: basePath || '/' });
  const deliver = (order: Order) => updateStatus.mutate({ id: order.id, data: { status: 'delivered' } }, { onSuccess: () => { client.invalidateQueries({ queryKey: getListOrdersQueryKey() }); client.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); } });
  const remove = (product: Product) => { if (window.confirm(`Remove ${product.name} from the shelf?`)) deleteProduct.mutate({ id: product.id }, { onSuccess: () => client.invalidateQueries({ queryKey: getListProductsQueryKey() }) }); };
  return <div className="min-h-[100dvh] bg-background"><aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-sidebar p-6 text-sidebar-foreground lg:flex"><Brand dark /><div className="mt-14"><p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-sidebar-foreground/40">Workspace</p><button onClick={() => setTab('orders')} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${tab === 'orders' ? 'bg-sidebar-foreground/10 text-accent' : 'text-sidebar-foreground/65 hover:text-sidebar-foreground'}`} data-testid="button-admin-orders"><BarChart3 size={18} /> Order pulse</button><button onClick={() => setTab('products')} className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${tab === 'products' ? 'bg-sidebar-foreground/10 text-accent' : 'text-sidebar-foreground/65 hover:text-sidebar-foreground'}`} data-testid="button-admin-products"><Package size={18} /> Product shelf</button></div><div className="mt-auto rounded-2xl border border-sidebar-foreground/10 bg-sidebar-foreground/5 p-4"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-accent">Live service</p><p className="mt-2 text-xs leading-relaxed text-sidebar-foreground/60">Orders refresh every 30 seconds while you work.</p></div><button onClick={logout} className="mt-5 flex items-center gap-2 px-3 text-xs font-bold text-sidebar-foreground/55 hover:text-accent" data-testid="button-admin-logout"><LogOut size={15} /> Sign out</button></aside><div className="lg:pl-64"><header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-xl lg:px-10"><div className="lg:hidden"><Brand /></div><div className="hidden lg:block"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">Operations desk</p><h1 className="mt-1 text-xl font-bold">{tab === 'orders' ? 'Order pulse' : 'Product shelf'}</h1></div><div className="flex items-center gap-3"><span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><span className="size-1.5 rounded-full bg-green-600" /> Live workspace</span><button onClick={logout} className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground hover:text-destructive lg:hidden" data-testid="button-mobile-logout"><LogOut size={17} /></button></div></header><main className="mx-auto max-w-7xl p-5 lg:p-10"><div className="mb-7 flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">Good morning, team</p><h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{tab === 'orders' ? 'Keep the campus moving.' : 'Keep the shelf fresh.'}</h2></div>{tab === 'products' && <button onClick={() => setEditor(null)} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold text-primary-foreground hover:brightness-95" data-testid="button-new-product"><Plus size={16} /> <span className="hidden sm:inline">New product</span></button>}</div><div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">{summaryLoading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />) : summaryError ? <div className="col-span-full rounded-2xl bg-destructive/10 p-4 text-sm text-destructive" data-testid="status-summary-error">Summary is unavailable right now.</div> : <><StatCard label="Total orders" value={safeSummary.totalOrders} accent="border-l-4 border-l-primary" icon={<BarChart3 size={18} />} /><StatCard label="Pending now" value={safeSummary.pendingOrders} accent="border-l-4 border-l-accent" icon={<Clock3 size={18} />} /><StatCard label="Delivered" value={safeSummary.deliveredOrders} accent="border-l-4 border-l-secondary" icon={<Check size={18} />} /><StatCard label="Revenue" value={money(safeSummary.totalRevenue)} accent="border-l-4 border-l-primary" icon={<Activity size={18} />} /></>}</div>{tab === 'orders' ? <section className="overflow-hidden rounded-[1.5rem] border border-border bg-card"><div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><h3 className="font-bold">Recent orders</h3><p className="mt-1 text-xs text-muted-foreground">Tap an order to see its full basket.</p></div><div className="flex items-center gap-1 rounded-xl bg-muted p-1">{(['all', 'pending', 'delivered'] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-lg px-3 py-1.5 text-[10px] font-bold capitalize ${filter === item ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`} data-testid={`button-filter-${item}`}>{item}</button>)}</div></div>{ordersLoading ? <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />)}</div> : ordersError ? <div className="flex flex-col items-center px-5 py-16 text-center"><CircleAlert className="text-destructive" /><p className="mt-3 font-bold">Orders could not load.</p><button onClick={() => refetchOrders()} className="mt-3 text-xs font-bold text-primary" data-testid="button-retry-orders">Try again</button></div> : visibleOrders.length === 0 ? <div className="flex flex-col items-center px-5 py-16 text-center"><span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><Package size={21} /></span><p className="mt-3 font-bold">No {filter === 'all' ? '' : filter} orders yet.</p><p className="mt-1 text-xs text-muted-foreground">New student orders will appear here.</p></div> : visibleOrders.map((order) => <OrderRow key={order.id} order={order} onDeliver={deliver} />)}</section> : <section className="overflow-hidden rounded-[1.5rem] border border-border bg-card"><div className="flex items-center justify-between border-b border-border p-4 sm:px-5"><div><h3 className="font-bold">Shelf inventory</h3><p className="mt-1 text-xs text-muted-foreground">Keep availability and pricing current.</p></div><span className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold text-muted-foreground">{products?.length || 0} items</span></div>{productsLoading ? <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}</div> : productsError ? <div className="p-12 text-center text-sm text-destructive">Products could not load. Refresh to try again.</div> : !products?.length ? <div className="p-12 text-center"><p className="font-bold">The shelf is empty.</p><p className="mt-1 text-xs text-muted-foreground">Add your first product to get started.</p></div> : <div>{products.map((product) => <div key={product.id} className="flex items-center gap-3 border-b border-border px-4 py-4 last:border-0 sm:px-5"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary/10 text-2xl">{product.emoji || product.name.slice(0, 1)}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h4 className="truncate text-sm font-bold">{product.name}</h4><span className={`size-1.5 shrink-0 rounded-full ${product.available ? 'bg-green-600' : 'bg-muted-foreground/40'}`} /></div><p className="mt-1 text-[11px] text-muted-foreground">{product.category} · <span className="font-mono">{money(product.price)}</span></p></div><button onClick={() => setEditor(product)} className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground hover:text-primary" data-testid={`button-edit-product-${product.id}`}><FilePenLine size={16} /></button><button onClick={() => remove(product)} className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground hover:text-destructive" data-testid={`button-delete-product-${product.id}`}><Trash2 size={16} /></button></div>)}</div>}</section>}</main></div>{editor !== undefined && <ProductEditor product={editor} onClose={() => setEditor(undefined)} onSaved={() => { setEditor(undefined); client.invalidateQueries({ queryKey: getListProductsQueryKey() }); client.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); }} />}</div>;
}

function AdminRoute() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-secondary">
        <LoaderCircle className="animate-spin text-accent" size={28} />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Redirect to="/sign-in" />;
  }

  return <AdminDashboard />;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch><Route path="/" component={Storefront} /><Route path="/sign-in/*?" component={SignInPage} /><Route path="/sign-up/*?" component={SignUpPage} /><Route path="/admin/login" component={AdminLoginRedirect} /><Route path="/admin" component={AdminRoute} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: 'Operations sign in',
            subtitle: 'Use your approved staff account to continue',
          },
        },
        signUp: {
          start: {
            title: 'Request staff access',
            subtitle: 'Create an account only if your team has approved it',
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Router />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return <WouterRouter base={basePath}><ClerkProviderWithRoutes /></WouterRouter>;
}

export default App;