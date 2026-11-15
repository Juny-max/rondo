import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addCartItem,
  calculateOrderTotal,
  computeConfiguredUnitPrice,
  formatCurrency,
  updateCartQuantity,
  validateCheckoutForm,
} from './cart';

test('computeConfiguredUnitPrice accounts for box sizes and toppings', () => {
  assert.equal(computeConfiguredUnitPrice('valrhona', 'none', 'single'), 5.5);
  assert.equal(computeConfiguredUnitPrice('sesame', 'gold', 'single'), 8);
  assert.equal(computeConfiguredUnitPrice('valrhona', 'none', 'half'), 29);
  assert.equal(computeConfiguredUnitPrice('valrhona', 'sprinkles', 'half'), 30);
});

test('addCartItem merges matching configurations and increments quantity', () => {
  let cart = addCartItem([], {
    flavorId: 'valrhona',
    drizzle: 'ribbon',
    topping: 'none',
    boxSize: 'single',
  });
  cart = addCartItem(cart, {
    flavorId: 'valrhona',
    drizzle: 'ribbon',
    topping: 'none',
    boxSize: 'single',
  });
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 2);

  cart = updateCartQuantity(cart, cart[0].key, -2);
  assert.equal(cart.length, 0);
});

test('calculateOrderTotal applies free delivery at $35+ and $0 on pickup', () => {
  const singleBox = addCartItem([], {
    flavorId: 'valrhona',
    drizzle: 'ribbon',
    topping: 'none',
    boxSize: 'half',
  });
  const deliveryUnder35 = calculateOrderTotal(singleBox, 'delivery');
  assert.equal(deliveryUnder35.subtotal, 29);
  assert.equal(deliveryUnder35.deliveryFee, 4.5);
  assert.equal(deliveryUnder35.total, 33.5);

  const pickupOrder = calculateOrderTotal(singleBox, 'pickup');
  assert.equal(pickupOrder.deliveryFee, 0);
  assert.equal(pickupOrder.total, 29);

  const dozenBox = addCartItem([], {
    flavorId: 'strawberry',
    drizzle: 'none',
    topping: 'sprinkles',
    boxSize: 'dozen',
  });
  const freeDelivery = calculateOrderTotal(dozenBox, 'delivery');
  assert.equal(freeDelivery.deliveryFee, 0);
  assert.equal(formatCurrency(freeDelivery.total), '$55.75');
});

test('validateCheckoutForm enforces required fields without silent bypass', () => {
  const bad = validateCheckoutForm(
    { customerName: '', phone: '123', address: '', notes: '' },
    'delivery',
  );
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.customerName);
  assert.ok(bad.errors.phone);
  assert.ok(bad.errors.address);

  const okPickup = validateCheckoutForm(
    { customerName: 'Maya Lin', phone: '415-555-0192', address: '', notes: '' },
    'pickup',
  );
  assert.equal(okPickup.valid, true);
});
