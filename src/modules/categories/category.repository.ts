import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './category.entity';
import { CategoryBrandDto } from './dtos/create.dto';
import { UpdateCategoryDto } from './dtos/update.dto';

@Injectable()
export class CategoryRepository {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async create(data: CategoryBrandDto): Promise<Category> {
    const newCategory = new this.categoryModel(data);
    return newCategory.save();
  }

  async findAll(): Promise<Category[]> {
    return this.categoryModel.find({ isDelete: false }).exec();
  }

  async findById(id: string): Promise<Category> {
    const category = await this.categoryModel.findById(id).exec();
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async update(id: string, data: UpdateCategoryDto): Promise<Category> {
    const updatedCategory = await this.categoryModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
    if (!updatedCategory) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return updatedCategory;
  }

  async delete(id: string): Promise<Category> {
    const deletedCategory = await this.categoryModel
      .findByIdAndUpdate(id, { isDelete: true }, { new: true })
      .exec();
    if (!deletedCategory) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return deletedCategory;
  }
}
