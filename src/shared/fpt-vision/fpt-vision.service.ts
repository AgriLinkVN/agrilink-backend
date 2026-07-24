import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KycVisionPort } from '../../modules/profiles/application/ports/outbound/kyc-vision.port';

@Injectable()
export class FptVisionService implements KycVisionPort {
  private readonly logger = new Logger(FptVisionService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Mocks the FPT.AI Vision API call for CCCD verification.
   * @param authorizedSource Authorized bytes or a short-lived private source handle.
   * @returns boolean Indicating whether the CCCD is valid
   */
  async verifyCccdImage(authorizedSource: string | Buffer): Promise<boolean> {
    this.logger.log('Starting FPT.AI Vision verification');
    
    // Example structure for the real HTTP call (commented out):
    /*
    const apiKey = this.configService.get<string>('FPT_AI_VISION_KEY');
    try {
      const response = await axios.post(
        'https://api.fpt.ai/vision/idr/vnm',
        { image: authorizedSource },
        { headers: { 'api-key': apiKey } }
      );
      
      if (response.data?.errorCode === 0 && response.data?.data?.length > 0) {
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('FPT.AI Vision API failed', error);
      return false;
    }
    */

    // Mock logic: Simulate network delay of 2 seconds
    return new Promise((resolve) => {
      setTimeout(() => {
        this.logger.log('FPT.AI Vision verification completed');
        resolve(true); // Always return true for now
      }, 2000);
    });
  }

  async verifyCccd(imageUrl: string): Promise<Record<string, string>> {
    this.logger.log(`Mock verifyCccd: ${imageUrl}`);
    return { id: 'mock', name: '', dob: '', sex: '', nationality: '', home: '', address: '' };
  }

  async verifyCccdFull(frontUrl: string, backUrl: string): Promise<Record<string, string>> {
    this.logger.log(`Mock verifyCccdFull: ${frontUrl}, ${backUrl}`);
    return { id: 'mock', name: '', dob: '', sex: '', nationality: '', home: '', address: '' };
  }

  async verifyBrc(imageUrl: string): Promise<Record<string, string>> {
    this.logger.log(`Mock verifyBrc: ${imageUrl}`);
    return {};
  }
}
