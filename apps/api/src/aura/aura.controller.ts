import { Body, Controller, Post } from '@nestjs/common';
import { AuraService } from './aura.service.js';

@Controller('aura')
export class AuraController {
  constructor(private readonly aura: AuraService) {}

  @Post('register-generated')
  async registerGenerated(@Body() body: { projectId?: string; path: string; meta: any }) {
    await this.aura.registerGenerated(body.projectId ?? 'default', body.path, body.meta);
    return { success: true };
  }
}
