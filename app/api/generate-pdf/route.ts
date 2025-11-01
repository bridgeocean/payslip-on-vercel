import { NextRequest } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { buildHtml } from '@/lib/template';

export const runtime = 'nodejs';

const fmtNG = (n: number | string) =>
  new Intl.NumberFormat('en-NG').format(typeof n === 'number' ? n : Number(n));

export async function POST(req: NextRequest) {
  try {
    const p = await req.json();
    const ensure = (x: any, d: any) => (x === undefined || x === null ? d : x);
    const num = (x: any) => Number(x || 0);

    // Build arrays (fall back to 3 standard rows if none supplied)
    const earnings = ensure(p.earnings, [
      { label: 'Basic', amount: fmtNG(num(p.basic_amount)) },
      { label: 'Internet and communication', amount: fmtNG(num(p.internet_amount)) },
      { label: 'Transport reimbursement', amount: fmtNG(num(p.transport_amount)) }
    ]);

    const deductions = ensure(p.deductions, [
      { label: 'Income Tax', amount: fmtNG(num(p.income_tax)) },
      { label: 'Provident Fund', amount: fmtNG(num(p.provident_fund)) },
      { label: 'Unpaid Leaves', amount: fmtNG(num(p.unpaid_leaves)) }
    ]);

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

      gross_earnings: fmtNG(
        ensure(
          p.gross_earnings,
          earnings.reduce((a: number, r: any) => a + Number(String(r.amount).replace(/,/g, '')), 0)
        )
      ),

      total_deductions: fmtNG(
        ensure(
          p.total_deductions,
          deductions.reduce((a: number, r: any) => a + Number(String(r.amount).replace(/,/g, '')), 0)
        )
      ),

      net_payable: fmtNG(
        ensure(
          p.net_payable,
          (Number(String(ensure(p.gross_earnings, 0)).toString().replace(/,/g, '')) ||
            earnings.reduce((a: number, r: any) => a + Number(String(r.amount).replace(/,/g, '')), 0)) -
            (Number(String(ensure(p.total_deductions, 0)).toString().replace(/,/g, '')) ||
              deductions.reduce((a: number, r: any) => a + Number(String(r.amount).replace(/,/g, '')), 0))
        )
      ),

      amount_in_words: ensure(p.amount_in_words, ''),
      notes: ensure(p.notes, ''),

      earnings: earnings.map((r: any) => ({ label: r.label, amount: typeof r.amount === 'number' ? fmtNG(r.amount) : r.amount })),
      deductions: deductions.map((r: any) => ({ label: r.label, amount: typeof r.amount === 'number' ? fmtNG(r.amount) : r.amount }))
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

    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="payslip-${data.employee_number}-${data.payslip_month}.pdf"`
      }
    });
  } catch (e: any) {
    return new Response(e?.message || 'Error', { status: 500 });
  }
}
