import { MoneyVnd, Quantity } from '../../orders/domain/commerce-values';
import { Contract } from './contract';
import { PurchaseRequest } from './purchase-request';

describe('Contracts domain', () => {
  it('allocates only open requests within the approved quantity', () => {
    const request = new PurchaseRequest('buyer', Quantity.parse('10'));
    request.allocate(Quantity.parse('4.5'));
    request.allocate(Quantity.parse('5.5'));
    expect(() => request.allocate(Quantity.parse('0.1'))).toThrow();
    request.close();
    expect(request.status).toBe('closed');
    expect(() => request.allocate(Quantity.parse('1'))).toThrow();
    expect(() => request.cancel()).toThrow();
  });

  it('protects contract terms and requires both signatures for activation', () => {
    expect(() => new Contract('same', 'same', Quantity.parse('1'), MoneyVnd.parse('10'), MoneyVnd.parse('10'))).toThrow();
    const contract = new Contract('buyer', 'seller', Quantity.parse('2'), MoneyVnd.parse('10'), MoneyVnd.parse('20'));
    contract.transition('negotiating');
    contract.transition('pending_signature');
    expect(() => contract.transition('active')).toThrow();
    contract.sign('buyer');
    contract.sign('buyer');
    expect(() => contract.sign('stranger')).toThrow();
    expect(() => contract.transition('active')).toThrow();
    contract.sign('seller');
    contract.transition('active');
    contract.transition('completed');
    expect(contract.status).toBe('completed');
    expect(() => contract.transition('cancelled')).toThrow();
  });

  it('rejects invalid totals and transitions', () => {
    expect(() => new Contract('b', 's', Quantity.parse('2'), MoneyVnd.parse('10'), MoneyVnd.parse('21'))).toThrow();
    const contract = new Contract('b', 's', Quantity.parse('1'), MoneyVnd.parse('10'), MoneyVnd.parse('10'));
    expect(() => contract.transition('active')).toThrow();
  });
});
