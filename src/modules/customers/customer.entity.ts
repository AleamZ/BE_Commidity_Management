import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CustomerDocument = Customer & Document;

export interface CustomerResponse {
  _id: string;
  name: string;
  phone: string;
  address: string;
  email: string;
  isActive: boolean;
}
@Schema({ timestamps: true, versionKey: false })
export class Customer {
  @Prop({ required: true }) // Ensure this is marked as required
  name: string;

  @Prop({ required: true, unique: true }) // Ensure this is marked as required
  phone: string;

  @Prop({ required: false })
  address: string;

  @Prop({ required: false })
  email: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false }) // Add isDelete for soft delete
  isDelete: boolean;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
