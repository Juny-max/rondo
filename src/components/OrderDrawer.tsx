import { Minus, Plus, ShoppingBag, Trash2, X, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { BOX_SIZES, DRIZZLE_OPTIONS, TOPPING_OPTIONS, getFlavorById } from '../data/donuts';
import {
  CartItem,
  CheckoutForm,
  FulfillmentMode,
  calculateOrderTotal,
  formatCurrency,
  validateCheckoutForm,
} from '../utils/cart';

interface OrderDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (key: string, delta: number) => void;
  onClearCart: () => void;
  onJumpToConfigurator: () => void;
}

interface ConfirmedReceipt {
  orderNumber: string;
  customerName: string;
  mode: FulfillmentMode;
  total: number;
  itemCount: number;
}

export function OrderDrawer({
  isOpen,
  items,
  onClose,
  onUpdateQuantity,
  onClearCart,
  onJumpToConfigurator,
}: OrderDrawerProps) {
  const [mode, setMode] = useState<FulfillmentMode>('pickup');
  const [form, setForm] = useState<CheckoutForm>({
    customerName: '',
    phone: '',
    address: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutForm, string>>>({});
  const [receipt, setReceipt] = useState<ConfirmedReceipt | null>(null);

  if (!isOpen) return null;

  const summary = calculateOrderTotal(items, mode);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateCheckoutForm(form, mode);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    const orderNum = `RN-${Math.floor(1000 + Math.random() * 8999)}`;
    setReceipt({
      orderNumber: orderNum,
      customerName: form.customerName.trim(),
      mode,
      total: summary.total,
      itemCount: summary.totalCount,
    });
    onClearCart();
  };

  const handleStartNew = () => {
    setReceipt(null);
    setForm({ customerName: '', phone: '', address: '', notes: '' });
    setErrors({});
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-drawer-title"
    >
      <div
        className="fixed inset-0 bg-black/65"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="relative z-10 w-full max-w-md bg-[#181412] text-[#F9F7F2] h-full flex flex-col border-l border-white/10 shadow-2xl">
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <h2 id="order-drawer-title" className="font-display font-bold text-xl tracking-tight">
            Your Pastry Box
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close order box drawer"
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {receipt ? (
            <div className="py-8 space-y-5" data-testid="order-confirmation">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-mono-tabular text-emerald-300">
                  Order #{receipt.orderNumber} Confirmed
                </p>
                <h3 className="font-display font-bold text-2xl">
                  Fresh batch reserved for {receipt.customerName}
                </h3>
                <p className="text-sm text-white/75 leading-relaxed">
                  {receipt.mode === 'pickup'
                    ? 'Your warm brioche box will be ready at our Osu, Accra counter in 20 minutes.'
                    : 'Our local Accra courier will pick up your fresh box once glazed and deliver within 40 minutes.'}
                </p>
              </div>
              <div className="border-t border-b border-white/10 py-4 flex items-center justify-between text-sm">
                <span className="text-white/70">Total Paid ({receipt.itemCount} items)</span>
                <span className="font-mono-tabular font-semibold text-base">
                  {formatCurrency(receipt.total)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleStartNew}
                className="w-full py-3 px-5 rounded-lg bg-white text-[#141413] font-semibold text-sm hover:bg-white/90 transition-colors cursor-pointer"
              >
                Back to Bakery
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-14 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 mx-auto flex items-center justify-center text-white/60">
                <ShoppingBag className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="space-y-1.5">
                <p className="font-display font-bold text-lg">Your pastry box is empty</p>
                <p className="text-sm text-white/65 max-w-xs mx-auto">
                  Spin up a custom 3D glaze or select a tasting box in the builder.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onJumpToConfigurator();
                }}
                className="px-5 py-2.5 rounded-lg bg-white text-[#141413] text-sm font-semibold hover:bg-white/90 transition-colors cursor-pointer"
              >
                Build Your Box
              </button>
            </div>
          ) : (
            <>
              {/* Fulfillment Mode */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setMode('pickup')}
                  className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    mode === 'pickup'
                      ? 'bg-white text-[#141413]'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Bakery Pickup (Free)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('delivery')}
                  className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    mode === 'delivery'
                      ? 'bg-white text-[#141413]'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Local Courier ($4.50)
                </button>
              </div>

              {/* Cart Items */}
              <ul className="divide-y divide-white/10" data-testid="cart-items-list">
                {items.map((item) => {
                  const flavor = getFlavorById(item.flavorId);
                  const box = BOX_SIZES.find((b) => b.id === item.boxSize);
                  const drizzle = DRIZZLE_OPTIONS.find((d) => d.id === item.drizzle);
                  const topping = TOPPING_OPTIONS.find((t) => t.id === item.topping);

                  return (
                    <li key={item.key} className="py-4 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className="w-8 h-8 rounded-full shrink-0 mt-0.5 border border-white/20"
                          style={{ backgroundColor: flavor.glazeHex }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 space-y-1">
                          <p className="font-semibold text-sm text-white truncate">
                            {flavor.name}
                          </p>
                          <p className="text-xs text-white/60">
                            {box?.label} · {drizzle?.label}
                            {topping && topping.id !== 'none' ? ` · ${topping.label}` : ''}
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.key, -1)}
                              aria-label={`Decrease quantity of ${flavor.name}`}
                              className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                            <span className="font-mono-tabular text-xs w-5 text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.key, 1)}
                              aria-label={`Increase quantity of ${flavor.name}`}
                              className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.key, -item.quantity)}
                              aria-label={`Remove ${flavor.name}`}
                              className="ml-1 p-1.5 text-white/45 hover:text-rose-300 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <span className="font-mono-tabular text-sm font-semibold shrink-0">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* Totals */}
              <div className="border-t border-white/10 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-white/70">
                  <span>Subtotal</span>
                  <span className="font-mono-tabular">{formatCurrency(summary.subtotal)}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>
                    {mode === 'pickup'
                      ? 'Bakery Counter Pickup'
                      : summary.deliveryFee === 0
                        ? 'Courier Delivery (Free $35+)'
                        : 'Courier Delivery'}
                  </span>
                  <span className="font-mono-tabular">
                    {summary.deliveryFee === 0 ? 'Free' : formatCurrency(summary.deliveryFee)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-white/10">
                  <span>Total</span>
                  <span className="font-mono-tabular">{formatCurrency(summary.total)}</span>
                </div>
              </div>

              {/* Checkout Form */}
              <form onSubmit={handleSubmit} noValidate className="space-y-3.5 pt-2">
                <div>
                  <label htmlFor="checkout-name" className="block text-xs font-medium text-white/75 mb-1">
                    Full Name
                  </label>
                  <input
                    id="checkout-name"
                    type="text"
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    placeholder="Kwame Mensah"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white"
                  />
                  {errors.customerName && (
                    <p className="mt-1 text-xs text-rose-300" role="alert">
                      {errors.customerName}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="checkout-phone" className="block text-xs font-medium text-white/75 mb-1">
                    Phone Number
                  </label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+233 24 555 0192"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-rose-300" role="alert">
                      {errors.phone}
                    </p>
                  )}
                </div>

                {mode === 'delivery' && (
                  <div>
                    <label htmlFor="checkout-address" className="block text-xs font-medium text-white/75 mb-1">
                      Delivery Street Address
                    </label>
                    <input
                      id="checkout-address"
                      type="text"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="Oxford St, Osu · Accra, Ghana"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white"
                    />
                    {errors.address && (
                      <p className="mt-1 text-xs text-rose-300" role="alert">
                        {errors.address}
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  data-testid="submit-order-button"
                  className="w-full py-3.5 px-5 rounded-lg bg-[#EA580C] hover:bg-[#DC4E07] text-white font-semibold text-sm transition-colors cursor-pointer min-h-[44px]"
                >
                  Place Fresh Batch Order · {formatCurrency(summary.total)}
                </button>
              </form>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
