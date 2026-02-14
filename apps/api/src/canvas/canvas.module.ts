// apps/api/src/modules/canvas/canvas.module.ts

import { Module } from '@nestjs/common';
import { CanvasController } from './canvas.controller';
import { CanvasService } from './canvas.service';
import { CanvasGateway } from './canvas.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [CanvasController],
  providers: [CanvasService, CanvasGateway],
  exports: [CanvasService],
})
export class CanvasModule {}