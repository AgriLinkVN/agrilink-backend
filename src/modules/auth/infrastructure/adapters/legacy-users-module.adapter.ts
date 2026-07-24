import { Injectable } from "@nestjs/common";
import { UsersService } from "../../../users/users.service";
import { IUserManagerPort } from "../../application/ports/outbound/user-manager.port";

@Injectable()
export class LegacyUsersModuleAdapter implements IUserManagerPort {
  constructor(private readonly usersService: UsersService) {}

  async findByEmail(email: string): Promise<any> {
    return this.usersService.findByEmail(email);
  }

  async findByFirebaseUid(uid: string): Promise<any> {
    return this.usersService.findByFirebaseUid(uid);
  }

  async findById(id: string): Promise<any> {
    return this.usersService.findById(id);
  }

  async create(userData: any): Promise<any> {
    return this.usersService.create(userData);
  }

  async updateInternal(id: string, updateData: any): Promise<void> {
    return this.usersService.updateInternal(id, updateData);
  }
}
