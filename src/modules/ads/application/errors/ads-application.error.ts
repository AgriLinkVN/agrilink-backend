export class AdPackageNotFoundError extends Error {
  constructor(message = 'Không tìm thấy gói quảng cáo đang hoạt động') {
    super(message);
    this.name = 'AdPackageNotFoundError';
  }
}

export class AdCampaignNotFoundError extends Error {
  constructor(message = 'Không tìm thấy chiến dịch quảng cáo') {
    super(message);
    this.name = 'AdCampaignNotFoundError';
  }
}

export class AdCampaignForbiddenError extends Error {
  constructor(message = 'Bạn không có quyền truy cập chiến dịch quảng cáo này') {
    super(message);
    this.name = 'AdCampaignForbiddenError';
  }
}
