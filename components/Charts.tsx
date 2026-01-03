'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function PointsChart({
  data,
  height = 260
}: {
  data: Array<{ gw: number; points: number; prize?: number; totalPoints?: number }>;
  height?: number;
}) {
  return (
    <div className="table-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Gameweek trend</p>
          <h3 className="text-lg font-semibold text-white">Points by GW</h3>
        </div>
        <span className="badge">GW 1–{data.length || 1}</span>
      </div>
      <div className="mt-3 w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="pointsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#256eff" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#256eff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="gw" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1f2937', borderRadius: 12 }}
              labelStyle={{ color: '#cbd5e1' }}
              formatter={(value: any, name: string) => [value, name === 'points' ? 'Points' : name]}
              labelFormatter={(label) => `GW ${label}`}
            />
            <Area
              type="monotone"
              dataKey="points"
              stroke="#60a5fa"
              fillOpacity={1}
              strokeWidth={3}
              fill="url(#pointsGradient)"
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#93c5fd' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
