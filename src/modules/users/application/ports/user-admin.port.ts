import { UserStatus } from '../../../../common/enums';
import {
  UserPage,
  UserStatusChangeResult,
  UserSummary,
} from '../../domain/models/user-account';

export const USER_ADMIN_READER = Symbol('USER_ADMIN_READER');
export const USER_STATUS_MANAGER = Symbol('USER_STATUS_MANAGER');

export interface UserAdminReader {
  countAll(): Promise<number>;
  countByStatus(status: UserStatus): Promise<number>;
  findSummariesByIds(ids: string[]): Promise<UserSummary[]>;
  list(skip: number, take: number): Promise<UserPage>;
}

export interface UserStatusManager {
  changeStatus(
    userId: string,
    status: UserStatus,
  ): Promise<UserStatusChangeResult>;
}
