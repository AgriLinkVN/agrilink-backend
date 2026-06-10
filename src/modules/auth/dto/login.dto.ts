import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: '+84901234567',
    description: 'Registered phone number',
  })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Str0ngP@ss!' })
  @IsString()
  @MinLength(6)
  password: string;
}
