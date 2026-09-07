export const STORAGE_OBSERVABILITY = Symbol("STORAGE_OBSERVABILITY");

export type StorageAuditAction =
  | "UPLOAD_INTENT"
  | "UPLOAD_COMPLETION"
  | "PRIVATE_DOWNLOAD"
  | "DELETE";

export type StorageAuditOutcome = "SUCCESS" | "FAILURE" | "RETRY_SCHEDULED";

export interface StorageAuditEvent {
  action: StorageAuditAction;
  outcome: StorageAuditOutcome;
  fileId: string;
  ownerId: string;
  correlationId: string;
  provider: "SUPABASE" | "CLOUDINARY";
}

export interface StorageProviderMetric {
  provider: "SUPABASE" | "CLOUDINARY";
  operation: string;
  outcome: "SUCCESS" | "ERROR" | "REJECTED" | "TIMEOUT";
  latencyMs: number;
  byteCount?: number;
}

export interface StorageObservabilityPort {
  recordAudit(event: StorageAuditEvent): void;
  recordProviderMetric(metric: StorageProviderMetric): void;
}
