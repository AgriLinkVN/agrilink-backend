import {
  CreateUserAccount,
  UpdateUserAccount,
  UserAccount,
} from '../../domain/models/user-account';

export const USER_ACCOUNT_MANAGER = Symbol('USER_ACCOUNT_MANAGER');

export interface UserAccountManager {
  create(data: CreateUserAccount): Promise<UserAccount>;
  updateInternal(id: string, data: UpdateUserAccount): Promise<void>;
}
