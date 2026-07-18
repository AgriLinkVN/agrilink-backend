export class InvalidAdCampaignStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAdCampaignStateError';
  }
}
