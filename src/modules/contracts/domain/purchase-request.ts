import { Quantity } from '../../commerce/domain/commerce-values';

export type PurchaseRequestStatus = 'open' | 'closed' | 'cancelled';
export class PurchaseRequestDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PurchaseRequestDomainError';
  }
}
export class PurchaseRequest {
  private currentStatus: PurchaseRequestStatus = 'open';
  private allocated = 0n;
  constructor(readonly buyerId: string, readonly quantityNeeded: Quantity) {}
  static rehydrate(input: {
    buyerId: string;
    quantityNeeded: string;
    allocatedQuantity: string;
    status: PurchaseRequestStatus;
  }): PurchaseRequest {
    const request = new PurchaseRequest(
      input.buyerId,
      Quantity.parse(input.quantityNeeded),
    );
    request.currentStatus = input.status;
    const allocated =
      /^0(?:\.0+)?$/.test(input.allocatedQuantity)
        ? 0n
        : Quantity.parse(input.allocatedQuantity).thousandths;
    if (allocated > request.quantityNeeded.thousandths) {
      throw new PurchaseRequestDomainError('Allocated quantity is invalid');
    }
    request.allocated = allocated;
    return request;
  }
  get status(): PurchaseRequestStatus { return this.currentStatus; }
  allocate(quantity: Quantity): void {
    if (
      this.currentStatus !== 'open' ||
      this.allocated + quantity.thousandths > this.quantityNeeded.thousandths
    ) {
      throw new PurchaseRequestDomainError(
        'Purchase request allocation is not allowed',
      );
    }
    this.allocated += quantity.thousandths;
  }
  close(): void {
    if (this.currentStatus !== 'open') {
      throw new PurchaseRequestDomainError('Purchase request is terminal');
    }
    this.currentStatus = 'closed';
  }
  cancel(): void {
    if (this.currentStatus !== 'open') {
      throw new PurchaseRequestDomainError('Purchase request is terminal');
    }
    this.currentStatus = 'cancelled';
  }
}
