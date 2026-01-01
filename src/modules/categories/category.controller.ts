import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CategoryBrandDto } from './dtos/create.dto';
import { CategoryUseCase } from './category.use-cases';
import { createResponse } from 'src/common/helpers/response.helper';
import { UpdateCategoryDto } from './dtos/update.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryUseCase: CategoryUseCase) {}

  @UseGuards(JwtAuthGuard)
  @Post('')
  async create(@Body() dto: CategoryBrandDto, @Request() req) {
    const data = await this.categoryUseCase.create(dto, req.user.userId);
    return createResponse(HttpStatus.CREATED, data, 'Tạo dữ liệu thành công');
  }

  @UseGuards(JwtAuthGuard)
  @Get('')
  async getAll() {
    const data = await this.categoryUseCase.getAll();
    return createResponse(HttpStatus.OK, data, 'Lấy dữ liệu thành công');
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getById(@Param('id') id: string) {
    const data = await this.categoryUseCase.getById(id);
    return createResponse(HttpStatus.OK, data, 'Lấy dữ liệu thành công');
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const data = await this.categoryUseCase.update(id, dto);
    return createResponse(HttpStatus.OK, data, 'Cập nhật dữ liệu thành công');
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    const data = await this.categoryUseCase.delete(id);
    return createResponse(HttpStatus.OK, data, 'Xóa dữ liệu thành công');
  }
}
