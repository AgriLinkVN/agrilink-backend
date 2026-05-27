import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums';

export const ROLES_KEY = 'roles';

/**
 * Restricts endpoint access to users with the specified role(s).
 *
 * Usage: @Roles(UserRole.admin, UserRole.state_agency)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
