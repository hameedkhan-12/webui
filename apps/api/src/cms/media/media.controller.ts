import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';

import { multerConfig } from '../../storage/multer.config';
import { ClerkAuthGuard } from 'src/auth/clerk-auth.guard';
import { ProjectGuard } from 'src/guards/project.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { type MediaQuery } from '@repo/shared';

@Controller('api/v1/cms/media')
@UseGuards(ClerkAuthGuard, ProjectGuard)
export class MediaController {
  constructor(private readonly service: MediaService) {}

  @Get()
  findAll(
    @CurrentUser() user: { id: string; projectId: string },
    @Query() query: MediaQuery,
  ) {
    return this.service.findAll(user.projectId, query);
  }

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  upload(
    @CurrentUser() user: { id: string; projectId: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.upload(user.projectId, user.id, file);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: { id: string; projectId: string },
    @Param('id') id: string,
  ) {
    return this.service.remove(user.projectId, id);
  }
}
