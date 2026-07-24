/** A persistence invariant could not be satisfied without changing legacy data. */
export class CooperativePersistenceInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CooperativePersistenceInvariantError';
  }
}

/** A legacy data row needs an explicit operator decision before migration. */
export class CooperativeMigrationPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CooperativeMigrationPreflightError';
  }
}
