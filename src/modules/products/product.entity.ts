import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
export type ProductDocument = Product & Document;
@Schema({ timestamps: true, versionKey: false })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop({ default: 0 })
  costPrice: number;

  @Prop({ default: 0 })
  sellPrice: number;

  @Prop({ default: 0 })
  stock: number;

  @Prop({ required: false })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Brand', required: true })
  brandId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  categoryId: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: 'Variable', default: [] })
  variables: Types.ObjectId[];

  @Prop({ default: false })
  isVariable: boolean;

  @Prop({ required: false })
  mainImage: string;

  @Prop({ type: [String], default: [] })
  listImage: string[];

  @Prop({ type: [String], default: [] })
  serials: string[];

  @Prop({ default: false })
  isSerial: boolean;

  @Prop({ default: false })
  isDelete: boolean;

  @Prop({ required: false, sparse: true }) // Removed unique constraint to handle manually
  barcode: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Add compound index để ensure barcode unique chỉ với sản phẩm chưa xóa
ProductSchema.index(
  { barcode: 1, isDelete: 1 },
  {
    unique: true,
    partialFilterExpression: { isDelete: false },
    background: true
  }
);

// Add single indexes for performance
ProductSchema.index({ barcode: 1 });
ProductSchema.index({ isDelete: 1 });
