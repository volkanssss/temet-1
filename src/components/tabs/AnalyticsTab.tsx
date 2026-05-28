import React from 'react';
import { motion } from 'motion/react';
import {
  PieChart as RePieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, XAxis, YAxis, LineChart, Line,
} from 'recharts';
import { formatCurrency, formatPercentage } from '../../lib/utils';
import { StockStat, Dividend, Purchase, Sale } from '../../types/stock';
import { TrendingUp, TrendingDown } from 'lucide-react';

const COLORS = ['#06b6d4','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#f97316','#14b8a6','#a855f7','#ef4444'];

type AnalyticsTabProps = {
  stockStats: StockStat[];
  dividends: Dividend[];
  purchases: Purchase[];
  sales: Sale[];
  summary: any;
};

export default function AnalyticsTab({ stockStats, dividends, purchases, sales, summary }: AnalyticsTabProps) {
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

  // Gerçekleşen K/Z — satışlar
  const totalRealizedPnl = sales.reduce((acc, s) => acc + s.realizedPnl, 0);
  const salesByTicker = sales.reduce((acc, s) => {
    if (!acc[s.ticker]) acc[s.ticker] = { ticker: s.ticker, realizedPnl: 0, qty: 0, count: 0 };
    acc[s.ticker].realizedPnl += s.realizedPnl;
    acc[s.ticker].qty         += s.qty;
    acc[s.ticker].count       += 1;
    return acc;
  }, {} as Record<string, { ticker: string; realizedPnl: number; qty: number; count: number }>);

  const sortedSalesStats = Object.values(salesByTicker).sort((a, b) => b.realizedPnl - a.realizedPnl);
  const sortedSalesHistory = [...sales].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">

      {/* ─── Çeşitlendirme Skoru ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="premium-card p-6 shadow-md border border-slate-800/40 text-center flex flex-col justify-between min-h-[220px]">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">Çeşitlendirme Skoru</div>
          <div className="relative w-24 h-24 mx-auto mb-3">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="2.5" />
              <circle cx="18" cy="18" r="15.9" fill="none"
                stroke={divScore > 60 ? '#10b981' : divScore > 30 ? '#f59e0b' : '#ef4444'}
                strokeWidth="2.5"
                strokeDasharray={`${divScore} 100`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-white tabular-nums">{Math.round(divScore)}</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">SKOR</span>
            </div>
          </div>
          <div className="text-center text-xs font-bold text-slate-400">
            {divScore > 60 ? '✅ İyi çeşitlendirilmiş' : divScore > 30 ? '⚠️ Orta düzey' : '❌ Yüksek konsantrasyon'}
          </div>
        </div>

        <div className="premium-card p-6 shadow-md border border-slate-800/40 md:col-span-2 flex flex-col justify-between">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-4">Sektörel Dağılım</div>
          <div className="space-y-3.5">
            {sectorsData.slice(0, 5).map(([sector, value], i) => (
              <div key={sector}>
                <div className="flex justify-between text-xs font-bold text-slate-350 mb-1.5">
                  <span className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    {sector}
                  </span>
                  <span className="text-slate-450 tabular-nums">{formatPercentage(totalVal > 0 ? ((value as number) / totalVal) * 100 : 0)}</span>
                </div>
                <div className="h-2 bg-slate-950/40 border border-slate-800/40 rounded-full overflow-hidden">
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
        <div className="premium-card p-6 shadow-md border border-slate-800/40">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">Portföy Dağılımı</h3>
          <div className="h-[260px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={stockStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="currentValue"
                  nameKey="ticker"
                  stroke="none"
                >
                  {stockStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', color: '#f8fafc', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', fontSize: '12px' }}
                  formatter={(v: number) => [formatCurrency(v), 'Değer']}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  content={({ payload }) => (
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-4">
                      {payload?.map((e: any, i: number) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
                          <span className="text-[10px] font-bold text-slate-300">{e.value}</span>
                          <span className="text-[10px] text-slate-500 font-semibold tabular-nums">
                            {formatPercentage(totalVal > 0 ? (e.payload.currentValue / totalVal) * 100 : 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                />
              </RePieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-12">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Toplam</div>
              <div className="text-lg font-black text-white tabular-nums">{formatCurrency(totalVal)}</div>
            </div>
          </div>
        </div>

        {/* Hisse K/Z Sıralaması */}
        <div className="premium-card p-6 shadow-md border border-slate-800/40">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">K/Z Sıralaması</h3>
          <div className="space-y-3.5 max-h-[240px] overflow-y-auto hide-scrollbar">
            {topPerformers.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3.5">
                <div className="w-6 text-center text-xs text-slate-500 font-black">{i + 1}</div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-extrabold text-slate-205">{s.ticker}</span>
                    <span className={s.profitLoss >= 0 ? 'text-emerald-450 font-black' : 'text-red-405 font-black'}>
                      {s.profitLoss >= 0 ? '+' : ''}{formatPercentage(s.profitLossPct)}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-950/40 border border-slate-850 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.profitLoss >= 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-red-500 to-pink-500'}`}
                      style={{ width: `${Math.min(100, Math.abs(s.profitLossPct) * 2)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Gerçekleşen K/Z (Satışlar) ─── */}
      {sales.length > 0 && (
        <div className="premium-card p-6 shadow-md border border-slate-800/40">
          <div className="flex justify-between items-center mb-6 border-b border-slate-800/30 pb-4">
            <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider">Gerçekleşen K/Z (Satışlar)</h3>
            <span className={`text-xl font-black flex items-center gap-1.5 tabular-nums ${totalRealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalRealizedPnl >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              {totalRealizedPnl >= 0 ? '+' : ''}{formatCurrency(totalRealizedPnl)}
            </span>
          </div>

          {/* Hisse Bazlı Özet */}
          {sortedSalesStats.length > 0 && (
            <div className="space-y-3 mb-6">
              {sortedSalesStats.map(s => (
                <div key={s.ticker} className="flex items-center gap-4">
                  <div className="w-16 text-xs font-bold text-slate-200">{s.ticker}</div>
                  <div className="flex-1 h-2.5 bg-slate-950/40 border border-slate-800/35 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.realizedPnl >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{
                        width: sortedSalesStats.length > 0
                          ? `${Math.min(100, (Math.abs(s.realizedPnl) / Math.max(...sortedSalesStats.map(x => Math.abs(x.realizedPnl)))) * 100)}%`
                          : '0%'
                      }}
                    />
                  </div>
                  <div className={`w-28 text-right text-xs font-black tabular-nums ${s.realizedPnl >= 0 ? 'text-emerald-400' : 'text-red-405'}`}>
                    {s.realizedPnl >= 0 ? '+' : ''}{formatCurrency(s.realizedPnl)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold w-16 text-right uppercase tracking-wide">{s.count} satış</div>
                </div>
              ))}
            </div>
          )}

          {/* Satış Geçmişi */}
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Satış Geçmişi</h4>
          <div className="space-y-3.5 max-h-[300px] overflow-y-auto hide-scrollbar">
            {sortedSalesHistory.map(s => (
              <div key={s.id} className={`flex justify-between items-center rounded-2xl border p-4 text-sm ${
                s.realizedPnl >= 0 
                  ? 'bg-emerald-500/5 border-emerald-500/10' 
                  : 'bg-red-500/5 border-red-500/10'
              }`}>
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-800/50 flex items-center justify-center font-bold text-xs text-slate-300 border border-slate-700/20">
                    {s.ticker.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-100">{s.ticker}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {s.date} • <span className="font-semibold text-slate-400">{s.qty} lot</span> • <span className="text-slate-400">{formatCurrency(s.price)}/lot</span>
                    </div>
                    {s.note && <div className="text-[10px] text-slate-650 mt-1 italic">{s.note}</div>}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-extrabold text-base tabular-nums ${s.realizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {s.realizedPnl >= 0 ? '+' : ''}{formatCurrency(s.realizedPnl)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    Gelir: {formatCurrency(s.qty * s.price)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Aylık Temettü Bar Chart ─── */}
      <div className="premium-card p-6 shadow-md border border-slate-800/40">
        <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider mb-6">Aylık Temettü Seyri (Son 12 Ay)</h3>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyDivs}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" strokeOpacity={0.5} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} tickFormatter={v => '₺' + (v / 1000).toFixed(0) + 'k'} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', color: '#f8fafc', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', fontSize: '12px' }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                formatter={(v: number) => [formatCurrency(v), '']}
              />
              <Bar dataKey="net" fill="#10b981" radius={[6, 6, 0, 0]} name="Net Temettü" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Aylık Yatırım Line Chart ─── */}
      {monthlyInvest.length > 1 && (
        <div className="premium-card p-6 shadow-md border border-slate-800/40">
          <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider mb-6">Aylık Yatırım Seyri (Son 12 Ay)</h3>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyInvest}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" strokeOpacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} tickFormatter={v => '₺' + (v / 1000).toFixed(0) + 'k'} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', color: '#f8fafc', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', fontSize: '12px' }}
                  formatter={(v: number) => [formatCurrency(v), '']}
                />
                <Line type="monotone" dataKey="val" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 5, fill: '#06b6d4' }} name="Yatırım" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ─── En Çok Temettü Veren Hisseler ─── */}
      {topDivPayers.length > 0 && topDivPayers[0].totalDiv > 0 && (
        <div className="premium-card p-6 shadow-md border border-slate-800/40">
          <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider mb-5">Toplam Temettü — Hisse Bazlı</h3>
          <div className="space-y-3.5">
            {topDivPayers.filter(s => s.totalDiv > 0).map((s, i) => {
              const maxDiv = topDivPayers[0].totalDiv;
              return (
                <div key={s.id} className="flex items-center gap-4">
                  <div className="w-16 text-xs font-bold text-slate-205">{s.ticker}</div>
                  <div className="flex-1 h-2.5 bg-slate-950/40 border border-slate-800/35 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${(s.totalDiv / maxDiv) * 100}%` }}
                    />
                  </div>
                  <div className="w-24 text-right text-xs font-black text-emerald-450 tabular-nums">{formatCurrency(s.totalDiv)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stockStats.length === 0 && (
        <div className="p-12 text-center text-slate-500 premium-card">
          <div className="text-3xl mb-3">📊</div>
          Hisse ekleyince grafikler burada görünecek.
        </div>
      )}
    </motion.div>
  );
}
