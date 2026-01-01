import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { RegisterDTO } from './dtos/register.dto';
import { AuthUseCase } from './use-cases/auth.use-case';
import { createResponse } from 'src/common/helpers/response.helper';
import { LoginDto } from './dtos/login.dto';
import { RefreshTokenDto } from './dtos/refreshToken.dto';
import { ForgotPasswordDto, ResetPasswordDto, VerifyOTPDto } from './dtos/forgot-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authUseCase: AuthUseCase) { }

  @Get('staffs')
  async getStaffs() {
    const data = await this.authUseCase.getAllStaff();
    return createResponse(HttpStatus.OK, data, 'Lấy dữ liệu thành công');
  }

  @Delete(':id')
  deleteStaff(@Param('id') id: string) {
    return this.authUseCase.deleteStaff(id);
  }

  @Put(':id')
  updateStaff(@Param('id') id: string, @Body() body: RegisterDTO) {
    return this.authUseCase.updateStaff(id, body);
  }

  @Post('register')
  async create(@Body() dto: RegisterDTO) {
    const data = await this.authUseCase.register(dto);
    return createResponse(HttpStatus.OK, data, 'Đăng ký thành công');
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const data = await this.authUseCase.login(dto);
    return createResponse(HttpStatus.OK, data, 'Đăng nhập thành công');
  }

  @Post('refresh')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    const data = await this.authUseCase.refreshToken(dto);
    return createResponse(HttpStatus.OK, data, 'Refresh Token thành công');
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const data = await this.authUseCase.forgotPassword(dto);
    return createResponse(HttpStatus.OK, data, 'Gửi mã OTP thành công');
  }

  @Post('verify-otp')
  async verifyOTP(@Body() dto: VerifyOTPDto) {
    const data = await this.authUseCase.verifyOTP(dto);
    return createResponse(HttpStatus.OK, data, 'Xác thực OTP thành công');
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const data = await this.authUseCase.resetPassword(dto);
    return createResponse(HttpStatus.OK, data, 'Đặt lại mật khẩu thành công');
  }
}
