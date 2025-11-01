import { NextRequest } from 'next/server';
import JSZip from 'jszip';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { buildHtml } from '../../../lib/template';

export const runtime = 'nodejs';

const fmt = (n: any) => new Intl.NumberFormat('en-NG').format(Number(n || 0));

function buildRecord(raw: any) {
  // dynamic earning:/deduction: columns (e.g., "earning:Housing", "deduction:Pension")
  const earnings: any[] = [];
  const deductions: any[] = [];
  for (const [k, v] of Object.entries(raw)) {
    if (k.toLowerCase().startsWith('earning:')) {
      earnings.push({ label: k.split(':')[1], amount: fmt(v) });
    }
    if (k.toLowerCase().startsWith('deduction:')) {
      deductions.push({ label: k.split(':')[1], amount: fmt(v) });
    }
  }

  // if none provided, fall back to the standard three (optional)
  if (earnings.length === 0) {
    earnings.push(
      { label: 'Basic', amount: fmt(raw.basic_amount) },
      { label: 'Internet and communication', amount: fmt(raw.internet_amount) },
      { label: 'Transport reimbursement', amount: fmt(raw.transport_amount) }
    );
  }
  if (deductions.length === 0) {
    deductions.push(
      { label: 'Income Tax', amount: fmt(raw.income_tax) },
      { label: 'Provident Fund', amount: fmt(raw.provident_fund) },
      { label: 'Unpaid Leaves', amount: fmt(raw.unpaid_leaves) }
    );
  }

  const sum = (arr: any[]) =>
    arr.reduce((a, r) => a + Number(String(r.amount).replace(/,/g, '')), 0);

  const gross = Number(raw.gross_earnings || sum(earnings));
  const totalDeds = Number(raw.total_deductions || sum(deductions));
  const net = Number(raw.net_payable || gross - totalDeds);

  return {
    company_name: raw.company_name || 'BRIDGEOCEAN LIMITED',
    company_address: raw.company_address || 'Ajah, Lagos',
    payslip_month: raw.payslip_month || '—',
    employee_name: raw.employee_name || '—',
    employee_number: raw.employee_number || 'EMP-0001',
    pay_period: raw.pay_period || raw.payslip_month || '—',
    paid_days: raw.paid_days ?? '—',
    pay_date: raw.pay_date || '—',
    loss_of_pay_days: raw.loss_of_pay_days ?? 0,
    gross_earnings: fmt(gross),
    total_deductions: fmt(totalDeds),
    net_payable: fmt(net),
    amount_in_words: raw.amount_in_words || '',
    notes: raw.notes || '',
    earnings,
    deductions
  };
}

export async function POST(req: NextRequest) {
  try {
    const { records } = await req.json(); // [{...}, {...}]
    if (!Array.isArray(records) || records.length === 0) {
      return new Response('Provide { records: [...] }', { status: 400 });
    }

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });

    const zip = new JSZip();
    const page = await browser.newPage();

    for (const r of records) {
      const data = buildRecord(r);
      const html = buildHtml(data);
      await page.setContent(html, { waitUntil: ['load', 'networkidle0'] });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '12mm', right: '12mm' }
      });
      const fileName = `payslip-${data.employee_number}-${data.payslip_month}.pdf`;
      zip.file(fileName, pdf);
    }

    await browser.close();
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="payslips.zip"`
      }
    });
  } catch (e: any) {
    return new Response(e?.message || 'Error', { status: 500 });
  }
}
