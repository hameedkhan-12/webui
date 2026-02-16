import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  ExportFormat,
  Framework,
  StylingApproach,
} from '../types/code-gen.types';

export class GenerateCodeDto {
  @IsEnum(Framework)
  framework: Framework;

  @IsEnum(StylingApproach)
  styling: StylingApproach;

  @IsBoolean()
  typescript: boolean;

  @IsBoolean()
  @IsOptional()
  includeTests?: boolean;

  @IsBoolean()
  @IsOptional()
  includeStorybook?: boolean;

  @IsBoolean()
  @IsOptional()
  responsiveBreakPoints?: boolean;

  @IsBoolean()
  @IsOptional()
  seo?: boolean;

  @IsBoolean()
  @IsOptional()
  analytics?: boolean;

  @IsBoolean()
  @IsOptional()
  i18n?: boolean;

  @IsBoolean()
  @IsOptional()
  darkMode?: boolean;

  @IsBoolean()
  @IsOptional()
  accessibility?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: {
    title?: string;
    description?: string;
    keywords?: string[];
    author?: string;
  };
}

export class ExportCodeDto {
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsString()
  @IsOptional()
  repositoryName?: string;

  @IsBoolean()
  @IsOptional()
  privateRepo?: boolean;

  @IsString()
  @IsOptional()
  githubToken?: string;
}

export class PreviewCodeDto {
  @IsString()
  @IsOptional()
  entryFile?: string;

  @IsString()
  @IsOptional()
  hotReload?: string;
}

export class UpdateCodeGenDto {
  @IsObject()
  @IsOptional()
  customizations?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  regenerate?: boolean;
}
