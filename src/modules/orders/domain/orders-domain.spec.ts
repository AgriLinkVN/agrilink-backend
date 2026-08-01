import { MoneyVnd, Quantity } from './commerce-values';
import { Order } from './order';
import { OrderItem } from './order-item';
import { OrderActor, OrderStatus } from './order-status';

const money = (value: string) => MoneyVnd.parse(value);

describe('Orders domain', () => {
  it.each(['0', '1', '9007199254740993123456789'])(
    'preserves valid VND integer %s',
    (value) => expect(money(value).toString()).toBe(value),
  );

  it.each(['-1', '1.5', '1e3', ' 1', '1 ', 'NaN', 'Infinity'])(
    'rejects invalid VND input %s',
    (value) => expect(() => money(value)).toThrow(),
  );

  it('adds, subtracts and multiplies without floating point', () => {
    expect(money('100').add(money('25')).subtract(money('5')).toString()).toBe('120');
    expect(money('200').multiply(Quantity.parse('1.125')).toString()).toBe('225');
    expect(() => money('1').multiply(Quantity.parse('1.5'))).toThrow();
  });

  it.each(['1', '1.1', '1.12', '1.123'])(
    'round-trips quantity %s',
    (value) => expect(Quantity.parse(value).toString()).toBe(value),
  );

  it.each(['0', '-1', '1.1234', ' 1', '1e2'])(
    'rejects invalid quantity %s',
    (value) => expect(() => Quantity.parse(value)).toThrow(),
  );

  it('protects line and order totals', () => {
    expect(new OrderItem('p', 'Rice', Quantity.parse('2'), money('10')).lineTotal.toString()).toBe('20');
    expect(() => new OrderItem('p', 'Rice', Quantity.parse('2'), money('10'), money('21'))).toThrow();
    expect(() => Order.fromValues('b', 's', money('20'), money('2'), money('1'), money('24'))).toThrow();
  });

  it.each<[OrderStatus, OrderStatus, OrderActor]>([
    ['pending', 'confirmed', 'seller'], ['pending', 'cancelled', 'buyer'],
    ['confirmed', 'preparing', 'seller'], ['preparing', 'handed_to_logistics', 'seller'],
    ['handed_to_logistics', 'shipping', 'logistics'], ['shipping', 'delivered', 'logistics'],
  ])('allows %s -> %s for %s', (from, to, actor) => {
    const order = Order.fromValues('b', 's', money('1'), money('0'), money('0'), money('1'), from);
    order.transition(to, actor);
    expect(order.status).toBe(to);
  });

  it('rejects invalid, unauthorized and terminal transitions', () => {
    const pending = Order.fromValues('b', 's', money('1'), money('0'), money('0'), money('1'));
    expect(() => pending.transition('confirmed', 'buyer')).toThrow();
    const delivered = Order.fromValues('b', 's', money('1'), money('0'), money('0'), money('1'), 'delivered');
    expect(() => delivered.transition('cancelled', 'admin')).toThrow();
  });
});
