import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../../../common/enums';

export class RegisterDto {
  @ApiPropertyOptional({ example: '+84901234567', description: 'Vietnamese phone number' })
  @IsOptional()
  @IsString()
  @Matches(/^\+84[0-9]{9}$/, { message: 'Phone must be a valid Vietnamese number (+84xxxxxxxxx)' })
  phone?: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Str0ngP@ss!', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.FARMER })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({ example: 'Nguyen Van A' })
  @IsOptional()
  @IsString()
  fullName?: string;
}
