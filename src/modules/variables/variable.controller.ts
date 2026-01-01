import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { CreateVariableDto } from './dtos/create.dto';
import { VariableUseCase } from './variable.use-cases';
import { createResponse } from 'src/common/helpers/response.helper';
import { UpdateVariableDto } from './dtos/update.dto';

@Controller('variables')
export class VariableController {
  constructor(private readonly variableUseCase: VariableUseCase) { }

  @Post('')
  async create(@Body() dto: CreateVariableDto) {
    const data = await this.variableUseCase.create(dto);
    return createResponse(HttpStatus.CREATED, data, 'Tạo dữ liệu thành công');
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const data = await this.variableUseCase.findById(id);
    return createResponse(HttpStatus.OK, data, 'Lấy thông tin biến thể thành công');
  }

  @Put(':id')
  async update(@Body() dto: UpdateVariableDto, @Param('id') id: string) {
    const data = await this.variableUseCase.update(id, dto);
    return createResponse(HttpStatus.OK, data, 'Cập nhật biến thể thành công');
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.variableUseCase.delete(id);
    return createResponse(HttpStatus.OK, null, 'Xóa biến thể thành công');
  }
}
