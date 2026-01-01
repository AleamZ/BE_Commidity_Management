import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;

    constructor(private configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: this.configService.get<string>('email.user'),
                pass: this.configService.get<string>('email.password')
            }
        });
    }

    async sendOTP(email: string, otp: string): Promise<void> {
        const mailOptions = {
            from: this.configService.get<string>('email.user'),
            to: email,
            subject: 'Mã OTP đặt lại mật khẩu',
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Yêu cầu đặt lại mật khẩu</h2>
          <p>Bạn đã yêu cầu đặt lại mật khẩu. Đây là mã OTP của bạn:</p>
          <h3 style="background-color: #f0f0f0; padding: 10px; text-align: center; font-size: 24px;">${otp}</h3>
          <p>Mã OTP này sẽ hết hạn sau 5 phút.</p>
          <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        </div>
      `
        };

        try {
            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            throw new Error('Không thể gửi email OTP: ' + error.message);
        }
    }
} 