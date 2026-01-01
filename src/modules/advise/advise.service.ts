import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Advise } from './advise.entity';

@Injectable()
export class AdviseService {
  constructor(@InjectModel(Advise.name) private adviseModel: Model<Advise>) {}

  async saveAdvise(data: {
    name: string;
    phone: string;
    initialMessage: string;
    assignedStaffName: string;
  }) {
    return this.adviseModel.create(data);
  }
}
