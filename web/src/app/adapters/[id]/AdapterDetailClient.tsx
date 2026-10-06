'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface Props {
  adapter: any;
  apyHistory: { date: string; apy: number }[];
}

export function AdapterDetailClient({ adapter, apyHistory }: Props) {
  return (
    <div className="space-y-6">
      <div className="surface rounded-lg p-6">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h3 className="font-semibold">About {adapter.name}</h3>
          <span className="text-xs font-mono text-wheat-300 border border-wheat-400/30 rounded px-2 py-1">reference adapter</span>
        </div>
        <p className="text-muted-foreground leading-relaxed">{adapter.description}</p>
      </div>

      <div className="surface rounded-lg p-6">
        <div className="flex items-center justify-between mb-4 gap-4">
          <div>
            <h3 className="font-semibold">Sample APY visualisation</h3>
            <p className="text-xs text-muted-foreground mt-1">Deterministic demo data for UI testing — not current protocol history.</p>
          </div>
          <span className="text-sm text-wheat-300">{adapter.apyPercent} sample</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={apyHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#666' }} tickLine={false} axisLine={false} interval={6} />
            <YAxis tick={{ fontSize: 11, fill: '#666' }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(1)}%`} />
            <Tooltip
              contentStyle={{ background: '#0f2a26', border: '1px solid #1a3d39', borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [`${v.toFixed(2)}%`, 'Sample APY']}
            />
            <Line type="monotone" dataKey="apy" stroke="#7dd6c4" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
