import {
  CertificationStatus,
  CertType,
  FarmingType,
  ProductStatus,
  ProductUnit,
} from '@common/enums';

export interface CreateProductImageInput {
  imageUrl: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

export interface CreateProductCertificationInput {
  certType: CertType;
  certNumber?: string;
  issuedBy?: string;
  issuedDate?: string;
  expiryDate?: string;
  documentUrl?: string;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  categoryId?: string;
  sku?: string;
  variety?: string;
  pricePerUnit: number;
  unit: ProductUnit;
  availableQuantity: number;
  minOrderQuantity?: number;
  farmingType?: FarmingType;
  provinceId?: string;
  districtId?: string;
  farmLatitude?: number;
  farmLongitude?: number;
  harvestDate?: string;
  expiryDate?: string;
  images?: CreateProductImageInput[];
  certifications?: CreateProductCertificationInput[];
}

export type UpdateProductInput = Partial<CreateProductInput>;

export interface ProductFilterInput {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  provinceId?: string;
  farmingType?: FarmingType;
  status?: ProductStatus;
  minPrice?: number;
  maxPrice?: number;
  sellerId?: string;
  isFeatured?: boolean;
  sortBy?: 'createdAt' | 'pricePerUnit' | 'name' | 'soldCount' | 'avgRating';
  order?: 'ASC' | 'DESC';
}

export interface VerifyProductCertificationInput {
  status: CertificationStatus;
  rejectionReason?: string;
}

export interface WishlistQueryInput {
  page?: number;
  limit?: number;
}
