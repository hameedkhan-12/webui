// apps/api/src/modules/ai/ai.controller.ts

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
} from '@nestjs/common';
import * as express from 'express';
import { AiService } from './ai.service';
import { ClerkAuthGuard } from 'src/auth/clerk-auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import {
  GenerateDto,
  GetJobsQueryDto,
  ModifyDto,
  RegenerateDto,
  SuggestionsDto,
  VariationsDto,
} from './dto/ai.dto';

@Controller('ai')
@UseGuards(ClerkAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  async generate(
    @CurrentUser() user: { clerkId: string },
    @Body() dto: GenerateDto,
  ) {
    return this.aiService.generate(user.clerkId, dto);
  }

  @Post('generate-stream')
  async generateStream(
    @CurrentUser() user: { clerkId: string },
    @Body() dto: GenerateDto,
    @Res() res: express.Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      await this.aiService.generateStream(user.clerkId, dto, res);
    } catch (error: any) {
      console.error('[generateStream] Controller error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', data: { message: error?.message || String(error) } })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Post('modify')
  @HttpCode(HttpStatus.ACCEPTED)
  async modify(
    @CurrentUser() user: { clerkId: string },
    @Body() dto: ModifyDto,
  ) {
    return this.aiService.modify(user.clerkId, dto);
  }

  @Post('suggestions')
  @HttpCode(HttpStatus.ACCEPTED)
  async getSuggestions(
    @CurrentUser() user: { clerkId: string },
    @Body() dto: SuggestionsDto,
  ) {
    return this.aiService.getSuggestions(user.clerkId, dto);
  }

  @Post('regenerate')
  @HttpCode(HttpStatus.ACCEPTED)
  async regenerate(
    @CurrentUser() user: { clerkId: string },
    @Body() dto: RegenerateDto,
  ) {
    return this.aiService.regenerate(user.clerkId, dto);
  }

  @Post('variations')
  @HttpCode(HttpStatus.ACCEPTED)
  async generateVariations(
    @CurrentUser() user: { clerkId: string },
    @Body() dto: VariationsDto,
  ) {
    return this.aiService.generateVariations(user.clerkId, dto);
  }

  @Get('jobs/:jobId')
  async getJobStatus(
    @CurrentUser() user: { clerkId: string },
    @Param('jobId') jobId: string,
  ) {
    return this.aiService.getJobStatus(user.clerkId, jobId);
  }

  @Post('jobs/:jobId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelJob(
    @CurrentUser() user: { clerkId: string },
    @Param('jobId') jobId: string,
  ) {
    return this.aiService.cancelJob(user.clerkId, jobId);
  }

  @Get('jobs')
  async getUserJobs(
    @CurrentUser() user: { clerkId: string },
    @Query() query: GetJobsQueryDto,
  ) {
    return this.aiService.getUserJobs(user.clerkId, {
      status: query.status,
      jobType: query.jobType,
      limit: query.limit ? parseInt(query.limit) : 20,
      offset: query.offset ? parseInt(query.offset) : 0,
    });
  }
}
