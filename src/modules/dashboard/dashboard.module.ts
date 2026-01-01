import { Module } from '@nestjs/common';

import { OrderModule } from '../orders/order.module';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { ProductModule } from '../products/product.module';
import { CustomerModule } from '../customers/customer.module';
import { SalesReportUseCase } from './sales-report.use-cases';

@Module({
  imports: [OrderModule, ProductModule, CustomerModule],
  providers: [DashboardService, SalesReportUseCase],
  controllers: [DashboardController],
})
export class DashboardModule { }
