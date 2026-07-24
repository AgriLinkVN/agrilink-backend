import type { User } from '@database/entities/user.entity';

export const USER_MANAGER_PORT = Symbol('USER_MANAGER_PORT');

export interface IUserManagerPort {
  findByEmail(email: string): Promise<User | null>;
  findByFirebaseUid(uid: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(userData: Partial<User>): Promise<User>;
  updateInternal(id: string, updateData: Partial<User>): Promise<void>;
}
