import { AdStatus, AdType } from '@common/enums';

export type AdEventType = 'impression' | 'click';

export interface AdPackageModel {
  id: number;
  name: string;
  adType: AdType;
  price: number;
  durationDays: number;
  maxImpressions: number | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdCampaignModel {
  id: string;
  supplierId: string;
  packageId: number;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  targetProvinces: number[];
  status: AdStatus;
  rejectionReason: string | null;
  startDate: string | null;
  endDate: string | null;
  totalImpressions: number;
  totalClicks: number;
  createdAt: Date;
  updatedAt: Date;
  package?: AdPackageModel;
}

export interface CreateAdCampaignInput {
  title: string;
  packageId: number;
  imageUrl: string;
  linkUrl?: string;
  targetProvinces?: number[];
}

export interface AdCampaignPagination {
  page?: number;
  limit?: number;
}

export interface AdCampaignModerationFilter extends AdCampaignPagination {
  status?: AdStatus;
}

export interface NormalizedAdCampaignPagination {
  page: number;
  limit: number;
}

export interface AdCampaignListResult {
  data: AdCampaignModel[];
  total: number;
  page: number;
  limit: number;
}

export interface TrackAdEventInput {
  campaignId: string;
  eventType: AdEventType;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface ModerateAdCampaignInput {
  status: AdStatus.ACTIVE | AdStatus.REJECTED;
  approvedBy: string;
  approvedAt: Date;
  rejectionReason: string | null;
  startDate: string | null;
  endDate: string | null;
}
