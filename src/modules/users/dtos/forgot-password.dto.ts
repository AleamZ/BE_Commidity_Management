import { IsEmail, IsString, MinLength } from 'class-validator';

export class ForgotPasswordDto {
    @IsEmail()
    email: string;
}

export class VerifyOTPDto {
    @IsEmail()
    email: string;

    @IsString()
    otp: string;
}

export class ResetPasswordDto {
    @IsEmail()
    email: string;

    @IsString()
    otp: string;

    @IsString()
    @MinLength(6)
    newPassword: string;
} 