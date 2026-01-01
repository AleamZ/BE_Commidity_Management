import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class OTP extends Document {
    @Prop({ required: true })
    email: string;

    @Prop({ required: true })
    otp: string;

    @Prop({ required: true, default: Date.now, expires: 300 }) // OTP expires after 5 minutes
    createdAt: Date;
}

export const OTPSchema = SchemaFactory.createForClass(OTP); 