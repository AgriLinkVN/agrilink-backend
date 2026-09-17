# Storage Observability Runbook

## Safe event fields

Storage emits JSON log records named `storage.audit` and
`storage.provider.metric`. Operators may use `fileId` and `correlationId` to
trace an intent, completion, private download, or delete request. Records do
not include object keys, original filenames, signed URLs, upload tokens,
provider secrets, identity data, or OCR payloads.

## Alerts

Configure alerts from `storage.provider.metric`:

- Alert when provider `ERROR`, `REJECTED`, or `TIMEOUT` events exceed 5% of
  storage provider operations for 10 minutes.
- Alert immediately when `TIMEOUT` events occur for 5 consecutive minutes.
- Alert when the count of `DELETE_RETRY` records is greater than 20 for 15
  minutes. This is the cleanup backlog.

## Triage

1. Find the audit record by `fileId` or the client-provided `correlationId`.
2. Inspect provider metrics for the provider, operation, outcome, and latency.
3. For transient timeout or provider errors, verify the bounded retry outcome
   and wait for scheduled cleanup when deletion was queued.
4. For rejections, verify provider bucket policy and application validation;
   do not paste a signed URL, token, secret, identity number, or OCR payload
   into tickets or logs.
5. If cleanup backlog remains elevated, verify provider availability and retry
   records before manually reconciling an individual file by its file ID.
