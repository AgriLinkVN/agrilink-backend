import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsIn, IsOptional, IsString } from "class-validator";
import { UserRole } from "../../../common/enums";

export class FirebaseSyncDto {
  @ApiPropertyOptional({
    enum: [UserRole.FARMER, UserRole.SUPPLIER, UserRole.BUYER],
  })
  @IsOptional()
  @IsIn([UserRole.FARMER, UserRole.SUPPLIER, UserRole.BUYER])
  role?: UserRole;

  @ApiPropertyOptional({ example: "Nguyen Van A" })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: "user@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string;
}
