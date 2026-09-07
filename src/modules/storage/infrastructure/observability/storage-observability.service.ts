import { Injectable, Logger } from "@nestjs/common";
import {
  StorageAuditEvent,
  StorageObservabilityPort,
  StorageProviderMetric,
} from "../../application/ports/outbound/storage-observability.port";

const SENSITIVE_KEY = /(?:authorization|secret|token|signedurl|url|key)/i;
const URL_VALUE = /https?:\/\/\S+/gi;

export function redactStorageLogRecord(
  record: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => {
      if (SENSITIVE_KEY.test(key)) return [key, "[REDACTED]"];
      if (typeof value === "string")
        return [key, value.replace(URL_VALUE, "[REDACTED_URL]")];
      return [key, value];
    }),
  );
}

@Injectable()
export class StorageObservabilityService implements StorageObservabilityPort {
  private readonly logger = new Logger(StorageObservabilityService.name);

  recordAudit(event: StorageAuditEvent): void {
    this.write("storage.audit", event);
  }

  recordProviderMetric(metric: StorageProviderMetric): void {
    this.write("storage.provider.metric", metric);
  }

  private write(eventName: string, details: object): void {
    const record: Record<string, unknown> = {
      event: eventName,
      ...(details as Record<string, unknown>),
    };
    this.logger.log(JSON.stringify(redactStorageLogRecord(record)));
  }
}
