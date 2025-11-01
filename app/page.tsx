'use client';
import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';

type Row = { label: string; amount: string };
type FormState = {
  company_name: string; company_address: string; payslip_month: string;
  employee_name: string; employee_number: string;
  pay_period: string; paid_days: string; pay_date: string; loss_of_pay_days: string;
  earnings: Row[]; deductions: Row[];
  amount_in_words: string; notes: string;
};

const emptyRow = (): Row => ({ label: '', amount: '' });

const N = (v: string) => (v.trim() === '' ? 0 : Number(v));

export default function Page() {
  const [f, setF] = useState<FormState>(() => {
    // load from localStorage
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('payslip_form');
      if (s) try { return JSON.parse(s); } catch {}
    }
    return {
      company_name: 'BRIDGEOCEAN LIMITED',
      company_address: 'Ajah, Lagos\nPincode : 1110001',
      payslip_month: 'October 2025',
      employee_name: 'Mr Akpum Michael',
      employee_number: 'BRG-2025-001',
      pay_period: 'October 2025',
      paid_days: '10',
      pay_date: '30th October, 2025',
      loss_of_pay_days: '0',
      earnings: [
        { label: 'Basic', amount: '65000' },
        { label: 'Internet and communication', amount: '7000' },
        { label: 'Transport reimbursement', amount: '5000' }
      ],
      deductions: [
        { label: 'Income Tax', amount: '5000' },
        { label: 'Provident Fund', amount: '0' },
        { label: 'Unpaid Leaves', amount: '0' }
      ],
      amount_in_words: 'Seventy Two Thousand Only',
      notes: 'Reimbursement paid for dates 28-Oct-25, 29-Oct-25 and first two records from date 21-Oct-25.'
    };
  });

  // persist to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('payslip_form', JSON.stringify(f));
  }, [f]);

  const gross = useMemo(
    () => f.earnings.reduce((a, r) => a + N(r.amount), 0),
    [f.earnings]
  );
  const totalDeductions = useMemo(
    () => f.deductions.reduce((a, r) => a + N(r.amount), 0),
    [f.deductions]
  );
  const net = useMemo(() => gross - totalDeductions, [gross, totalDeductions]);

  const setField = (k: keyof FormState, v: any) => setF({ ...f, [k]: v });

  async function generateOne() {
    const payload = {
      ...f,
      gross_earnings: gross,
      total_deductions: totalDeductions,
      net_payable: net,
      // ensure numeric amounts in arrays
      earnings: f.earnings.map(r => ({ ...r, amount: Number(r.amount || 0) })),
      deductions: f.deductions.map(r => ({ ...r, amount: Number(r.amount || 0) }))
    };

    const res = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
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

  async function onCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const records = result.data as any[];
        if (!records.length) return alert('CSV is empty.');

        // NOTE: You can add "earning:Housing" / "deduction:Pension" columns in CSV for custom rows.
        const res = await fetch('/api/bulk-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records })
        });
        if (!res.ok) return alert(await res.text());
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'payslips.zip';
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }

  const Grid = ({ children }: any) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>
  );
  const Input = ({ label, value, onChange, type = 'text' }: any) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, color: '#555' }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
      />
    </label>
  );
  const Rows = ({
    title,
    rows,
    setRows
  }: { title: string; rows: Row[]; setRows: (r: Row[]) => void }) => (
    <div style={{ marginTop: 16 }}>
      <h4>{title}</h4>
      {rows.map((r, i) => (
        <Grid key={i}>
          <Input label="Label" value={r.label} onChange={(v: string) => {
            const copy = [...rows]; copy[i] = { ...copy[i], label: v }; setRows(copy);
          }} />
          <Input label="Amount" type="number" value={r.amount} onChange={(v: string) => {
            const copy = [...rows]; copy[i] = { ...copy[i], amount: v }; setRows(copy);
          }} />
          <div>
            <button onClick={() => setRows([...rows.slice(0, i), ...rows.slice(i + 1)])}>Remove</button>
            <button style={{ marginLeft: 8 }} onClick={() => setRows([...rows.slice(0, i + 1), { ...rows[i] }, ...rows.slice(i + 1)])}>Duplicate</button>
          </div>
        </Grid>
      ))}
      <button style={{ marginTop: 8 }} onClick={() => setRows([...rows, emptyRow()])}>+ Add Row</button>
    </div>
  );

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto', fontFamily: 'Inter, system-ui, Arial' }}>
      <h2>Bridgeocean — Payslip Generator</h2>
      <p>Fill the form and click <b>Generate PDF</b>. Use CSV for bulk (returns a ZIP).</p>

      <Grid>
        <Input label="Company Name" value={f.company_name} onChange={(v: string) => setField('company_name', v)} />
        <Input label="Payslip Month" value={f.payslip_month} onChange={(v: string) => setField('payslip_month', v)} />
      </Grid>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
        <span style={{ fontSize: 12, color: '#555' }}>Company Address</span>
        <textarea
          value={f.company_address}
          onChange={(e) => setField('company_address', e.target.value)}
          rows={3}
          style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8, fontFamily: 'inherit' }}
        />
      </label>

      <Grid>
        <Input label="Employee Name" value={f.employee_name} onChange={(v: string) => setField('employee_name', v)} />
        <Input label="Employee’s Number" value={f.employee_number} onChange={(v: string) => setField('employee_number', v)} />
      </Grid>

      <Grid>
        <Input label="Pay Period" value={f.pay_period} onChange={(v: string) => setField('pay_period', v)} />
        <Input label="Pay Date" value={f.pay_date} onChange={(v: string) => setField('pay_date', v)} />
      </Grid>

      <Grid>
        <Input label="Paid Days" type="number" value={f.paid_days} onChange={(v: string) => setField('paid_days', v)} />
        <Input label="Loss of Pay Days" type="number" value={f.loss_of_pay_days} onChange={(v: string) => setField('loss_of_pay_days', v)} />
      </Grid>

      <Rows title="Earnings" rows={f.earnings} setRows={(r) => setField('earnings', r)} />
      <Rows title="Deductions" rows={f.deductions} setRows={(r) => setField('deductions', r)} />

      <Grid>
        <Input label="Gross (auto)" value={String(gross)} onChange={() => {}} />
        <Input label="Total Deductions (auto)" value={String(totalDeductions)} onChange={() => {}} />
      </Grid>
      <Grid>
        <Input label="Net Payable (auto)" value={String(net)} onChange={() => {}} />
        <div />
      </Grid>

      <Input label="Amount in Words" value={f.amount_in_words} onChange={(v: string) => setField('amount_in_words', v)} />
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
        <span style={{ fontSize: 12, color: '#555' }}>Notes</span>
        <textarea
          value={f.notes}
          onChange={(e) => setField('notes', e.target.value)}
          rows={3}
          style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8, fontFamily: 'inherit' }}
        />
      </label>

      <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={generateOne} style={{ padding: '10px 16px', cursor: 'pointer' }}>
          Generate PDF
        </button>

        <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <input type="file" accept=".csv" onChange={onCsv} />
          <span>Bulk via CSV → ZIP</span>
        </label>

        <small style={{ color: '#666' }}>
          Tip: replace <code>/public/images/logo.png</code> with your logo.
        </small>
      </div>
    </main>
  );
}
