export const COOPERATIVE_UNIT_OF_WORK = Symbol('COOPERATIVE_UNIT_OF_WORK');

export interface CooperativeUnitOfWorkPort {
  withinTransaction<T>(work: () => Promise<T>): Promise<T>;
}
