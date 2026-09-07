import { MoneyVnd, Quantity } from '../../commerce/domain/commerce-values';
export type ContractStatus = 'draft' | 'negotiating' | 'pending_signature' | 'active' | 'completed' | 'cancelled';
export class ContractDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContractDomainError';
  }
}
export class Contract {
  private currentStatus: ContractStatus = 'draft';
  private buyerSignedAt: Date | null = null;
  private sellerSignedAt: Date | null = null;
  constructor(readonly buyerId: string, readonly sellerId: string, readonly quantity: Quantity, readonly unitPrice: MoneyVnd, readonly totalValue: MoneyVnd) {
    if (
      buyerId === sellerId ||
      unitPrice.multiply(quantity).value !== totalValue.value
    ) {
      throw new ContractDomainError('Invalid contract terms');
    }
  }
  get status(): ContractStatus { return this.currentStatus; }
  get buyerSignatureTime(): Date | null { return this.buyerSignedAt; }
  get sellerSignatureTime(): Date | null { return this.sellerSignedAt; }
  static rehydrate(input: {
    buyerId: string;
    sellerId: string;
    quantity: string;
    unitPrice: string;
    totalValue: string;
    status: ContractStatus;
    buyerSignedAt: Date | null;
    sellerSignedAt: Date | null;
  }): Contract {
    const contract = new Contract(
      input.buyerId,
      input.sellerId,
      Quantity.parse(input.quantity),
      MoneyVnd.parse(input.unitPrice),
      MoneyVnd.parse(input.totalValue),
    );
    contract.currentStatus = input.status;
    contract.buyerSignedAt = input.buyerSignedAt;
    contract.sellerSignedAt = input.sellerSignedAt;
    return contract;
  }
  transition(to: ContractStatus): void {
    const allowed: Record<ContractStatus, ContractStatus[]> = { draft: ['negotiating', 'cancelled'], negotiating: ['pending_signature', 'cancelled'], pending_signature: ['active', 'cancelled'], active: ['completed'], completed: [], cancelled: [] };
    if (
      !allowed[this.currentStatus].includes(to) ||
      (to === 'active' && (!this.buyerSignedAt || !this.sellerSignedAt))
    ) {
      throw new ContractDomainError('Invalid contract transition');
    }
    this.currentStatus = to;
  }
  sign(actorId: string, signedAt: Date = new Date()): void {
    if (this.currentStatus !== 'pending_signature') {
      throw new ContractDomainError('Contract cannot be signed');
    }
    if (actorId === this.buyerId) this.buyerSignedAt ??= signedAt;
    else if (actorId === this.sellerId) this.sellerSignedAt ??= signedAt;
    else throw new ContractDomainError('Actor is not a contract party');
  }
}
