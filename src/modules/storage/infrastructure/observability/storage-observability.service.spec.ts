import { redactStorageLogRecord } from "./storage-observability.service";

describe("storage observability redaction", () => {
  it("redacts signed URLs, tokens, and provider secrets before a record is logged", () => {
    const record = redactStorageLogRecord({
      event: "storage.audit",
      fileId: "file-1",
      signedUrl:
        "https://project.supabase.co/storage/v1/object/sign/file?token=secret",
      uploadToken: "secret-token",
      providerSecret: "service-role-secret",
      note: "provider returned https://project.supabase.co/path?token=secret",
    });

    expect(record).toEqual({
      event: "storage.audit",
      fileId: "file-1",
      signedUrl: "[REDACTED]",
      uploadToken: "[REDACTED]",
      providerSecret: "[REDACTED]",
      note: "provider returned [REDACTED_URL]",
    });
    expect(JSON.stringify(record)).not.toContain("secret");
    expect(JSON.stringify(record)).not.toContain("supabase.co");
  });
});
