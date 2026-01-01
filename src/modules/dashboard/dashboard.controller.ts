import { Controller, Get, HttpStatus, Query, UseGuards, Res } from '@nestjs/common';
import { DashboardService, TimeType } from './dashboard.service';
import { createResponse } from 'src/common/helpers/response.helper';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SalesReportUseCase } from './sales-report.use-cases';
import { Response } from 'express';
import { OrderRepository } from '../orders/order.repository';
import * as dayjs from 'dayjs';
import * as timezone from 'dayjs/plugin/timezone';
import * as utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

@Controller('dashboards')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly salesReportUseCase: SalesReportUseCase,
    private readonly orderRepository: OrderRepository,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Get('revenue')
  async getRevenue() {
    const data = await this.dashboardService.getRevenueDashboard();
    return createResponse(HttpStatus.OK, data, 'Lấy dữ liệu thành công');
  }

  @UseGuards(JwtAuthGuard)
  @Get('dateTime')
  async getRevenueByTimeType(
    @Query('timeType') timeType: TimeType = 'TODAY',
    @Query('customFrom') customFrom?: string,
    @Query('customTo') customTo?: string,
  ) {
    const customFromDate = customFrom ? new Date(customFrom) : undefined;
    const customToDate = customTo ? new Date(customTo) : undefined;
    return this.dashboardService.getRevenueByTimeType(timeType, customFromDate, customToDate);
  }

  @UseGuards(JwtAuthGuard)
  @Get('year')
  async getRevenueByYear(@Query('year') year: number) {
    return this.dashboardService.getRevenueByYear(year);
  }

  @UseGuards(JwtAuthGuard)
  @Get('topProduct')
  async getTopProductsByQuantityAndRevenue(
    @Query('timeType') timeType: TimeType = 'TODAY',
    @Query('customFrom') customFrom?: string,
    @Query('customTo') customTo?: string,
  ) {
    const customFromDate = customFrom ? new Date(customFrom) : undefined;
    const customToDate = customTo ? new Date(customTo) : undefined;
    const data = await this.dashboardService.getTopProductsByQuantityAndRevenue(timeType, customFromDate, customToDate);
    return createResponse(HttpStatus.OK, data, 'Lấy dữ liệu top sản phẩm thành công');
  }

  @UseGuards(JwtAuthGuard)
  @Get('customers')
  async getCustomerAnalytics(
    @Query('timeType') timeType: TimeType = 'TODAY',
    @Query('customFrom') customFrom?: string,
    @Query('customTo') customTo?: string,
  ) {
    const customFromDate = customFrom ? new Date(customFrom) : undefined;
    const customToDate = customTo ? new Date(customTo) : undefined;
    const data = await this.dashboardService.getCustomerAnalytics(timeType, customFromDate, customToDate);
    return createResponse(HttpStatus.OK, data, 'Lấy dữ liệu khách hàng thành công');
  }

  @UseGuards(JwtAuthGuard)
  @Get('categories')
  async getCategoryDistribution(
    @Query('timeType') timeType: TimeType = 'TODAY',
    @Query('customFrom') customFrom?: string,
    @Query('customTo') customTo?: string,
  ) {
    const customFromDate = customFrom ? new Date(customFrom) : undefined;
    const customToDate = customTo ? new Date(customTo) : undefined;
    const data = await this.dashboardService.getCategoryDistribution(timeType, customFromDate, customToDate);
    return createResponse(HttpStatus.OK, data, 'Lấy dữ liệu danh mục thành công');
  }

  @UseGuards(JwtAuthGuard)
  @Get('debug/collections')
  async debugCollections() {
    const data = await this.dashboardService.debugCollections();
    return createResponse(HttpStatus.OK, data, 'Debug collections thành công');
  }

  @UseGuards(JwtAuthGuard)
  @Get('debug/orders')
  async debugOrders() {
    const data = await this.dashboardService.debugOrders();
    return createResponse(HttpStatus.OK, data, 'Debug orders thành công');
  }

  @Get('/debug-debt')
  async debugDebt() {
    const dashboardData = await this.dashboardService.getRevenueDashboard();
    const todayData = await this.dashboardService.getRevenueByTimeType('TODAY');
    const yearData = await this.dashboardService.getRevenueByYear(2025);

    return {
      dashboard: {
        totalRevenue: dashboardData.value,
      },
      today: {
        totalRevenue: todayData.totalRevenue,
      },
      year: {
        totalRevenue: yearData.totalRevenue,
      }
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('sales-report')
  async getSalesReport(
    @Query('timeType') timeType: TimeType = 'TODAY',
    @Query('customFrom') customFrom?: string,
    @Query('customTo') customTo?: string,
  ) {
    try {
      console.log('🎯 Sales Report Controller called with:', { timeType, customFrom, customTo });
      const customFromDate = customFrom ? new Date(customFrom) : undefined;
      const customToDate = customTo ? new Date(customTo) : undefined;
      const data = await this.dashboardService.getSalesReport(timeType, customFromDate, customToDate);
      console.log('✅ Sales Report Controller success');
      return createResponse(HttpStatus.OK, data, 'Lấy báo cáo bán hàng thành công');
    } catch (error) {
      console.error('❌ Sales Report Controller error:', error);
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, null, 'Lỗi khi lấy báo cáo bán hàng');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('sales-report/pdf')
  async getSalesReportPDF(
    @Res() res: Response,
    @Query('timeType') timeType: TimeType = 'TODAY',
    @Query('customFrom') customFrom?: string,
    @Query('customTo') customTo?: string,
  ) {
    try {
      console.log('🎯 Sales Report PDF Controller called with:', { timeType, customFrom, customTo });
      const customFromDate = customFrom ? new Date(customFrom) : undefined;
      const customToDate = customTo ? new Date(customTo) : undefined;

      const pdfBuffer = await this.salesReportUseCase.generateSalesReportPDFBuffer(
        timeType,
        customFromDate,
        customToDate,
      );

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `bao-cao-chi-tiet-san-pham-${timestamp}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

      console.log('✅ Sales Report PDF Controller success');
      return res.send(pdfBuffer);
    } catch (error) {
      console.error('❌ Sales Report PDF Controller error:', error);
      return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, null, 'Lỗi khi tạo PDF báo cáo bán hàng');
    }
  }

  @Get('/debug-debt-orders-2025')
  async debugDebtOrders2025() {
    // Tìm tất cả đơn hàng năm 2025 có công nợ > 0
    const from = new Date('2025-01-01T00:00:00.000Z');
    const to = new Date('2025-12-31T23:59:59.999Z');

    const ordersWithDebt = await this.orderRepository.find({
      createdAt: { $gte: from, $lte: to },
      isDelete: { $ne: true },
      customerDebt: { $gt: 0 },
    });

    const totalDebt = ordersWithDebt.reduce((sum, order) => sum + (order.customerDebt || 0), 0);

    const ordersByMonth: { [key: string]: any[] } = {};
    ordersWithDebt.forEach(order => {
      const month = new Date((order as any).createdAt).getMonth() + 1;
      const monthKey = `Tháng ${month}`;
      if (!ordersByMonth[monthKey]) {
        ordersByMonth[monthKey] = [];
      }
      ordersByMonth[monthKey].push({
        id: (order as any)._id,
        createdAt: (order as any).createdAt,
        customerDebt: order.customerDebt,
        totalAmount: order.totalAmount,
        customerPaid: order.customerPaid,
        paymentStatus: order.paymentStatus,
      });
    });

    return {
      summary: {
        totalOrdersWithDebt: ordersWithDebt.length,
        totalDebt,
        monthsWithDebt: Object.keys(ordersByMonth),
      },
      ordersByMonth,
      allDebtOrders: ordersWithDebt.slice(0, 10).map(order => ({
        id: (order as any)._id,
        createdAt: (order as any).createdAt,
        customerDebt: order.customerDebt,
        totalAmount: order.totalAmount,
        customerPaid: order.customerPaid,
        paymentStatus: order.paymentStatus,
      })),
    };
  }

  @Get('/debug-year-2025')
  async debugYear2025() {
    // Lấy tất cả đơn hàng năm 2025
    const from = new Date('2025-01-01T00:00:00.000Z');
    const to = new Date('2025-12-31T23:59:59.999Z');

    const orders = await this.orderRepository.find({
      createdAt: { $gte: from, $lte: to },
      isDelete: { $ne: true },
    });

    console.log('=== DEBUG YEAR 2025 ORDERS ===');
    console.log('Total orders found:', orders.length);

    let totalRevenue = 0;
    let totalDebt = 0;
    let totalAmount = 0;

    const orderDetails = orders.map(order => {
      totalRevenue += order.estimatedRevenue || 0;
      totalDebt += order.customerDebt || 0;
      totalAmount += order.totalAmount || 0;

      return {
        id: (order as any)._id,
        createdAt: (order as any).createdAt,
        totalAmount: order.totalAmount,
        estimatedRevenue: order.estimatedRevenue,
        customerDebt: order.customerDebt,
        customerPaid: order.customerPaid,
        paymentStatus: order.paymentStatus,
      };
    });

    console.log('Calculated totals:', {
      totalRevenue,
      totalDebt,
      totalAmount,
      actualRevenue: totalRevenue - totalDebt
    });

    return {
      totalOrders: orders.length,
      totals: {
        totalRevenue,
        totalDebt,
        totalAmount,
        actualRevenue: totalRevenue - totalDebt
      },
      orders: orderDetails.slice(0, 10), // Chỉ trả về 10 đơn đầu tiên để xem
      suspiciousOrders: orderDetails.filter(o => o.customerDebt > 1000000) // Đơn có công nợ > 1M
    };
  }

  @Get('/debug-year-simple')
  async debugYearSimple() {
    return await this.dashboardService.debugYear2025Simple();
  }

  @Get('/debug-high-debt')
  async debugHighDebt() {
    return await this.dashboardService.findHighDebtOrders();
  }

  @Get('/debug-compare-debt')
  async debugCompareDebt() {
    return await this.dashboardService.compareDebtCalculations();
  }

  @Get('/debug-year-2025-detailed')
  async debugYear2025Detailed() {
    return await this.dashboardService.debugYear2025Detailed();
  }

  @Get('/debug-revenue-today')
  async debugRevenueToday() {
    const now = dayjs().tz('Asia/Ho_Chi_Minh');
    const startOfToday = now.startOf('day').toDate();
    const endOfToday = now.endOf('day').toDate();

    // Lấy tất cả đơn hàng hôm nay
    const allTodayOrders = await this.orderRepository.find({
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });

    const debugInfo = allTodayOrders.map(order => {
      const orderTotalValue = order.totalAmountDiscount > 0 ? order.totalAmountDiscount : order.totalAmount;
      return {
        id: (order as any)._id,
        totalAmount: order.totalAmount,
        totalAmountDiscount: order.totalAmountDiscount,
        estimatedRevenue: order.estimatedRevenue,
        customerPaid: order.customerPaid,
        totalCostPrice: order.totalCostPrice,
        calculatedOrderValue: orderTotalValue,
        calculatedProfit: orderTotalValue - (order.totalCostPrice || 0),
        isValidOrder: !order.isDelete,
        createdAt: (order as any).createdAt,
      };
    });

    // Tính tổng theo logic mới
    let totalRevenue = 0;
    let totalCostPrice = 0;
    let totalProfit = 0;

    debugInfo.forEach(order => {
      if (order.isValidOrder) {
        totalRevenue += order.calculatedOrderValue || 0;
        totalCostPrice += order.totalCostPrice || 0;
      }
    });

    totalProfit = totalRevenue - totalCostPrice;

    return {
      summary: {
        totalRevenue,
        totalCostPrice,
        totalProfit,
        totalOrders: debugInfo.length,
      },
      orders: debugInfo,
      apiResult: await this.dashboardService.getRevenueByTimeType('TODAY'),
    };
  }

  @Get('/debug-debt-simple')
  async debugDebtSimple() {
    // 1. Lấy tất cả đơn hàng không bị xóa
    const allActiveOrders = await this.orderRepository.find({
      isDelete: { $ne: true },
    });

    // 2. Tính tổng doanh thu thủ công
    let totalRevenueManual = 0;
    let orderCount = 0;

    const orderDetails = allActiveOrders.map(order => {
      const revenue = order.estimatedRevenue || 0;

      totalRevenueManual += revenue;
      orderCount++;

      return {
        id: (order as any)._id,
        estimatedRevenue: revenue,
        totalAmount: order.totalAmount,
        customerPaid: order.customerPaid,
        paymentStatus: order.paymentStatus,
        createdAt: (order as any).createdAt,
      };
    });

    // 3. Gọi các API khác để so sánh
    const dashboardResult = await this.dashboardService.getRevenueDashboard();
    const year2025Result = await this.dashboardService.getRevenueByYear(2025);
    const todayResult = await this.dashboardService.getRevenueByTimeType('TODAY');

    return {
      manual: {
        totalOrders: orderCount,
        totalRevenue: totalRevenueManual,
      },
      dashboard: {
        totalRevenue: dashboardResult.value,
      },
      today: {
        totalRevenue: todayResult.totalRevenue,
      },
      year2025: {
        totalRevenue: year2025Result.totalRevenue,
      },
      // Hiển thị 5 đơn hàng đầu tiên
      topOrders: orderDetails.slice(0, 5),
    };
  }

  @Get('/debug-year-2025-by-month')
  async debugYear2025ByMonth() {
    const results: any[] = [];

    for (let month = 1; month <= 12; month++) {
      const from = new Date(`2025-${month.toString().padStart(2, '0')}-01T00:00:00.000Z`);
      const to = new Date(`2025-${month.toString().padStart(2, '0')}-${new Date(2025, month, 0).getDate()}T23:59:59.999Z`);

      const orders = await this.orderRepository.find({
        createdAt: { $gte: from, $lte: to },
        isDelete: { $ne: true },
      });

      let totalRevenue = 0;
      let totalDebt = 0;

      orders.forEach(order => {
        totalRevenue += order.estimatedRevenue || 0;
        totalDebt += order.customerDebt || 0;
      });

      results.push({
        month,
        monthName: `Tháng ${month}`,
        orderCount: orders.length,
        totalRevenue,
        totalDebt,
        actualRevenue: totalRevenue - totalDebt,
        hasDebt: totalDebt > 0,
        topDebtOrders: orders
          .filter(o => (o.customerDebt || 0) > 0)
          .sort((a, b) => (b.customerDebt || 0) - (a.customerDebt || 0))
          .slice(0, 3)
          .map(o => ({
            id: (o as any)._id,
            customerDebt: o.customerDebt,
            totalAmount: o.totalAmount,
            customerPaid: o.customerPaid,
            createdAt: (o as any).createdAt
          }))
      });
    }

    const yearTotal = results.reduce((sum: any, month: any) => ({
      orderCount: sum.orderCount + month.orderCount,
      totalRevenue: sum.totalRevenue + month.totalRevenue,
      totalDebt: sum.totalDebt + month.totalDebt,
    }), { orderCount: 0, totalRevenue: 0, totalDebt: 0 });

    return {
      yearSummary: {
        ...yearTotal,
        actualRevenue: yearTotal.totalRevenue - yearTotal.totalDebt
      },
      monthlyBreakdown: results,
      monthsWithData: results.filter((m: any) => m.orderCount > 0),
      monthsWithDebt: results.filter((m: any) => m.hasDebt),
    };
  }
}
