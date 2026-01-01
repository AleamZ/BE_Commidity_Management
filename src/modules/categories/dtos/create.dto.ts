import { IsNotEmpty } from 'class-validator';

export class CategoryBrandDto {
  @IsNotEmpty({ message: 'Name is require' })
  name: string;
}
