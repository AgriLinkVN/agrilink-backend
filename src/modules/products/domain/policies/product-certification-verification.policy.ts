import { CertificationStatus } from '@common/enums';
import { InvalidProductCertificationVerificationError } from '../errors/product-application.error';

export interface CertificationVerificationInput {
  status: CertificationStatus;
  rejectionReason?: string;
}

export function assertValidCertificationVerification(
  input: CertificationVerificationInput,
): void {
  if (input.status === CertificationStatus.PENDING) {
    throw new InvalidProductCertificationVerificationError(
      'Trạng thái duyệt phải là verified hoặc rejected',
    );
  }
  if (input.status === CertificationStatus.REJECTED && !input.rejectionReason?.trim()) {
    throw new InvalidProductCertificationVerificationError(
      'Vui lòng nhập lý do từ chối chứng nhận',
    );
  }
}
