import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { UserRole } from '../../common/enums';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user\'s own profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  getMe(@CurrentUser('sub') userId: string) {
    return this.usersService.getMe(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the authenticated user\'s own profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  updateMe(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateMe(userId, dto);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @ApiOperation({ summary: '(Admin) Get any user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  adminGetUser(@Param('id', ParseUuidPipe) id: string) {
    return this.usersService.adminGetUser(id);
  }
}
