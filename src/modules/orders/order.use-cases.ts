import {
  BadRequestException,
  Injectable,
  NotFoundException,
  HttpStatus,
} from '@nestjs/common';
import { OrderRepository } from './order.repository';
import { CreateOrderDto } from './dtos/create.dto';
import { Order } from './order.entity';
import { ProductRepository } from '../products/product.repository';
import { CustomerRepository } from '../customers/customer.repository';
import { HistorySerialRepository } from '../history-serials/historySerial.repository';
import { ProductEnum } from 'src/common/enums/product';
import { Types } from 'mongoose';
import { VariableRepository } from '../variables/variable.repository';
import { ActivityLogService } from '../ActivityLog/activityLog.service';
import { calculateCustomerDebt } from 'src/common/utils/calculate';
import { refundDto, ReturnItemDto } from './dtos/return.dto';
import { BaseQueryDto } from 'src/common/dtos/base-query.dto';
import { createResponse } from 'src/common/helpers/response.helper';
type OrderProductItem = {
  typeProduct: ProductEnum;
  productId: Types.ObjectId | string;
  name: string;
  barcode: string;
  serial: string | null;
  quantity: number;
  sellPrice: number;
  realSellPrice: number;
  variableId: string | null;
};
@Injectable()
export class OrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productRepository: ProductRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly historySerialRepository: HistorySerialRepository,
    private readonly variableRepository: VariableRepository,
    private readonly activityLogService: ActivityLogService,
  ) { }

  async createOrder(dto: CreateOrderDto): Promise<{ order: Order }> {
    const orderItems: OrderProductItem[] = [];
    let totalCostPrice = 0;
    for (const item of dto.productList) {
      const product = await this.productRepository.findProductById(
        item.productId,
      );
      if (!product)
        throw new NotFoundException(
          `Sản phẩm không tìm thấy: ${item.productId}`,
        );
      switch (item.typeProduct) {
        case ProductEnum.NO_VARIABLE_NO_SERIAL:
          if (product.stock < item.quantity) {
            throw new BadRequestException(
              `Sản phẩm không đủ số lượng của ${item.name}`,
            );
          }
          await this.productRepository.updateQuantity(
            item.productId,
            product.stock - item.quantity,
          );
          totalCostPrice += product.costPrice * item.quantity;
          orderItems.push({
            typeProduct: item.typeProduct,
            productId: item.productId,
            name: item.name,
            barcode: item.barcode || '',
            serial: null,
            variableId: null,
            quantity: item.quantity,
            sellPrice: item.sellPrice,
            realSellPrice: item.realSellPrice ?? 0,
          });

          break;
        case ProductEnum.NORMAL_SERIALS:
          if (!item.serials || item.serials.length === 0) {
            throw new BadRequestException(
              `Serials missing for productId ${item.productId}`,
            );
          }

          // Xoá tất cả serials song song
          await Promise.all(
            item.serials.map((serial) =>
              this.productRepository.removeSerialFromProduct(
                item.productId,
                serial,
              ),
            ),
          );

          // Tạo orderItems sau khi đã xoá serials
          for (const serial of item.serials) {
            totalCostPrice += product.costPrice;
            orderItems.push({
              typeProduct: item.typeProduct,
              productId: item.productId,
              name: item.name,
              barcode: item.barcode || '',
              serial,
              variableId: null,
              quantity: 1,
              sellPrice: item.sellPrice,
              realSellPrice: item.realSellPrice ?? 0,
            });
          }
          break;
        case ProductEnum.NORMAL_VARIABLES: {
          if (!item.variable)
            throw new BadRequestException(
              `Variable missing for productId ${item.productId}`,
            );
          if (product.stock < item.quantity) {
            throw new BadRequestException(
              `Sản phẩm không đủ số lượng của ${item.name}`,
            );
          }
          const variable = await this.variableRepository.findById(
            item.variable.variableId,
          );
          // Trừ số lượng trong kho tổng sản phẩm
          await this.productRepository.updateQuantity(
            item.productId,
            product.stock - item.quantity,
          );
          // Trừ số lượng trong biến thể
          await this.variableRepository.updateStock(
            item.variable.variableId,
            variable!.stock - item.quantity,
          );
          totalCostPrice += (variable?.costPrice ?? 0) * item.quantity;
          orderItems.push({
            typeProduct: item.typeProduct,
            productId: item.productId,
            name: item.name,
            barcode: item.barcode || '',
            serial: null,
            variableId: item.variable.variableId,
            quantity: item.quantity,
            sellPrice: item.variable.sellPrice,
            realSellPrice: item.variable.realSellPrice ?? 0,
          });
          break;
        }
        case ProductEnum.NORMAL_VARIABLES_SERIALS: {
          if (!item.variable)
            throw new BadRequestException(
              `Variable missing for productId ${item.productId}`,
            );

          const variable = await this.variableRepository.findById(
            item.variable.variableId,
          );
          const serials = item.variable.serials;
          if (!serials || serials.length === 0)
            throw new Error(
              `Serials missing in variable for productId ${item.productId}`,
            );

          await Promise.all(
            serials.map(async (serial) => {
              await this.variableRepository.removeSerialFromVariable(
                item.variable!.variableId,
                serial,
              );
              totalCostPrice += variable?.costPrice ?? 0;
              orderItems.push({
                typeProduct: item.typeProduct,
                productId: item.productId,
                name: item.name,
                barcode: item.barcode || '',
                serial,
                quantity: 1,
                variableId: item.variable!.variableId,
                sellPrice: item.variable!.sellPrice,
                realSellPrice: item.variable!.realSellPrice ?? 0,
              });
            }),
          );
          break;
        }
        default:
          throw new Error(`Unknown typeProduct: ${item.typeProduct}`);
      }
    }
    const customerDebt = calculateCustomerDebt(
      dto.totalAmount,
      dto.totalAmountDiscount,
      dto.customerPaid,
    );
    let paymentStatus: 'paid' | 'partial' | 'unpaid';

    if (customerDebt === 0) {
      paymentStatus = 'paid';
    } else if (dto.customerPaid > 0 && customerDebt > 0) {
      paymentStatus = 'partial';
    } else {
      paymentStatus = 'unpaid';
    }
    const orderData = {
      staffId: dto.staffId,
      customerId: dto.customerId,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerAddress: dto.customerAddress,
      productList: orderItems,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      totalAmount: dto.totalAmount,
      estimatedRevenue: dto.customerPaid || 0,
      totalAmountDiscount: dto.totalAmountDiscount,
      customerPaid: dto.customerPaid,
      customerDebt: customerDebt,
      paymentStatus: paymentStatus,
      totalCostPrice: totalCostPrice,
      createdAt: dto.saleDate ? new Date(dto.saleDate) : new Date(),
    };
    const order = (await this.orderRepository.create(orderData)) as Order & {
      _id: Types.ObjectId;
    };

    await this.activityLogService.logActivity({
      userId: dto.staffId,
      action: 'CREATE_ORDER',
      message: `Tạo đơn hàng cho khách ${dto.customerName} (${dto.customerPhone})`,
      refId: String(order._id),
      refType: 'Order',
      metadata: {
        total:
          dto.totalAmountDiscount > 0
            ? dto.totalAmountDiscount
            : dto.totalAmount,
        totalAmountDiscount: dto.totalAmountDiscount,
        productCount: orderItems.length,
      },
    });
    return { order };
  }

  async returnOrder(
    orderId: string,
    returnItems: ReturnItemDto[],
    staffId: string,
    refund: refundDto,
  ): Promise<void> {
    const order = (await this.orderRepository.getOrderById(
      orderId,
    )) as Order & {
      _id: Types.ObjectId;
    };
    if (!order) throw new NotFoundException(`Order not found`);

    for (const item of returnItems) {
      switch (item.typeProduct) {
        case ProductEnum.NO_VARIABLE_NO_SERIAL: {
          const currentProduct = await this.productRepository.findProductById(
            item.productId,
          );
          if (!currentProduct)
            throw new NotFoundException(`Product not found ${item.name}`);

          await this.productRepository.updateQuantity(
            item.productId,
            currentProduct.stock + item.quantity,
          );
          break;
        }
        case ProductEnum.NORMAL_VARIABLES: {
          if (!item.variableId) {
            throw new BadRequestException(
              `variable not found in product ${item.name}`,
            );
          }
          const currentProduct = await this.productRepository.findProductById(
            item.productId,
          );
          if (!currentProduct) {
            throw new NotFoundException(`Product not found: ${item.name}`);
          }

          const currentVariable = await this.variableRepository.findById(
            item.variableId,
          );

          if (!currentVariable) {
            throw new NotFoundException(`Variable not found ${item.name}`);
          }

          await this.productRepository.updateQuantity(
            item.productId,
            currentProduct.stock + item.quantity,
          );

          await this.variableRepository.updateStock(
            item.variableId,
            currentVariable.stock + item.quantity,
          );
          break;
        }
        case ProductEnum.NORMAL_SERIALS: {
          const currentProduct = await this.productRepository.findProductById(
            item.productId,
          );
          if (!currentProduct)
            throw new NotFoundException(`Product not found ${item.name}`);
          if (!item.serial) {
            throw new BadRequestException(
              `Serials not empty with product ${item.name}`,
            );
          }
          await this.productRepository.updateQuantity(
            item.productId,
            currentProduct.stock + item.quantity,
          );
          await this.productRepository.addSerialToProduct(
            item.productId,
            item.serial,
          );

          break;
        }

        case ProductEnum.NORMAL_VARIABLES_SERIALS:
          if (!item.variableId || !item.serial) {
            throw new BadRequestException(
              `Thiếu variableId hoặc serial của sản phẩm ${item.name}`,
            );
          }

          await this.variableRepository.addSerialToVariable(
            item.variableId,
            item.serial,
          );
          break;
        default:
          throw new BadRequestException(
            `typeProduct not have ProductEnum: ${item.typeProduct}`,
          );
      }
    }
    // Tính doanh thu sau hoàn hàng
    // Logic: Doanh thu còn lại = Tổng tiền ban đầu - Số tiền hoàn
    const originalRevenue = order.totalAmountDiscount > 0 ? order.totalAmountDiscount : order.totalAmount;
    const revenueAfterRefund = Math.max(0, originalRevenue - refund.money);

    // LOGIC ĐÚNG: Khi hoàn hàng, hàng được trả về kho
    // → Không còn cost trong order này → Cost = 0
    // → Lợi nhuận = toàn bộ số tiền giữ lại
    const adjustedCostPrice = 0;

    await this.orderRepository.updateReturnOrder(
      String(order._id),
      revenueAfterRefund,
      refund.reason,
      adjustedCostPrice,
    );
    await this.activityLogService.logActivity({
      userId: staffId,
      action: 'RETURN_ORDER_ITEM',
      message: `Hoàn hàng đơn ${orderId} (${returnItems.length} sản phẩm)`,
      refId: String(order._id),
      refType: 'Order',
      metadata: {
        total: refund.money,
        productCount: returnItems.length,
      },
    });
  }
  async getOrderById(id: string): Promise<Order | null> {
    return this.orderRepository.getOrderById(id);
  }
  async getAll(query: BaseQueryDto): Promise<{
    data: Order[];
    attrs: { totalPage: number; totalCount: number };
  }> {
    const data = await this.orderRepository.findAll(query);
    const attrs = await this.orderRepository.count(query);
    return {
      data,
      attrs,
    };
  }

  async getOrderDetail(id: string): Promise<Order | null> {
    return await this.orderRepository.getOrderById(id);
  }

  async customerPaymentDept(orderId: string, money: number) {
    const order = await this.orderRepository.getOrderById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const debt = order.customerDebt - money;
    const paymentStatus = debt === 0 ? 'paid' : 'partial';

    // FIXED: Cập nhật doanh thu thực tế khi khách trả nợ thêm
    const newEstimatedRevenue = order.estimatedRevenue + money;

    const result = await this.orderRepository.customerPaymentDept(
      orderId,
      debt,
      paymentStatus,
      newEstimatedRevenue, // Thêm parameter này
    );

    await this.activityLogService.logActivity({
      userId: order.staffId.toString(),
      action: 'CREATE_ORDER',
      message: `Khách hàng thanh toán ${money.toLocaleString('vi-VN')} VNĐ cho đơn hàng`,
      refId: orderId,
      refType: 'Order',
      metadata: {
        paymentAmount: money,
        remainingDebt: debt,
      },
    });

    return createResponse(HttpStatus.OK, result, 'Thanh toán thành công');
  }

  async softDeleteOrder(orderId: string, userId: string) {
    const order = (await this.orderRepository.getOrderById(orderId)) as Order & {
      _id: Types.ObjectId;
    };
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Chỉ hoàn trả stock nếu đơn hàng CHƯA được hoàn trả
    // Nếu đã hoàn hàng rồi (isReturnOrder = true) thì không cần hoàn trả stock nữa
    if (!order.isReturnOrder) {
      // Hoàn trả stock cho tất cả sản phẩm trong đơn hàng (giống logic hoàn hàng 100%)
      for (const item of order.productList) {
        // Convert typeProduct to number since it's stored as string in MongoDB
        const typeProduct = Number(item.typeProduct);

        switch (typeProduct) {
          case ProductEnum.NO_VARIABLE_NO_SERIAL: {
            const currentProduct = await this.productRepository.findProductById(
              String(item.productId),
            );
            if (!currentProduct)
              throw new NotFoundException(`Product not found ${item.name}`);

            await this.productRepository.updateQuantity(
              String(item.productId),
              currentProduct.stock + item.quantity,
            );
            break;
          }
          case ProductEnum.NORMAL_VARIABLES: {
            if (!item.variableId) {
              throw new BadRequestException(
                `variable not found in product ${item.name}`,
              );
            }
            const currentProduct = await this.productRepository.findProductById(
              String(item.productId),
            );
            if (!currentProduct) {
              throw new NotFoundException(`Product not found: ${item.name}`);
            }

            const currentVariable = await this.variableRepository.findById(
              item.variableId,
            );

            if (!currentVariable) {
              throw new NotFoundException(`Variable not found ${item.name}`);
            }

            await this.productRepository.updateQuantity(
              String(item.productId),
              currentProduct.stock + item.quantity,
            );

            await this.variableRepository.updateStock(
              item.variableId,
              currentVariable.stock + item.quantity,
            );
            break;
          }
          case ProductEnum.NORMAL_SERIALS: {
            const currentProduct = await this.productRepository.findProductById(
              String(item.productId),
            );
            if (!currentProduct)
              throw new NotFoundException(`Product not found ${item.name}`);
            if (!item.serial) {
              throw new BadRequestException(
                `Serials not empty with product ${item.name}`,
              );
            }
            await this.productRepository.updateQuantity(
              String(item.productId),
              currentProduct.stock + item.quantity,
            );
            await this.productRepository.addSerialToProduct(
              String(item.productId),
              item.serial,
            );

            break;
          }

          case ProductEnum.NORMAL_VARIABLES_SERIALS:
            if (!item.variableId || !item.serial) {
              throw new BadRequestException(
                `Thiếu variableId hoặc serial của sản phẩm ${item.name}`,
              );
            }

            await this.variableRepository.addSerialToVariable(
              item.variableId,
              item.serial,
            );
            break;
          default:
            throw new BadRequestException(
              `typeProduct not have ProductEnum: ${item.typeProduct} (converted: ${typeProduct})`,
            );
        }
      }
    }

    // Cập nhật trạng thái đơn hàng
    const adjustedCostPrice = order.isReturnOrder ? order.totalCostPrice : 0;
    const adjustedRevenue = order.isReturnOrder ? order.estimatedRevenue : 0;

    const updateData = {
      isDelete: true,
      estimatedRevenue: adjustedRevenue, // Giữ nguyên nếu đã hoàn, set 0 nếu chưa hoàn
      totalCostPrice: adjustedCostPrice,   // Giữ nguyên nếu đã hoàn, set 0 nếu chưa hoàn
    };

    const result = await this.orderRepository.update(orderId, updateData);

    const statusMessage = order.isReturnOrder ? '(Đã hoàn hàng trước đó)' : `(${order.productList.length} sản phẩm, Doanh thu gốc: ${order.estimatedRevenue?.toLocaleString('vi-VN')} VNĐ)`;

    await this.activityLogService.logActivity({
      userId: userId,
      action: 'DELETE_ORDER',
      message: `Xóa đơn hàng #${orderId} ${statusMessage}`,
      refId: orderId,
      refType: 'Order',
      metadata: {
        originalRevenue: order.estimatedRevenue,
        originalCostPrice: order.totalCostPrice,
        totalAmount: order.totalAmount,
        productCount: order.productList.length,
        wasReturnedOrder: order.isReturnOrder,
      },
    });

    return createResponse(HttpStatus.OK, result, 'Xóa đơn hàng thành công');
  }
}
