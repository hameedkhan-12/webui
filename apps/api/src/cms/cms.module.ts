
import { Module } from '@nestjs/common';
import { CollectionsController } from './collections/collections.controller';
import { EntriesController } from './entries/entries.controller';
import { EntriesService } from './entries/entries.service';
import { MediaController } from './media/media.controller';
import { MediaService } from './media/media.service';
import { CloudinaryService } from './media/cloudinary.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectGuard } from 'src/guards/project.guard';
import { CollectionService } from './collections/collections.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    CollectionsController,
    EntriesController,
    MediaController,
  ],
  providers: [
    CollectionService,
    EntriesService,
    MediaService,
    CloudinaryService,
    ProjectGuard,
  ],
})
export class CmsModule {}