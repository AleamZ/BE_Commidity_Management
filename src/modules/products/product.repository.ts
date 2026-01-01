import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from './product.entity';
import { Model, Types } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { builderQuery } from 'src/common/helpers/query-builder.helper';
import { BaseQueryDto } from 'src/common/dtos/base-query.dto';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) { }

  async findByProductByBarCode(barcode: string): Promise<Product | null> {
    return await this.productModel.findOne({
      barcode,
      $or: [
        { isDelete: false },
        { isDelete: { $exists: false } }
      ]
    }).exec();
  }

  async findByProductByBarCodeExcludingId(barcode: string, excludeId: string): Promise<Product | null> {
    return await this.productModel.findOne({
      barcode,
      _id: { $ne: excludeId },
      $or: [
        { isDelete: false },
        { isDelete: { $exists: false } }
      ]
    }).exec();
  }
  async updateQuantity(productId: string, newQuantity: number): Promise<void> {
    await this.productModel.updateOne(
      { _id: productId },
      { $set: { stock: newQuantity } },
    );
  }
  async addSerialToProduct(productId: string, serial: string) {
    return this.productModel.findByIdAndUpdate(
      productId,
      { $addToSet: { serials: serial } },
      { new: true },
    );
  }
  async removeSerialFromProduct(
    productId: string,
    serial: string,
  ): Promise<void> {
    await this.productModel.updateOne(
      { _id: productId },
      {
        $pull: { serials: serial },
        $inc: { stock: -1 },
      },
    );
  }

  async getProductWithVariables(productId: string) {
    return this.productModel.findById(productId).populate('variables').lean();
  }

  async create(data: any): Promise<Product> {
    const newProduct = new this.productModel(data);
    return newProduct.save();
  }

  async update(id: string, updateData: any): Promise<Product | null> {
    return this.productModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async findProductById(id: string): Promise<Product | null> {
    return this.productModel.findById(id).exec();
  }

  async findByIds(ids: string[]): Promise<ProductDocument[]> {
    const objectIds = ids.map((id) => new Types.ObjectId(id));
    return this.productModel.find({ _id: { $in: objectIds } }).exec();
  }

  async productSoft(id: string, isDelete: boolean): Promise<void> {
    await this.productModel.findByIdAndUpdate(
      id,
      { isDelete: isDelete },
      { new: true },
    );
  }
  async decreaseStock(productId: string, quantity: number): Promise<boolean> {
    const product = await this.productModel.findById(productId);

    if (!product || product.stock < quantity) return false;

    product.stock -= quantity;
    await product.save();
    return true;
  }
  async removeSerial(productId: string, serial: string): Promise<boolean> {
    const updated = await this.productModel.updateOne(
      { _id: productId },
      { $pull: { serials: serial } },
    );
    return updated.modifiedCount > 0;
  }
  async productsSoftDelete(
    productIds: string[] | Types.ObjectId[],
  ): Promise<any> {
    // Directly update all products in the list to set isDelete: true
    return this.productModel
      .updateMany({ _id: { $in: productIds } }, { $set: { isDelete: true } })
      .exec();
  }

  async checkProductInListProducts(
    listProductIds: string[],
  ): Promise<ProductDocument[]> {
    return await this.productModel
      .find({ _id: { $in: listProductIds } })
      .exec();
  }

  async find(query: BaseQueryDto): Promise<ProductDocument[]> {
    const { filter, pagination, sort, select, populate } = builderQuery(query); // filter now includes isDelete: false by default

    let queryBuilder = this.productModel
      .find(filter) // This will now correctly filter by isDelete: false by default
      .skip(pagination.skip)
      .limit(pagination.limit)
      .sort(sort as any);

    // Fix: Type assertion to handle select operation
    if (select) {
      queryBuilder = queryBuilder.select(select) as any;
    }

    // Mặc định populate các variables, if not handled by specific getProductDetail
    // For general find, we might still want to populate.
    // However, for getProductDetail, we will handle it manually.
    // Let's keep the populate here for the general find() method.
    queryBuilder = queryBuilder.populate('variables');

    // Nếu có yêu cầu populate thêm các trường khác
    if (populate?.length) {
      populate.forEach((p) => {
        // Check if p is a string or an object with a path property
        if (typeof p === 'string') {
          if (p !== 'variables') {
            // Avoid double populating if already handled
            queryBuilder = queryBuilder.populate(p);
          }
        } else if (typeof p === 'object' && p !== null) {
          // Use a type assertion to tell TypeScript that p has a path property
          const populateOption = p as { path?: string };
          if (populateOption.path && populateOption.path !== 'variables') {
            queryBuilder = queryBuilder.populate(p as any);
          }
        } else {
          // Handle other potential structures or log a warning if necessary
          queryBuilder = queryBuilder.populate(p as any); // Fallback, assuming it's a valid populate option
        }
      });
    }

    return queryBuilder.exec();
  }

  async count(query: BaseQueryDto) {
    const { filter, pagination } = builderQuery(query);

    const totalCount = await this.productModel.countDocuments(filter).exec();
    const totalPage = Math.ceil(totalCount / pagination.limit);

    return {
      totalCount,
      totalPage,
    };
  }

  async findProductWithFullDetails(id: string): Promise<Product | null> {
    return this.productModel
      .findById(id)
      .populate({
        path: 'variables',
        select:
          'attribute costPrice sellPrice stock description mainImage listImage isSerial serials isDelete',
      })
      .exec();
  }
}
