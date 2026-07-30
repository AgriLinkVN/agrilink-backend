import { ProductStatus } from '@common/enums';
import { ProductModel } from '../../models/product.model';

export const PRODUCT_ADMIN_READER = Symbol('PRODUCT_ADMIN_READER');
export const PRODUCT_MODERATION_MANAGER = Symbol('PRODUCT_MODERATION_MANAGER');

export interface ProductAdminPage {
  data: ProductModel[];
  total: number;
}

export interface ProductAdminReader {
  countAll(): Promise<number>;
  countPending(): Promise<number>;
  findDetail(id: string): Promise<ProductModel | null>;
  listPending(skip: number, take: number): Promise<ProductAdminPage>;
  listViolating(skip: number, take: number): Promise<ProductAdminPage>;
}

export type ProductModerationResult =
  | { outcome: 'not-found' }
  | { outcome: 'invalid-target' }
  | { outcome: 'conflict' }
  | {
      outcome: 'updated';
      previousStatus: ProductStatus;
      product: ProductModel;
    };

export interface ProductModerationManager {
  moderate(
    id: string,
    status: string,
    reason: string | null,
  ): Promise<ProductModerationResult>;
}
