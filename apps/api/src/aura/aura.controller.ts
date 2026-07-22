import { Body, Controller, Post, Get, Put, Param } from '@nestjs/common';
import { AuraService } from './aura.service.js';

@Controller('aura')
export class AuraController {
  constructor(private readonly aura: AuraService) {}

  @Post('register-generated')
  async registerGenerated(@Body() body: { projectId?: string; path: string; meta: any }) {
    await this.aura.registerGenerated(body.projectId ?? 'default', body.path, body.meta);
    return { success: true };
  }

  @Put('tree/:projectId')
  async saveContentTree(
    @Param('projectId') projectId: string,
    @Body() body: { nodes: any[] },
  ) {
    await this.aura.saveContentTree(projectId, body.nodes || []);
    return { success: true };
  }

  @Get('tree/:projectId')
  async loadContentTree(@Param('projectId') projectId: string) {
    const nodes = await this.aura.loadContentTree(projectId);
    return { nodes };
  }
}
