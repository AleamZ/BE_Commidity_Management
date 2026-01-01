import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateBrandDto {
    @IsNotEmpty()
    @IsString()
    name: string;
}
