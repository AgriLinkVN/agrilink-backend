import { UserAccount } from '../../domain/models/user-account';

export const USER_IDENTITY_READER = Symbol('USER_IDENTITY_READER');

export interface UserIdentityReader {
  findById(id: string): Promise<UserAccount | null>;
  findByEmail(email: string): Promise<UserAccount | null>;
  findByPhone(phone: string): Promise<UserAccount | null>;
  findByFirebaseUid(firebaseUid: string): Promise<UserAccount | null>;
}
