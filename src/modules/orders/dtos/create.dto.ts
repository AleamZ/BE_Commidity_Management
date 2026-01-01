import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  ValidateNested,
  Min,
  ValidateIf,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductEnum } from 'src/common/enums/product';
class ProductAttributeDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsOptional()
  @IsString()
  _id?: string;
}

class ProductVariableDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeDto)
  attribute: ProductAttributeDto[];

  @IsString()
  @IsNotEmpty()
  variableId: string;

  @IsArray()
  @IsString({ each: true })
  serials: string[];

  @IsNumber()
  sellPrice: number;

  @IsNumber()
  @IsOptional()
  realSellPrice: number;
}

export class ProductItemDto {
  @IsNumber()
  @IsNotEmpty()
  typeProduct: ProductEnum;

  @IsString()
  @IsNotEmpty()
  cartProductId: string;

  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  // quantity bắt buộc nếu typeProduct là 100 hoặc 300
  @ValidateIf((o) => o.typeProduct === 100 || o.typeProduct === 300)
  @IsNumber()
  @Min(1)
  quantity: number;

  // sellPrice bắt buộc nếu typeProduct là 100, 200, 300 hoặc trong variable
  @ValidateIf((o) => o.typeProduct === 100 || o.typeProduct === 200)
  @IsNumber()
  sellPrice: number;

  @IsNumber()
  @IsOptional()
  realSellPrice: number;

  // variable bắt buộc nếu typeProduct là 300 hoặc 400
  @ValidateIf((o) => o.typeProduct === 300 || o.typeProduct === 400)
  @ValidateNested()
  @Type(() => ProductVariableDto)
  variable?: ProductVariableDto;

  // serials bắt buộc nếu typeProduct là 200
  @ValidateIf((o) => o.typeProduct === 200)
  @IsArray()
  @IsString({ each: true })
  serials?: string[];
}

export class CreateOrderDto {
  @IsMongoId()
  @IsNotEmpty()
  staffId: string;

  @IsMongoId()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsPhoneNumber('VN')
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  customerAddress?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductItemDto)
  productList: ProductItemDto[];

  @IsEnum(['percent', 'money'])
  discountType: 'percent' | 'money';

  @IsNumber()
  @Min(0)
  discountValue: number;

  @IsNumber()
  totalAmount: number;

  @IsNumber()
  totalAmountDiscount: number;

  @IsNumber()
  customerPaid: number;

  @IsDateString()
  @IsOptional()
  saleDate?: string;
}
