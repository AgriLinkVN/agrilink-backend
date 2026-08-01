import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UserRole } from '@common/enums';
import {
  CommerceConflictError,
  CommerceForbiddenError,
  CommerceNotFoundError,
} from '../../../commerce/application/errors/commerce-application.error';
import { createCommerceFingerprint } from '../../../commerce/application/services/commerce-fingerprint';
import { MoneyVnd, Quantity } from '../../../commerce/domain/commerce-values';
import { CommerceActorContext } from '../../../orders/application/use-cases/order.use-cases';
import { Contract, ContractStatus } from '../../domain/contract';
import { PurchaseRequest } from '../../domain/purchase-request';
import {
  ContractModel,
  PurchaseRequestModel,
} from '../models/contract.model';
import {
  CONTRACT_REPOSITORY,
  ContractRepository,
  PURCHASE_REQUEST_REPOSITORY,
  PurchaseRequestRepository,
} from '../ports/contract-repository.port';

@Injectable()
export class CreatePurchaseRequestUseCase {
  constructor(
    @Inject(PURCHASE_REQUEST_REPOSITORY)
    private readonly requests: PurchaseRequestRepository,
  ) {}

  execute(
    actor: CommerceActorContext,
    input: {
      productCategoryId: string | null;
      provinceId: string | null;
      quantityNeeded: string;
      unit: string;
    },
    key: string,
  ): Promise<PurchaseRequestModel> {
    if (actor.role !== UserRole.ENTERPRISE) {
      throw new CommerceForbiddenError('Only enterprises can create purchase requests');
    }
    const quantity = Quantity.parse(input.quantityNeeded);
    new PurchaseRequest(actor.id, quantity);
    return this.requests.createAtomically({
      buyerId: actor.id,
      ...input,
      quantityNeeded: quantity.toString(),
      operationKey: key,
      requestFingerprint: createCommerceFingerprint(
        'create-purchase-request',
        actor.id,
        input,
      ),
    });
  }
}

@Injectable()
export class GetPurchaseRequestUseCase {
  constructor(
    @Inject(PURCHASE_REQUEST_REPOSITORY)
    private readonly requests: PurchaseRequestRepository,
  ) {}
  async execute(actor: CommerceActorContext, id: string): Promise<PurchaseRequestModel> {
    const request = await this.requests.findById(id);
    if (!request) throw new CommerceNotFoundError('Purchase request not found');
    if (request.buyerId !== actor.id && actor.role !== UserRole.ADMIN) {
      throw new CommerceForbiddenError('Purchase request does not belong to actor');
    }
    return request;
  }
}

@Injectable()
export class ListPurchaseRequestsUseCase {
  constructor(
    @Inject(PURCHASE_REQUEST_REPOSITORY)
    private readonly requests: PurchaseRequestRepository,
  ) {}
  execute(actor: CommerceActorContext): Promise<PurchaseRequestModel[]> {
    if (actor.role !== UserRole.ENTERPRISE) {
      throw new CommerceForbiddenError('Only enterprises can list purchase requests');
    }
    return this.requests.listForBuyer(actor.id);
  }
}

@Injectable()
export class TransitionPurchaseRequestUseCase {
  constructor(
    @Inject(PURCHASE_REQUEST_REPOSITORY)
    private readonly requests: PurchaseRequestRepository,
  ) {}
  async execute(
    actor: CommerceActorContext,
    input: { id: string; action: 'close' | 'cancel'; expectedVersion: number },
    key: string,
  ): Promise<PurchaseRequestModel> {
    if (actor.role !== UserRole.ENTERPRISE) {
      throw new CommerceForbiddenError('Only enterprises can update purchase requests');
    }
    const result = await this.requests.transitionAtomically({
      ...input,
      buyerId: actor.id,
      operationKey: key,
      requestFingerprint: createCommerceFingerprint(
        `${input.action}-purchase-request`,
        actor.id,
        input,
      ),
    });
    if (!result) throw new CommerceConflictError('Purchase request state changed');
    return result;
  }
}

@Injectable()
export class CreateContractFromPurchaseRequestUseCase {
  constructor(
    @Inject(PURCHASE_REQUEST_REPOSITORY)
    private readonly requests: PurchaseRequestRepository,
    @Inject(CONTRACT_REPOSITORY)
    private readonly contracts: ContractRepository,
  ) {}
  async execute(
    actor: CommerceActorContext,
    input: {
      purchaseRequestId: string;
      sellerId: string;
      quantity: string;
      unitPrice: string;
    },
    key: string,
  ): Promise<ContractModel> {
    if (actor.role !== UserRole.ENTERPRISE) {
      throw new CommerceForbiddenError('Only enterprises can create contracts');
    }
    const request = await this.requests.findById(input.purchaseRequestId);
    if (!request) throw new CommerceNotFoundError('Purchase request not found');
    if (request.buyerId !== actor.id) {
      throw new CommerceForbiddenError('Purchase request does not belong to buyer');
    }
    const quantity = Quantity.parse(input.quantity);
    const unitPrice = MoneyVnd.parse(input.unitPrice);
    const totalValue = unitPrice.multiply(quantity);
    new Contract(actor.id, input.sellerId, quantity, unitPrice, totalValue);
    return this.contracts.createFromRequestAtomically({
      contractCode: `CTR-${randomUUID().replace(/-/g, '').slice(0, 20)}`,
      purchaseRequestId: request.id,
      buyerId: actor.id,
      sellerId: input.sellerId,
      productCategoryId: request.productCategoryId,
      quantity: quantity.toString(),
      unit: request.unit,
      unitPrice: unitPrice.toString(),
      totalValue: totalValue.toString(),
      operationKey: key,
      requestFingerprint: createCommerceFingerprint(
        'create-contract',
        actor.id,
        input,
      ),
    });
  }
}

@Injectable()
export class GetContractUseCase {
  constructor(@Inject(CONTRACT_REPOSITORY) private readonly contracts: ContractRepository) {}
  async execute(actor: CommerceActorContext, id: string): Promise<ContractModel> {
    const contract = await this.contracts.findById(id);
    if (!contract) throw new CommerceNotFoundError('Contract not found');
    if (
      contract.buyerId !== actor.id &&
      contract.sellerId !== actor.id &&
      actor.role !== UserRole.ADMIN
    ) {
      throw new CommerceForbiddenError('Actor is not a contract party');
    }
    return contract;
  }
}

@Injectable()
export class ListMyContractsUseCase {
  constructor(@Inject(CONTRACT_REPOSITORY) private readonly contracts: ContractRepository) {}
  execute(actor: CommerceActorContext): Promise<ContractModel[]> {
    return this.contracts.listForParty(actor.id);
  }
}

@Injectable()
export class SignContractUseCase {
  constructor(@Inject(CONTRACT_REPOSITORY) private readonly contracts: ContractRepository) {}
  async execute(
    actor: CommerceActorContext,
    id: string,
    expectedVersion: number,
    key: string,
  ): Promise<ContractModel> {
    const contract = await this.contracts.findById(id);
    if (!contract) throw new CommerceNotFoundError('Contract not found');
    Contract.rehydrate(contract).sign(actor.id);
    const result = await this.contracts.signAtomically({
      id,
      actorId: actor.id,
      expectedVersion,
      operationKey: key,
      requestFingerprint: createCommerceFingerprint(
        'sign-contract',
        actor.id,
        { id, expectedVersion },
      ),
    });
    if (!result) throw new CommerceConflictError('Contract state changed');
    return result;
  }
}

@Injectable()
export class TransitionContractStatusUseCase {
  constructor(@Inject(CONTRACT_REPOSITORY) private readonly contracts: ContractRepository) {}
  async execute(
    actor: CommerceActorContext,
    input: { id: string; toStatus: ContractStatus; expectedVersion: number },
    key: string,
  ): Promise<ContractModel> {
    const contract = await this.contracts.findById(input.id);
    if (!contract) throw new CommerceNotFoundError('Contract not found');
    if (
      contract.buyerId !== actor.id &&
      contract.sellerId !== actor.id
    ) {
      throw new CommerceForbiddenError('Actor is not a contract party');
    }
    Contract.rehydrate(contract).transition(input.toStatus);
    const result = await this.contracts.transitionAtomically({
      ...input,
      actorId: actor.id,
      operationKey: key,
      requestFingerprint: createCommerceFingerprint(
        'transition-contract',
        actor.id,
        input,
      ),
    });
    if (!result) throw new CommerceConflictError('Contract state changed');
    return result;
  }
}
