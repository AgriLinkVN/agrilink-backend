import { UserRole, UserStatus } from '../../../../common/enums';

export interface UserAccount {
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

export type SafeUserAccount = Omit<UserAccount, 'passwordHash'>;

export interface CreateUserAccount {
  phone?: string | null;
  firebaseUid?: string | null;
  email: string;
  passwordHash: string;
  role: UserRole;
  status?: UserStatus;
  avatarUrl?: string | null;
  fullName?: string | null;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  lastLoginAt?: Date | null;
}

export interface UpdateUserAccount {
  phone?: string | null;
  firebaseUid?: string | null;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  avatarUrl?: string | null;
  fullName?: string | null;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  lastLoginAt?: Date | null;
}

export interface UserSummary {
  id: string;
  fullName: string | null;
}

export interface UserPage {
  data: SafeUserAccount[];
  total: number;
}

export type UserStatusChangeResult =
  | { outcome: 'not-found' }
  | { outcome: 'protected-admin' }
  | {
      outcome: 'updated';
      userId: string;
      previousStatus: UserStatus;
      status: UserStatus;
      account: SafeUserAccount;
    };
