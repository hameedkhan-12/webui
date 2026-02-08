// apps/api/src/modules/canvas/dto/canvas.dto.ts

import { 
  IsString, 
  IsOptional, 
  IsObject, 
  IsArray, 
  ValidateNested,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ElementType, BulkOperationType } from '../types/canvas.types';

export class CreateElementDto {
  @IsEnum(ElementType)
  @IsNotEmpty()
  type: ElementType;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsObject()
  @IsNotEmpty()
  props: Record<string, any>;

  @IsObject()
  @IsOptional()
  styles?: Record<string, any>;

  @IsString()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  order?: number;

  @IsBoolean()
  @IsOptional()
  locked?: boolean;

  @IsBoolean()
  @IsOptional()
  hidden?: boolean;

  @IsObject()
  @IsOptional()
  responsiveStyles?: Record<string, any>;
}

export class UpdateElementDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsObject()
  @IsOptional()
  props?: Record<string, any>;

  @IsObject()
  @IsOptional()
  styles?: Record<string, any>;

  @IsString()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  order?: number;

  @IsBoolean()
  @IsOptional()
  locked?: boolean;

  @IsBoolean()
  @IsOptional()
  hidden?: boolean;

  @IsObject()
  @IsOptional()
  responsiveStyles?: Record<string, any>;
}

export class BulkElementOperation {
  @IsEnum(BulkOperationType)
  @IsNotEmpty()
  type: BulkOperationType;

  @IsString()
  @IsOptional()
  @IsUUID()
  elementId?: string;

  @IsObject()
  @IsOptional()
  data?: any;

  @IsString()
  @IsOptional()
  tempId?: string; // For optimistic updates
}

export class BulkElementOperationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkElementOperation)
  operations: BulkElementOperation[];

  @IsString()
  @IsNotEmpty()
  sessionId: string; // For tracking related changes
}

export class UpdateStylesDto {
  @IsObject()
  @IsNotEmpty()
  styles: Record<string, any>;
}

export class MoveElementDto {
  @IsString()
  @IsOptional()
  @IsUUID()
  newParentId?: string;

  @IsNumber()
  @Min(0)
  newOrder: number;
}

export class ReorderElementsDto {
  @IsArray()
  @IsNotEmpty()
  elementOrders: Array<{ elementId: string; order: number }>;
}

export class LockElementDto {
  @IsNumber()
  @IsOptional()
  @Min(1000)
  @Max(3600000) // Max 1 hour
  duration?: number; // Lock duration in ms (default: 30 seconds)
}

export class GetCanvasQueryDto {
  @IsBoolean()
  @IsOptional()
  includeHidden?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  version?: number; // Get specific version
}

export class ExportCanvasDto {
  @IsEnum(['react', 'html', 'vue', 'json'])
  @IsNotEmpty()
  format: 'react' | 'html' | 'vue' | 'json';

  @IsObject()
  @IsOptional()
  options?: {
    includeStyles?: boolean;
    framework?: string;
    typescript?: boolean;
  };
}