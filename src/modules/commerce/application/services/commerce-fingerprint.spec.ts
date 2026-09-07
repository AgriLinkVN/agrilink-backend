import { createCommerceFingerprint } from './commerce-fingerprint';

describe('Commerce fingerprint', () => {
  it('is stable across object key order', () => {
    expect(
      createCommerceFingerprint('create-order', 'actor', {
        sellerId: 'seller',
        items: [{ quantity: '1', productId: 'product' }],
      }),
    ).toBe(
      createCommerceFingerprint('create-order', 'actor', {
        items: [{ productId: 'product', quantity: '1' }],
        sellerId: 'seller',
      }),
    );
  });

  it('separates actor, operation and payload', () => {
    const base = createCommerceFingerprint('create-order', 'actor', {
      total: '100',
    });
    expect(
      createCommerceFingerprint('create-order', 'other', { total: '100' }),
    ).not.toBe(base);
    expect(
      createCommerceFingerprint('refund-payment', 'actor', { total: '100' }),
    ).not.toBe(base);
    expect(
      createCommerceFingerprint('create-order', 'actor', { total: '101' }),
    ).not.toBe(base);
  });
});
