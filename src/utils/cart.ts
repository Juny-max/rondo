import {
  BOX_SIZES,
  BoxSizeId,
  DrizzleStyle,
  TOPPING_OPTIONS,
  ToppingStyle,
  getFlavorById,
} from '../data/donuts';

export interface CartItem {
  key: string;
  flavorId: string;
  drizzle: DrizzleStyle;
  topping: ToppingStyle;
  boxSize: BoxSizeId;
  unitPrice: number;
  quantity: number;
}

export type FulfillmentMode = 'pickup' | 'delivery';

export interface CheckoutForm {
  customerName: string;
  phone: string;
  address: string;
  notes: string;
}

export interface CheckoutValidation {
  valid: boolean;
  errors: Partial<Record<keyof CheckoutForm, string>>;
}

export function computeConfiguredUnitPrice(
  flavorId: string,
  topping: ToppingStyle,
  boxSize: BoxSizeId,
): number {
  const flavor = getFlavorById(flavorId);
  const toppingObj = TOPPING_OPTIONS.find((t) => t.id === topping) ?? TOPPING_OPTIONS[0];
  const boxObj = BOX_SIZES.find((b) => b.id === boxSize) ?? BOX_SIZES[0];

  if (boxObj.id === 'single') {
    return Number((flavor.unitPrice + toppingObj.priceDelta).toFixed(2));
  }

  // Multi-donut box applies a modest artisan topping surcharge scaled cleanly per box
  const boxToppingDelta = toppingObj.priceDelta * (boxObj.count === 6 ? 2 : 3.5);
  return Number((boxObj.price + boxToppingDelta).toFixed(2));
}

export function buildCartKey(
  flavorId: string,
  drizzle: DrizzleStyle,
  topping: ToppingStyle,
  boxSize: BoxSizeId,
): string {
  return `${flavorId}__${drizzle}__${topping}__${boxSize}`;
}

export function addCartItem(
  items: CartItem[],
  config: {
    flavorId: string;
    drizzle: DrizzleStyle;
    topping: ToppingStyle;
    boxSize: BoxSizeId;
  },
): CartItem[] {
  const key = buildCartKey(config.flavorId, config.drizzle, config.topping, config.boxSize);
  const unitPrice = computeConfiguredUnitPrice(config.flavorId, config.topping, config.boxSize);
  const existing = items.find((item) => item.key === key);

  if (existing) {
    return items.map((item) =>
      item.key === key ? { ...item, quantity: item.quantity + 1 } : item,
    );
  }

  return [
    ...items,
    {
      key,
      flavorId: config.flavorId,
      drizzle: config.drizzle,
      topping: config.topping,
      boxSize: config.boxSize,
      unitPrice,
      quantity: 1,
    },
  ];
}

export function updateCartQuantity(
  items: CartItem[],
  key: string,
  delta: number,
): CartItem[] {
  return items
    .map((item) =>
      item.key === key ? { ...item, quantity: item.quantity + delta } : item,
    )
    .filter((item) => item.quantity > 0);
}

export function calculateSubtotal(items: CartItem[]): number {
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return Number(total.toFixed(2));
}

export function calculateDeliveryFee(subtotal: number, mode: FulfillmentMode): number {
  if (mode === 'pickup' || subtotal === 0) return 0;
  return subtotal >= 35 ? 0 : 4.5;
}

export function calculateOrderTotal(
  items: CartItem[],
  mode: FulfillmentMode,
): { subtotal: number; deliveryFee: number; total: number; totalCount: number } {
  const subtotal = calculateSubtotal(items);
  const deliveryFee = calculateDeliveryFee(subtotal, mode);
  const total = Number((subtotal + deliveryFee).toFixed(2));
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return { subtotal, deliveryFee, total, totalCount };
}

export function validateCheckoutForm(
  form: CheckoutForm,
  mode: FulfillmentMode,
): CheckoutValidation {
  const errors: Partial<Record<keyof CheckoutForm, string>> = {};

  if (!form.customerName.trim() || form.customerName.trim().length < 2) {
    errors.customerName = 'Enter your name for the bakery pickup ticket.';
  }

  const digits = form.phone.replace(/\D/g, '');
  if (digits.length < 7) {
    errors.phone = 'Enter a valid phone number for batch updates.';
  }

  if (mode === 'delivery' && form.address.trim().length < 6) {
    errors.address = 'Enter a street address for courier delivery.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
