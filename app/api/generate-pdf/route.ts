// app/api/generate-pdf/route.ts
import { NextRequest } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { buildHtml } from '../../../lib/template';

export const runtime = 'nodejs';

const fmtNG = (n: number | string) =>
  new Intl.NumberFormat('en-NG').format(typeof n === 'number' ? n : Number(n));

export async function POST(req: NextRequest) {
  try {
    const p = await req.json();
    const ensure = (x: any, d: any) => (x === undefined || x === null ? d : x);

    const data = {
      company_name: ensure(p.company_name, 'BRIDGEOCEAN LIMITED'),
      company_address: ensure(p.company_address, 'Ajah, Lagos'),
      payslip_month: ensure(p.payslip_month, '—'),
      employee_name: ensure(p.employee_name, '—'),
      employee_number: ensure(p.employee_number, 'EMP-0001'),
      pay_period: ensure(p.pay_period, p.payslip_month ?? '—'),
      paid_days: ensure(p.paid_days, '—'),
      pay_date: ensure(p.pay_date, '—'),
      loss_of_pay_days: ensure(p.loss_of_pay_days, 0),

      basic_amount: fmtNG(ensure(p.basic_amount, 0)),
      internet_amount: fmtNG(ensure(p.internet_amount, 0)),
      transport_amount: fmtNG(ensure(p.transport_amount, 0)),
      gross_earnings: fmtNG(
        ensure(
          p.gross_earnings,
          (p.basic_amount || 0) + (p.internet_amount || 0) + (p.transport_amount || 0)
        )
      ),
      income_tax: fmtNG(ensure(p.income_tax, 0)),
      provident_fund: fmtNG(ensure(p.provident_fund, 0)),
      unpaid_leaves: fmtNG(ensure(p.unpaid_leaves, 0)),
      total_deductions: fmtNG(
        ensure(p.total_deductions, (p.income_tax || 0) + (p.provident_fund || 0) + (p.unpaid_leaves || 0))
      ),
      net_payable: fmtNG(ensure(p.net_payable, 0)),
      amount_in_words: ensure(p.amount_in_words, ''),
      notes: ensure(p.notes, '')
    };

    const html = buildHtml(data);

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: ['load', 'networkidle0'] });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '12mm', right: '12mm' }
    });

    await browser.close();
    
    // ✅ Convert the Uint8Array to a plain ArrayBuffer that Response() accepts
    const arrayBuffer: ArrayBuffer = pdf.buffer.slice(
      pdf.byteOffset,
      pdf.byteOffset + pdf.byteLength
    );

    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="payslip-${data.employee_number}-${data.payslip_month}.pdf"`
      }
    });

  } catch (e: any) {
    return new Response(e?.message || 'Error', { status: 500 });
  }
}
