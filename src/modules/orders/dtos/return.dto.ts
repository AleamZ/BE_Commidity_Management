import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
} from 'class-validator';
import { ProductEnum } from 'src/common/enums/product';

export class ReturnItemDto {
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @IsEnum(ProductEnum)
  typeProduct: ProductEnum;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serial?: string;

  @IsOptional()
  @IsMongoId()
  variableId?: string;
}

export class refundDto {
  @IsNumber()
  @IsNotEmpty()
  money: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ReturnOrderDto {
  @IsString()
  @IsNotEmpty()
  staffId: string;

  @IsNotEmpty()
  refund: refundDto;

  @IsArray()
  itemOrder: ReturnItemDto[];
}
