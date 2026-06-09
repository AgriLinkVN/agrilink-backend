import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FptVisionService {
  private readonly logger = new Logger(FptVisionService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Mocks the FPT.AI Vision API call for CCCD verification.
   * @param imageUrl The secure URL of the CCCD image (uploaded to Cloudinary)
   * @returns boolean Indicating whether the CCCD is valid
   */
  async verifyCccdImage(imageUrl: string): Promise<boolean> {
    this.logger.log(`Starting FPT.AI Vision verification for image: ${imageUrl}`);
    
    // Example structure for the real HTTP call (commented out):
    /*
    const apiKey = this.configService.get<string>('FPT_AI_VISION_KEY');
    try {
      const response = await axios.post(
        'https://api.fpt.ai/vision/idr/vnm',
        { image: imageUrl },
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
        this.logger.log(`FPT.AI Vision verification completed for image: ${imageUrl}`);
        resolve(true); // Always return true for now
      }, 2000);
    });
  }
}
