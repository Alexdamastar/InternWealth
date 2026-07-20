import type { Metadata } from 'next';
import './globals.css';
import DisclaimerBanner from '@/components/DisclaimerBanner';
import NavBar from '@/components/NavBar';
import ApiKeyGate from '@/components/ApiKeyGate';

export const metadata: Metadata = {
  title: 'InternWealth — a financial agent for SWE interns',
  description:
    'Deterministic, personalized allocation plan for incoming SWE interns. Open source, runs locally, bring your own API key.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 antialiased">
        <DisclaimerBanner />
        <NavBar />
        <ApiKeyGate>
          <main className="max-w-5xl mx-auto w-full px-4 py-6">{children}</main>
        </ApiKeyGate>
      </body>
    </html>
  );
}
