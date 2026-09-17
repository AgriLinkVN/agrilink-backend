import { Module } from '@nestjs/common';
import { FptVisionService } from './fpt-vision.service';
import { KYC_VISION } from '../../modules/profiles/application/ports/outbound/kyc-vision.port';

@Module({
  providers: [FptVisionService, { provide: KYC_VISION, useExisting: FptVisionService }],
  exports: [KYC_VISION],
})
export class FptVisionRoute {}
