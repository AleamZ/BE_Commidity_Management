import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Brand, BrandDocument } from './brand.entity';
import { CreateBrandDto } from './dtos/create.dto';
import { UpdateBrandDto } from './dtos/update.dto';

@Injectable()
export class BrandRepository {
  constructor(
    @InjectModel(Brand.name) private readonly brandModel: Model<BrandDocument>,
  ) { }
  async create(data: CreateBrandDto): Promise<Brand> {
    const newBrand = new this.brandModel(data);
    return newBrand.save();
  }

  async getAll(): Promise<Brand[]> {
    return this.brandModel.find({ isDelete: false }).exec();
  }

  async update(id: string, data: UpdateBrandDto): Promise<Brand> {
    const brand = await this.brandModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true },
    ).exec();

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    return brand;
  }

  async delete(id: string): Promise<Brand> {
    const brand = await this.brandModel.findByIdAndUpdate(
      id,
      { isDelete: true },
      { new: true },
    ).exec();

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    return brand;
  }
}
