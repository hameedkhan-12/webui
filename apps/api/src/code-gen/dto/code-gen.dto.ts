// apps/api/src/modules/code-gen/dto/code-gen.dto.ts

import {
  IsEnum,
  IsBoolean,
  IsOptional,
  IsString,
  IsObject,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { 
  Framework, 
  StylingApproach, 
  ExportFormat,
  BuildTool,
  PackageManager,
} from '../types/code-gen.types';

export class GenerateCodeDto {
  @IsEnum(Framework)
  framework: Framework;

  @IsEnum(StylingApproach)
  styling: StylingApproach;

  @IsBoolean()
  typescript: boolean;

  @IsEnum(BuildTool)
  @IsOptional()
  buildTool?: BuildTool;

  @IsEnum(PackageManager)
  @IsOptional()
  packageManager?: PackageManager;

  // Features
  @IsBoolean()
  @IsOptional()
  includeTests?: boolean;

  @IsBoolean()
  @IsOptional()
  includeStorybook?: boolean;

  @IsBoolean()
  @IsOptional()
  includeESLint?: boolean;

  @IsBoolean()
  @IsOptional()
  includePrettier?: boolean;

  // UI/UX
  @IsBoolean()
  @IsOptional()
  responsiveBreakpoints?: boolean;

  @IsBoolean()
  @IsOptional()
  darkMode?: boolean;

  @IsBoolean()
  @IsOptional()
  accessibility?: boolean;

  @IsBoolean()
  @IsOptional()
  animations?: boolean;

  // SEO & Performance
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
  pwa?: boolean;

  // State Management
  @IsString()
  @IsOptional()
  stateManagement?: 'zustand' | 'redux' | 'jotai' | 'recoil' | 'none';

  // Data Fetching
  @IsString()
  @IsOptional()
  dataFetching?: 'react-query' | 'swr' | 'apollo' | 'none';

  // Form Handling
  @IsString()
  @IsOptional()
  formLibrary?: 'react-hook-form' | 'formik' | 'none';

  // UI Components
  @IsString()
  @IsOptional()
  componentLibrary?: 'shadcn' | 'radix' | 'mui' | 'chakra' | 'none';

  // Metadata
  @IsObject()
  @IsOptional()
  metadata?: {
    title?: string;
    description?: string;
    author?: string;
    keywords?: string[];
    license?: string;
    repository?: string;
    homepage?: string;
  };
}

export class ExportCodeDto {
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsString()
  @IsOptional()
  repositoryName?: string; // For GitHub export

  @IsBoolean()
  @IsOptional()
  privateRepo?: boolean; // For GitHub export

  @IsString()
  @IsOptional()
  githubToken?: string; // For GitHub export (optional, can use server token)

  @IsString()
  @IsOptional()
  vercelToken?: string; // For Vercel deployment

  @IsString()
  @IsOptional()
  netlifyToken?: string; // For Netlify deployment
}

export class PreviewCodeDto {
  @IsString()
  @IsOptional()
  entryFile?: string; // Specific file to preview (default: main entry)

  @IsBoolean()
  @IsOptional()
  hotReload?: boolean; // Enable hot reload in preview
}

export class UpdateCodeGenDto {
  @IsObject()
  @IsOptional()
  customizations?: Record<string, any>; // Custom code modifications

  @IsBoolean()
  @IsOptional()
  regenerate?: boolean; // Force regeneration
}

export class OptimizeCodeDto {
  @IsString()
  code: string;

  @IsString()
  language: string;

  @IsBoolean()
  @IsOptional()
  performance?: boolean;

  @IsBoolean()
  @IsOptional()
  accessibility?: boolean;

  @IsBoolean()
  @IsOptional()
  seo?: boolean;
}

export class GenerateTestsDto {
  @IsString()
  componentCode: string;

  @IsString()
  componentName: string;

  @IsEnum(Framework)
  framework: Framework;

  @IsBoolean()
  @IsOptional()
  includeE2E?: boolean;
}