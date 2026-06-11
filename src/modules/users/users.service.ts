import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /** Find a user by their UUID — returns null if not found */
  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  /** Find a user by phone number */
  async findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ phone });
  }

  /** Return the authenticated user's own profile (strips sensitive fields) */
  async getMe(userId: string): Promise<Partial<User>> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  /** Update the authenticated user's own profile */
  async updateMe(userId: string, dto: UpdateUserDto): Promise<Partial<User>> {
    await this.usersRepository.update(userId, dto);
    return this.getMe(userId);
  }

  /** Internal method to update system fields */
  async updateInternal(userId: string, data: Partial<User>): Promise<void> {
    await this.usersRepository.update(userId, data);
  }

  /** Admin: get any user by id */
  async adminGetUser(id: string): Promise<User | null> {
    return this.findById(id);
  }

  /** Create a new user */
  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }
}
