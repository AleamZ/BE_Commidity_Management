import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ActivityLogDocument = ActivityLog & Document;

@Schema({ timestamps: true })
export class ActivityLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  action: 'CREATE_ORDER' | 'IMPORT_PRODUCT' | 'RETURN_ORDER_ITEM';

  @Prop({ required: true })
  message: string;

  @Prop({ type: Types.ObjectId, refPath: 'refType' })
  refId: Types.ObjectId;

  @Prop({ required: true })
  refType: 'Order' | 'Product';

  @Prop({ type: Object })
  metadata?: {
    total?: number;
    productCount?: number;
  };
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);
