import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class PresignDto {
  @ApiProperty({
    example: 'documents/cccd-front.jpg',
    description: 'Đường dẫn file upload lên Supabase',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  path: string;
}
