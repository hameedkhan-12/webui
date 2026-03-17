import {
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ClerkAuthGuard } from 'src/auth/clerk-auth.guard';
import { PublishService } from './publish.service';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { PublishTrigger } from '@webra/database';
import type { Response } from 'express';

@Controller('projects/:projectId/publish')
@UseGuards(ClerkAuthGuard)
export class PublishController {
  constructor(private readonly publishService: PublishService) {}

  @Version('1')
  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: 5,
      ttl: 60000,
    },
  })
  async publish(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
  ) {
    return this.publishService.publishProject(
      projectId,
      user.id,
      PublishTrigger.MANUAL,
    );
  }

  @Version('1')
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async unpublish(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
  ) {
    await this.publishService.unpublishProject(projectId, user.id);
  }

  @Version('1')
  @Get('status')
  async getStatus(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
  ) {
    return this.publishService.getPublishStatus(projectId, user.id);
  }

  @Version('1')
  @Get('history')
  async getHistory(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.publishService.getPublishHistory(projectId, user.id, limit);
  }

  @Version('1')
  @Get('preview/:slug/*filepath')
  async previewSite(
    @Param('slug') slug: string,
    @Param('filepath') filepath: string,
    @Res() res: Response,
  ) {
    return this.publishService.serveLocalFile(
      slug,
      filepath || 'index.html',
      res,
    );
  }
}
