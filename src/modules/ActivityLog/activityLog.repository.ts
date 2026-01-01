import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ActivityLog, ActivityLogDocument } from './activityLog.entity';

@Injectable()
export class ActivityLogRepository {
  constructor(
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLogDocument>,
  ) { }

  async create(data: {
    userId: string;
    action:
    | 'CREATE_ORDER'
    | 'IMPORT_PRODUCT'
    | 'RETURN_ORDER_ITEM'
    | 'CREATE_PRODUCT'
    | 'UPDATE_PRODUCT'
    | 'DELETE_PRODUCT'
    | 'DELETE_ORDER';
    message: string;
    refId: string;
    refType: 'Order' | 'Product';
    metadata?: any;
  }) {
    return this.activityLogModel.create(data);
  }

  async findAll() {
    return this.activityLogModel
      .find()
      .sort({ createdAt: -1 })
      .populate('userId', 'name')
      .exec();
  }

  async findById(id: string) {
    const log = await this.activityLogModel
      .findById(id)
      .populate('userId', 'name')
      .lean();

    if (!log) return null;

    const refModel = log.refType === 'Order' ? 'Order' : 'Product';
    const populatedRef = await this.activityLogModel.populate(log, {
      path: 'refId',
      model: refModel,
    });

    return populatedRef;
  }
}
