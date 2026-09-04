import { ProductStatus } from '@common/enums';
import { WishlistProductUnavailableError } from '../errors/product-application.error';

interface WishlistEligibleProduct {
  status: ProductStatus;
}

export function assertWishlistProductIsAvailable(
  product: WishlistEligibleProduct | null,
): asserts product is WishlistEligibleProduct {
  if (!product) {
    throw new WishlistProductUnavailableError('Không tìm thấy sản phẩm hoạt động');
  }
}
