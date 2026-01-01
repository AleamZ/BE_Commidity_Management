import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HistorySerialDocument = HistorySerial & Document;

@Schema({ timestamps: true, versionKey: false })
export class HistorySerial {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  serial: string;

  @Prop()
  soldAt: Date;
}

export const HistorySerialSchema = SchemaFactory.createForClass(HistorySerial);
