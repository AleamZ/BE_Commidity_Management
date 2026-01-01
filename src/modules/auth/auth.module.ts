import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/user.entity';
import { OTP, OTPSchema } from '../users/schemas/otp.schema';
import { UserRepository } from '../users/repositories/user.repository';
import { MailService } from '../users/services/mail.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: OTP.name, schema: OTPSchema }
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, UserRepository, MailService],
  exports: [JwtModule],
})
export class AuthModule { }
