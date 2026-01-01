import { Injectable } from '@nestjs/common';
import { BrandRepository } from './brand.repository';
import { Brand } from './brand.entity';
import { CreateBrandDto } from './dtos/create.dto';
import { UpdateBrandDto } from './dtos/update.dto';
import { ActivityLogService } from '../ActivityLog/activityLog.service';

@Injectable()
export class BrandUseCase {
  constructor(
    private readonly brandRepository: BrandRepository,
    private readonly activityLogService: ActivityLogService,
  ) {}
  async create(data: CreateBrandDto, staffId: string): Promise<Brand> {
    const brand = await this.brandRepository.create(data);
    await this.activityLogService.logActivity({
      userId: staffId,
      action: 'CREATE_ORDER',
      message: `Thương hiệu ${data.name} vừa mới được tạo`,
      refId: String(brand._id),
      refType: 'Order',
    });
    return brand;
  }

  async getAll(): Promise<Brand[]> {
    return await this.brandRepository.getAll();
  }

  async update(id: string, data: UpdateBrandDto): Promise<Brand> {
    return await this.brandRepository.update(id, data);
  }

  async delete(id: string): Promise<Brand> {
    return await this.brandRepository.delete(id);
  }
}
