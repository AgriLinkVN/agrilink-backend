export type CooperativeMemberStatus =
  | 'pending'
  | 'active'
  | 'suspended'
  | 'rejected'
  | 'left';

/** P3-owned listing state. ProductStatus must not be reused by P3. */
export type BulkListingStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'archived';

export interface CooperativeMemberModel {
  id: string;
  cooperativeId: string;
  farmerId: string;
  status: CooperativeMemberStatus;
  role: string | null;
  joinedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BulkListingModel {
  id: string;
  cooperativeId: string;
  title: string;
  description: string | null;
  productCategoryId: string | null;
  totalQuantity: string;
  unit: string;
  pricePerUnit: string;
  deadline: Date | null;
  isOpen: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BulkListingContributionModel {
  id: string;
  bulkListingId: string;
  farmerId: string;
  quantity: string;
  unit: string;
  createdAt: Date;
}

export interface HarvestScheduleModel {
  id: string;
  userId: string;
  productId: string | null;
  cropName: string;
  expectedHarvestDate: Date;
  estimatedQuantity: string | null;
  unit: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Only UUIDs may cross P3's public/application boundary for a province. */
export interface CooperativeProvinceReferenceModel {
  cooperativeId: string;
  provinceId: string;
  createdAt: Date;
  updatedAt: Date;
}
