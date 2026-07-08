import { Module } from '@nestjs/common';
import { AuraController } from './aura.controller.js';
import { AuraService } from './aura.service.js';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AuraController],
  providers: [AuraService],
  exports: [AuraService],
})
export class AuraModule {}
