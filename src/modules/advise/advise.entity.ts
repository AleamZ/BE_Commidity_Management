import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Advise extends Document {
  @Prop() name: string;
  @Prop() phone: string;
  @Prop() initialMessage: string;
  @Prop() assignedStaffName: string;
  @Prop() createdAt: Date;
  @Prop() updatedAt: Date;
}

export const AdviseSchema = SchemaFactory.createForClass(Advise);
