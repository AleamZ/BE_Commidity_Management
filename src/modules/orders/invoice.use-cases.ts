import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Order } from './order.entity';
import * as pdf from 'html-pdf-node';
@Injectable()
export class InvoiceUseCase {
  async generateInvoicePDFBuffer(order: Order): Promise<Buffer> {
    const templatePath = path.resolve(
      process.env.NODE_ENV === 'production'
        ? path.join(__dirname, '../../common/templates/invoice-template.html')
        : path.join(
            process.cwd(),
            'src/common/templates/invoice-template.html',
          ),
    );
    // const templatePath = path.resolve(
    //   __dirname,
    //   '../../common/templates/invoice-template.html',
    // );

    const template = fs.readFileSync(templatePath, 'utf8');

    const productRows = order.productList
      .map((p, index) => {
        const hasDiscount = p.realSellPrice > 0;
        const sellPriceHtml = hasDiscount
          ? `<s>${p.sellPrice.toLocaleString()} VND</s>`
          : `${p.sellPrice.toLocaleString()} VND`;

        const realSellPriceHtml = hasDiscount
          ? `${p.realSellPrice.toLocaleString()} VND`
          : '0 VND';

        return `
        <tr>
          <td>${index + 1}</td>
          <td>${p.name}</td>
          <td>${p.quantity}</td>
          <td>${sellPriceHtml}</td>
          <td>${realSellPriceHtml}</td>
        </tr>`;
      })
      .join('');

    const discount = `${order.discountValue} (${order.discountType === 'money' ? 'vnd' : '%'})`;
    const total = `${order.totalAmount.toLocaleString()} VND`;

    const html = template
      .replace('{{customerName}}', order.customerName)
      .replace('{{customerPhone}}', order.customerPhone)
      .replace('{{customerAddress}}', order.customerAddress)
      .replace('{{productRows}}', productRows)
      .replace('{{discount}}', discount)
      .replace('{{total}}', total);

    const file = { content: html };
    const options = { format: 'A4' };

    const pdfBuffer = await pdf.generatePdf(file, options);

    return pdfBuffer;
  }
}
