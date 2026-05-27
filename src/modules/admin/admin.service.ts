import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from './entities/system-config.entity';
import { AuditLog } from './entities/audit-log.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async getSystemConfigs(): Promise<SystemConfig[]> {
    throw new Error('TODO: implement AdminService.getSystemConfigs()');
  }

  async updateSystemConfig(key: string, value: string, updatedBy: string): Promise<SystemConfig> {
    throw new Error('TODO: implement AdminService.updateSystemConfig()');
  }

  async getAuditLogs(pagination: PaginationDto): Promise<{ data: AuditLog[]; total: number }> {
    throw new Error('TODO: implement AdminService.getAuditLogs()');
  }

  /** Called by AuditLogInterceptor to persist log entries */
  async createAuditLog(data: Partial<AuditLog>): Promise<AuditLog> {
    throw new Error('TODO: implement AdminService.createAuditLog()');
  }
}
