import { DataSource, DataSourceOptions } from 'typeorm';
import { dataSourceOptions } from '../database/data-source';
import { AddProvinceMapFields1748665200000 } from '../database/migrations/1748665200000-AddProvinceMapFields';
import { AddFirebaseUidToUsers1782860400000 } from '../database/migrations/1782860400000-AddFirebaseUidToUsers';
import { AddProductStatusChangedNotificationType1783123200000 } from '../database/migrations/1783123200000-AddProductStatusChangedNotificationType';
import { AddProductCertificationVerifyFlow1783209600000 } from '../database/migrations/1783209600000-AddProductCertificationVerifyFlow';
import { AddP5NotificationTypes1783296000000 } from '../database/migrations/1783296000000-AddP5NotificationTypes';
import { AddReviewModerationAndConstraints1783382400000 } from '../database/migrations/1783382400000-AddReviewModerationAndConstraints';
import { CreateStoredFiles1783472400000 } from '../database/migrations/1783472400000-CreateStoredFiles';
import { AddStoredFileContentValidation1783558800000 } from '../database/migrations/1783558800000-AddStoredFileContentValidation';
import { AddStoredFileDeletionRetry1783645200000 } from '../database/migrations/1783645200000-AddStoredFileDeletionRetry';
import { EstablishCooperativePersistenceBoundaries1783731600000 } from '../database/migrations/1783731600000-EstablishCooperativePersistenceBoundaries';
import { AddStoredFileIdToPrivateDocuments1783818000000 } from '../database/migrations/1783818000000-AddStoredFileIdToPrivateDocuments';

const REQUIRED_DATABASE = 'agrilink_migration_test';
const configuredDatabase = String(dataSourceOptions.database);

if (configuredDatabase !== REQUIRED_DATABASE) {
  throw new Error(
    `Migration verification requires DB_NAME=${REQUIRED_DATABASE}; received ${configuredDatabase}`,
  );
}

if (dataSourceOptions.synchronize !== false) {
  throw new Error('Migration verification requires DB_SYNCHRONIZE=false');
}

const verificationOptions: DataSourceOptions = {
  ...dataSourceOptions,
  database: REQUIRED_DATABASE,
  synchronize: false,
  logging: false,
  migrations: [
    AddProvinceMapFields1748665200000,
    AddFirebaseUidToUsers1782860400000,
    AddProductStatusChangedNotificationType1783123200000,
    AddProductCertificationVerifyFlow1783209600000,
    AddP5NotificationTypes1783296000000,
    AddReviewModerationAndConstraints1783382400000,
    CreateStoredFiles1783472400000,
    AddStoredFileContentValidation1783558800000,
    AddStoredFileDeletionRetry1783645200000,
    EstablishCooperativePersistenceBoundaries1783731600000,
    AddStoredFileIdToPrivateDocuments1783818000000,
  ],
} as DataSourceOptions;

export default new DataSource(verificationOptions);
