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
} from '@nestjs/common';
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
