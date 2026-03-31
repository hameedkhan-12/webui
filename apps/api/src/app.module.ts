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
import { CodeGenModule } from './code-gen/code-gen.module';
import { PublishModule } from './publish/publish.module';
import { StorageModule } from './storage/storage.module';
import { AssetsModule } from './assets/assets.module';
import { CmsModule } from './cms/cms.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    PrismaModule,
    CacheModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    InngestModule,
    AiModule,
    CanvasModule,
    CodeGenModule,
    PublishModule,
    StorageModule,
    AssetsModule,
    CmsModule,
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
