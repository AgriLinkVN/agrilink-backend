import {
  ContractModel,
  PurchaseRequestModel,
} from '../../../application/models/contract.model';
import { Contract, ContractStatus } from '../../../domain/contract';
import {
  PurchaseRequest,
  PurchaseRequestStatus,
} from '../../../domain/purchase-request';
import { ContractOrmEntity } from '../entities/contract.orm-entity';
import { PurchaseRequestOrmEntity } from '../entities/purchase-request.orm-entity';

export class ContractPersistenceMapper {
  static purchaseRequestToDomain(
    entity: PurchaseRequestOrmEntity,
    allocatedQuantity: string,
  ): PurchaseRequest {
    return PurchaseRequest.rehydrate({
      buyerId: entity.buyerId,
      quantityNeeded: entity.quantityNeeded,
      allocatedQuantity,
      status: entity.status as PurchaseRequestStatus,
    });
  }

  static purchaseRequestToModel(
    entity: PurchaseRequestOrmEntity,
    allocatedQuantity: string,
  ): PurchaseRequestModel {
    return {
      id: entity.id,
      buyerId: entity.buyerId,
      productCategoryId: entity.productCategoryId,
      provinceId: entity.provinceId,
      quantityNeeded: entity.quantityNeeded,
      allocatedQuantity,
      unit: entity.unit,
      status: entity.status as PurchaseRequestStatus,
      version: entity.version,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static contractToDomain(entity: ContractOrmEntity): Contract {
    return Contract.rehydrate({
      buyerId: entity.buyerId,
      sellerId: entity.sellerId,
      quantity: entity.quantity,
      unitPrice: entity.unitPrice,
      totalValue: entity.totalValue,
      status: entity.status as ContractStatus,
      buyerSignedAt: entity.buyerSignedAt,
      sellerSignedAt: entity.sellerSignedAt,
    });
  }

  static contractToModel(entity: ContractOrmEntity): ContractModel {
    return {
      id: entity.id,
      contractCode: entity.contractCode,
      purchaseRequestId: entity.purchaseRequestId,
      buyerId: entity.buyerId,
      sellerId: entity.sellerId,
      productCategoryId: entity.productCategoryId,
      quantity: entity.quantity,
      unit: entity.unit,
      unitPrice: entity.unitPrice,
      totalValue: entity.totalValue,
      status: entity.status as ContractStatus,
      buyerSignedAt: entity.buyerSignedAt,
      sellerSignedAt: entity.sellerSignedAt,
      version: entity.version,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
