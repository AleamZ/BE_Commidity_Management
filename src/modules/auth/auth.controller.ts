import { Body, Controller, Post, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from '../users/dtos/login.dto';
import { RegisterDTO } from '../users/dtos/register.dto';
import { ForgotPasswordDto, ResetPasswordDto, VerifyOTPDto } from '../users/dtos/forgot-password.dto';
import { createResponse } from 'src/common/helpers/response.helper';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    async login(@Body() dto: LoginDto) {
        const data = await this.authService.login(dto);
        return createResponse(HttpStatus.OK, data, 'Đăng nhập thành công');
    }

    @Post('register')
    async register(@Body() dto: RegisterDTO) {
        const data = await this.authService.register(dto);
        return createResponse(HttpStatus.OK, data, 'Đăng ký thành công');
    }

    @Post('forgot-password')
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        const data = await this.authService.forgotPassword(dto);
        return createResponse(HttpStatus.OK, data, 'Gửi mã OTP thành công');
    }

    @Post('verify-otp')
    async verifyOTP(@Body() dto: VerifyOTPDto) {
        const data = await this.authService.verifyOTP(dto);
        return createResponse(HttpStatus.OK, data, 'Xác thực OTP thành công');
    }

    @Post('reset-password')
    async resetPassword(@Body() dto: ResetPasswordDto) {
        const data = await this.authService.resetPassword(dto);
        return createResponse(HttpStatus.OK, data, 'Đặt lại mật khẩu thành công');
    }
} 