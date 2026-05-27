import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /** Find a user by their UUID — returns null if not found */
  async findById(id: string): Promise<User | null> {
    throw new Error('TODO: implement UsersService.findById()');
  }

  /** Find a user by phone number */
  async findByPhone(phone: string): Promise<User | null> {
    throw new Error('TODO: implement UsersService.findByPhone()');
  }

  /** Return the authenticated user's own profile (strips sensitive fields) */
  async getMe(userId: string): Promise<Partial<User>> {
    throw new Error('TODO: implement UsersService.getMe()');
  }

  /** Update the authenticated user's own profile */
  async updateMe(userId: string, dto: UpdateUserDto): Promise<Partial<User>> {
    throw new Error('TODO: implement UsersService.updateMe()');
  }

  /** Admin: get any user by id */
  async adminGetUser(id: string): Promise<User | null> {
    throw new Error('TODO: implement UsersService.adminGetUser()');
  }
}
