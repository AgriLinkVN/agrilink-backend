import { SellerType, UserRole } from '@common/enums';
import { ProductForbiddenError } from '../errors/product-application.error';

export function resolveSellerType(role: UserRole): SellerType {
  switch (role) {
    case UserRole.FARMER:
      return SellerType.FARMER;
    case UserRole.COOPERATIVE:
      return SellerType.COOPERATIVE;
    case UserRole.SUPPLIER:
      return SellerType.SUPPLIER;
    default:
      throw new ProductForbiddenError('Vai trò hiện tại không phải người bán');
  }
}
