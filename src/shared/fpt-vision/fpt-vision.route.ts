import { Module } from '@nestjs/common';
import { FptVisionService } from './fpt-vision.service';

@Module({
  providers: [FptVisionService],
  exports: [FptVisionService],
})
export class FptVisionRoute {}
