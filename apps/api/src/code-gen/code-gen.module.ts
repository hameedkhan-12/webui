// apps/api/src/modules/code-gen/code-gen.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CodeGenController } from './code-gen.controller';
import { CodeGenService } from './code-gen.service';
import { GeminiService } from './services/gemini.service';
import { TemplateService } from './services/template.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule, // For environment variables
    PrismaModule,
    CacheModule,
    EventEmitterModule.forRoot({
      // Use this instance across the entire application
      global: true,
    }),
  ],
  controllers: [CodeGenController],
  providers: [
    CodeGenService,
    GeminiService,
    TemplateService,
  ],
  exports: [
    CodeGenService,
    GeminiService, // Export for use in other modules
    TemplateService, // Export for use in other modules
  ],
})
export class CodeGenModule {}