import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomerRepository } from './customer.repository';
import { Customer } from './customer.entity';
import { BaseQueryDto } from 'src/common/dtos/base-query.dto';

@Injectable()
export class CustomerUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async create(data: any): Promise<Customer> {
    return await this.customerRepository.create(data); // Ensure data is passed as-is
  }

  async findAll(query: BaseQueryDto): Promise<Customer[]> {
    return await this.customerRepository.find(query);
  }

  async findOne(id: string): Promise<Customer | null> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async update(id: string, updateData: any): Promise<Customer | null> {
    const customer = await this.customerRepository.update(id, updateData);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async delete(id: string): Promise<void> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    await this.customerRepository.softDelete(id);
  }
}
