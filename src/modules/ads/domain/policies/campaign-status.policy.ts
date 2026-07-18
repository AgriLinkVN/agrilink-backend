import { AdStatus } from '@common/enums';
import { InvalidAdCampaignStateError } from '../errors/invalid-ad-campaign-state.error';

export function assertCampaignCanBePaused(status: AdStatus): void {
  if (status !== AdStatus.ACTIVE) {
    throw new InvalidAdCampaignStateError(
      `Chỉ có thể tạm dừng chiến dịch đang chạy. Trạng thái hiện tại: ${status}`,
    );
  }
}

export function assertCampaignCanBeResumed(status: AdStatus): void {
  if (status !== AdStatus.PAUSED) {
    throw new InvalidAdCampaignStateError(
      `Chỉ có thể tiếp tục chiến dịch đã tạm dừng. Trạng thái hiện tại: ${status}`,
    );
  }
}
