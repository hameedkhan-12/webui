import {
    Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import type { AssetQuery, OptimizeAssetDto } from '@repo/shared';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/storage/multer.config';

@Controller('assets')
export class AssetsController {
  constructor(private readonly service: AssetsService) {}

  @Get()
  findAll(
    @CurrentUser()
    user: {
      id: string;
      projectId: string;
    },
    @Query() query: AssetQuery,
  ) {
    return this.service.findAll(user.projectId, query);
  }

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  upload(
    @CurrentUser() user: { id: string; projectId: string },
    @UploadedFile() file: Express.Multer.File,
    @Query('tags') tagsParam?: string,
  ) {
    const tags = tagsParam
      ? tagsParam
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];

    return this.service.upload(user.projectId, user.id, file, tags);
  }

  @Get('usage')
  getUsage(@CurrentUser() user: { id: string; projectId: string }) {
    return this.service.getUsage(user.projectId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: { id: string; projectId: string },
    @Param('id') id: string,
  ) {
    return this.service.findOne(user.projectId, id);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: { id: string; projectId: string },
    @Param('id') id: string,
  ) {
    return this.service.remove(user.projectId, id);
  }

  @Post(':id/optimize')
  optimize(
    @CurrentUser() user: { id: string, projectId: string},
    @Param('id') id: string,
    @Body() dto: OptimizeAssetDto
  ){
    return this.service.optimize(user.projectId, id, dto);
  }
}
