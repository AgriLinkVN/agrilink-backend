import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { USER_ACCOUNT_MANAGER } from './application/ports/user-account-manager.port';
import {
  USER_ADMIN_READER,
  USER_STATUS_MANAGER,
} from './application/ports/user-admin.port';
import { USER_IDENTITY_READER } from './application/ports/user-identity-reader.port';
import { User } from './infrastructure/persistence/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [
    UsersService,
    { provide: USER_IDENTITY_READER, useExisting: UsersService },
    { provide: USER_ACCOUNT_MANAGER, useExisting: UsersService },
    { provide: USER_ADMIN_READER, useExisting: UsersService },
    { provide: USER_STATUS_MANAGER, useExisting: UsersService },
  ],
  exports: [
    USER_IDENTITY_READER,
    USER_ACCOUNT_MANAGER,
    USER_ADMIN_READER,
    USER_STATUS_MANAGER,
  ],
})
export class UsersModule {}
