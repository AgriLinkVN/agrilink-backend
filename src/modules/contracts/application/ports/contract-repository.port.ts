import { ContractStatus } from '../../domain/contract';
import {
  ContractModel,
  PurchaseRequestModel,
} from '../models/contract.model';

export const PURCHASE_REQUEST_REPOSITORY = Symbol(
  'PURCHASE_REQUEST_REPOSITORY',
);
export const CONTRACT_REPOSITORY = Symbol('CONTRACT_REPOSITORY');

export interface PurchaseRequestRepository {
  createAtomically(input: {
    buyerId: string;
    productCategoryId: string | null;
    provinceId: string | null;
    quantityNeeded: string;
    unit: string;
    operationKey: string;
    requestFingerprint: string;
  }): Promise<PurchaseRequestModel>;
  findById(id: string): Promise<PurchaseRequestModel | null>;
  listForBuyer(buyerId: string): Promise<PurchaseRequestModel[]>;
  transitionAtomically(input: {
    id: string;
    buyerId: string;
    action: 'close' | 'cancel';
    expectedVersion: number;
    operationKey: string;
    requestFingerprint: string;
  }): Promise<PurchaseRequestModel | null>;
}

export interface ContractRepository {
  createFromRequestAtomically(input: {
    contractCode: string;
    purchaseRequestId: string;
    buyerId: string;
    sellerId: string;
    productCategoryId: string | null;
    quantity: string;
    unit: string;
    unitPrice: string;
    totalValue: string;
    operationKey: string;
    requestFingerprint: string;
  }): Promise<ContractModel>;
  findById(id: string): Promise<ContractModel | null>;
  listForParty(userId: string): Promise<ContractModel[]>;
  signAtomically(input: {
    id: string;
    actorId: string;
    expectedVersion: number;
    operationKey: string;
    requestFingerprint: string;
  }): Promise<ContractModel | null>;
  transitionAtomically(input: {
    id: string;
    actorId: string;
    toStatus: ContractStatus;
    expectedVersion: number;
    operationKey: string;
    requestFingerprint: string;
  }): Promise<ContractModel | null>;
}
