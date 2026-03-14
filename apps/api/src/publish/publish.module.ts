import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PublishController } from './publish.controller';
import { PublishService } from './publish.service';
import { BundlerService } from './bundler.service';
import { R2StorageService } from './r2-storage.service';
import { SlugService } from './slug.service';

@Module({
  imports: [PrismaModule],
  controllers: [PublishController],
  providers: [PublishService, BundlerService, R2StorageService, SlugService],
  exports: [PublishService],
})
export class PublishModule {}
