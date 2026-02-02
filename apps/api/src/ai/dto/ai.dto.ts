// apps/api/src/modules/ai/dto/ai.dto.ts

import {
  IsString,
  IsOptional,
  IsObject,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JobStatus } from '@webra/database';

export class GenerateDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsObject()
  @IsOptional()
  context?: Record<string, any>;
}

export class ModifyDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  elementId: string;

  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsObject()
  @IsOptional()
  context?: Record<string, any>;
}

export class SuggestionsDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsOptional()
  suggestionType?: 'design' | 'color' | 'layout' | 'typography' | 'accessibility';

  @IsObject()
  @IsOptional()
  context?: Record<string, any>;
}

export class RegenerateDto {
  @IsString()
  @IsNotEmpty()
  jobId: string;

  @IsString()
  @IsOptional()
  prompt?: string;
}

export class VariationsDto {
  @IsString()
  @IsNotEmpty()
  baseId: string; // Can be jobId or projectId

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  variationCount?: number;

  @IsObject()
  @IsOptional()
  parameters?: Record<string, any>;
}

export class GetJobsQueryDto {
  @IsEnum(JobStatus)
  @IsOptional()
  status?: JobStatus;

  @IsString()
  @IsOptional()
  jobType?: string;

  @IsString()
  @IsOptional()
  limit?: string;

  @IsString()
  @IsOptional()
  offset?: string;
}