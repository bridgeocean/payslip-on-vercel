'use client';
import { useMemo, useState } from 'react';

const toNum = (v: string) => (v.trim() === '' ? 0 : Number(v));

export default function Page() {
  const [f, setF] = useState({
    company_name: 'BRIDGEOCEAN LIMITED',
    company_address: 'Ajah, Lagos\nPincode : 1110001',
    payslip_month: 'October 2025',
    employee_name: 'Mr Akpum Michael',
    employee_number: 'BRG-2025-001',
    pay_period: 'October 2025',
    paid_days: '10',
    pay_date: '30th October, 2025',
    loss_of_pay_days: '0',
    basic_amount: '65000',
    internet_amount: '7000',
    transport_amount: '5000',
    income_tax: '5000',
    provident_fund: '0',
    unpaid_leaves: '0',
    amount_in_words: 'Seventy Two Thousand Only',
    notes:
      'Reimbursement paid for dates 28-Oct-25, 29-Oct-25 and first two records from date 21-Oct-25.',
  });

  const gross = useMemo(
    () => toNum(f.basic_amount) + toNum(f.internet_amount) + toNum(f.transport_amount),
    [f]
  );
  const deductions = useMemo(
    () => toNum(f.income_tax) + toNum(f.provident_fund) + toNum(f.unpaid_leaves),
    [f]
  );
  const net = useMemo(() => gross - deductions, [gross, deductions]);

  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function generate() {
    const payload = {
      ...f,
      basic_amount: toNum(f.basic_amount),
      internet_amount: toNum(f.internet_amount),
      transport_amount: toNum(f.transport_amount),
      income_tax: toNum(f.income_tax),
      provident_fund: toNum(f.provident_fund),
      unpaid_leaves: toNum(f.unpaid_leaves),
      gross_earnings: gross,
      total_deductions: deductions,
      net_payable: net,
    };
    const res = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return alert(await res.text());
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payslip-${f.employee_number || 'employee'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const Row = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>
  );
  const Field = ({ label, value, onChange, type = 'text' }: any) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, color: '#555' }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
      />
    </label>
  );

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <h2>Bridgeocean — Payslip Generator</h2>
      <p>Fill the fields and click <b>Generate PDF</b>. The payslip includes the <b>Employee’s Number</b> block.</p>

      <Row>
        <Field label="Company Name" value={f.company_name} onChange={set('company_name')} />
        <Field label="Payslip Month" value={f.payslip_month} onChange={set('payslip_month')} />
      </Row>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
        <span style={{ fontSize: 12, color: '#555' }}>Company Address</span>
        <textarea
          value={f.company_address}
          onChange={set('company_address')}
          rows={3}
          style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8, fontFamily: 'inherit' }}
        />
      </label>

      <Row>
        <Field label="Employee Name" value={f.employee_name} onChange={set('employee_name')} />
        <Field label="Employee’s Number" value={f.employee_number} onChange={set('employee_number')} />
      </Row>

      <Row>
        <Field label="Pay Period" value={f.pay_period} onChange={set('pay_period')} />
        <Field label="Pay Date" value={f.pay_date} onChange={set('pay_date')} />
      </Row>

      <Row>
        <Field label="Paid Days" type="number" value={f.paid_days} onChange={set('paid_days')} />
        <Field label="Loss of Pay Days" type="number" value={f.loss_of_pay_days} onChange={set('loss_of_pay_days')} />
      </Row>

      <h4 style={{ marginTop: 16 }}>Earnings</h4>
      <Row>
        <Field label="Basic" type="number" value={f.basic_amount} onChange={set('basic_amount')} />
        <Field label="Internet & Communication" type="number" value={f.internet_amount} onChange={set('internet_amount')} />
      </Row>
      <Row>
        <Field label="Transport Reimbursement" type="number" value={f.transport_amount} onChange={set('transport_amount')} />
        <div />
      </Row>

      <h4 style={{ marginTop: 16 }}>Deductions</h4>
      <Row>
        <Field label="Income Tax" type="number" value={f.income_tax} onChange={set('income_tax')} />
        <Field label="Provident Fund" type="number" value={f.provident_fund} onChange={set('provident_fund')} />
      </Row>
      <Row>
        <Field label="Unpaid Leaves" type="number" value={f.unpaid_leaves} onChange={set('unpaid_leaves')} />
        <div />
      </Row>

      <Row>
        <Field label="Gross (auto)" value={String(gross)} onChange={() => {}} />
        <Field label="Total Deductions (auto)" value={String(deductions)} onChange={() => {}} />
      </Row>
      <Row>
        <Field label="Net Payable (auto)" value={String(net)} onChange={() => {}} />
        <div />
      </Row>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
        <span style={{ fontSize: 12, color: '#555' }}>Amount in Words</span>
        <input
          value={f.amount_in_words}
          onChange={set('amount_in_words')}
          style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
        <span style={{ fontSize: 12, color: '#555' }}>Notes</span>
        <textarea
          value={f.notes}
          onChange={set('notes')}
          rows={3}
          style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8, fontFamily: 'inherit' }}
        />
      </label>

      <div style={{ marginTop: 16 }}>
        <button onClick={generate} style={{ padding: '10px 16px', cursor: 'pointer' }}>
          Generate PDF
        </button>
        <small style={{ color: '#666', marginLeft: 12 }}>
          The logo is embedded automatically from <code>/public/images/logo.png</code>.
        </small>
      </div>
    </main>
  );
}
