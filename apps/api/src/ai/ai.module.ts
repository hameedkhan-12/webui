// apps/api/src/modules/ai/ai.module.ts

import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiController } from './ai.controller';
import { InngestModule } from 'src/inngest/inngest.module';

@Module({
  imports: [PrismaModule, InngestModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}