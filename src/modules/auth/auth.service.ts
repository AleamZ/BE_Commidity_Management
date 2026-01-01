import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../users/repositories/user.repository';
import { LoginDto } from '../users/dtos/login.dto';
import { RegisterDTO } from '../users/dtos/register.dto';
import { ForgotPasswordDto, ResetPasswordDto, VerifyOTPDto } from '../users/dtos/forgot-password.dto';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OTP } from '../users/schemas/otp.schema';
import { MailService } from '../users/services/mail.service';
import { UserDocument } from '../users/user.entity';

@Injectable()
export class AuthService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly jwtService: JwtService,
        @InjectModel(OTP.name) private readonly otpModel: Model<OTP>,
        private readonly mailService: MailService,
    ) { }

    async login(data: LoginDto) {
        const user = await this.userRepository.checkEmail(data.email);
        if (!user) {
            throw new BadRequestException('Email hoặc password không hợp lệ');
        }
        const comparedPassword = await bcrypt.compare(data.password, user.password);
        if (!comparedPassword) {
            throw new BadRequestException('Email hoặc password không hợp lệ');
        }
        const payload = {
            name: user.name,
            userId: user._id,
            email: user.email,
            role: user.role,
        };
        const accessToken = await this.jwtService.signAsync(payload, {
            secret: process.env.JWT_ACCESS_SECRET,
            expiresIn: '1h',
        });
        const refreshToken = await this.jwtService.signAsync(payload, {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: '7d',
        });
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        await this.userRepository.updateRefreshToken(
            (user._id as Types.ObjectId).toString(),
            hashedRefreshToken,
        );
        return {
            accessToken,
            refreshToken,
        };
    }

    async register(data: RegisterDTO) {
        const checkEmailExits = await this.userRepository.checkEmail(data.email);
        if (checkEmailExits) {
            throw new BadRequestException('Email đã tồn tại');
        }
        const hashPassword = await bcrypt.hash(data.password, 10);
        const convertData = { ...data, password: hashPassword };
        return this.userRepository.createUser(convertData);
    }

    async forgotPassword(data: ForgotPasswordDto) {
        const user = await this.userRepository.checkEmail(data.email);
        if (!user) {
            throw new BadRequestException('Email không tồn tại trong hệ thống');
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP to database
        await this.otpModel.create({
            email: data.email,
            otp: await bcrypt.hash(otp, 10)
        });

        // Send OTP via email
        await this.mailService.sendOTP(data.email, otp);

        return { message: 'Mã OTP đã được gửi đến email của bạn' };
    }

    async verifyOTP(data: VerifyOTPDto) {
        const otpRecord = await this.otpModel
            .findOne({ email: data.email })
            .sort({ createdAt: -1 });

        if (!otpRecord) {
            throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
        }

        const isOTPValid = await bcrypt.compare(data.otp, otpRecord.otp);
        if (!isOTPValid) {
            throw new BadRequestException('Mã OTP không chính xác');
        }

        return { message: 'Xác thực OTP thành công' };
    }

    async resetPassword(data: ResetPasswordDto) {
        // Verify OTP again
        const otpRecord = await this.otpModel
            .findOne({ email: data.email })
            .sort({ createdAt: -1 });

        if (!otpRecord) {
            throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
        }

        const isOTPValid = await bcrypt.compare(data.otp, otpRecord.otp);
        if (!isOTPValid) {
            throw new BadRequestException('Mã OTP không chính xác');
        }

        // Update password
        const user = await this.userRepository.checkEmail(data.email);
        if (!user) {
            throw new BadRequestException('Email không tồn tại trong hệ thống');
        }

        const hashedPassword = await bcrypt.hash(data.newPassword, 10);
        await this.userRepository.updatePassword((user._id as Types.ObjectId).toString(), hashedPassword);

        // Delete used OTP
        await this.otpModel.deleteMany({ email: data.email });

        return { message: 'Đặt lại mật khẩu thành công' };
    }
} 