import {
  CertificationStatus,
  CertType,
  FarmingType,
  ProductStatus,
  ProductUnit,
  SellerType,
} from '@common/enums';

/**
 * Application-facing Product shapes. Persistence adapters may map TypeORM
 * entities to these structural models, but ports must not expose entities.
 */
export interface ProductCategoryModel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  iconUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  parent?: ProductCategoryModel | null;
  children?: ProductCategoryModel[];
}

export interface ProductImageModel {
  id: string;
  productId: string;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: Date;
  product?: ProductModel;
}

export interface ProductCertificationModel {
  id: string;
  productId: string;
  certType: CertType;
  certNumber: string | null;
  issuedBy: string | null;
  issuedDate: Date | null;
  expiryDate: Date | null;
  storedFileId: string | null;
  isVerified: boolean;
  status: CertificationStatus;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  product?: ProductModel;
}

export interface ProductModel {
  id: string;
  sellerId: string;
  sellerType: SellerType;
  name: string;
  description: string | null;
  categoryId: string | null;
  sku: string | null;
  variety: string | null;
  pricePerUnit: number;
  unit: ProductUnit;
  availableQuantity: number;
  minOrderQuantity: number | null;
  status: ProductStatus;
  farmingType: FarmingType | null;
  provinceId: string | null;
  districtId: string | null;
  farmLatitude: number | null;
  farmLongitude: number | null;
  harvestDate: Date | null;
  expiryDate: Date | null;
  rejectionReason: string | null;
  isFeatured: boolean;
  viewCount: number;
  soldCount: number;
  avgRating: number;
  createdAt: Date;
  updatedAt: Date;
  category?: ProductCategoryModel | null;
  images?: ProductImageModel[];
  certifications?: ProductCertificationModel[];
}

export interface WishlistModel {
  id: string;
  userId: string;
  productId: string;
  createdAt: Date;
  product?: ProductModel;
}
