'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// The journey order doubles as navigation: goals → transactions → plan → progress.
const LINKS = [
  { href: '/onboarding', label: 'Goals' },
  { href: '/ingest', label: 'Transactions' },
  { href: '/tax', label: 'Tax' },
  { href: '/plan', label: 'Plan' },
  { href: '/progress', label: 'Progress' },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="w-full border-b border-line bg-paper/85 backdrop-blur sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-baseline gap-2 group">
          <span className="font-display font-semibold text-xl tracking-tight text-ink group-hover:text-moss transition-colors">
            InternWealth
          </span>
          <span className="hidden sm:inline text-[10px] uppercase tracking-[0.18em] text-faint">
            est. your internship
          </span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          {LINKS.map((l, i) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
                  active ? 'text-moss font-semibold' : 'text-ink-2 hover:text-ink'
                }`}
              >
                <span
                  className={`font-mono text-[10px] ${active ? 'text-moss' : 'text-faint'}`}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                {l.label}
                {active && (
                  <span className="absolute left-2.5 right-2.5 -bottom-[13px] h-0.5 bg-moss" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
