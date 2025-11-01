import { NextRequest } from 'next/server';
import { Document, Page, Text, View, StyleSheet, Font, Image, PDFDownloadLink, pdf } from '@react-pdf/renderer';
import fs from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';

const fmtNG = (n: number | string) =>
  new Intl.NumberFormat('en-NG').format(typeof n === 'number' ? n : Number(n));

// Optional: register a font (React-PDF defaults are okay; this is just to match a clean look)
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQt0.woff2' }
  ]
});

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 11, fontFamily: 'Inter' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  brand: { flexDirection: 'row', gap: 8 },
  logo: { width: 40, height: 40 },
  company: { fontSize: 14, fontWeight: 700 },
  small: { color: '#666' },
  box: { borderWidth: 1, borderColor: '#c9c9c9', borderRadius: 6, padding: 10, marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  left: { width: '64%' },
  right: { width: '34%', alignItems: 'flex-end' },
  summaryRow: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 140, color: '#444' },
  empNum: { paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderStyle: 'dashed', borderColor: '#bbb' },
  grid: { flexDirection: 'row', gap: 12 },
  col: { width: '50%' },
  th: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e6e6e6', paddingVertical: 6, fontWeight: 700 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e6e6e6', paddingVertical: 6 },
  tdL: { flex: 1 },
  tdR: { width: 100, textAlign: 'right' },
  net: { marginTop: 8, fontSize: 16, fontWeight: 700 },
  smallText: { color: '#666', marginTop: 2 },
  notes: { marginTop: 6 }
});

function PayslipDoc(d: any, logoDataUrl: string) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Image src={logoDataUrl} style={styles.logo} />
            <View>
              <Text style={styles.company}>{d.company_name}</Text>
              <Text style={styles.small}>{d.company_address}</Text>
            </View>
          </View>
          <View>
            <Text>Payslip for the month</Text>
            <Text style={{ fontWeight: 700 }}>{d.payslip_month}</Text>
          </View>
        </View>

        <View style={styles.box}>
          <View style={styles.row}>
            <View style={styles.left}>
              <View style={styles.summaryRow}>
                <Text style={styles.label}>Employee Name :</Text><Text>{d.employee_name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.label}>Employee's Number :</Text><Text style={styles.empNum}>{d.employee_number}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.label}>Pay Period :</Text><Text>{d.pay_period}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.label}>Loss of Pay Days :</Text><Text>{String(d.loss_of_pay_days)}</Text>
              </View>
            </View>
            <View style={styles.right}>
              <Text><Text style={{ fontWeight: 700 }}>Paid Days :</Text> {String(d.paid_days)}</Text>
              <Text style={{ marginTop: 6 }}><Text style={{ fontWeight: 700 }}>Pay Date :</Text> {d.pay_date}</Text>
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.col}>
            <View style={styles.th}>
              <Text style={styles.tdL}>Earnings</Text>
              <Text style={styles.tdR}>Amount</Text>
            </View>
            <View style={styles.tr}><Text style={styles.tdL}>Basic</Text><Text style={styles.tdR}>₦ {d.basic_amount}</Text></View>
            <View style={styles.tr}><Text style={styles.tdL}>Internet and communication</Text><Text style={styles.tdR}>₦ {d.internet_amount}</Text></View>
            <View style={styles.tr}><Text style={styles.tdL}>Transport reimbursement</Text><Text style={styles.tdR}>₦ {d.transport_amount}</Text></View>
            <View style={styles.tr}><Text style={[styles.tdL, { fontWeight: 700 }]}>Gross Earnings</Text><Text style={[styles.tdR, { fontWeight: 700 }]}>₦ {d.gross_earnings}</Text></View>
          </View>

          <View style={styles.col}>
            <View style={styles.th}>
              <Text style={styles.tdL}>Deductions</Text>
              <Text style={styles.tdR}>Amount</Text>
            </View>
            <View style={styles.tr}><Text style={styles.tdL}>Income Tax</Text><Text style={styles.tdR}>₦ {d.income_tax}</Text></View>
            <View style={styles.tr}><Text style={styles.tdL}>Provident Fund</Text><Text style={styles.tdR}>₦ {d.provident_fund}</Text></View>
            <View style={styles.tr}><Text style={styles.tdL}>Unpaid Leaves</Text><Text style={styles.tdR}>₦ {d.unpaid_leaves}</Text></View>
            <View style={styles.tr}><Text style={[styles.tdL, { fontWeight: 700 }]}>Total Deductions</Text><Text style={[styles.tdR, { fontWeight: 700 }]}>₦ {d.total_deductions}</Text></View>
          </View>
        </View>

        <Text style={styles.net}>Net Payable : ₦ {d.net_payable}</Text>
        <Text style={styles.smallText}>Amount in words : {d.amount_in_words}</Text>

        <View style={styles.notes}>
          <Text style={{ fontWeight: 700 }}>Notes :</Text>
          <Text>{d.notes}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function POST(req: NextRequest) {
  try {
    const p = await req.json();
    const ensure = (x: any, d: any) => (x === undefined || x === null ? d : x);

    // read logo and inline as data URL
    let logoDataUrl = '';
    try {
      const logoPath = path.join(process.cwd(), 'public', 'images', 'logo.png');
      const bytes = fs.readFileSync(logoPath);
      logoDataUrl = `data:image/png;base64,${bytes.toString('base64')}`;
    } catch {
      // 1x1 transparent PNG fallback
      logoDataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2P4//8/AwAI/AL+v4gq5wAAAABJRU5ErkJggg==';
    }

    const d = {
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
        ensure(p.gross_earnings, (p.basic_amount || 0) + (p.internet_amount || 0) + (p.transport_amount || 0))
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

    const doc = PayslipDoc(d, logoDataUrl);
    const buffer = await pdf(doc).toBuffer();

    return new Response(buffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="payslip-${d.employee_number}-${d.payslip_month}.pdf"`
      }
    });
  } catch (e: any) {
    return new Response(e?.message || 'Error', { status: 500 });
  }
}
