import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Variable, VariableDocument } from './variable.entity';
import { Model } from 'mongoose';
import { CreateVariableDto } from './dtos/create.dto';

@Injectable()
export class VariableRepository {
  constructor(
    @InjectModel(Variable.name)
    private readonly variableModel: Model<VariableDocument>,
  ) {}
  async removeSerialFromVariable(
    variableId: string,
    serial: string,
  ): Promise<void> {
    await this.variableModel.updateOne(
      { _id: variableId },
      {
        $pull: { serials: serial },
        $inc: { stock: -1 },
      },
    );
  }

  async updateStock(variableId: string, newStock: number): Promise<void> {
    await this.variableModel.updateOne(
      { _id: variableId },
      { $set: { stock: newStock } },
    );
  }

  async addSerialToVariable(variableId: string, serial: string) {
    return this.variableModel.findByIdAndUpdate(
      variableId,
      { $addToSet: { serials: serial }, $inc: { stock: 1 } },
      { new: true },
    );
  }

  async create(data: CreateVariableDto): Promise<Variable> {
    const newVariable = new this.variableModel(data);
    return newVariable.save();
  }

  async update(id: string, data: any): Promise<Variable | null> {
    return this.variableModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async findById(id: string): Promise<Variable | null> {
    return this.variableModel.findById(id).exec();
  }

  async softDelete(
    id: string,
    isDelete: boolean = true,
  ): Promise<Variable | null> {
    return this.variableModel
      .findByIdAndUpdate(id, { isDelete: isDelete }, { new: true })
      .exec();
  }
}
