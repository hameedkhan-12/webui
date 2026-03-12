// apps/api/src/modules/code-gen/code-gen.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { type Response } from 'express';
import { CodeGenService } from './code-gen.service';
import { GeminiService } from './services/gemini.service';

import {
  GenerateCodeDto,
  ExportCodeDto,
  PreviewCodeDto,
  OptimizeCodeDto,
  GenerateTestsDto,
} from './dto/code-gen.dto';
import { ClerkAuthGuard } from 'src/auth/clerk-auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';

@Controller('code-gen')
@UseGuards(ClerkAuthGuard)
export class CodeGenController {
  constructor(
    private readonly codeGenService: CodeGenService,
    private readonly geminiService: GeminiService,
  ) {}

  /**
   * POST /api/code-gen/:projectId
   * Generate code for project
   */
  @Post(':projectId')
  @HttpCode(HttpStatus.ACCEPTED)
  async generateCode(
    @CurrentUser() user: { clerkId: string },
    @Param('projectId') projectId: string,
    @Body() dto: GenerateCodeDto,
  ) {
    return this.codeGenService.generateCode(user.clerkId, projectId, dto);
  }

  /**
   * GET /api/code-gen/:projectId/preview
   * Get preview of generated code
   */
  @Get(':projectId/preview')
  async getPreview(
    @CurrentUser() user: { clerkId: string },
    @Param('projectId') projectId: string,
  ) {
    return this.codeGenService.getPreview(user.clerkId, projectId);
  }

  /**
   * GET /api/code-gen/:projectId/download
   * Download generated code as ZIP
   */
  @Get(':projectId/download')
  async downloadCode(
    @CurrentUser() user: { clerkId: string },
    @Param('projectId') projectId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const zipBuffer = await this.codeGenService.downloadCode(
      user.clerkId,
      projectId,
    );

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="project-${projectId}.zip"`,
      'Content-Length': zipBuffer.length,
    });

    return new StreamableFile(zipBuffer);
  }

  /**
   * POST /api/code-gen/:projectId/export
   * Export code to external platform
   */
  @Post(':projectId/export')
  async exportCode(
    @CurrentUser() user: { clerkId: string },
    @Param('projectId') projectId: string,
    @Body() dto: ExportCodeDto,
  ) {
    return this.codeGenService.exportCode(user.clerkId, projectId, dto);
  }

  /**
   * GET /api/code-gen/:projectId/dependencies
   * Get project dependencies
   */
  @Get(':projectId/dependencies')
  async getDependencies(
    @CurrentUser() user: { clerkId: string },
    @Param('projectId') projectId: string,
  ) {
    return this.codeGenService.getDependencies(user.clerkId, projectId);
  }

  /**
   * GET /api/code-gen/:projectId/status
   * Get code generation status
   */
  @Get(':projectId/status')
  async getStatus(
    @CurrentUser() user: { clerkId: string },
    @Param('projectId') projectId: string,
  ) {
    const preview = await this.codeGenService.getPreview(user.clerkId, projectId);
    return {
      status: preview.status,
      id: preview.id,
      framework: preview.framework,
      createdAt: preview.createdAt,
    };
  }

  /**
   * POST /api/code-gen/optimize
   * Optimize code snippet
   */
  @Post('optimize')
  async optimizeCode(
    @CurrentUser() user: { clerkId: string },
    @Body() dto: OptimizeCodeDto,
  ) {
    const optimized = await this.geminiService.optimizeCode(
      dto.code,
      dto.language,
    );

    return {
      original: dto.code,
      optimized,
      language: dto.language,
    };
  }

  /**
   * POST /api/code-gen/generate-tests
   * Generate tests for component
   */
  @Post('generate-tests')
  async generateTests(
    @CurrentUser() user: { clerkId: string },
    @Body() dto: GenerateTestsDto,
  ) {
    const tests = await this.geminiService.generateTests(
      dto.componentCode,
      dto.componentName,
      dto.framework,
    );

    return {
      componentName: dto.componentName,
      tests,
      framework: dto.framework,
    };
  }

  /**
   * GET /api/code-gen/health
   * Check if code generation service is healthy
   */
  @Get('health')
  async healthCheck() {
    const geminiInfo = this.geminiService.getModelInfo();
    
    return {
      status: 'healthy',
      gemini: geminiInfo,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/code-gen/frameworks
   * Get list of supported frameworks
   */
  @Get('frameworks')
  async getSupportedFrameworks() {
    return {
      frameworks: [
        { id: 'react', name: 'React', version: '19.0', description: 'React with Vite' },
        { id: 'next', name: 'Next.js', version: '16.0', description: 'Next.js with App Router' },
        { id: 'vue', name: 'Vue', version: '3.5', description: 'Vue 3 with Composition API' },
        { id: 'nuxt', name: 'Nuxt', version: '4.0', description: 'Nuxt 4 with Vue 3' },
        { id: 'svelte', name: 'Svelte', version: '5.0', description: 'Svelte 5 with Runes' },
        { id: 'remix', name: 'Remix', version: '2.15', description: 'Remix with React Router' },
        { id: 'astro', name: 'Astro', version: '5.0', description: 'Astro with Islands' },
        { id: 'html', name: 'HTML', version: '-', description: 'Vanilla HTML/CSS/JS' },
      ],
      styling: [
        { id: 'tailwind', name: 'Tailwind CSS', version: '4.0' },
        { id: 'css-modules', name: 'CSS Modules', version: '-' },
        { id: 'styled-components', name: 'Styled Components', version: '6.1' },
        { id: 'emotion', name: 'Emotion', version: '11.13' },
        { id: 'vanilla-css', name: 'Vanilla CSS', version: '-' },
        { id: 'sass', name: 'SASS', version: '1.82' },
      ],
    };
  }

  /**
   * DELETE /api/code-gen/:projectId
   * Delete generated code
   */
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGeneratedCode(
    @CurrentUser() user: { clerkId: string },
    @Param('projectId') projectId: string,
  ) {
    // TODO: Implement deletion
    return { message: 'Code generation deleted' };
  }
}