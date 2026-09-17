import { ContractStatus } from '../../domain/contract';
import { PurchaseRequestStatus } from '../../domain/purchase-request';

export interface PurchaseRequestModel {
  id: string;
  buyerId: string;
  productCategoryId: string | null;
  provinceId: string | null;
  quantityNeeded: string;
  allocatedQuantity: string;
  unit: string;
  status: PurchaseRequestStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContractModel {
  id: string;
  contractCode: string;
  purchaseRequestId: string | null;
  buyerId: string;
  sellerId: string;
  productCategoryId: string | null;
  quantity: string;
  unit: string;
  unitPrice: string;
  totalValue: string;
  status: ContractStatus;
  buyerSignedAt: Date | null;
  sellerSignedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
