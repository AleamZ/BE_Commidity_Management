import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProductEnum } from 'src/common/enums/product';

export type OrderDocument = Order & Document;

@Schema({ timestamps: true, versionKey: false })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  staffId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customerId: Types.ObjectId;

  @Prop()
  customerName: string;

  @Prop()
  customerPhone: string;

  @Prop()
  customerAddress: string;

  @Prop([
    {
      productId: { type: Types.ObjectId, ref: 'Product', required: true },
      name: String,
      barcode: String,
      serial: { type: String, default: null },
      quantity: Number,
      sellPrice: Number,
      realSellPrice: Number,
      variableId: { type: String, default: null },
      typeProduct: { type: String, enum: Object.values(ProductEnum) },
    },
  ])
  productList: {
    productId: Types.ObjectId;
    name: string;
    barcode: string;
    serial: string | null;
    variableId: string | null;
    quantity: number;
    sellPrice: number;
    realSellPrice: number;
    typeProduct: ProductEnum;
  }[];

  @Prop({ type: String, enum: ['percent', 'money'], default: 'percent' })
  discountType: 'percent' | 'money';

  @Prop({ type: Number, default: 0 })
  discountValue: number;

  @Prop({ type: Number, default: 0 })
  totalAmount: number;

  @Prop({ type: Number, default: 0 })
  totalCostPrice: number;

  @Prop({ type: Number, default: 0 })
  estimatedRevenue: number;

  @Prop({ type: Number, default: 0 })
  totalAmountDiscount: number;

  @Prop({ type: Number, default: 0 })
  customerPaid: number;

  @Prop({ type: Number, default: 0 })
  customerDebt: number;

  @Prop({
    type: String,
    enum: ['unpaid', 'partial', 'paid', 'paid_refund'],
    default: 'unpaid',
  })
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'paid_refund';

  @Prop({ type: Boolean, default: false })
  isReturnOrder: boolean;

  @Prop({ type: String, default: null })
  reasonRefund: string;

  @Prop({ type: Boolean, default: false })
  isDelete: boolean;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
