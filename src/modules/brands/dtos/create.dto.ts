import { IsNotEmpty } from 'class-validator';

export class CreateBrandDto {
  @IsNotEmpty({ message: 'Name is require' })
  name: string;
}
