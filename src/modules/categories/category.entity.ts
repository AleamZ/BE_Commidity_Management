import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export type CategoryDocument = Category & Document;
@Schema({ timestamps: true, versionKey: false })
export class Category extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ default: false })
  isDelete: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
