import { Injectable } from '@nestjs/common';
import { OrderRepository } from '../orders/order.repository';
import * as dayjs from 'dayjs';
import * as quarterOfYear from 'dayjs/plugin/quarterOfYear';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
import { ProductRepository } from '../products/product.repository';
import { ProductDocument } from '../products/product.entity';
import { CustomerRepository } from '../customers/customer.repository';

dayjs.extend(quarterOfYear);
dayjs.extend(utc);
dayjs.extend(timezone);

export type TimeType =
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_QUARTER'
  | 'THIS_YEAR'
  | 'CUSTOM';
@Injectable()
export class DashboardService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productRepository: ProductRepository,
    private readonly customerRepository: CustomerRepository,
  ) { }
  private getDateRange(timeType: TimeType, customFrom?: Date, customTo?: Date) {
    // Use Vietnam timezone consistently
    const now = dayjs().tz('Asia/Ho_Chi_Minh');
    switch (timeType) {
      case 'TODAY':
        return {
          from: now.startOf('day').toDate(),
          to: now.endOf('day').toDate(),
        };
      case 'YESTERDAY':
        return {
          from: now.subtract(1, 'day').startOf('day').toDate(),
          to: now.subtract(1, 'day').endOf('day').toDate(),
        };
      case 'THIS_WEEK':
        return {
          from: now.startOf('week').toDate(),
          to: now.endOf('week').toDate(),
        };
      case 'THIS_MONTH':
        return {
          from: now.startOf('month').toDate(),
          to: now.endOf('month').toDate(),
        };
      case 'LAST_MONTH':
        return {
          from: now.subtract(1, 'month').startOf('month').toDate(),
          to: now.subtract(1, 'month').endOf('month').toDate(),
        };
      case 'THIS_QUARTER':
        const quarterStart = now.quarter(now.quarter()).startOf('quarter');
        const quarterEnd = now.quarter(now.quarter()).endOf('quarter');
        return {
          from: quarterStart.toDate(),
          to: quarterEnd.toDate(),
        };
      case 'THIS_YEAR':
        return {
          from: now.startOf('year').toDate(),
          to: now.endOf('year').toDate(),
        };
      case 'CUSTOM':
        return {
          from: customFrom || now.startOf('day').toDate(),
          to: customTo || now.endOf('day').toDate(),
        };
      default:
        return {
          from: now.startOf('day').toDate(),
          to: now.endOf('day').toDate(),
        };
    }
  }
  private isValidOrder(order: any): boolean {
    // Chỉ kiểm tra đơn hàng không bị xóa
    if (order.isDelete === true) return false;

    return true;

    // // Kiểm tra công nợ hợp lý
    // const debt = order.customerDebt || 0;
    // const totalAmount = order.totalAmount || 0;
    // const totalAmountDiscount = order.totalAmountDiscount || 0;
    // const customerPaid = order.customerPaid || 0;

    // // Công nợ không được âm
    // if (debt < 0) return false;

    // // Công nợ không được lớn hơn tổng tiền đơn hàng
    // const orderTotal = totalAmountDiscount > 0 ? totalAmountDiscount : totalAmount;
    // if (debt > orderTotal) return false;

    // // Công nợ không được quá lớn (> 10M có thể là dữ liệu test sai)
    // if (debt > 10000000) return false;

    // // Kiểm tra logic tính công nợ
    // const calculatedDebt = totalAmountDiscount > 0
    //   ? Math.max(0, totalAmountDiscount - customerPaid)
    //   : Math.max(0, totalAmount - customerPaid);

    // // Cho phép sai lệch nhỏ (< 1000 VND) do làm tròn
    // if (Math.abs(debt - calculatedDebt) > 1000) {
    //   console.warn('Invalid debt calculation:', {
    //     orderId: order._id,
    //     debt,
    //     calculatedDebt,
    //     totalAmount,
    //     totalAmountDiscount,
    //     customerPaid
    //   });
    //   return false;
    // }

    // return true;
  }
  async getRevenueDashboard() {
    const now = dayjs().tz('Asia/Ho_Chi_Minh');
    const startOfToday = now.startOf('day').toDate();
    const endOfToday = now.endOf('day').toDate();

    const startOfYesterday = now.subtract(1, 'day').startOf('day').toDate();
    const endOfYesterday = now.subtract(1, 'day').endOf('day').toDate();

    const startOfMonth = now.startOf('month').toDate();
    const endOfMonth = now.endOf('month').toDate();

    // Lấy tất cả đơn hàng hôm nay
    const allTodayOrders = await this.orderRepository.find({
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });

    // Lọc chỉ những đơn hàng hợp lệ
    const todayOrders = allTodayOrders.filter(order => this.isValidOrder(order));

    console.log(`Dashboard Today - Total orders: ${allTodayOrders.length}, Valid orders: ${todayOrders.length}`);

    // Doanh thu hôm nay = tổng giá trị hóa đơn (tổng tiền bán, không phụ thuộc vào thanh toán)
    const totalToday = todayOrders.reduce(
      (sum, order) => {
        const orderTotalValue = order.totalAmountDiscount > 0 ? order.totalAmountDiscount : order.totalAmount;
        return sum + (orderTotalValue || 0);
      },
      0,
    );



    // Đếm số đơn có doanh thu (có giá trị hóa đơn > 0)
    const totalBill = todayOrders.filter(order => {
      const orderTotalValue = order.totalAmountDiscount > 0 ? order.totalAmountDiscount : order.totalAmount;
      return orderTotalValue > 0;
    }).length;

    // Lấy tất cả đơn hàng hôm qua
    const allYesterdayOrders = await this.orderRepository.find({
      createdAt: { $gte: startOfYesterday, $lte: endOfYesterday },
    });
    const yesterdayOrders = allYesterdayOrders.filter(order => this.isValidOrder(order));

    const totalYesterday = yesterdayOrders.reduce(
      (sum, order) => {
        const orderTotalValue = order.totalAmountDiscount > 0 ? order.totalAmountDiscount : order.totalAmount;
        return sum + (orderTotalValue || 0);
      },
      0,
    );

    // Lấy tất cả đơn hàng tháng này
    const allMonthOrders = await this.orderRepository.find({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    });
    const monthOrders = allMonthOrders.filter(order => this.isValidOrder(order));

    const totalMonth = monthOrders.reduce(
      (sum, order) => {
        const orderTotalValue = order.totalAmountDiscount > 0 ? order.totalAmountDiscount : order.totalAmount;
        return sum + (orderTotalValue || 0);
      },
      0,
    );

    const avgPerDay = totalMonth / now.date();

    // Tổng đơn hàng hôm nay (tất cả đơn bao gồm cả unpaid)
    const allTodayOrdersCount = allTodayOrders.length;

    // Đếm số lượng hóa đơn hoàn hôm nay
    const totalReturnedOrders = todayOrders.filter(order => order.isReturnOrder).length;

    // Tính số lượng hóa đơn chuẩn (tổng hóa đơn - hóa đơn hoàn)
    const totalNormalOrders = allTodayOrdersCount - totalReturnedOrders;

    const compareWithYesterday = totalYesterday
      ? ((totalToday - totalYesterday) / totalYesterday) * 100
      : 0;

    const compareWithMonth = avgPerDay
      ? ((totalToday - avgPerDay) / avgPerDay) * 100
      : 0;

    return {
      title: 'Doanh Thu',
      value: totalToday,
      compareWithYesterday: Math.round(compareWithYesterday),
      compareWithMonth: Math.round(compareWithMonth),
      totalBill,
      totalOrders: allTodayOrdersCount,
      totalReturnedOrders,
      totalNormalOrders,
    };
  }

  async getRevenueByTimeType(timeType: TimeType, customFrom?: Date, customTo?: Date) {
    const { from, to } = this.getDateRange(timeType, customFrom, customTo);

    // Lấy tất cả đơn hàng trong khoảng thời gian
    const allOrders = await this.orderRepository.find({
      createdAt: { $gte: from, $lte: to },
    });

    // Lọc chỉ những đơn hàng hợp lệ
    const validOrders = allOrders.filter(order => this.isValidOrder(order));

    console.log(`${timeType} - Total orders: ${allOrders.length}, Valid orders: ${validOrders.length}`);

    // Tính tổng từ valid orders
    let totalRevenue = 0;
    let totalCostPrice = 0;

    validOrders.forEach(order => {
      // Sử dụng tổng giá trị hóa đơn thay vì số tiền đã thu
      const orderTotalValue = order.totalAmountDiscount > 0 ? order.totalAmountDiscount : order.totalAmount;
      totalRevenue += orderTotalValue || 0;
      totalCostPrice += order.totalCostPrice || 0;
    });

    const totalProfit = totalRevenue - totalCostPrice;

    // Count total valid orders for the period
    const totalOrdersCount = validOrders.length;

    // Group by Hour (Revenue, CostPrice, Profit)
    const hourGroups = await this.orderRepository.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lte: to },
          isDelete: { $ne: true },
        },
      },
      {
        $addFields: {
          localTime: {
            $dateToParts: {
              date: '$createdAt',
              timezone: 'Asia/Ho_Chi_Minh',
            },
          },
          // Tính tổng giá trị hóa đơn (ưu tiên totalAmountDiscount nếu có, không thì lấy totalAmount)
          totalOrderValue: {
            $cond: {
              if: { $gt: ['$totalAmountDiscount', 0] },
              then: '$totalAmountDiscount',
              else: '$totalAmount'
            }
          }
        },
      },
      {
        $group: {
          _id: {
            hour: '$localTime.hour',
            minute: '$localTime.minute',
          },
          revenue: { $sum: '$totalOrderValue' },
          costPrice: { $sum: '$totalCostPrice' },
        },
      },
      {
        $project: {
          date: {
            $concat: [
              {
                $cond: [
                  { $lt: ['$_id.hour', 10] },
                  { $concat: ['0', { $toString: '$_id.hour' }] },
                  { $toString: '$_id.hour' },
                ],
              },
              ':',
              {
                $cond: [
                  { $lt: ['$_id.minute', 10] },
                  { $concat: ['0', { $toString: '$_id.minute' }] },
                  { $toString: '$_id.minute' },
                ],
              },
            ],
          },
          revenue: 1,
          costPrice: 1,
          profit: { $subtract: ['$revenue', '$costPrice'] },
        },
      },
      { $sort: { date: 1 } },
    ]);

    // Group by Day (Revenue, CostPrice, Profit)
    const dayGroups = await this.orderRepository.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lte: to },
          isDelete: { $ne: true },
        },
      },
      {
        $addFields: {
          // Tính tổng giá trị hóa đơn (ưu tiên totalAmountDiscount nếu có, không thì lấy totalAmount)
          totalOrderValue: {
            $cond: {
              if: { $gt: ['$totalAmountDiscount', 0] },
              then: '$totalAmountDiscount',
              else: '$totalAmount'
            }
          }
        },
      },
      {
        $group: {
          _id: { $dayOfMonth: '$createdAt' },
          revenue: { $sum: '$totalOrderValue' },
          costPrice: { $sum: '$totalCostPrice' },
        },
      },
      {
        $project: {
          date: {
            $cond: [
              { $lt: ['$_id', 10] },
              { $concat: ['0', { $toString: '$_id' }] },
              { $toString: '$_id' },
            ],
          },
          revenue: 1,
          costPrice: 1,
          profit: { $subtract: ['$revenue', '$costPrice'] },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Group by Weekday (Revenue, CostPrice, Profit)
    const weekGroups = await this.orderRepository.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lte: to },
          isDelete: { $ne: true },
        },
      },
      {
        $addFields: {
          // Tính tổng giá trị hóa đơn (ưu tiên totalAmountDiscount nếu có, không thì lấy totalAmount)
          totalOrderValue: {
            $cond: {
              if: { $gt: ['$totalAmountDiscount', 0] },
              then: '$totalAmountDiscount',
              else: '$totalAmount'
            }
          }
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          revenue: { $sum: '$totalOrderValue' },
          costPrice: { $sum: '$totalCostPrice' },
        },
      },
      {
        $project: {
          date: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 1] }, then: 'CN' },
                { case: { $eq: ['$_id', 2] }, then: 'T2' },
                { case: { $eq: ['$_id', 3] }, then: 'T3' },
                { case: { $eq: ['$_id', 4] }, then: 'T4' },
                { case: { $eq: ['$_id', 5] }, then: 'T5' },
                { case: { $eq: ['$_id', 6] }, then: 'T6' },
                { case: { $eq: ['$_id', 7] }, then: 'T7' },
              ],
              default: 'Unknown',
            },
          },
          revenue: 1,
          costPrice: 1,
          profit: { $subtract: ['$revenue', '$costPrice'] },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      chartHour: hourGroups,
      chartDay: dayGroups,
      chartWeek: weekGroups,
      totalRevenue,
      totalCostPrice,
      totalProfit,
      totalOrders: totalOrdersCount,
    };
  }

  async getTopProductsByQuantityAndRevenue(timeType: TimeType, customFrom?: Date, customTo?: Date): Promise<{
    quantity: { date: string; value: number }[];
    revenue: { date: string; value: number }[];
  }> {
    const { from: start, to: end } = this.getDateRange(timeType, customFrom, customTo);

    // FIXED: Lấy TẤT CẢ đơn hàng bao gồm cả unpaid để đếm sản phẩm
    const orders = await this.orderRepository.find({
      createdAt: { $gte: start, $lte: end },
      isDelete: { $ne: true },
    });

    const productStats: Record<string, { quantity: number; revenue: number }> = {};

    for (const order of orders) {
      for (const item of order.productList) {
        const { productId, quantity, sellPrice } = item;
        const id = productId.toString();
        if (!productStats[id]) {
          productStats[id] = { quantity: 0, revenue: 0 };
        }
        // FIXED: Luôn đếm số lượng sản phẩm bán, bất kể đơn hàng thanh toán hay chưa
        productStats[id].quantity += quantity;
        // FIXED: Tính doanh thu cho tất cả sản phẩm đã bán, kể cả đơn hàng chưa thanh toán đầy đủ
        // Doanh thu = sellPrice * quantity (doanh thu gộp, không phụ thuộc vào thanh toán)
        productStats[id].revenue += quantity * sellPrice;
      }
    }

    // Lấy danh sách productId để map sang tên
    const productIds = Object.keys(productStats);
    const products = await this.productRepository.findByIds(productIds);

    const idToName = new Map(products.map((p) => [p?._id?.toString(), p.name]));

    const quantityList = Object.entries(productStats)
      .map(([id, stats]) => ({
        date: idToName.get(id) || 'Unknown',
        value: stats.quantity,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const revenueList = Object.entries(productStats)
      .map(([id, stats]) => ({
        date: idToName.get(id) || 'Unknown',
        value: stats.revenue,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return {
      quantity: quantityList,
      revenue: revenueList,
    };
  }

  async getRevenueByYear(year: number) {
    const from = dayjs(`${year}-01-01`).startOf('day').toDate();
    const to = dayjs(`${year}-12-31`).endOf('day').toDate();

    // Lấy tất cả đơn hàng trong năm
    const allOrders = await this.orderRepository.find({
      createdAt: { $gte: from, $lte: to },
    });

    // Lọc chỉ những đơn hàng hợp lệ
    const validOrders = allOrders.filter(order => this.isValidOrder(order));

    console.log(`Year ${year} - Total orders: ${allOrders.length}, Valid orders: ${validOrders.length}`);

    // DEBUG: Log chi tiết đơn hàng theo tháng
    const monthlyDebug: { [key: number]: { count: number; revenue: number } } = {};
    validOrders.forEach(order => {
      const month = dayjs((order as any).createdAt).month() + 1;
      if (!monthlyDebug[month]) {
        monthlyDebug[month] = { count: 0, revenue: 0 };
      }
      monthlyDebug[month].count++;
      // FIXED: Sử dụng tổng giá trị hóa đơn thay vì số tiền đã thu
      const orderTotalValue = order.totalAmountDiscount > 0 ? order.totalAmountDiscount : order.totalAmount;
      monthlyDebug[month].revenue += orderTotalValue || 0;
    });

    console.log(`=== YEAR ${year} MONTHLY DEBUG ===`);
    for (let month = 1; month <= 12; month++) {
      const data = monthlyDebug[month];
      if (data && data.count > 0) {
        console.log(`Tháng ${month}: ${data.count} đơn, Doanh thu: ${data.revenue}`);
      }
    }
    console.log('=== END MONTHLY DEBUG ===');

    // Tính doanh thu theo tháng từ valid orders
    const monthlyData: { [key: number]: { revenue: number; costPrice: number } } = {};

    validOrders.forEach(order => {
      const month = dayjs((order as any).createdAt).month() + 1; // dayjs month is 0-based
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, costPrice: 0 };
      }
      // FIXED: Sử dụng tổng giá trị hóa đơn thay vì số tiền đã thu
      const orderTotalValue = order.totalAmountDiscount > 0 ? order.totalAmountDiscount : order.totalAmount;
      monthlyData[month].revenue += orderTotalValue || 0;
      monthlyData[month].costPrice += order.totalCostPrice || 0;
    });

    // FIXED: Chỉ tính tổng từ những tháng có dữ liệu thực tế
    let totalRevenue = 0;
    let totalCostPrice = 0;

    Object.values(monthlyData).forEach(monthData => {
      totalRevenue += monthData.revenue;
      totalCostPrice += monthData.costPrice;
    });

    const totalProfit = totalRevenue - totalCostPrice;

    console.log(`=== YEAR ${year} TOTALS ===`);
    console.log(`Total Revenue: ${totalRevenue}`);
    console.log(`Total Profit: ${totalProfit}`);
    console.log(`Months with data: ${Object.keys(monthlyData).length}`);
    console.log('=== END TOTALS ===');

    // Chuyển đổi thành format mong muốn
    const monthGroups: any[] = [];
    for (let month = 1; month <= 12; month++) {
      const data = monthlyData[month] || { revenue: 0, costPrice: 0 };
      monthGroups.push({
        _id: month,
        revenue: data.revenue,
        costPrice: data.costPrice,
        profit: data.revenue - data.costPrice,
        date: month < 10 ? `0${month}` : `${month}`,
      });
    }

    return {
      totalRevenue,
      totalCostPrice,
      totalProfit,
      monthGroups,
    };
  }

  // New method for customer analytics
  async getCustomerAnalytics(timeType: TimeType, customFrom?: Date, customTo?: Date) {
    const { from, to } = this.getDateRange(timeType, customFrom, customTo);

    // Calculate previous period for comparison
    const now = dayjs().tz('Asia/Ho_Chi_Minh');
    let previousFrom: Date, previousTo: Date;

    switch (timeType) {
      case 'TODAY':
        previousFrom = now.subtract(1, 'day').startOf('day').toDate();
        previousTo = now.subtract(1, 'day').endOf('day').toDate();
        break;
      case 'YESTERDAY':
        previousFrom = now.subtract(2, 'day').startOf('day').toDate();
        previousTo = now.subtract(2, 'day').endOf('day').toDate();
        break;
      case 'THIS_WEEK':
        previousFrom = now.subtract(1, 'week').startOf('week').toDate();
        previousTo = now.subtract(1, 'week').endOf('week').toDate();
        break;
      case 'THIS_MONTH':
        previousFrom = now.subtract(1, 'month').startOf('month').toDate();
        previousTo = now.subtract(1, 'month').endOf('month').toDate();
        break;
      case 'LAST_MONTH':
        previousFrom = now.subtract(2, 'month').startOf('month').toDate();
        previousTo = now.subtract(2, 'month').endOf('month').toDate();
        break;
      case 'THIS_QUARTER':
        const prevQuarter = now.quarter(now.quarter() - 1);
        previousFrom = prevQuarter.startOf('quarter').toDate();
        previousTo = prevQuarter.endOf('quarter').toDate();
        break;
      case 'THIS_YEAR':
        previousFrom = now.subtract(1, 'year').startOf('year').toDate();
        previousTo = now.subtract(1, 'year').endOf('year').toDate();
        break;
      case 'CUSTOM':
        // For custom, calculate same period length backwards
        const diffDays = dayjs(to).diff(dayjs(from), 'day');
        previousFrom = dayjs(from).subtract(diffDays + 1, 'day').toDate();
        previousTo = dayjs(from).subtract(1, 'day').toDate();
        break;
      default:
        previousFrom = now.subtract(1, 'day').startOf('day').toDate();
        previousTo = now.subtract(1, 'day').endOf('day').toDate();
    }

    // Get customer growth data
    const customerGrowthData = await this.customerRepository.getNewCustomersGrowth(
      from, to, previousFrom, previousTo
    );

    return {
      newCustomers: customerGrowthData.currentCount,
      newCustomersGrowth: customerGrowthData.growthPercentage,
      previousPeriodCustomers: customerGrowthData.previousCount
    };
  }

  // New method for category revenue distribution
  async getCategoryDistribution(timeType: TimeType, customFrom?: Date, customTo?: Date) {
    try {
      const { from, to } = this.getDateRange(timeType, customFrom, customTo);
      console.log('Category Distribution - Date Range:', { from, to, timeType });

      // Debug: Check if we have any orders in this time range
      const ordersInRange = await this.orderRepository.find({
        paymentStatus: { $in: ['partial', 'paid', 'paid_refund'] },
        createdAt: { $gte: from, $lte: to },
        isDelete: { $ne: true },
      });
      console.log('Orders in range:', ordersInRange.length);

      if (ordersInRange.length > 0) {
        console.log('Sample order:', {
          productListLength: ordersInRange[0].productList?.length || 0,
          paymentStatus: ordersInRange[0].paymentStatus,
          hasProducts: ordersInRange[0].productList?.length > 0
        });
      }

      // Debug: Check data types and structure
      console.log('=== DETAILED DEBUG ===');

      // Step 1: Check matched orders
      const step1 = await this.orderRepository.aggregate([
        {
          $match: {
            paymentStatus: { $in: ['partial', 'paid', 'paid_refund'] },
            createdAt: { $gte: from, $lte: to },
            isDelete: { $ne: true },
          },
        },
        { $limit: 1 },
        {
          $project: {
            paymentStatus: 1,
            createdAt: 1,
            productList: 1
          }
        }
      ]);
      console.log('Step 1 - Sample order:', JSON.stringify(step1[0], null, 2));

      if (step1.length > 0 && step1[0].productList?.length > 0) {
        console.log('ProductId type:', typeof step1[0].productList[0].productId);
        console.log('ProductId value:', step1[0].productList[0].productId);

        // Test direct product lookup
        const productTest = await this.orderRepository.aggregate([
          {
            $match: { _id: step1[0]._id }
          },
          {
            $unwind: '$productList'
          },
          {
            $addFields: {
              'productList.productObjectId': {
                $toObjectId: '$productList.productId'
              }
            }
          },
          {
            $lookup: {
              from: 'products',
              localField: 'productList.productObjectId',
              foreignField: '_id',
              as: 'product'
            }
          },
          {
            $project: {
              originalProductId: '$productList.productId',
              convertedProductId: '$productList.productObjectId',
              productFound: { $size: '$product' },
              productName: { $arrayElemAt: ['$product.name', 0] },
              categoryId: { $arrayElemAt: ['$product.categoryId', 0] }
            }
          }
        ]);
        console.log('Product lookup test:', JSON.stringify(productTest[0], null, 2));
      }

      // Real aggregation with proper category lookup
      const categoryRevenue = await this.orderRepository.aggregate([
        {
          $match: {
            // FIXED: Lấy tất cả đơn hàng để tính doanh thu, không phụ thuộc vào payment status
            createdAt: { $gte: from, $lte: to },
            isDelete: { $ne: true },
          },
        },
        {
          $unwind: '$productList'
        },
        {
          $addFields: {
            'productList.productObjectId': {
              $toObjectId: '$productList.productId'
            }
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: 'productList.productObjectId',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $unwind: {
            path: '$product',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $addFields: {
            'product.categoryObjectId': {
              $toObjectId: '$product.categoryId'
            }
          }
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'product.categoryObjectId',
            foreignField: '_id',
            as: 'category'
          }
        },
        {
          $unwind: {
            path: '$category',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $match: {
            'category.name': { $exists: true }
          }
        },
        {
          $group: {
            _id: '$category._id',
            categoryName: { $first: '$category.name' },
            totalRevenue: {
              $sum: {
                $multiply: ['$productList.quantity', '$productList.sellPrice']
              }
            }
          }
        },
        {
          $sort: { totalRevenue: -1 }
        }
      ]);

      // Calculate total revenue for percentage calculation
      const totalRevenue = categoryRevenue.reduce((sum, item) => sum + item.totalRevenue, 0);

      // Transform data to match frontend format
      const categoryData = categoryRevenue.map(item => ({
        name: item.categoryName,
        value: item.totalRevenue,
        percentage: totalRevenue > 0 ? Math.round((item.totalRevenue / totalRevenue) * 100) : 0
      }));

      console.log('Category Distribution Result:', {
        categoryRevenue: categoryRevenue.length,
        categoryData: categoryData.length,
        totalRevenue
      });

      return {
        categories: categoryData,
        totalRevenue
      };
    } catch (error) {
      console.error('Error getting category distribution:', error);
      return {
        categories: [],
        totalRevenue: 0
      };
    }
  }

  // Debug method to check collections and data
  async debugCollections() {
    try {
      // Check if we have any orders
      const totalOrders = await this.orderRepository.aggregate([
        { $count: "total" }
      ]);

      // Check recent orders with products
      const recentOrders = await this.orderRepository.aggregate([
        { $match: { isDelete: { $ne: true } } },
        { $sort: { createdAt: -1 } },
        { $limit: 5 },
        {
          $project: {
            paymentStatus: 1,
            productList: 1,
            createdAt: 1,
            estimatedRevenue: 1
          }
        }
      ]);

      // Simple check for products and categories
      const allProducts = await this.productRepository.findByIds([]);
      const productCount = allProducts.length;

      return {
        totalOrders: totalOrders[0]?.total || 0,
        recentOrdersCount: recentOrders.length,
        productCount,
        sampleOrder: recentOrders[0] || null
      };
    } catch (error) {
      console.error('Debug collections error:', error);
      return { error: error.message };
    }
  }

  async debugOrders() {
    console.log('=== DEBUG ORDERS ===');

    // Check total orders without any filter
    const totalAllOrders = await this.orderRepository.countDocuments({});
    console.log('Total orders in DB:', totalAllOrders);

    // Check orders with isDelete field
    const ordersWithIsDelete = await this.orderRepository.countDocuments({ isDelete: true });
    console.log('Orders with isDelete = true:', ordersWithIsDelete);

    const ordersWithoutIsDelete = await this.orderRepository.countDocuments({
      $or: [{ isDelete: false }, { isDelete: { $exists: false } }]
    });
    console.log('Orders with isDelete = false or not exists:', ordersWithoutIsDelete);

    // Check orders for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthOrdersAll = await this.orderRepository.countDocuments({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });
    console.log('Orders this month (no filter):', monthOrdersAll);

    const monthOrdersFiltered = await this.orderRepository.countDocuments({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      isDelete: { $ne: true }
    });
    console.log('Orders this month (filtered isDelete):', monthOrdersFiltered);

    // Sample some orders to see their isDelete field
    const sampleOrders = await this.orderRepository.find({});
    console.log('Sample orders (first 3):');
    sampleOrders.slice(0, 3).forEach((order, index) => {
      console.log(`Order ${index + 1}:`, {
        isDelete: order.isDelete,
        paymentStatus: order.paymentStatus
      });
    });

    console.log('=================');

    return {
      totalAllOrders,
      ordersWithIsDelete,
      ordersWithoutIsDelete,
      monthOrdersAll,
      monthOrdersFiltered
    };
  }

  async getSalesReport(timeType: TimeType, customFrom?: Date, customTo?: Date) {
    console.log('=== SALES REPORT DEBUG ===');
    console.log('TimeType:', timeType);
    console.log('CustomFrom:', customFrom);
    console.log('CustomTo:', customTo);

    const { from, to } = this.getDateRange(timeType, customFrom, customTo);
    console.log('Date range:', { from, to });

    // FIXED: Lấy TẤT CẢ đơn hàng trong khoảng thời gian, bao gồm cả unpaid
    const orders = await this.orderRepository.find({
      createdAt: { $gte: from, $lte: to },
      isDelete: { $ne: true },
    });

    console.log('Filtered orders count:', orders.length);

    // If no orders found, return empty data
    if (orders.length === 0) {
      console.log('⚠️ No orders found');
      const emptyData = {
        period: {
          from: from.toISOString(),
          to: to.toISOString(),
          timeType
        },
        summary: {
          totalOrders: 0,
          totalProducts: 0,
          totalQuantity: 0,
          totalSellPrice: 0,
          totalCostPrice: 0,
          totalProfit: 0,
          totalDebt: 0, // THÊM: Tổng công nợ
          actualRevenue: 0, // THÊM: Doanh thu thực tế
          actualProfit: 0, // THÊM: Lợi nhuận thực tế
        },
        salesDetails: []
      };
      return emptyData;
    }

    // Prepare detailed sales data
    const salesDetails: any[] = [];
    let totalQuantity = 0;
    let totalSellPrice = 0;
    let totalCostPrice = 0;
    let totalProfit = 0;
    let totalDebt = 0; // THÊM: Tổng công nợ
    let totalActualRevenue = 0; // THÊM: Tổng doanh thu thực tế
    let totalActualProfit = 0; // THÊM: Tổng lợi nhuận thực tế

    for (const order of orders) {
      if (!order.productList || order.productList.length === 0) {
        console.log('⚠️ Order has no productList:', (order as any)._id);
        continue;
      }

      // FIXED: Sử dụng tổng giá trị hóa đơn thay vì số tiền đã thu
      const orderTotalValue = order.totalAmountDiscount > 0 ? order.totalAmountDiscount : order.totalAmount;
      const orderRevenue = orderTotalValue || 0;
      const orderCostPrice = order.totalCostPrice || 0;
      const orderProfit = orderRevenue - orderCostPrice;

      // Tính công nợ = tổng giá trị hóa đơn - số tiền đã thu
      const orderDebt = orderRevenue - (order.estimatedRevenue || 0);

      for (const item of order.productList) {
        // FIXED: Chia đều công nợ cho từng sản phẩm trong đơn hàng
        const itemDebt = orderDebt / order.productList.length;
        const itemRevenue = (orderRevenue / order.productList.length);
        const itemCostPrice = (orderCostPrice / order.productList.length);
        const itemProfit = itemRevenue - itemCostPrice;

        salesDetails.push({
          orderId: (order as any)._id,
          orderDate: (order as any).createdAt,
          customerName: order.customerName || 'Khách lẻ',
          customerPhone: order.customerPhone || '',
          productName: item.name,
          barcode: item.barcode,
          serial: item.serial,
          quantity: item.quantity,
          sellPrice: item.sellPrice,
          realSellPrice: item.realSellPrice,
          // FIXED: Doanh thu = tổng giá trị hóa đơn (không phụ thuộc vào thanh toán)
          totalSellAmount: itemRevenue,
          costPrice: itemCostPrice,
          totalCostAmount: itemCostPrice,
          profit: itemProfit,
          debt: itemDebt, // FIXED: Công nợ = doanh thu - số tiền đã thu
          actualRevenue: itemRevenue - itemDebt, // FIXED: Doanh thu thực tế = doanh thu - công nợ
          actualProfit: itemProfit - itemDebt, // THÊM: Lợi nhuận thực tế = lợi nhuận - công nợ
          isReturnOrder: order.isReturnOrder
        });

        // FIXED: Luôn đếm số lượng sản phẩm, bất kể thanh toán hay chưa
        totalQuantity += item.quantity;
      }

      // FIXED: Cộng doanh thu và chi phí thực tế của đơn hàng
      totalSellPrice += orderRevenue;
      totalCostPrice += orderCostPrice;
      totalProfit += orderProfit;
      totalDebt += orderDebt; // THÊM: Cộng tổng công nợ
      totalActualRevenue += (orderRevenue - orderDebt); // THÊM: Cộng tổng doanh thu thực tế
      totalActualProfit += (orderProfit - orderDebt); // THÊM: Cộng tổng lợi nhuận thực tế
    }

    // Sort by order date and order ID for grouping
    salesDetails.sort((a, b) => {
      const dateCompare = new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.orderId.toString().localeCompare(b.orderId.toString());
    });

    const result = {
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
        timeType
      },
      summary: {
        totalOrders: orders.length,
        totalProducts: salesDetails.length,
        totalQuantity,
        totalSellPrice,
        totalCostPrice,
        totalProfit,
        totalDebt, // THÊM: Tổng công nợ
        actualRevenue: totalActualRevenue, // THÊM: Doanh thu thực tế
        actualProfit: totalActualProfit, // THÊM: Lợi nhuận thực tế
      },
      salesDetails
    };

    console.log('SALES REPORT RESULT:', {
      totalOrders: result.summary.totalOrders,
      totalProducts: result.summary.totalProducts,
      firstSalesDetail: salesDetails[0] || 'No data'
    });
    console.log('=== END SALES REPORT DEBUG ===');

    return result;
  }

  async debugYear2025Simple() {
    const from = dayjs('2025-01-01').startOf('day').toDate();
    const to = dayjs('2025-12-31').endOf('day').toDate();

    console.log('=== SIMPLE DEBUG YEAR 2025 ===');
    console.log('Date range:', { from, to });

    // Lấy tất cả đơn hàng năm 2025
    const orders = await this.orderRepository.find({
      createdAt: { $gte: from, $lte: to },
      isDelete: { $ne: true },
    });

    console.log('Total orders found:', orders.length);

    if (orders.length > 0) {
      let totalRevenue = 0;
      let totalDebt = 0;
      let maxDebt = 0;
      let maxDebtOrder: any = null;

      orders.forEach(order => {
        // Sử dụng tổng giá trị hóa đơn thay vì số tiền đã thu
        const orderTotalValue = order.totalAmountDiscount > 0 ? order.totalAmountDiscount : order.totalAmount;
        const orderDebt = orderTotalValue - (order.estimatedRevenue || 0);

        totalRevenue += orderTotalValue || 0;
        totalDebt += orderDebt;

        if (orderDebt > maxDebt) {
          maxDebt = orderDebt;
          maxDebtOrder = {
            id: (order as any)._id,
            customerDebt: orderDebt,
            totalAmount: order.totalAmount,
            totalAmountDiscount: order.totalAmountDiscount,
            customerPaid: order.customerPaid,
            estimatedRevenue: order.estimatedRevenue,
            calculatedDebt: orderDebt,
            paymentStatus: order.paymentStatus,
          };
        }
      });

      console.log('Manual calculation:', {
        totalRevenue,
        totalDebt,
        actualRevenue: totalRevenue - totalDebt,
        maxDebt,
        maxDebtOrder
      });

      return {
        totalOrders: orders.length,
        totalRevenue,
        totalDebt,
        actualRevenue: totalRevenue - totalDebt,
        maxDebt,
        maxDebtOrder,
        firstFewOrders: orders.slice(0, 3).map(o => ({
          id: (o as any)._id,
          estimatedRevenue: o.estimatedRevenue,
          customerDebt: o.customerDebt,
          totalAmount: o.totalAmount,
          customerPaid: o.customerPaid,
        }))
      };
    }

    return { message: 'No orders found for 2025' };
  }

  async compareDebtCalculations() {
    console.log('=== COMPARE DEBT CALCULATIONS ===');

    // 1. Lấy dữ liệu từ getSalesReport (method đã fix)
    const salesReportToday = await this.getSalesReport('TODAY');
    const salesReportThisMonth = await this.getSalesReport('THIS_MONTH');

    // 2. Lấy dữ liệu từ getRevenueDashboard (method cũ)
    const dashboardData = await this.getRevenueDashboard();

    // 3. Tính toán thủ công để so sánh
    const todayStart = dayjs().tz('Asia/Ho_Chi_Minh').startOf('day').toDate();
    const todayEnd = dayjs().tz('Asia/Ho_Chi_Minh').endOf('day').toDate();

    const todayOrders = await this.orderRepository.find({
      createdAt: { $gte: todayStart, $lte: todayEnd },
      isDelete: { $ne: true },
    });

    let manualTotalDebt = 0;
    let manualTotalRevenue = 0;
    let manualActualRevenue = 0;

    todayOrders.forEach(order => {
      const orderTotalValue = order.totalAmountDiscount > 0 ? order.totalAmountDiscount : order.totalAmount;
      const debt = orderTotalValue - (order.estimatedRevenue || 0);
      const revenue = orderTotalValue || 0;

      manualTotalDebt += debt;
      manualTotalRevenue += revenue;
      manualActualRevenue += (revenue - debt);
    });

    // 4. So sánh kết quả
    const comparison = {
      manual: {
        totalOrders: todayOrders.length,
        totalDebt: manualTotalDebt,
        totalRevenue: manualTotalRevenue,
        actualRevenue: manualActualRevenue,
      },
      salesReportToday: {
        totalOrders: salesReportToday.summary.totalOrders,
        totalDebt: salesReportToday.summary.totalDebt,
        totalRevenue: salesReportToday.summary.totalSellPrice,
        actualRevenue: salesReportToday.summary.actualRevenue,
      },
      dashboard: {
        totalRevenue: dashboardData.value,
        totalDebt: (dashboardData as any).totalDebt || 0,
        actualRevenue: (dashboardData as any).actualRevenue || 0,
      },
      differences: {
        debtDiff: Math.abs(manualTotalDebt - salesReportToday.summary.totalDebt),
        revenueDiff: Math.abs(manualTotalRevenue - salesReportToday.summary.totalSellPrice),
        actualRevenueDiff: Math.abs(manualActualRevenue - salesReportToday.summary.actualRevenue),
      },
      isConsistent: {
        debt: manualTotalDebt === salesReportToday.summary.totalDebt,
        revenue: manualTotalRevenue === salesReportToday.summary.totalSellPrice,
        actualRevenue: manualActualRevenue === salesReportToday.summary.actualRevenue,
      }
    };

    console.log('DEBT CALCULATION COMPARISON:', comparison);
    console.log('=== END COMPARE DEBT CALCULATIONS ===');

    return comparison;
  }

  async findHighDebtOrders() {
    // Tìm các đơn hàng có customerDebt > 1,000,000
    const highDebtOrders = await this.orderRepository.find({
      customerDebt: { $gt: 1000000 },
      isDelete: { $ne: true },
    });

    console.log('=== HIGH DEBT ORDERS ===');
    console.log('Found orders with debt > 1M:', highDebtOrders.length);

    const orderDetails = highDebtOrders.map(order => ({
      id: (order as any)._id,
      createdAt: (order as any).createdAt,
      totalAmount: order.totalAmount,
      totalAmountDiscount: order.totalAmountDiscount,
      customerPaid: order.customerPaid,
      customerDebt: order.customerDebt,
      paymentStatus: order.paymentStatus,
      // Tính lại để kiểm tra
      calculatedDebt: order.totalAmountDiscount > 0
        ? order.totalAmountDiscount - order.customerPaid
        : order.totalAmount - order.customerPaid,
    }));

    const totalDebt = highDebtOrders.reduce((sum, order) => sum + (order.customerDebt || 0), 0);

    console.log('Total debt from high debt orders:', totalDebt);
    console.log('Order details:', orderDetails);

    return {
      count: highDebtOrders.length,
      totalDebt,
      orders: orderDetails
    };
  }



  async debugYear2025Detailed() {
    const from = dayjs('2025-01-01').startOf('day').toDate();
    const to = dayjs('2025-12-31').endOf('day').toDate();

    console.log('=== DETAILED DEBUG YEAR 2025 ===');

    // 1. Tất cả đơn hàng năm 2025 (bao gồm cả deleted)
    const allOrders = await this.orderRepository.find({
      createdAt: { $gte: from, $lte: to },
    });

    // 2. Chỉ đơn hàng không bị xóa
    const activeOrders = await this.orderRepository.find({
      createdAt: { $gte: from, $lte: to },
      isDelete: { $ne: true },
    });

    // 3. Đơn hàng có công nợ cao
    const highDebtOrders = activeOrders.filter(order => (order.customerDebt || 0) > 1000000);

    // 4. Tính toán thống kê
    const stats = {
      allOrders: allOrders.length,
      activeOrders: activeOrders.length,
      deletedOrders: allOrders.length - activeOrders.length,
      highDebtOrders: highDebtOrders.length,
    };

    // 5. Tính tổng công nợ từ active orders
    let totalDebtActive = 0;
    let totalRevenueActive = 0;

    activeOrders.forEach(order => {
      totalDebtActive += order.customerDebt || 0;
      totalRevenueActive += order.estimatedRevenue || 0;
    });

    // 6. Chi tiết đơn hàng có công nợ cao nhất
    const topDebtOrders = highDebtOrders
      .sort((a, b) => (b.customerDebt || 0) - (a.customerDebt || 0))
      .slice(0, 5)
      .map(order => ({
        id: (order as any)._id,
        customerDebt: order.customerDebt,
        totalAmount: order.totalAmount,
        totalAmountDiscount: order.totalAmountDiscount,
        customerPaid: order.customerPaid,
        estimatedRevenue: order.estimatedRevenue,
        paymentStatus: order.paymentStatus,
        isDelete: order.isDelete,
        createdAt: (order as any).createdAt,
        // Tính lại để kiểm tra
        calculatedDebt: order.totalAmountDiscount > 0
          ? order.totalAmountDiscount - order.customerPaid
          : order.totalAmount - order.customerPaid,
      }));

    console.log('Year 2025 Stats:', stats);
    console.log('Total Debt (Active):', totalDebtActive);
    console.log('Total Revenue (Active):', totalRevenueActive);
    console.log('Top Debt Orders:', topDebtOrders);

    return {
      stats,
      totals: {
        totalDebtActive,
        totalRevenueActive,
        actualRevenue: totalRevenueActive - totalDebtActive,
      },
      topDebtOrders,
      // So sánh với method getRevenueByYear
      getRevenueByYearResult: await this.getRevenueByYear(2025),
    };
  }
}
