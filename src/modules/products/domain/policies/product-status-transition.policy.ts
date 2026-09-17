import { ProductStatus, UserRole } from '@common/enums';
import {
  InvalidProductStatusTransitionError,
  ProductForbiddenError,
} from '../errors/product-application.error';

export interface ProductStatusTransitionContext {
  currentStatus: ProductStatus;
  nextStatus: ProductStatus;
  sellerId: string;
  actorId: string;
  actorRole: UserRole;
  availableQuantity: number;
}

const ALLOWED_TARGETS: Partial<Record<ProductStatus, ProductStatus[]>> = {
  [ProductStatus.DRAFT]: [ProductStatus.PENDING_APPROVAL],
  [ProductStatus.REJECTED]: [ProductStatus.PENDING_APPROVAL],
  [ProductStatus.PENDING_APPROVAL]: [ProductStatus.ACTIVE],
  [ProductStatus.ACTIVE]: [ProductStatus.OUT_OF_STOCK],
  [ProductStatus.OUT_OF_STOCK]: [ProductStatus.ACTIVE],
};

export function assertProductStatusTransition(
  context: ProductStatusTransitionContext,
): void {
  const isOwner = context.sellerId === context.actorId;
  const isReviewer = [UserRole.ADMIN, UserRole.STATE_AGENCY].includes(
    context.actorRole,
  );

  if (!isOwner && !isReviewer) {
    throw new ProductForbiddenError('Bạn không có quyền đổi trạng thái sản phẩm này');
  }
  if (context.currentStatus === context.nextStatus) {
    return;
  }
  if (!ALLOWED_TARGETS[context.currentStatus]?.includes(context.nextStatus)) {
    throw new InvalidProductStatusTransitionError(
      `Không thể chuyển trạng thái sản phẩm từ ${context.currentStatus} sang ${context.nextStatus}`,
    );
  }
  if (context.nextStatus === ProductStatus.PENDING_APPROVAL && !isOwner) {
    throw new ProductForbiddenError('Chỉ người bán mới được gửi sản phẩm chờ duyệt');
  }
  if (
    context.currentStatus === ProductStatus.PENDING_APPROVAL &&
    context.nextStatus === ProductStatus.ACTIVE &&
    !isReviewer
  ) {
    throw new ProductForbiddenError('Chỉ admin hoặc cơ quan quản lý mới được duyệt sản phẩm');
  }
  if (context.nextStatus === ProductStatus.OUT_OF_STOCK && !isOwner && !isReviewer) {
    throw new ProductForbiddenError('Bạn không có quyền đánh dấu hết hàng');
  }
  if (context.nextStatus === ProductStatus.ACTIVE && context.availableQuantity <= 0) {
    throw new InvalidProductStatusTransitionError(
      'Sản phẩm phải có số lượng tồn kho lớn hơn 0 để kích hoạt',
    );
  }
}
