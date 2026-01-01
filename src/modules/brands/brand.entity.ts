import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export type BrandDocument = Brand & Document;
@Schema({ timestamps: true, versionKey: false })
export class Brand extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ default: false })
  isDelete: boolean;
}

export const BrandSchema = SchemaFactory.createForClass(Brand);
