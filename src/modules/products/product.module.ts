import { Module, OnModuleInit } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductRepository } from './product.repository';
import { ProductUseCase } from './product.use-cases';
import { ProductMigrationService } from './product.migration.service';
import { BarcodeGeneratorService } from './barcode-generator.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './product.entity';
import { VariableModule } from '../variables/variable.module';
import { ActivityLogModule } from '../ActivityLog/activityLog.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    VariableModule,
    ActivityLogModule,
  ],
  providers: [ProductRepository, ProductUseCase, ProductMigrationService, BarcodeGeneratorService],
  exports: [ProductRepository, BarcodeGeneratorService],
  controllers: [ProductController],
})
export class ProductModule implements OnModuleInit {
  constructor(private readonly migrationService: ProductMigrationService) { }

  async onModuleInit() {
    // Migration will run automatically via ProductMigrationService.onModuleInit()
  }
}
