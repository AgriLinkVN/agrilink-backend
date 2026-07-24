import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoredFileEntity } from './stored-file.entity';
import { StoredFileModel, StoredFileRepositoryPort } from '../../application/ports/outbound/stored-file-repository.port';

@Injectable()
export class TypeOrmStoredFileRepository implements StoredFileRepositoryPort {
  constructor(@InjectRepository(StoredFileEntity) private readonly files: Repository<StoredFileEntity>) {}
  async create(file: StoredFileModel): Promise<StoredFileModel> { return this.toModel(await this.files.save(this.files.create({ ...file, sizeBytes: String(file.sizeBytes) }))); }
  async findByIdForOwner(id: string, ownerId: string): Promise<StoredFileModel | null> { const entity = await this.files.findOne({ where: { id, ownerId } }); return entity ? this.toModel(entity) : null; }
  async updateStatus(id: string, ownerId: string, status: string): Promise<StoredFileModel | null> { await this.files.update({ id, ownerId }, { status }); return this.findByIdForOwner(id, ownerId); }
  private toModel(entity: StoredFileEntity): StoredFileModel { return { id: entity.id, ownerId: entity.ownerId, assetType: entity.assetType, provider: entity.provider, visibility: entity.visibility, status: entity.status, objectKey: entity.objectKey, originalName: entity.originalName, declaredMime: entity.declaredMime, sizeBytes: Number(entity.sizeBytes), expiresAt: entity.expiresAt, resourceType: entity.resourceType, resourceId: entity.resourceId }; }
}
