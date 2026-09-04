import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ExactlyOneOf } from '../validation/exactly-one-of.decorator';
import { IsVietnamesePhoneNumber } from '../validation/is-vietnamese-phone.decorator';

export class LoginDto {
  @ApiPropertyOptional({
    example: 'user@example.com',
    description:
      'Registered email address. Provide exactly one of email or phone.',
  })
  @IsOptional()
  @IsString()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: '+84901234567',
    description:
      'Vietnamese phone linked to the account. Provide exactly one of phone or email.',
  })
  @IsOptional()
  @IsString()
  @IsVietnamesePhoneNumber()
  phone?: string;

  @ApiProperty({ example: 'Str0ngP@ss!' })
  @ExactlyOneOf(['email', 'phone'])
  @IsString()
  @MinLength(6)
  password: string;
}
