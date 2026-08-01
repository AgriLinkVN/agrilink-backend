export const PRODUCT_COMMERCE_READER = Symbol('PRODUCT_COMMERCE_READER');

export interface ProductCommerceProjection {
  id: string;
  sellerId: string;
  name: string;
  pricePerUnit: string;
  unit: string;
}

export interface ProductCommerceReader {
  findCommerceProduct(
    productId: string,
  ): Promise<ProductCommerceProjection | null>;
}
