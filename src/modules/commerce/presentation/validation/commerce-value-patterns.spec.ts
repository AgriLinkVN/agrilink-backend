import {
  POSITIVE_INTEGER_MONEY_PATTERN,
  POSITIVE_QUANTITY_PATTERN,
} from './commerce-value-patterns';

describe('Commerce presentation value patterns', () => {
  it.each([
    ['0', false],
    ['0.0', false],
    ['0.00', false],
    ['0.000', false],
    ['0.001', true],
    ['1', true],
    ['1.234', true],
    ['1.2345', false],
    ['-1', false],
    ['1e3', false],
    [' 1', false],
    ['1 ', false],
  ])('validates quantity %s as %s', (value, expected) => {
    expect(POSITIVE_QUANTITY_PATTERN.test(value)).toBe(expected);
  });

  it.each([
    ['0', false],
    ['-1', false],
    ['0.5', false],
    ['1e3', false],
    ['10000', true],
  ])('validates positive integer money %s as %s', (value, expected) => {
    expect(POSITIVE_INTEGER_MONEY_PATTERN.test(value)).toBe(expected);
  });
});
