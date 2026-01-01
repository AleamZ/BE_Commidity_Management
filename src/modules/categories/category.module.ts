import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from './category.entity';
import { CategoryUseCase } from './category.use-cases';
import { CategoryRepository } from './category.repository';
import { CategoryController } from './category.controller';
import { ActivityLogModule } from '../ActivityLog/activityLog.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
    ]),
    ActivityLogModule,
  ],
  providers: [CategoryUseCase, CategoryRepository],
  controllers: [CategoryController],
})
export class CategoryModule {}
