import {
  InvalidVietnamesePhoneNumberError,
  normalizeVietnamesePhone,
} from './phone-normalizer';

describe('normalizeVietnamesePhone', () => {
  it.each([
    ['0901234567', '+84901234567'],
    ['84901234567', '+84901234567'],
    ['+84901234567', '+84901234567'],
    ['0901 234 567', '+84901234567'],
    ['0901-234-567', '+84901234567'],
    [' +84 901-234-567 ', '+84901234567'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeVietnamesePhone(input)).toBe(expected);
  });

  it.each([
    '',
    '090123456',
    '09012345678',
    '+84123456789',
    '+8490123456a',
    '+84901234567 ext 1',
    '+12025550123',
  ])('rejects invalid input %s', (input) => {
    expect(() => normalizeVietnamesePhone(input)).toThrow(
      InvalidVietnamesePhoneNumberError,
    );
  });
});
