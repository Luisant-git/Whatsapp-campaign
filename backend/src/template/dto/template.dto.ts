import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, IsBoolean, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export enum TemplateCategory {
  MARKETING = 'MARKETING',
  UTILITY = 'UTILITY',
  AUTHENTICATION = 'AUTHENTICATION',
}

export enum TemplateStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class TemplateComponentDto {
  @IsEnum(['HEADER', 'BODY', 'FOOTER', 'BUTTONS'])
  type: string;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsArray()
  example?: any[];

  @IsOptional()
  @IsArray()
  buttons?: any[];
}

export class CreateTemplateDto {
  @IsString()
  @MaxLength(512)
  name: string;

  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @IsString()
  language: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateComponentDto)
  components: TemplateComponentDto[];

  @IsOptional()
  @IsBoolean()
  allowCategoryChange?: boolean;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateComponentDto)
  components?: TemplateComponentDto[];
}

export class TemplatePreviewDto {
  @IsString()
  name: string;

  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @IsString()
  language: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateComponentDto)
  components: TemplateComponentDto[];

  @IsOptional()
  @IsArray()
  sampleValues?: string[];
}

export class RequestReviewDto {
  @IsArray()
  @IsString({ each: true })
  templateIds: string[];

  @IsOptional()
  @IsString()
  reason?: string;
}