// apps/api/src/modules/collaboration/collaboration.module.ts

import { Module } from '@nestjs/common';
import { CommentsController } from './comments/comments.controller';
import { CommentsService } from './comments/comments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CollaboratorsController } from './collaborators.controller';
import { CollaboratorsService } from './collaborators.service';

@Module({
  imports:     [PrismaModule],
  controllers: [CollaboratorsController, CommentsController],
  providers:   [CollaboratorsService, CommentsService],
  exports:     [CollaboratorsService],  
})
export class CollaborationModule {}