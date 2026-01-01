import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  MinLength,
} from 'class-validator';
import { UserRole } from 'src/common/enums/role';

export class RegisterDTO {
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Role must be either ADMIN or STAFF' })
  @Transform(({ value }) => value?.toUpperCase())
  role?: UserRole;
}
