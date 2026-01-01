import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RegisterDTO } from '../dtos/register.dto';
import { UserRepository } from '../repositories/user.repository';
import { User } from '../user.entity';
import * as bcrypt from 'bcrypt';
import { LoginDto } from '../dtos/login.dto';
import { ResponseLogin } from '../types/response-login.interface';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenDto } from '../dtos/refreshToken.dto';
import { UpdateProfileDto } from '../dtos/update-profile.dto';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { ForgotPasswordDto, ResetPasswordDto, VerifyOTPDto } from '../dtos/forgot-password.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OTP } from '../schemas/otp.schema';
import { MailService } from '../services/mail.service';

@Injectable()
export class AuthUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    @InjectModel(OTP.name) private readonly otpModel: Model<OTP>,
    private readonly mailService: MailService,
  ) { }

  async getAllStaff(): Promise<User[]> {
    return this.userRepository.findStaff();
  }
  async deleteStaff(id: string): Promise<void> {
    const staff = await this.userRepository.findStaffById(id);
    if (!staff) throw new NotFoundException('Staff not found');
    await this.userRepository.deleteStaffById(id);
  }

  async updateStaff(id: string, updateData: Partial<User>): Promise<User> {
    const updated = await this.userRepository.updateStaffById(id, updateData);
    if (!updated) throw new NotFoundException('Staff not found or not updated');
    return updated;
  }
  async register(data: RegisterDTO): Promise<User> {
    const checkEmailExits = await this.userRepository.checkEmail(data.email);
    if (checkEmailExits) {
      throw new BadRequestException('Email đã tồn tại');
    }
    const hashPassword = await bcrypt.hash(data.password, 10);
    const convertData = { ...data, password: hashPassword };
    return this.userRepository.createUser(convertData);
  }

  async login(data: LoginDto): Promise<ResponseLogin> {
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
      String(user._id),
      hashedRefreshToken,
    );
    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(data: RefreshTokenDto): Promise<ResponseLogin> {
    const { userId, refreshToken } = data;
    const user = await this.userRepository.findUserById(userId);
    if (!user || !user.refreshToken)
      throw new ForbiddenException('Access Denied');
    const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isMatch) throw new ForbiddenException('Access Denied');
    const payload = { sub: user._id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '1h',
    });

    const newRefreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    await this.userRepository.updateRefreshToken(
      String(user._id),
      hashedRefreshToken,
    );
    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  // New methods for account settings
  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    // Return user without password and refreshToken
    const { password, refreshToken, ...userProfile } = user.toObject();
    return userProfile as User;
  }

  async updateProfile(userId: string, updateData: UpdateProfileDto): Promise<User> {
    // Check if email is being updated and already exists
    if (updateData.email) {
      const emailExists = await this.userRepository.checkEmailExists(updateData.email, userId);
      if (emailExists) {
        throw new BadRequestException('Email đã tồn tại');
      }
    }

    const updatedUser = await this.userRepository.updateProfile(userId, updateData);
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    return updatedUser;
  }

  async changePassword(userId: string, changePasswordData: ChangePasswordDto): Promise<void> {
    const { currentPassword, newPassword, confirmPassword } = changePasswordData;

    // Check if new password and confirm password match
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Mật khẩu mới và xác nhận mật khẩu không khớp');
    }

    // Get user and verify current password
    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }

    // Hash new password and update
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.updatePassword(userId, hashedNewPassword);
  }

  async forgotPassword(data: ForgotPasswordDto): Promise<{ message: string }> {
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

  async verifyOTP(data: VerifyOTPDto): Promise<{ message: string }> {
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

  async resetPassword(data: ResetPasswordDto): Promise<{ message: string }> {
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
    await this.userRepository.updatePassword(user._id.toString(), hashedPassword);

    // Delete used OTP
    await this.otpModel.deleteMany({ email: data.email });

    return { message: 'Đặt lại mật khẩu thành công' };
  }
}
