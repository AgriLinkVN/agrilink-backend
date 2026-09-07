const VIETNAMESE_MOBILE_SUBSCRIBER = /^[35789]\d{8}$/;
const ALLOWED_PHONE_INPUT = /^[+\d\s-]+$/;

export class InvalidVietnamesePhoneNumberError extends Error {
  constructor() {
    super('Phone must be a valid Vietnamese mobile number');
    this.name = 'InvalidVietnamesePhoneNumberError';
  }
}

export function normalizeVietnamesePhone(phone: string): string {
  if (
    typeof phone !== 'string' ||
    !phone.trim() ||
    !ALLOWED_PHONE_INPUT.test(phone)
  ) {
    throw new InvalidVietnamesePhoneNumberError();
  }

  const compact = phone.replace(/[\s-]/g, '');
  let subscriber: string;

  if (compact.startsWith('+84')) {
    subscriber = compact.slice(3);
  } else if (compact.startsWith('84')) {
    subscriber = compact.slice(2);
  } else if (compact.startsWith('0')) {
    subscriber = compact.slice(1);
  } else {
    throw new InvalidVietnamesePhoneNumberError();
  }

  if (!VIETNAMESE_MOBILE_SUBSCRIBER.test(subscriber)) {
    throw new InvalidVietnamesePhoneNumberError();
  }

  return `+84${subscriber}`;
}

export function isVietnamesePhoneNumber(phone: unknown): phone is string {
  if (typeof phone !== 'string') {
    return false;
  }

  try {
    normalizeVietnamesePhone(phone);
    return true;
  } catch (error) {
    if (error instanceof InvalidVietnamesePhoneNumberError) {
      return false;
    }
    throw error;
  }
}
