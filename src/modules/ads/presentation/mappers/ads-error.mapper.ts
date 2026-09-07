import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

import {
  AdCampaignForbiddenError,
  AdCampaignNotFoundError,
  AdPackageNotFoundError,
} from '../../application/errors/ads-application.error';
import { InvalidAdCampaignStateError } from '../../domain/errors/invalid-ad-campaign-state.error';

export function mapAdsApplicationError(error: unknown): never {
  if (error instanceof AdPackageNotFoundError || error instanceof AdCampaignNotFoundError) {
    throw new NotFoundException(error.message);
  }
  if (error instanceof AdCampaignForbiddenError) {
    throw new ForbiddenException(error.message);
  }
  if (error instanceof InvalidAdCampaignStateError) {
    throw new ConflictException(error.message);
  }
  throw error;
}
