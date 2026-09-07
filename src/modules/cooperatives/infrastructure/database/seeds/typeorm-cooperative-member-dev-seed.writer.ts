import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { CooperativeMemberEntity } from "../../persistence/entities/cooperative-member.entity";
import {
  CooperativeMemberDevSeedCreateData,
  CooperativeMemberDevSeedRecord,
  CooperativeMemberDevSeedUpdateData,
  CooperativeMemberDevSeedWriter,
} from "./cooperative-member-development-seed.service";

@Injectable()
export class TypeOrmCooperativeMemberDevSeedWriter implements CooperativeMemberDevSeedWriter {
  constructor(
    @InjectRepository(CooperativeMemberEntity)
    private readonly repository: Repository<CooperativeMemberEntity>,
  ) {}

  findMembersByCooperativeAndFarmer(
    cooperativeId: string,
    farmerId: string,
  ): Promise<readonly CooperativeMemberDevSeedRecord[]> {
    return this.repository.find({
      select: { id: true, joinedAt: true },
      where: { cooperativeId, farmerId },
    });
  }

  async createMember(data: CooperativeMemberDevSeedCreateData): Promise<void> {
    await this.repository.save(this.repository.create(data));
  }

  async updateMember(
    id: string,
    data: CooperativeMemberDevSeedUpdateData,
  ): Promise<void> {
    await this.repository.update(id, data);
  }
}
