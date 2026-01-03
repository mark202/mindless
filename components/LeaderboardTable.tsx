'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatCurrency, formatNumber } from '../lib/format';
import { SeasonRow } from '../lib/types';
import { Filters } from './Filters';

export function LeaderboardTable({ rows, currency }: { rows: SeasonRow[]; currency: string }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      `${row.playerName} ${row.teamName}`.toLowerCase().includes(term)
    );
  }, [query, rows]);

  return (
    <div className="table-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-gray-400">Leaderboard</p>
          <h2 className="text-2xl font-bold text-white">Season standings</h2>
        </div>
        <Filters value={query} onChange={setQuery} placeholder="Search players or teams" />
      </div>
      <div className="overflow-x-auto">
        <table className="mt-2 w-full text-sm">
          <thead className="text-gray-400">
            <tr className="border-b border-gray-800 text-left">
              <th className="px-3 py-2">Rank</th>
              <th className="px-3 py-2">Manager</th>
              <th className="px-3 py-2">Team</th>
              <th className="px-3 py-2 text-right">Season Points</th>
              <th className="px-3 py-2 text-right">Weekly</th>
              <th className="px-3 py-2 text-right">Monthly</th>
              <th className="px-3 py-2 text-right">Cup</th>
              <th className="px-3 py-2 text-right">Season</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.entryId} className="border-b border-gray-900/60 hover:bg-gray-900/40">
                <td className="px-3 py-2 font-semibold text-brand-300">{row.rank}</td>
                <td className="px-3 py-2">
                  <Link href={`/managers/${row.entryId}`} className="hover:underline">
                    {row.playerName}
                  </Link>
                </td>
                <td className="px-3 py-2 text-gray-200">{row.teamName}</td>
                <td className="px-3 py-2 text-right font-mono">{formatNumber(row.totalPoints)}</td>
                <td className="px-3 py-2 text-right font-mono text-brand-200">{formatCurrency(row.weeklyWinnings, currency)}</td>
                <td className="px-3 py-2 text-right font-mono text-brand-200">{formatCurrency(row.monthlyWinnings, currency)}</td>
                <td className="px-3 py-2 text-right font-mono text-brand-200">{formatCurrency(row.cupWinnings, currency)}</td>
                <td className="px-3 py-2 text-right font-mono text-emerald-200">{formatCurrency(row.seasonPrize, currency)}</td>
                <td className="px-3 py-2 text-right font-mono text-white">{formatCurrency(row.totalWinnings, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-6 text-center text-sm text-gray-400">No managers match that search.</div>
        )}
      </div>
    </div>
  );
}
