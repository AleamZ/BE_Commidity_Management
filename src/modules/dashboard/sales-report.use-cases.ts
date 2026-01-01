import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as pdf from 'html-pdf-node';
import { DashboardService, TimeType } from './dashboard.service';

@Injectable()
export class SalesReportUseCase {
    constructor(private readonly dashboardService: DashboardService) { }

    async generateSalesReportPDFBuffer(
        timeType: TimeType,
        customFrom?: Date,
        customTo?: Date,
    ): Promise<Buffer> {
        // Get sales report data
        const reportData = await this.dashboardService.getSalesReport(
            timeType,
            customFrom,
            customTo,
        );

        // Validate reportData
        if (!reportData || !reportData.salesDetails) {
            throw new Error('Không có dữ liệu báo cáo để tạo PDF');
        }

        // Read template
        const templatePath = path.resolve(
            process.env.NODE_ENV === 'production'
                ? path.join(__dirname, '../../common/templates/sales-report-template.html')
                : path.join(
                    process.cwd(),
                    'src/common/templates/sales-report-template.html',
                ),
        );

        const template = fs.readFileSync(templatePath, 'utf8');

        // Format currency helper
        const formatCurrency = (amount: number): string => {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
            }).format(amount);
        };

        // Format date helper
        const formatDate = (date: string | Date): string => {
            if (!date) return 'N/A';
            try {
                return new Date(date).toLocaleDateString('vi-VN');
            } catch (error) {
                return 'N/A';
            }
        };

        // Generate period text
        const fromDate = reportData.period.from ? formatDate(reportData.period.from) : 'N/A';
        const toDate = reportData.period.to ? formatDate(reportData.period.to) : 'N/A';
        const periodText = `Từ ngày: ${fromDate} - Đến ngày: ${toDate}`;

        // Generate sales rows HTML
        const salesRows = reportData.salesDetails
            ?.map((item: any) => {
                const profitClass = item.profit >= 0 ? 'profit-positive' : 'profit-negative';
                // Safely handle orderId - convert to string first
                const orderIdStr = String(item.orderId || '');
                const shortOrderId = orderIdStr.length > 8 ? orderIdStr.slice(-8) : orderIdStr;

                const debtClass = (item.debt || 0) > 0 ? 'profit-negative' : 'profit-positive';
                const actualProfitClass = (item.actualProfit || 0) >= 0 ? 'profit-positive' : 'profit-negative';

                return `
        <tr class="order-item">
          <td class="text-center">HD: ${shortOrderId}</td>
          <td class="text-center">${formatDate(item.orderDate)}</td>
          <td>${item.customerName || 'N/A'}</td>
          <td>${item.productName || 'N/A'}</td>
          <td class="text-center">${item.quantity || 0}</td>
          <td class="text-right">${formatCurrency(item.sellPrice || 0)}</td>
          <td class="text-right">${formatCurrency(item.totalSellAmount || 0)}</td>
          <td class="text-right">${formatCurrency(item.costPrice || 0)}</td>
          <td class="text-right">${formatCurrency(item.totalCostAmount || 0)}</td>
          <td class="text-right ${profitClass}">${formatCurrency(item.profit || 0)}</td>
          <td class="text-right ${debtClass}">${formatCurrency(item.debt || 0)}</td>
          <td class="text-right">${formatCurrency(item.actualRevenue || 0)}</td>
          <td class="text-right ${actualProfitClass}">${formatCurrency(item.actualProfit || 0)}</td>
        </tr>`;
            })
            .join('') || '<tr><td colspan="13" class="text-center">Không có dữ liệu</td></tr>';

        // Safe summary data with defaults
        const summary = reportData.summary || {};
        const safeSummary = {
            totalOrders: summary.totalOrders || 0,
            totalProducts: summary.totalProducts || 0,
            totalQuantity: summary.totalQuantity || 0,
            totalSellPrice: summary.totalSellPrice || 0,
            totalCostPrice: summary.totalCostPrice || 0,
            totalProfit: summary.totalProfit || 0,
            totalDebt: summary.totalDebt || 0, // THÊM: Tổng công nợ
            actualRevenue: summary.actualRevenue || 0, // THÊM: Doanh thu thực tế
            actualProfit: summary.actualProfit || 0, // THÊM: Lợi nhuận thực tế
        };

        // Replace template variables
        const html = template
            .replace('{{period}}', periodText)
            .replace('{{exportDate}}', new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN'))
            .replace(/{{totalOrders}}/g, safeSummary.totalOrders.toString())
            .replace(/{{totalProducts}}/g, safeSummary.totalProducts.toString())
            .replace(/{{totalQuantity}}/g, safeSummary.totalQuantity.toString())
            .replace(/{{totalSellPrice}}/g, formatCurrency(safeSummary.totalSellPrice))
            .replace(/{{totalCostPrice}}/g, formatCurrency(safeSummary.totalCostPrice))
            .replace(/{{totalProfit}}/g, formatCurrency(safeSummary.totalProfit))
            .replace(/{{totalDebt}}/g, formatCurrency(safeSummary.totalDebt)) // THÊM: Tổng công nợ
            .replace(/{{actualRevenue}}/g, formatCurrency(safeSummary.actualRevenue)) // THÊM: Doanh thu thực tế
            .replace(/{{actualProfit}}/g, formatCurrency(safeSummary.actualProfit)) // THÊM: Lợi nhuận thực tế
            .replace('{{salesRows}}', salesRows);

        const file = { content: html };
        const options = {
            format: 'A4',
            orientation: 'landscape',
            margin: { top: '20px', bottom: '20px', left: '10px', right: '10px' }
        };

        const pdfBuffer = await pdf.generatePdf(file, options);

        return pdfBuffer;
    }
} 