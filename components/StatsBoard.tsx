'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatNumber } from '../lib/format';

export type StatDatum = { name: string; value: number; extra?: string };

export function StatsBoard({
  gwWins,
  seasonPoints
}: {
  gwWins: StatDatum[];
  seasonPoints: StatDatum[];
}) {
  const gwWinsSorted = useMemo(() => gwWins.slice(0, 10), [gwWins]);
  const seasonPointsSorted = useMemo(() => seasonPoints.slice(0, 10), [seasonPoints]);

  return (
    <div className="table-card grid gap-6 p-6 md:grid-cols-2">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Gameweek wins</p>
            <h3 className="text-xl font-semibold text-white">Most GW wins</h3>
          </div>
          <span className="badge">Top 10</span>
        </div>
        <div className="mt-3 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gwWinsSorted} margin={{ top: 10, left: 0, right: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 12 }}
                formatter={(v: any) => [v, 'GW wins']}
              />
              <Bar dataKey="value" fill="#60a5fa" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Season points</p>
            <h3 className="text-xl font-semibold text-white">Total points leaders</h3>
          </div>
          <span className="badge">Top 10</span>
        </div>
        <div className="mt-3 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={seasonPointsSorted} margin={{ top: 10, left: 0, right: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 12 }}
                formatter={(v: any) => [formatNumber(v as number), 'Points']}
              />
              <Bar dataKey="value" fill="#34d399" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
