import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Types } from 'mongoose';

export class AttributeDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}

export class CreateVariableDto {
  @IsArray({ message: 'Thuộc tính biến thể phải là mảng' })
  @ValidateNested({ each: true })
  @Type(() => AttributeDto)
  attribute: AttributeDto[];

  @IsBoolean({ message: 'Trạng thái quản lý serial phải là true hoặc false' })
  @IsOptional()
  isSerial?: boolean;

  @IsArray({ message: 'Danh sách serial phải là mảng' })
  @IsString({ each: true, message: 'Mỗi serial phải là chuỗi ký tự' })
  @IsOptional()
  serials?: string[];

  @IsNumber({}, { message: 'Giá vốn biến thể phải là số' })
  @IsNotEmpty({ message: 'Giá vốn biến thể không được để trống' })
  costPrice: number;

  @IsNumber({}, { message: 'Giá bán biến thể phải là số' })
  @IsNotEmpty({ message: 'Giá bán biến thể không được để trống' })
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

export class CreateProductDto {
  @IsString({ message: 'Tên sản phẩm phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  name: string;

  @IsNumber({}, { message: 'Giá vốn phải là số' })
  @IsOptional()
  costPrice?: number;

  @IsNumber({}, { message: 'Giá bán phải là số' })
  @IsOptional()
  sellPrice?: number;

  @IsNumber({}, { message: 'Số lượng tồn kho phải là số' })
  @IsOptional()
  stock?: number;

  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  @IsOptional()
  description?: string;

  @IsMongoId({ message: 'ID thương hiệu không hợp lệ' })
  @IsNotEmpty({ message: 'Thương hiệu không được để trống' })
  brandId: string | Types.ObjectId;

  @IsMongoId({ message: 'ID danh mục không hợp lệ' })
  @IsNotEmpty({ message: 'Danh mục không được để trống' })
  categoryId: string | Types.ObjectId;

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
  @ValidateNested({ each: true })
  @Type(() => CreateVariableDto)
  @IsOptional()
  variablesProduct?: CreateVariableDto[];

  @IsBoolean()
  @IsOptional()
  isSerial?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  serials?: string[];

  @IsString({ message: 'Mã sản phẩm phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mã sản phẩm không được để trống' })
  barcode: string;
}
