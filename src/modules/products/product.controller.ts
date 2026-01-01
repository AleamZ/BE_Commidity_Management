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
  Request,
  UseGuards,
} from '@nestjs/common';

import { ProductUseCase } from './product.use-cases';
import { BarcodeGeneratorService } from './barcode-generator.service';
import { createResponse } from 'src/common/helpers/response.helper';
import { UpdateProductDto } from './dtos/update.dto';
import { BaseQueryDto } from 'src/common/dtos/base-query.dto';
import { DeleteListProductDto } from './dtos/delete-list.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('products')
export class ProductController {
  constructor(
    private readonly productUseCase: ProductUseCase,
    private readonly barcodeGeneratorService: BarcodeGeneratorService,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Post('')
  async create(@Body() dto: any, @Request() req) {
    const user = req.user;
    const data = await this.productUseCase.create(dto, user.userId);
    return createResponse(HttpStatus.CREATED, data, 'Tạo dữ liệu thành công');
  }
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Body() dto: UpdateProductDto,
    @Param('id') id: string,
    @Request() req,
  ) {
    const user = req.user;
    const data = await this.productUseCase.update(id, dto, user.userId);
    return createResponse(HttpStatus.OK, data, 'Cập nhật dữ liệu thành công');
  }
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async actionSoft(@Param('id') id: string, @Request() req) {
    const user = req.user;
    const data = await this.productUseCase.actionProductSoft(id, user.userId);
    return createResponse(HttpStatus.OK, data, 'Cập nhật dữ liệu thành công');
  }

  @UseGuards(JwtAuthGuard)
  @Delete('list/delete')
  async actionSoftDeleteList(
    @Body() dto: DeleteListProductDto,
    @Request() req,
  ) {
    const user = req.user;
    await this.productUseCase.actionSoftDeleteListProducts(dto, user.userId);
    return createResponse(
      HttpStatus.OK,
      null,
      'Xóa danh sách sản phẩm thành công',
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query() query: BaseQueryDto) {
    const data = await this.productUseCase.getList(query); // getList uses repository.find, which uses builderQuery
    return createResponse(HttpStatus.OK, data, 'Lấy danh sách thành công');
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.productUseCase.getProductDetail(id);
    return createResponse(
      HttpStatus.OK,
      data,
      'Lấy thông tin sản phẩm thành công',
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('serials')
  async getSerials(
    @Body() payload: { productId: string; variableId?: string },
  ) {
    const data = await this.productUseCase.getSerials(payload);
    return createResponse(
      HttpStatus.OK,
      data,
      'Lấy thông tin sản phẩm thành công',
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('variables/:id')
  async getVariables(@Param('id') id: string) {
    const data = await this.productUseCase.getVariables(id);
    return createResponse(
      HttpStatus.OK,
      data,
      'Lấy thông tin sản phẩm thành công',
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('barcode/next-available')
  async getNextAvailableBarcode() {
    const nextBarcode = await this.barcodeGeneratorService.generateUniqueBarcode();
    const nextNumber = await this.barcodeGeneratorService.getNextAvailableNumber();

    return createResponse(
      HttpStatus.OK,
      {
        nextBarcode,
        nextNumber,
        format: 'SP00001',
        suggestion: `Mã sản phẩm tiếp theo: ${nextBarcode}`,
      },
      'Lấy mã sản phẩm tiếp theo thành công',
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('barcode/check-availability')
  async checkBarcodeAvailability(@Body() payload: { barcode: string }) {
    const { barcode } = payload;

    if (!barcode) {
      return createResponse(
        HttpStatus.BAD_REQUEST,
        { available: false },
        'Mã sản phẩm không được để trống',
      );
    }

    const isValidFormat = this.barcodeGeneratorService.validateBarcodeFormat(barcode);
    const isAvailable = await this.barcodeGeneratorService.isBarcodeAvailable(barcode);
    const suggestions = !isAvailable
      ? await this.barcodeGeneratorService.suggestAlternativeBarcodes(barcode, 5)
      : [];

    return createResponse(
      HttpStatus.OK,
      {
        available: isAvailable,
        validFormat: isValidFormat,
        suggestions,
        message: isAvailable
          ? 'Mã sản phẩm có thể sử dụng'
          : `Mã sản phẩm "${barcode}" đã được sử dụng`,
      },
      isAvailable ? 'Mã sản phẩm khả dụng' : 'Mã sản phẩm đã tồn tại',
    );
  }
}
