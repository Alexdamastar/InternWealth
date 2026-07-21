import type { Metadata } from 'next';
import { Fraunces, Spline_Sans, Spline_Sans_Mono } from 'next/font/google';
import './globals.css';
import DisclaimerBanner from '@/components/DisclaimerBanner';
import NavBar from '@/components/NavBar';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['opsz', 'SOFT', 'WONK'],
});

const splineSans = Spline_Sans({
  subsets: ['latin'],
  variable: '--font-spline',
});

const splineSansMono = Spline_Sans_Mono({
  subsets: ['latin'],
  variable: '--font-spline-mono',
});

export const metadata: Metadata = {
  title: 'InternWealth — a financial agent for SWE interns',
  description:
    'Deterministic, personalized allocation plan for incoming SWE interns. Open source, runs locally on your own AWS Bedrock access.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`h-full ${fraunces.variable} ${splineSans.variable} ${splineSansMono.variable}`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <DisclaimerBanner />
        <NavBar />
        <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
          {children}
        </main>
        <footer className="border-t border-line mt-12">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-display text-sm text-ink-2">InternWealth</span>
            <span className="text-xs text-faint">
              Open source · runs locally · your AWS credentials, your data
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
