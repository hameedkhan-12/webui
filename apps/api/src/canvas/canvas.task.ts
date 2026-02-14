// apps/api/src/modules/canvas/canvas.tasks.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CanvasService } from './canvas.service';

@Injectable()
export class CanvasTasks {
  private readonly logger = new Logger(CanvasTasks.name);

  constructor(private canvasService: CanvasService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleLockCleanup() {
    try {
      const count = await this.canvasService.cleanupExpiredLocks();
      if (count > 0) {
        this.logger.log(`Cleaned up ${count} expired locks`);
      }
    } catch (error) {
      this.logger.error('Failed to clean up expired locks:', error);
    }
  }
}
