import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Order, OrderDocument } from './order.entity';
import { Model, FilterQuery, UpdateQuery } from 'mongoose';
import { BaseQueryDto } from 'src/common/dtos/base-query.dto';
import { builderQuery } from 'src/common/helpers/query-builder.helper';

@Injectable()
export class OrderRepository {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) { }

  async create(data: any): Promise<Order> {
    const newOrder = new this.orderModel(data);
    return newOrder.save();
  }

  async getOrderById(id: string): Promise<Order | null> {
    return this.orderModel.findOne({ _id: id, isDelete: { $ne: true } }).exec();
  }

  async findAll(query: BaseQueryDto): Promise<Order[]> {
    const extraFilters: Record<string, any> = {};
    if (query.status && query.status.length > 0) {
      extraFilters.paymentStatus = query.status;
    }

    // Only return non-deleted orders
    extraFilters.isDelete = { $ne: true };

    const { filter, pagination, sort } = builderQuery(query, {}, extraFilters);
    const queryBuilder = this.orderModel
      .find(filter)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .sort(sort as any);
    return queryBuilder.exec();
  }

  async count(query: BaseQueryDto) {
    const extraFilters: Record<string, any> = {};
    if (query.status && query.status.length > 0) {
      extraFilters.paymentStatus = query.status;
    }

    // Only count non-deleted orders
    extraFilters.isDelete = { $ne: true };

    const { filter, pagination } = builderQuery(query, {}, extraFilters);

    const totalCount = await this.orderModel.countDocuments(filter).exec();
    const totalPage = Math.ceil(totalCount / pagination.limit);

    return {
      totalCount,
      totalPage,
    };
  }

  async countTotal(query: BaseQueryDto): Promise<number> {
    const extraFilters: Record<string, any> = {};
    if (query.status && query.status.length > 0) {
      extraFilters.paymentStatus = query.status;
    }

    // Only count non-deleted orders
    extraFilters.isDelete = { $ne: true };

    const { filter } = builderQuery(query, {}, extraFilters);
    return this.orderModel.countDocuments(filter).exec();
  }

  async customerPaymentDept(
    orderId: string,
    money: number,
    paymentStatus: 'partial' | 'paid',
    estimatedRevenue?: number,
  ): Promise<Order | null> {
    const updateData: any = {
      customerDebt: money,
      paymentStatus
    };

    // Cập nhật doanh thu thực tế nếu được cung cấp
    if (estimatedRevenue !== undefined) {
      updateData.estimatedRevenue = estimatedRevenue;
    }

    return this.orderModel
      .findByIdAndUpdate(
        orderId,
        updateData,
        { new: true },
      )
      .exec();
  }

  async find(filter: FilterQuery<Order>): Promise<Order[]> {
    return this.orderModel.find({ ...filter, isDelete: { $ne: true } }).exec();
  }

  async findOne(filter: FilterQuery<Order>): Promise<Order | null> {
    return this.orderModel.findOne({ ...filter, isDelete: { $ne: true } }).exec();
  }

  async update(id: string, update: UpdateQuery<Order>): Promise<Order | null> {
    return this.orderModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  async updateReturnOrder(
    id: string,
    reveuneAfterRefund: number,
    reason: string,
    adjustedCostPrice?: number,
  ): Promise<Order | null> {
    const updateData: any = {
      isReturnOrder: true,
      paymentStatus: 'paid_refund',
      estimatedRevenue: reveuneAfterRefund,
      reasonRefund: reason,
    };

    // Nếu có adjustedCostPrice thì cập nhật totalCostPrice
    if (adjustedCostPrice !== undefined) {
      updateData.totalCostPrice = adjustedCostPrice;
    }

    return this.orderModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async delete(id: string): Promise<Order | null> {
    return this.orderModel.findByIdAndDelete(id).exec();
  }

  async softDelete(id: string): Promise<Order | null> {
    return this.orderModel.findByIdAndUpdate(
      id,
      { isDelete: true },
      { new: true }
    ).exec();
  }

  async aggregate(pipeline: any[]): Promise<any[]> {
    return this.orderModel.aggregate(pipeline).exec();
  }

  async findByTimeRange(start: Date, end: Date): Promise<Order[]> {
    return this.orderModel
      .find({
        createdAt: {
          $gte: start,
          $lte: end,
        },
        isDelete: { $ne: true },
      })
      .exec();
  }

  async countDocuments(filter: FilterQuery<Order>): Promise<number> {
    return this.orderModel.countDocuments(filter).exec();
  }
}
