export const COMMERCE_OPERATION_REPOSITORY = Symbol(
  'COMMERCE_OPERATION_REPOSITORY',
);
export const COMMERCE_UNIT_OF_WORK = Symbol('COMMERCE_UNIT_OF_WORK');

export interface CommerceUnitOfWork {
  execute<T>(work: () => Promise<T>): Promise<T>;
}

export interface CommerceOperationKey {
  actorId: string;
  operationType: string;
  idempotencyKey: string;
  requestFingerprint: string;
}

export interface CommerceOperationRecord extends CommerceOperationKey {
  id: string;
  aggregateId: string | null;
  resultReference: string | null;
  status: 'started' | 'completed';
}

export interface CommerceOperationRepository {
  claim(input: CommerceOperationKey): Promise<{
    record: CommerceOperationRecord;
    claimed: boolean;
  }>;
  complete(
    id: string,
    aggregateId: string,
    resultReference: string,
  ): Promise<void>;
}
