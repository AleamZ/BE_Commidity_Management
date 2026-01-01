import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CustomerDeptDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsNumber()
  @IsNotEmpty()
  money: number;
}
