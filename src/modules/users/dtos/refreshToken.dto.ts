import { IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty({ message: 'userId is required' })
  userId: string;

  @IsNotEmpty({ message: 'refreshToken is required' })
  refreshToken: string;
}
