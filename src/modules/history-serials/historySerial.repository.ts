import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HistorySerial, HistorySerialDocument } from './historySerial.entity';

@Injectable()
export class HistorySerialRepository {
  constructor(
    @InjectModel(HistorySerial.name)
    private readonly historySerialModel: Model<HistorySerialDocument>,
  ) {}

  async create(data: any): Promise<HistorySerial> {
    const newOrder = new this.historySerialModel(data);
    return newOrder.save();
  }
}
