import { Injectable } from '@nestjs/common';
import { CategoryRepository } from './category.repository';
import { Category } from './category.entity';
import { CategoryBrandDto } from './dtos/create.dto';
import { UpdateCategoryDto } from './dtos/update.dto';
import { ActivityLogService } from '../ActivityLog/activityLog.service';

@Injectable()
export class CategoryUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(data: CategoryBrandDto, staffId: string): Promise<Category> {
    const category = await this.categoryRepository.create(data);
    await this.activityLogService.logActivity({
      userId: staffId,
      action: 'CREATE_ORDER',
      message: `Danh mục ${data.name} vừa mới được tạo`,
      refId: String(category._id),
      refType: 'Order',
    });
    return category;
  }

  async getAll(): Promise<Category[]> {
    return await this.categoryRepository.findAll();
  }

  async getById(id: string): Promise<Category> {
    return await this.categoryRepository.findById(id);
  }

  async update(id: string, data: UpdateCategoryDto): Promise<Category> {
    return await this.categoryRepository.update(id, data);
  }

  async delete(id: string): Promise<Category> {
    return await this.categoryRepository.delete(id);
  }
}
