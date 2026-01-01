import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class AttributeDto {
  @IsString()
  @IsNotEmpty({ message: 'key of attribute is required' })
  key: string;

  @IsString()
  @IsNotEmpty({ message: 'value of attribute is required' })
  value: string;
}

export class CreateVariableDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeDto)
  attribute: AttributeDto[];

  @IsBoolean()
  @IsOptional()
  isSerial?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  serials?: string[];

  @IsNumber()
  @IsNotEmpty()
  costPrice: number;

  @IsNumber()
  @IsNotEmpty()
  sellPrice: number;

  @IsNumber()
  @IsOptional()
  stock?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  mainImage?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  listImage?: string[];

  @IsBoolean()
  @IsOptional()
  isDelete?: boolean;
}
