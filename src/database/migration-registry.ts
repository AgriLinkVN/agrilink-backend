import { MigrationInterface } from "typeorm";

import { AddProvinceMapFields1748665200000 } from "./migrations/1748665200000-AddProvinceMapFields";
import { AddFirebaseUidToUsers1782860400000 } from "./migrations/1782860400000-AddFirebaseUidToUsers";
import { AddProductStatusChangedNotificationType1783123200000 } from "./migrations/1783123200000-AddProductStatusChangedNotificationType";
import { AddProductCertificationVerifyFlow1783209600000 } from "./migrations/1783209600000-AddProductCertificationVerifyFlow";
import { AddP5NotificationTypes1783296000000 } from "./migrations/1783296000000-AddP5NotificationTypes";
import { AddReviewModerationAndConstraints1783382400000 } from "./migrations/1783382400000-AddReviewModerationAndConstraints";
import { CreateStoredFiles1783472400000 } from "./migrations/1783472400000-CreateStoredFiles";
import { AddStoredFileContentValidation1783558800000 } from "./migrations/1783558800000-AddStoredFileContentValidation";
import { AddStoredFileDeletionRetry1783645200000 } from "./migrations/1783645200000-AddStoredFileDeletionRetry";
import { EstablishCooperativePersistenceBoundaries1783731600000 } from "./migrations/1783731600000-EstablishCooperativePersistenceBoundaries";
import { AddStoredFileIdToPrivateDocuments1783818000000 } from "./migrations/1783818000000-AddStoredFileIdToPrivateDocuments";
import { CreateCanonicalBaselineV21800000000000 } from "./migrations-v2/1800000000000-CreateCanonicalBaselineV2";

export type MigrationClass = new () => MigrationInterface;

export const LEGACY_MIGRATIONS = Object.freeze([
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
] as const satisfies readonly MigrationClass[]);

export const V2_MIGRATIONS = Object.freeze([
  CreateCanonicalBaselineV21800000000000,
] as const satisfies readonly MigrationClass[]);

export function getMigrationNames(
  migrations: readonly MigrationClass[],
): string[] {
  return migrations.map((Migration) => new Migration().name ?? Migration.name);
}

export function assertDeterministicMigrationRegistry(): void {
  const allNames = [
    ...getMigrationNames(LEGACY_MIGRATIONS),
    ...getMigrationNames(V2_MIGRATIONS),
  ];
  if (new Set(allNames).size !== allNames.length) {
    throw new Error("Migration names must be unique across all lineages");
  }
  for (const migrations of [LEGACY_MIGRATIONS, V2_MIGRATIONS]) {
    const timestamps = getMigrationNames(migrations).map((name) => {
      const match = name.match(/(\d{13})$/);
      if (!match) throw new Error(`Migration name has no timestamp: ${name}`);
      return Number(match[1]);
    });
    if (
      timestamps.some(
        (timestamp, index) => index > 0 && timestamp <= timestamps[index - 1],
      )
    ) {
      throw new Error("Migration registry must be strictly ordered");
    }
  }
}
