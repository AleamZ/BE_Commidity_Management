import { Module } from '@nestjs/common';
import { ProductModule } from '../products/product.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerModule } from '../customers/customer.module';
import { HistorySerial, HistorySerialSchema } from './historySerial.entity';
import { HistorySerialRepository } from './historySerial.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HistorySerial.name, schema: HistorySerialSchema },
    ]),
    ProductModule,
    CustomerModule,
  ],
  providers: [HistorySerialRepository],
  controllers: [],
  exports: [HistorySerialRepository],
})
export class HistorySerialModule {}
