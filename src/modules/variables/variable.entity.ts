import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export type VariableDocument = Variable & Document;
@Schema({ timestamps: true, versionKey: false })
export class Variable extends Document {
  @Prop({
    type: [
      {
        key: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
    required: true,
    validate: [
      (val: any[]) => val.length <= 2,
      '{PATH} exceeds the limit of 2',
    ],
  })
  attribute: { key: string; value: string }[];

  @Prop({ required: true })
  costPrice: number;

  @Prop({ default: 0 })
  sellPrice: number;

  @Prop({ default: 0 })
  stock: number;

  @Prop({ required: false }) // Changed from required: true
  description: string;

  @Prop({ required: false })
  mainImage: string;

  @Prop({ type: [String], default: [] })
  listImage: string[];

  @Prop({ default: false })
  isSerial: boolean;

  @Prop({ type: [String], default: [] })
  serials: string[];

  @Prop({ default: false })
  isDelete: boolean;
}

export const VariableSchema = SchemaFactory.createForClass(Variable);
