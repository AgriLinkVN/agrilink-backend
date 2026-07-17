import { Product } from '../entities/product.entity';
import { WishlistProductUnavailableError } from '../errors/product-application.error';

export function assertWishlistProductIsAvailable(
  product: Product | null,
): asserts product is Product {
  if (!product) {
    throw new WishlistProductUnavailableError('Không tìm thấy sản phẩm hoạt động');
  }
}

export function shouldCreateWishlistItem(existingItem: unknown): boolean {
  return !existingItem;
}
