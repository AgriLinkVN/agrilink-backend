import { MoneyVnd } from '../../commerce/domain/commerce-values';
import { Payment } from './payment';

const money = (value: string) => MoneyVnd.parse(value);

describe('Payment domain', () => {
  it('requires the canonical order total', () => {
    expect(() => new Payment('o', money('10'), 'manual', money('11'))).toThrow();
  });

  it('marks payment paid once for seller or admin', () => {
    const payment = new Payment('o', money('100'), 'manual');
    payment.markPaid('seller');
    expect(payment.status).toBe('paid');
    expect(() => payment.markPaid('admin')).toThrow();
  });

  it('supports partial then full admin refunds', () => {
    const payment = new Payment('o', money('100'), 'bank_transfer');
    payment.markPaid('admin');
    payment.refund(money('40'), 'admin');
    expect(payment.status).toBe('partially_refunded');
    payment.refund(money('60'), 'admin');
    expect(payment.status).toBe('refunded');
    expect(payment.refundedAmount.toString()).toBe('100');
  });

  it('rejects unpaid, unauthorized, zero and excessive refunds', () => {
    const payment = new Payment('o', money('100'), 'manual');
    expect(() => payment.refund(money('1'), 'admin')).toThrow();
    payment.markPaid('seller');
    expect(() => payment.refund(money('1'), 'seller')).toThrow();
    expect(() => payment.refund(money('0'), 'admin')).toThrow();
    expect(() => payment.refund(money('101'), 'admin')).toThrow();
  });
});
