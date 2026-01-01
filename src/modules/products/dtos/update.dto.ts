import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Types } from 'mongoose';

class AttributeDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}

class VariableInputDto {
  @IsString()
  @IsOptional()
  _id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeDto)
  @IsOptional()
  attribute: { key: string; value: string }[];

  @IsNumber()
  @IsOptional()
  costPrice: number;

  @IsNumber()
  @IsOptional()
  sellPrice: number;

  @IsNumber()
  @IsOptional()
  stock: number;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  @IsOptional()
  mainImage?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  listImage?: string[];
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  costPrice?: number;

  @IsNumber()
  @IsOptional()
  sellPrice?: number;

  @IsNumber()
  @IsOptional()
  stock?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsMongoId()
  @IsOptional()
  brandId?: string | Types.ObjectId;

  @IsMongoId()
  @IsOptional()
  categoryId?: string | Types.ObjectId;

  @IsString()
  @IsOptional()
  mainImage?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  listImage?: string[];

  @IsBoolean()
  @IsOptional()
  isVariable?: boolean;

  @IsArray()
  @IsOptional()
  variablesProduct?: any[]; // Using any[] since we need to handle both new and existing variables

  @IsBoolean()
  @IsOptional()
  isSerial?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  serials?: string[];

  @IsString()
  @IsOptional()
  barcode?: string;
}
