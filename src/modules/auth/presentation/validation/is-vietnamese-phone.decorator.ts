import {
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { isVietnamesePhoneNumber } from '../../domain/services/phone-normalizer';

export function IsVietnamesePhoneNumber(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyKey) => {
    registerDecorator({
      name: 'isVietnamesePhoneNumber',
      target: target.constructor,
      propertyName: propertyKey.toString(),
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return isVietnamesePhoneNumber(value);
        },
        defaultMessage(): string {
          return 'Phone must be a valid Vietnamese mobile number';
        },
      },
    });
  };
}
