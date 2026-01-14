import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mindless FPL Automation',
  description: 'Automated FPL prize computation and interactive dashboard for league 1237332.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-6xl px-4 py-6">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/60">
                <Image src="/image.png" alt="Mindless crest" fill className="object-contain" sizes="48px" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-gray-400">Mindless FPL</div>
                <div className="text-lg font-semibold text-white">Automation + Ledger</div>
              </div>
            </Link>
            <nav className="flex flex-wrap gap-2">
              {[
                { href: '/', label: 'Leaderboard' },
                { href: '/gameweeks', label: 'Gameweeks' },
                { href: '/fixtures', label: 'Fixtures' },
                { href: '/stats', label: 'Stats' },
                { href: '/months', label: 'Months' },
                { href: '/cup', label: 'Cup' },
                { href: '/prizes', label: 'Prizes' },
                { href: '/rules', label: 'Rules' }
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href as any}
                  className="rounded-full border border-gray-800 px-3 py-2 text-sm text-gray-200 transition hover:border-brand-400 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </header>
          <main className="space-y-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
