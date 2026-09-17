import { UserRole, UserStatus } from '../../../../../common/enums';

export const USER_MANAGER_PORT = Symbol('USER_MANAGER_PORT');

export interface AuthUserAccount {
  id: string;
  phone: string | null;
  firebaseUid: string | null;
  email: string | null;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  fullName: string | null;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAuthUser {
  phone?: string | null;
  firebaseUid?: string | null;
  email: string;
  passwordHash: string;
  role: UserRole;
  status?: UserStatus;
  fullName?: string | null;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  lastLoginAt?: Date | null;
}

export interface UpdateAuthUser {
  phone?: string | null;
  firebaseUid?: string | null;
  email?: string;
  status?: UserStatus;
  fullName?: string | null;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  lastLoginAt?: Date | null;
}

export interface IUserManagerPort {
  findByEmail(email: string): Promise<AuthUserAccount | null>;
  findByPhone(phone: string): Promise<AuthUserAccount | null>;
  findByFirebaseUid(uid: string): Promise<AuthUserAccount | null>;
  findById(id: string): Promise<AuthUserAccount | null>;
  create(userData: CreateAuthUser): Promise<AuthUserAccount>;
  updateInternal(id: string, updateData: UpdateAuthUser): Promise<void>;
}
