import { Inject, Injectable } from '@nestjs/common';

import {
  USER_ACCOUNT_MANAGER,
  UserAccountManager,
} from '../../../users/application/ports/user-account-manager.port';
import {
  USER_IDENTITY_READER,
  UserIdentityReader,
} from '../../../users/application/ports/user-identity-reader.port';
import {
  AuthUserAccount,
  CreateAuthUser,
  IUserManagerPort,
  UpdateAuthUser,
} from '../../application/ports/outbound/user-manager.port';

@Injectable()
export class LegacyUsersModuleAdapter implements IUserManagerPort {
  static readonly retirementPhase = 4;

  constructor(
    @Inject(USER_IDENTITY_READER)
    private readonly identityReader: UserIdentityReader,
    @Inject(USER_ACCOUNT_MANAGER)
    private readonly accountManager: UserAccountManager,
  ) {}

  async findByEmail(email: string): Promise<AuthUserAccount | null> {
    return this.identityReader.findByEmail(email);
  }

  async findByPhone(phone: string): Promise<AuthUserAccount | null> {
    return this.identityReader.findByPhone(phone);
  }

  async findByFirebaseUid(uid: string): Promise<AuthUserAccount | null> {
    return this.identityReader.findByFirebaseUid(uid);
  }

  async findById(id: string): Promise<AuthUserAccount | null> {
    return this.identityReader.findById(id);
  }

  async create(userData: CreateAuthUser): Promise<AuthUserAccount> {
    return this.accountManager.create(userData);
  }

  async updateInternal(
    id: string,
    updateData: UpdateAuthUser,
  ): Promise<void> {
    return this.accountManager.updateInternal(id, updateData);
  }
}
