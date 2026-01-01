import { IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class UpdateProfileDto {
    @IsOptional()
    @IsNotEmpty({ message: 'Name is required' })
    name?: string;

    @IsOptional()
    @IsEmail({}, { message: 'Invalid email format' })
    email?: string;
} 