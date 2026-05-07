import React from 'react';
import { motion } from 'motion/react';
import {
  PieChart as RePieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, XAxis, YAxis, LineChart, Line,
} from 'recharts';
import { formatCurrency, formatPercentage } from '../../lib/utils';
import { StockStat, Dividend, Purchase } from '../../types/stock';

const COLORS = ['#06b6d4','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#f97316','#14b8a6','#a855f7','#ef4444'];

type AnalyticsTabProps = {
  stockStats: StockStat[];
  dividends: Dividend[];
  purchases: Purchase[];
  summary: any;
};

export default function AnalyticsTab({ stockStats, dividends, purchases, summary }: AnalyticsTabProps) {
  // Sektörel dağılım
  const sectorsData = Object.entries(
    stockStats.reduce((acc, s) => {
      acc[s.sector] = (acc[s.sector] || 0) + s.currentValue;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a: any, b: any) => b[1] - a[1]);

  // Aylık temettü
  const monthlyDivs = Object.entries(
    dividends.reduce((acc, d) => {
      const m = d.date.slice(0, 7);
      acc[m] = (acc[m] || 0) + d.net;
      return acc;
    }, {} as Record<string, number>)
  ).sort().slice(-12).map(([name, net]) => ({ name: name.slice(5), net }));

  // Aylık yatırım
  const monthlyInvest = Object.entries(
    purchases.reduce((acc, p) => {
      const m = p.date.slice(0, 7);
      acc[m] = (acc[m] || 0) + p.qty * p.price;
      return acc;
    }, {} as Record<string, number>)
  ).sort().slice(-12).map(([name, val]) => ({ name: name.slice(5), val }));

  // Hisse performans sıralaması
  const topPerformers = [...stockStats].sort((a, b) => b.profitLossPct - a.profitLossPct);
  const topDivPayers  = [...stockStats].sort((a, b) => b.totalDiv - a.totalDiv).slice(0, 8);

  // Çeşitlendirme skoru (HHI)
  const totalVal = summary.totalValue;
  const hhi = totalVal > 0
    ? stockStats.reduce((acc, s) => acc + Math.pow((s.currentValue / totalVal) * 100, 2), 0)
    : 0;
  const divScore = Math.max(0, 100 - hhi / 100);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">

      {/* ─── Çeşitlendirme Skoru ─── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 col-span-1">
          <div className="text-xs text-slate-500 uppercase font-bold mb-3">Çeşitlendirme Skoru</div>
          <div className="relative w-20 h-20 mx-auto mb-3">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none"
                stroke={divScore > 60 ? '#10b981' : divScore > 30 ? '#f59e0b' : '#ef4444'}
                strokeWidth="3"
                strokeDasharray={`${divScore} 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-white">{Math.round(divScore)}</span>
            </div>
          </div>
          <div className="text-center text-xs text-slate-500">
            {divScore > 60 ? '✅ İyi çeşitlendirilmiş' : divScore > 30 ? '⚠️ Orta düzey' : '❌ Yüksek konsantrasyon'}
          </div>
        </div>

        <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 col-span-2">
          <div className="text-xs text-slate-500 uppercase font-bold mb-3">Sektörel Dağılım</div>
          <div className="space-y-2.5">
            {sectorsData.slice(0, 5).map(([sector, value], i) => (
              <div key={sector}>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    {sector}
                  </span>
                  <span className="text-slate-400">{formatPercentage(totalVal > 0 ? ((value as number) / totalVal) * 100 : 0)}</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${totalVal > 0 ? ((value as number) / totalVal) * 100 : 0}%`,
                      backgroundColor: COLORS[i],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Pasta + Performans ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Portföy Dağılımı */}
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Portföy Dağılımı</h3>
          <div className="h-[240px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={stockStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="currentValue"
                  nameKey="ticker"
                  stroke="none"
                >
                  {stockStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                  formatter={(v: number) => [formatCurrency(v), 'Değer']}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  content={({ payload }) => (
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-3">
                      {payload?.map((e: any, i: number) => (
                        <div key={i} className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
                          <span className="text-[10px] font-bold text-slate-300">{e.value}</span>
                          <span className="text-[10px] text-slate-500">
                            {formatPercentage(totalVal > 0 ? (e.payload.currentValue / totalVal) * 100 : 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                />
              </RePieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-10">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Toplam</div>
              <div className="text-base font-bold text-white">{formatCurrency(totalVal)}</div>
            </div>
          </div>
        </div>

        {/* Hisse K/Z Sıralaması */}
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">K/Z Sıralaması</h3>
          <div className="space-y-2.5 max-h-[240px] overflow-y-auto hide-scrollbar">
            {topPerformers.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <div className="w-6 text-center text-xs text-slate-600 font-bold">{i + 1}</div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="font-bold text-slate-200">{s.ticker}</span>
                    <span className={s.profitLoss >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                      {s.profitLoss >= 0 ? '+' : ''}{formatPercentage(s.profitLossPct)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.profitLoss >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, Math.abs(s.profitLossPct) * 2)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Aylık Temettü Bar Chart ─── */}
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <h3 className="text-sm font-semibold text-slate-300 mb-6">Aylık Temettü Seyri (Son 12 Ay)</h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyDivs}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => '₺' + (v / 1000).toFixed(0) + 'k'} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                cursor={{ fill: '#1e293b' }}
                formatter={(v: number) => formatCurrency(v)}
              />
              <Bar dataKey="net" fill="#10b981" radius={[4, 4, 0, 0]} name="Net Temettü" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Aylık Yatırım Line Chart ─── */}
      {monthlyInvest.length > 1 && (
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-6">Aylık Yatırım Seyri (Son 12 Ay)</h3>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyInvest}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => '₺' + (v / 1000).toFixed(0) + 'k'} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                  formatter={(v: number) => formatCurrency(v)}
                />
                <Line type="monotone" dataKey="val" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4, fill: '#06b6d4' }} name="Yatırım" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ─── En Çok Temettü Veren Hisseler ─── */}
      {topDivPayers.length > 0 && topDivPayers[0].totalDiv > 0 && (
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Toplam Temettü — Hisse Bazlı</h3>
          <div className="space-y-3">
            {topDivPayers.filter(s => s.totalDiv > 0).map((s, i) => {
              const maxDiv = topDivPayers[0].totalDiv;
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="w-16 text-xs font-bold text-slate-300">{s.ticker}</div>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${(s.totalDiv / maxDiv) * 100}%` }}
                    />
                  </div>
                  <div className="w-24 text-right text-xs font-bold text-emerald-400">{formatCurrency(s.totalDiv)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stockStats.length === 0 && (
        <div className="p-12 text-center text-slate-500">
          <div className="text-3xl mb-3">📊</div>
          Hisse ekleyince grafikler burada görünecek.
        </div>
      )}
    </motion.div>
  );
}
