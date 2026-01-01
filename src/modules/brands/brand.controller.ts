import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Put,
  Post,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CreateBrandDto } from './dtos/create.dto';
import { BrandUseCase } from './brand.use-cases';
import { createResponse } from 'src/common/helpers/response.helper';
import { UpdateBrandDto } from './dtos/update.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('brands')
export class BrandController {
  constructor(private readonly brandUseCase: BrandUseCase) {}

  @UseGuards(JwtAuthGuard)
  @Post('')
  async create(@Body() dto: CreateBrandDto, @Request() req) {
    const data = await this.brandUseCase.create(dto, req.user.userId);
    return createResponse(HttpStatus.CREATED, data, 'Tạo dữ liệu thành công');
  }

  @UseGuards(JwtAuthGuard)
  @Get('')
  async getAll() {
    const data = await this.brandUseCase.getAll();
    return createResponse(HttpStatus.OK, data, 'Lấy dữ liệu thành công');
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    const data = await this.brandUseCase.update(id, dto);
    return createResponse(HttpStatus.OK, data, 'Cập nhật dữ liệu thành công');
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    const data = await this.brandUseCase.delete(id);
    return createResponse(HttpStatus.OK, data, 'Xóa dữ liệu thành công');
  }
}
