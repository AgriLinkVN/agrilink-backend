export class CommerceDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class OrderInvariantError extends CommerceDomainError {}
export class OrderTransitionError extends CommerceDomainError {}
export class OrderAuthorizationError extends CommerceDomainError {}
