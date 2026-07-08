import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { ClerkAuthGuard } from 'src/auth/clerk-auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';

// The shape returned by ClerkStrategy → UsersService.syncUser → Prisma User
interface AuthUser {
  id: string;
  clerkId: string;
  email: string;
}

@Controller('workspace')
@UseGuards(ClerkAuthGuard)
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get(':projectId')
  async fetchWorkspace(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ) {
    return this.workspaceService.fetchWorkspace(user.id, projectId);
  }

  @Put(':projectId')
  @HttpCode(HttpStatus.OK)
  async saveWorkspace(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() body: { entries: { path: string; content: string; kind: string }[] },
  ) {
    if (!body || !Array.isArray(body.entries)) {
      throw new BadRequestException('Invalid entries payload');
    }
    return this.workspaceService.saveWorkspace(user.id, projectId, body.entries);
  }

  @Post(':projectId/folders')
  @HttpCode(HttpStatus.CREATED)
  async createFolder(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() body: { folderPath?: string; path?: string },
  ) {
    const path = body.folderPath || body.path;
    if (!path) {
      throw new BadRequestException('Folder path is required');
    }
    return this.workspaceService.createFolder(user.id, projectId, path);
  }
}
