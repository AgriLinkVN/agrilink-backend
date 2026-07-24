export const KYC_VISION = Symbol('KYC_VISION');
export interface KycVisionPort { verifyCccdImage(authorizedSource: string | Buffer): Promise<boolean>; }
