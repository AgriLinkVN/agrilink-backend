import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function ExactlyOneOf(
  properties: readonly string[],
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyKey) => {
    registerDecorator({
      name: 'exactlyOneOf',
      target: target.constructor,
      propertyName: propertyKey.toString(),
      constraints: [properties],
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments): boolean {
          const [propertyNames] = args.constraints as [readonly string[]];
          const object = args.object as Record<string, unknown>;
          return (
            propertyNames.filter((property) => {
              const value = object[property];
              return (
                value !== undefined &&
                value !== null &&
                (typeof value !== 'string' || value.trim().length > 0)
              );
            }).length === 1
          );
        },
        defaultMessage(args: ValidationArguments): string {
          const [propertyNames] = args.constraints as [readonly string[]];
          return `Exactly one of ${propertyNames.join(' or ')} must be provided`;
        },
      },
    });
  };
}
