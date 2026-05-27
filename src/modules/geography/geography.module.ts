import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeographyController } from './geography.controller';
import { GeographyService } from './geography.service';
import { Province } from './entities/province.entity';
import { District } from './entities/district.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Province, District])],
  controllers: [GeographyController],
  providers: [GeographyService],
  exports: [GeographyService],
})
export class GeographyModule {}
