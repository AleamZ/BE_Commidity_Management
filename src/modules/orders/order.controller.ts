import {
  Body,
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { CreateOrderDto } from './dtos/create.dto';
import { OrderUseCase } from './order.use-cases';
import { createResponse } from 'src/common/helpers/response.helper';
import { InvoiceUseCase } from './invoice.use-cases';
import { Response } from 'express';
import { ReturnOrderDto } from './dtos/return.dto';
import { CustomerDeptDto } from './dtos/customerDept';
import { BaseQueryDto } from 'src/common/dtos/base-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderUseCase: OrderUseCase,
    private readonly invoiceUseCase: InvoiceUseCase,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Post('')
  async create(@Body() dto: CreateOrderDto) {
    const data = await this.orderUseCase.createOrder(dto);
    return createResponse(HttpStatus.OK, data, 'Order thành công');
  }

  @UseGuards(JwtAuthGuard)
  @Post('return/:orderId')
  async returnItem(
    @Param('orderId') orderId: string,
    @Body() dto: ReturnOrderDto,
  ) {
    return this.orderUseCase.returnOrder(
      orderId,
      dto.itemOrder,
      dto.staffId,
      dto.refund,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('')
  async getAll(@Query() query: BaseQueryDto) {
    const data = await this.orderUseCase.getAll(query);
    return createResponse(HttpStatus.OK, data, 'Get data thành công');
  }

  @Get(':id')
  async getOrderDetail(@Param('id') id: string) {
    const data = await this.orderUseCase.getOrderDetail(id);
    return createResponse(HttpStatus.OK, data, 'Get data thành công');
  }

  @UseGuards(JwtAuthGuard)
  @Post('customer-dept')
  async customerPaymentDept(@Body() dto: CustomerDeptDto) {
    return this.orderUseCase.customerPaymentDept(dto.orderId, dto.money);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async softDeleteOrder(@Param('id') id: string, @Body() body: { userId: string }) {
    const data = await this.orderUseCase.softDeleteOrder(id, body.userId);
    return data;
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/invoice')
  async getInvoice(@Param('id') id: string, @Res() res: Response) {
    const order = await this.orderUseCase.getOrderById(id);
    if (!order) throw new NotFoundException('Order not found');
    const pdfBuffer = await this.invoiceUseCase.generateInvoicePDFBuffer(order);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${id}.pdf`,
    );

    return res.send(pdfBuffer);
  }
}
