import { Injectable, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FILE_STORAGE, FileStoragePort } from './ports/outbound/file-storage.port';
import { STORED_FILE_REPOSITORY, StoredFileRepositoryPort } from './ports/outbound/stored-file-repository.port';

@Injectable()
export class StorageCleanupService {
  constructor(@Inject(FILE_STORAGE) private readonly files: FileStoragePort, @Inject(STORED_FILE_REPOSITORY) private readonly records: StoredFileRepositoryPort) {}
  @Cron('0 */5 * * * *') async cleanup(): Promise<void> {
    const records = [...await this.records.findExpiredPending(new Date()), ...await this.records.findDeletionRetries()];
    await Promise.all(records.map(async (record) => { try { await this.files.delete(record.objectKey); await this.records.updateStatus(record.id, record.ownerId, 'DELETED'); } catch { await this.records.markDeletionRetry(record.id, record.ownerId); } }));
  }
}
