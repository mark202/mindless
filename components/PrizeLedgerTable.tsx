'use client';

import { useMemo, useState } from 'react';
import { formatCurrency } from '../lib/format';
import { Manager, PrizeLedgerItem } from '../lib/types';

const filters: Array<{ key: 'all' | PrizeLedgerItem['type']; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'season', label: 'Season' },
  { key: 'cup', label: 'Cup' }
];

export function PrizeLedgerTable({
  items,
  totals,
  managers,
  currency
}: {
  items: PrizeLedgerItem[];
  totals: Record<number, number>;
  managers: Manager[];
  currency: string;
}) {
  const [filter, setFilter] = useState<'all' | PrizeLedgerItem['type']>('all');

  const nameByEntry = useMemo(() => {
    const map = new Map<number, { player: string; team: string }>();
    managers.forEach((m) => map.set(m.entryId, { player: m.playerName, team: m.teamName }));
    return map;
  }, [managers]);

  const filtered = useMemo(() => {
    return filter === 'all' ? items : items.filter((item) => item.type === filter);
  }, [filter, items]);

  const topTotals = useMemo(() => {
    return [...managers]
      .sort((a, b) => (totals[b.entryId] ?? 0) - (totals[a.entryId] ?? 0))
      .slice(0, 6);
  }, [managers, totals]);

  return (
    <div className="table-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-gray-400">Prize ledger</p>
          <h2 className="text-2xl font-bold text-white">Payments + winnings</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                filter === f.key ? 'bg-brand-500 text-white' : 'bg-gray-800 text-gray-200'
              }`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-gray-400">
            <tr className="border-b border-gray-800 text-left">
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Detail</th>
              <th className="px-3 py-2">Manager</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, index) => {
              const name = nameByEntry.get(item.entryId);
              return (
                <tr key={`${item.type}-${index}-${item.entryId}`} className="border-b border-gray-900/60">
                  <td className="px-3 py-2 capitalize text-brand-200">{item.type}</td>
                  <td className="px-3 py-2 text-gray-100">
                    {item.reason || '—'}
                    {item.type === 'weekly' && 'GW' in item ? '' : ''}
                  </td>
                  <td className="px-3 py-2 text-gray-200">
                    {name ? (
                      <span>
                        {name.player}
                        <span className="text-gray-500"> • </span>
                        {name.team}
                      </span>
                    ) : (
                      item.entryId
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-brand-100">
                    {formatCurrency(item.amount, currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-6 text-center text-sm text-gray-400">No prizes recorded yet.</div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {topTotals.map((m) => (
          <div key={m.entryId} className="rounded-xl border border-gray-800 bg-gray-900/40 p-3">
            <div className="text-xs uppercase tracking-widest text-gray-500">{m.playerName}</div>
            <div className="text-sm text-gray-300">{m.teamName}</div>
            <div className="text-lg font-semibold text-white">
              {formatCurrency(totals[m.entryId] ?? 0, currency)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
