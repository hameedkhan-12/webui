import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { ClerkAuthGuard } from 'src/auth/clerk-auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { Roles } from 'src/decorators/roles.decorator';
import { UserRole, type User } from '@webra/database';
import { RolesGuard } from 'src/guards/roles.guard';

@Controller('users')
@UseGuards(ClerkAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Version('1')
  @Get('me')
  async getCurrentUser(@CurrentUser() user: User) {
    const fullUser = await this.usersService.getUserByClerkId(user.clerkId);

    return {
      id: fullUser?.id,
      clerkId: fullUser?.clerkId,
      email: fullUser?.email,
      name: fullUser?.name,
      avatar: fullUser?.avatar,
      role: fullUser?.role,
      stats: {
        ownedProjects: fullUser?.ownedProjects,
      },
      createdAt: fullUser?.createdAt,
    };
  }

  @Version('1')
  @Patch('me')
  async updateCurrentUser(
    @CurrentUser() user: User,
    @Body() updatedData: { name?: string; avatar?: string },
  ) {
    return this.usersService.updateUserProfile(user.clerkId, updatedData);
  }

  @Version('1')
  @Get(':id')
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.getUserById(id);

    return {
      id: user?.id,
      name: user?.name,
      avatar: user?.avatar,
      role: user?.role,
      createdAt: user?.createdAt,
    };
  }

  @Version('1')
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllUsers(@Query('page') page = '1', @Query('limit') limit = '20') {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const skip = (pageNum - 1) * limitNum;

    return this.usersService.getAllUsers(skip, limitNum);
  }
}
