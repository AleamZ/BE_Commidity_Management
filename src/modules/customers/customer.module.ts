import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Customer, CustomerSchema } from './customer.entity';
import { CustomerRepository } from './customer.repository';
import { CustomerUseCase } from './customer.use-cases';
import { CustomerController } from './customer.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
    ]),
  ],
  providers: [CustomerRepository, CustomerUseCase],
  exports: [CustomerRepository],
  controllers: [CustomerController],
})
export class CustomerModule {}
