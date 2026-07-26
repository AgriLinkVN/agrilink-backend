import { Injectable } from "@nestjs/common";
import { UsersService } from "../../../users/users.service";
import { IUserManagerPort } from "../../application/ports/outbound/user-manager.port";
import type { User } from "@database/entities/user.entity";

@Injectable()
export class LegacyUsersModuleAdapter implements IUserManagerPort {
  constructor(private readonly usersService: UsersService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersService.findByEmail(email);
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.usersService.findByPhone(phone);
  }

  async findByFirebaseUid(uid: string): Promise<User | null> {
    return this.usersService.findByFirebaseUid(uid);
  }

  async findById(id: string): Promise<User | null> {
    return this.usersService.findById(id);
  }

  async create(userData: Partial<User>): Promise<User> {
    return this.usersService.create(userData);
  }

  async updateInternal(id: string, updateData: Partial<User>): Promise<void> {
    return this.usersService.updateInternal(id, updateData);
  }
}
