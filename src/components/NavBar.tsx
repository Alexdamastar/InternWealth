'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/onboarding', label: 'Goals' },
  { href: '/ingest', label: 'Transactions' },
  { href: '/tax', label: 'Tax' },
  { href: '/plan', label: 'Plan' },
  { href: '/progress', label: 'Progress' },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="w-full border-b border-gray-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-1">
        <Link href="/" className="font-semibold text-indigo-700 mr-4">
          InternWealth
        </Link>
        {LINKS.slice(1).map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md text-sm ${
                active
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
