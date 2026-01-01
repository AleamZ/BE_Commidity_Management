import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Customer, CustomerDocument } from './customer.entity';
import { Model } from 'mongoose';
import { builderQuery } from 'src/common/helpers/query-builder.helper';
import { BaseQueryDto } from 'src/common/dtos/base-query.dto';

@Injectable()
export class CustomerRepository {
  constructor(
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
  ) { }

  async create(data: any): Promise<Customer> {
    const newCustomer = new this.customerModel(data); // Ensure data is passed to the model constructor
    return newCustomer.save(); // Ensure save() is called
  }

  async find(query: BaseQueryDto): Promise<Customer[]> {
    const { filter: baseFilter, pagination, sort } = builderQuery(query);

    // Add custom search conditions for customer fields
    if (query.keyword) {
      const searchRegex = { $regex: query.keyword, $options: 'i' };
      baseFilter.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { address: searchRegex }
      ];
    }

    // Add isDelete filter
    const filter = { ...baseFilter, isDelete: false };

    let queryBuilder = this.customerModel
      .find(filter)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .sort(sort as any);

    return queryBuilder.exec();
  }

  async findById(id: string): Promise<Customer | null> {
    return this.customerModel.findOne({ _id: id, isDelete: false }).exec(); // Exclude deleted customers
  }

  async update(id: string, updateData: any): Promise<Customer | null> {
    return this.customerModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async softDelete(id: string): Promise<void> {
    await this.customerModel.findByIdAndUpdate(id, { isDelete: true }).exec();
  }

  // New method to count customers within a date range
  async countNewCustomers(fromDate: Date, toDate: Date): Promise<number> {
    return this.customerModel.countDocuments({
      createdAt: { $gte: fromDate, $lte: toDate },
      isDelete: false,
      isActive: true
    }).exec();
  }

  // Method to get new customers growth percentage
  async getNewCustomersGrowth(
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    previousPeriodStart: Date,
    previousPeriodEnd: Date
  ): Promise<{ currentCount: number; previousCount: number; growthPercentage: number }> {
    const [currentCount, previousCount] = await Promise.all([
      this.countNewCustomers(currentPeriodStart, currentPeriodEnd),
      this.countNewCustomers(previousPeriodStart, previousPeriodEnd)
    ]);

    const growthPercentage = previousCount > 0
      ? ((currentCount - previousCount) / previousCount) * 100
      : 0;

    return {
      currentCount,
      previousCount,
      growthPercentage: Math.round(growthPercentage)
    };
  }
}
