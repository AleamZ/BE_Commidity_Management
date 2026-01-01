import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CustomerUseCase } from './customer.use-cases';
import { createResponse } from 'src/common/helpers/response.helper';
import { CreateCustomerDto } from './dtos/create-customer.dto';
import { BaseQueryDto } from 'src/common/dtos/base-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('customers')
export class CustomerController {
  constructor(private readonly customerUseCase: CustomerUseCase) {}

  @UseGuards(JwtAuthGuard)
  @Post('')
  async create(@Body() dto: CreateCustomerDto) {
    console.log('Incoming DTO:', dto); // Debug log
    const data = await this.customerUseCase.create(dto);
    return createResponse(HttpStatus.CREATED, data, 'Tạo dữ liệu thành công');
  }

  @UseGuards(JwtAuthGuard)
  @Get('')
  async findAll(@Query() query: BaseQueryDto) {
    // The query parameter name is 'keyword'
    const data = await this.customerUseCase.findAll(query);
    return createResponse(HttpStatus.OK, data, 'Lấy danh sách thành công');
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.customerUseCase.findOne(id);
    return createResponse(HttpStatus.OK, data, 'Lấy thông tin thành công');
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    const data = await this.customerUseCase.update(id, dto);
    return createResponse(HttpStatus.OK, data, 'Cập nhật dữ liệu thành công');
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.customerUseCase.delete(id);
    return createResponse(HttpStatus.OK, null, 'Xóa dữ liệu thành công');
  }
}
