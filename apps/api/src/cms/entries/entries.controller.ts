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
  Query,
  UseGuards,
} from '@nestjs/common';
import { EntriesService } from './entries.service';
import type {
  CreateEntryDto,
  PaginationQuery,
  UpdateEntryDto,
} from '@repo/shared';
import { ClerkAuthGuard } from 'src/auth/clerk-auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { ProjectGuard } from 'src/guards/project.guard';

@Controller('cms/collections/:collectionId/entries')
@UseGuards(ClerkAuthGuard, ProjectGuard)
export class EntriesController {
  constructor(private readonly entriesService: EntriesService) {}

  @Get()
  findAll(
    @CurrentUser() user: { id: string; projectId: string },
    @Query() query: PaginationQuery,
    @Param('collectionId') collectionId: string,
  ) {
    return this.entriesService.findAllEntries(
      collectionId,
      user.projectId,
      query,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createEntry(
    @CurrentUser() user: { id: string; projectId: string },
    @Param('collectionId') collectionId: string,
    @Body() dto: CreateEntryDto,
  ) {
    return this.entriesService.createEntry(
      collectionId,
      user.projectId,
      user.id,
      dto,
    );
  }

  @Get(':entryId')
  findOneEntry(
    @CurrentUser() user: { id: string; projectId: string },
    @Param('collectionId') collectionId: string,
    @Param('entryId') entryId: string,
  ) {
    return this.entriesService.findOneEntry(
      collectionId,
      entryId,
      user.projectId,
    );
  }

  @Patch(':entryId')
  updateEntry(
    @CurrentUser() user: { id: string; projectId: string },
    @Param('collectionId') collectionId: string,
    @Param('entryId') entryId: string,
    @Body() dto: UpdateEntryDto,
  ) {
    return this.entriesService.updateEntry(
      collectionId,
      entryId,
      user.projectId,
      dto,
    );
  }

  @Delete(':entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  DeleteMarkerEntry$(
    @CurrentUser() user: { id: string; projectId: string },
    @Param('collectionId') collectionId: string,
    @Param('entryId') entryId: string,
  ) {
    return this.entriesService.delete(collectionId, entryId, user.projectId);
  }
}
