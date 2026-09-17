import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import { UserRole } from "../../../common/enums";

export class UpdateRoleDto {
  @ApiProperty({ enum: [UserRole.FARMER, UserRole.SUPPLIER, UserRole.BUYER] })
  @IsIn([UserRole.FARMER, UserRole.SUPPLIER, UserRole.BUYER])
  role: UserRole;
}
