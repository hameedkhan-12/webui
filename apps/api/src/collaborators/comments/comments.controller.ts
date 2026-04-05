import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClerkAuthGuard } from 'src/auth/clerk-auth.guard';
import { CommentsService } from './comments.service';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import type { CreateCommentDto } from '@repo/shared';

@Controller('projects/:projectId/comments')
@UseGuards(ClerkAuthGuard)
export class CommentsController {
  constructor(private readonly service: CommentsService) {}

  @Get()
  findAll(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
  ) {
    return this.service.findAll(projectId, user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Body() body: CreateCommentDto,
  ) {
    return this.service.create(projectId, user.id, body);
  }

  
}
