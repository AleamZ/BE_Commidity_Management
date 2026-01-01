import { Module } from '@nestjs/common';
import { ProductModule } from '../products/product.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './order.entity';
import { OrderUseCase } from './order.use-cases';
import { OrderRepository } from './order.repository';
import { OrderController } from './order.controller';
import { CustomerModule } from '../customers/customer.module';
import { HistorySerialModule } from '../history-serials/historySerial.module';
import { InvoiceUseCase } from './invoice.use-cases';
import { VariableModule } from '../variables/variable.module';
import { ActivityLogModule } from '../ActivityLog/activityLog.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    ProductModule,
    CustomerModule,
    HistorySerialModule,
    VariableModule,
    ActivityLogModule
  ],
  providers: [OrderUseCase, OrderRepository, InvoiceUseCase],
  controllers: [OrderController],
  exports: [OrderRepository],
})
export class OrderModule {}
