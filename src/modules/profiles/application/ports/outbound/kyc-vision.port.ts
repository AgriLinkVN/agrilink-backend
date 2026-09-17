export const KYC_VISION = Symbol('KYC_VISION');

export interface CccdData {
  id: string;
  name: string;
  dob: string;
  sex: string;
  nationality: string;
  home: string;
  address: string;
  issue_date?: string;
  issue_loc?: string;
}

export interface KycVisionPort {
  /** @deprecated — use verifyCccd or verifyCccdFull */
  verifyCccdImage(authorizedSource: string | Buffer): Promise<boolean>;
  verifyCccd(imageUrl: string): Promise<Record<string, string>>;
  verifyCccdFull(frontUrl: string, backUrl: string): Promise<Record<string, string>>;
  verifyBrc(imageUrl: string): Promise<Record<string, string>>;
}
