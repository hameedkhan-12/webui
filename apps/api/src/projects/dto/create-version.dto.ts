import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVersionDto {
  @IsObject()
  snapshot: Record<string, any>;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  message?: string;
}
