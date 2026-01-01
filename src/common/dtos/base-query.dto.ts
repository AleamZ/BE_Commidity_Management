import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsNumberString, IsArray } from 'class-validator';

export class BaseQueryDto {
  [x: string]: any;
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  select?: string;

  @IsOptional()
  @IsString()
  populate?: string;

  @IsOptional()
  @IsString()
  timeType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value, key }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    return [];
  })
  status?: string[];
}
