import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.entity';
import { UserRepository } from './repositories/user.repository';
import { AccountController } from './account.controller';
import { AuthUseCase } from './use-cases/auth.use-case';
import { JwtModule } from '@nestjs/jwt';
import { OTP, OTPSchema } from './schemas/otp.schema';
import { MailService } from './services/mail.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: OTP.name, schema: OTPSchema }
    ]),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AccountController],
  providers: [UserRepository, AuthUseCase, MailService],
  exports: [UserRepository],
})
export class UserModule { }
