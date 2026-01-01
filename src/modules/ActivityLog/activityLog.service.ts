import { Injectable } from '@nestjs/common';
import { ActivityLogRepository } from './activityLog.repository';

@Injectable()
export class ActivityLogService {
  constructor(private readonly activityRepository: ActivityLogRepository) { }

  async logActivity(data: {
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
    return this.activityRepository.create(data);
  }

  async getAllLogs() {
    return this.activityRepository.findAll();
  }

  async getLogDetail(id: string) {
    return this.activityRepository.findById(id);
  }
}
