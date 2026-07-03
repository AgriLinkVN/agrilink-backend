import {
  CertificationStatus,
  CertType,
  FarmingType,
  ProductStatus,
  ProductUnit,
  Region,
  SellerType,
  SupplierType,
} from '@common/enums';

export interface ProductDetailLocation {
  id: string;
  name: string;
  code: string | null;
  region?: Region | null;
}

export interface ProductDetailCategory {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  description: string | null;
  parent: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface ProductDetailImage {
  id: string;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductDetailCertification {
  id: string;
  certType: CertType;
  certNumber: string | null;
  issuedBy: string | null;
  issuedDate: string | null;
  expiryDate: string | null;
  documentUrl: string | null;
  isVerified: boolean;
  status: CertificationStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
}

export interface ProductDetailSeller {
  id: string;
  fullName: string | null;
  phone: string;
  avatarUrl: string | null;
  sellerType: SellerType;

  // farmer
  bio?: string | null;
  farmName?: string | null;
  experienceYears?: number | null;

  // cooperative
  cooperativeName?: string;
  memberCount?: number;

  // supplier
  companyName?: string;
  supplierType?: SupplierType | null;

  province?: ProductDetailLocation | null;
}

export interface ProductDetailResponse {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  variety: string | null;
  pricePerUnit: number;
  unit: ProductUnit;
  availableQuantity: number;
  minOrderQuantity: number | null;
  farmingType: FarmingType | null;
  status: ProductStatus;
  harvestDate: string | null;
  expiryDate: string | null;
  rejectionReason: string | null;
  isFeatured: boolean;
  viewCount: number;
  soldCount: number;
  avgRating: number;
  farmLatitude: number | null;
  farmLongitude: number | null;
  createdAt: string;
  updatedAt: string;

  province: ProductDetailLocation | null;
  district: ProductDetailLocation | null;
  category: ProductDetailCategory | null;
  images: ProductDetailImage[];
  certifications: ProductDetailCertification[];
  seller: ProductDetailSeller | null;
}
