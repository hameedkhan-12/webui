// apps/api/src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { ClerkClientProvider } from './providers/clerk-client.provider';
import { APP_GUARD } from '@nestjs/core';
import { ClerkAuthGuard } from './auth/clerk-auth.guard';
import { PrismaModule } from './prisma/prisma.module';
import { InngestModule } from './inngest/inngest.module';
import { AiModule } from './ai/ai.module';
import { CanvasModule } from './canvas/canvas.module';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(), // For scheduled tasks (lock cleanup)
    EventEmitterModule.forRoot(), // For real-time events
    PrismaModule,
    CacheModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    InngestModule,
    AiModule,
    CanvasModule,
  ],
  controllers: [AppController],
  providers: [
    ClerkClientProvider,
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
  ],
})
export class AppModule {}