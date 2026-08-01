export class MoneyValidationError extends Error {}
export class QuantityValidationError extends Error {}

export class MoneyVnd {
  private constructor(readonly value: bigint) {}

  static parse(input: string): MoneyVnd {
    if (!/^(0|[1-9]\d*)$/.test(input)) {
      throw new MoneyValidationError(
        'VND amount must be a non-negative integer decimal string',
      );
    }
    return new MoneyVnd(BigInt(input));
  }

  add(other: MoneyVnd): MoneyVnd {
    return new MoneyVnd(this.value + other.value);
  }

  subtract(other: MoneyVnd): MoneyVnd {
    if (other.value > this.value) {
      throw new MoneyValidationError('VND amount cannot become negative');
    }
    return new MoneyVnd(this.value - other.value);
  }

  multiply(quantity: Quantity): MoneyVnd {
    const scaled = this.value * quantity.thousandths;
    if (scaled % 1000n !== 0n) {
      throw new MoneyValidationError(
        'Quantity and unit price produce a fractional VND amount',
      );
    }
    return new MoneyVnd(scaled / 1000n);
  }

  toString(): string {
    return this.value.toString();
  }
}

export class Quantity {
  private constructor(readonly thousandths: bigint) {}

  static parse(input: string): Quantity {
    if (!/^(0|[1-9]\d*)(\.\d{1,3})?$/.test(input)) {
      throw new QuantityValidationError(
        'Quantity must be a positive decimal with at most three decimal places',
      );
    }
    const [whole, fraction = ''] = input.split('.');
    const thousandths = BigInt(`${whole}${fraction.padEnd(3, '0')}`);
    if (thousandths <= 0n) {
      throw new QuantityValidationError('Quantity must be greater than zero');
    }
    return new Quantity(thousandths);
  }

  toString(): string {
    const whole = this.thousandths / 1000n;
    const fraction = (this.thousandths % 1000n)
      .toString()
      .padStart(3, '0')
      .replace(/0+$/, '');
    return fraction ? `${whole}.${fraction}` : whole.toString();
  }
}
