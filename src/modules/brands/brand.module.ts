import { Module } from '@nestjs/common';
import { Brand, BrandSchema } from './brand.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { BrandUseCase } from './brand.use-cases';
import { BrandRepository } from './brand.repository';
import { BrandController } from './brand.controller';
import { ActivityLogModule } from '../ActivityLog/activityLog.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Brand.name, schema: BrandSchema }]),
    ActivityLogModule,
  ],
  providers: [BrandUseCase, BrandRepository],
  controllers: [BrandController],
})
export class BrandModule {}
