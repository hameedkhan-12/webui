// apps/backend/src/app.controller.ts
import { Controller, Get, Version } from '@nestjs/common';
import { Public } from './decorators/public.decorator';

@Controller()
export class AppController {
  // Remove constructor - no AppService needed

  @Public()
  @Version('1')
  @Get()
  getHello() {
    return {
      status: 'ok',
      message: 'API is running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health')
  health() {
    return {
      status: 'healthy',
      uptime: process.uptime(),
    };
  }
}