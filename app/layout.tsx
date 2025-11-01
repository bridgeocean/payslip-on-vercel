import './globals.css';
export const metadata = {
  title: 'Bridgeocean — Payslip Generator',
  description: 'Generate payslips as PDF (Vercel + Puppeteer).'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
