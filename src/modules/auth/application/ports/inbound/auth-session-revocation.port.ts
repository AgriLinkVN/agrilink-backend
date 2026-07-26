export const AUTH_SESSION_REVOCATION = Symbol('AUTH_SESSION_REVOCATION');

export interface AuthSessionRevocationPort {
  revokeAllForUser(userId: string): Promise<void>;
}
