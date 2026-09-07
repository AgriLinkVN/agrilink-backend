import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';

async function validateLogin(payload: Record<string, unknown>) {
  return validate(plainToInstance(LoginDto, payload));
}

describe('LoginDto', () => {
  it('accepts email only', async () => {
    await expect(
      validateLogin({
        email: 'user@example.com',
        password: 'Str0ngP@ss!',
      }),
    ).resolves.toHaveLength(0);
  });

  it('accepts phone only', async () => {
    await expect(
      validateLogin({
        phone: '0901-234-567',
        password: 'Str0ngP@ss!',
      }),
    ).resolves.toHaveLength(0);
  });

  it('rejects a request without an identifier', async () => {
    const errors = await validateLogin({ password: 'Str0ngP@ss!' });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          constraints: expect.objectContaining({
            exactlyOneOf:
              'Exactly one of email or phone must be provided',
          }),
        }),
      ]),
    );
  });

  it('rejects a request with both identifiers', async () => {
    const errors = await validateLogin({
      email: 'user@example.com',
      phone: '+84901234567',
      password: 'Str0ngP@ss!',
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          constraints: expect.objectContaining({
            exactlyOneOf:
              'Exactly one of email or phone must be provided',
          }),
        }),
      ]),
    );
  });

  it('rejects an invalid email', async () => {
    const errors = await validateLogin({
      email: 'not-an-email',
      password: 'Str0ngP@ss!',
    });
    expect(errors.some(({ property }) => property === 'email')).toBe(true);
  });

  it('rejects an invalid phone', async () => {
    const errors = await validateLogin({
      phone: '0123',
      password: 'Str0ngP@ss!',
    });
    expect(errors.some(({ property }) => property === 'phone')).toBe(true);
  });

  it('rejects a short password', async () => {
    const errors = await validateLogin({
      email: 'user@example.com',
      password: 'short',
    });
    expect(errors.some(({ property }) => property === 'password')).toBe(true);
  });
});
