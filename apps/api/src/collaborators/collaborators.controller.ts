import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClerkAuthGuard } from 'src/auth/clerk-auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { CollaboratorsService } from './collaborators.service';
import type { AddCollaboratorDto, UpdateCollaboratorRoleDto } from '@repo/shared';

@Controller('projects/:projectId/collaborators')
@UseGuards(ClerkAuthGuard)
export class CollaboratorsController {
  constructor(private readonly service: CollaboratorsService) {}

  @Get()
  findAll(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
  ) {
    return this.service.findAll(projectId, user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  add(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Body() dto: AddCollaboratorDto,
  ) {
    return this.service.add(projectId, user.id, dto);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.service.remove(projectId, user.id, targetUserId);
  }

  @Patch(':userId/role')
  updateRole(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateCollaboratorRoleDto
){
    return this.service.updateRole(projectId, user.id, targetUserId, dto);
}
}
