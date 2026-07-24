const DISPOSABLE_DATABASE_PREFIXES = [
  "agrilink_schema_parity_",
  "agrilink_persistence_test_",
] as const;

export function assertDisposableDatabaseTarget(database: string): void {
  if (database === "agrilink_db") {
    throw new Error("Refusing to use protected database agrilink_db");
  }
  if (
    !DISPOSABLE_DATABASE_PREFIXES.some((prefix) => database.startsWith(prefix))
  ) {
    throw new Error(
      `Disposable database must start with ${DISPOSABLE_DATABASE_PREFIXES.join(
        " or ",
      )}`,
    );
  }
}
