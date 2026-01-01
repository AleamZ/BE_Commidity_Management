import {
    Body,
    Controller,
    Get,
    HttpStatus,
    Patch,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import { AuthUseCase } from './use-cases/auth.use-case';
import { createResponse } from 'src/common/helpers/response.helper';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';

@Controller('account')
@UseGuards(JwtAuthGuard)
export class AccountController {
    constructor(private readonly authUseCase: AuthUseCase) { }

    @Get('profile')
    async getProfile(@Request() req: any) {
        const userId = req.user.userId;
        const profile = await this.authUseCase.getProfile(userId);
        return createResponse(HttpStatus.OK, profile, 'Lấy thông tin tài khoản thành công');
    }

    @Patch('profile')
    async updateProfile(@Request() req: any, @Body() updateProfileDto: UpdateProfileDto) {
        const userId = req.user.userId;
        const updatedProfile = await this.authUseCase.updateProfile(userId, updateProfileDto);
        return createResponse(HttpStatus.OK, updatedProfile, 'Cập nhật thông tin tài khoản thành công');
    }

    @Post('change-password')
    async changePassword(@Request() req: any, @Body() changePasswordDto: ChangePasswordDto) {
        const userId = req.user.userId;
        await this.authUseCase.changePassword(userId, changePasswordDto);
        return createResponse(HttpStatus.OK, null, 'Đổi mật khẩu thành công');
    }
} 