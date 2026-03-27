// apps/api/src/modules/cms/media/media.controller.ts

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
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MediaService } from './media.service';
import { ClerkAuthGuard } from 'src/auth/clerk-auth.guard';
import { ProjectGuard } from 'src/guards/project.guard';
import { MediaType } from '@repo/shared';

@Controller('api/v1/cms/:projectId/media')
@UseGuards(ClerkAuthGuard, ProjectGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  findAll(
    @Param('projectId') projectId: string,
    @Query('type') type?: MediaType,
  ) {
    return this.mediaService.findAll(projectId, type);
  }

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      // memoryStorage — never writes to disk, buffer goes straight to Cloudinary
      storage: memoryStorage(),
      limits: {
        fileSize: 50 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  async upload(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No file provided. Use multipart/form-data with field name "file"',
      );
    }

    return this.mediaService.uploadMedia(projectId, file);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.mediaService.removeMedia(projectId, id);
  }
}
