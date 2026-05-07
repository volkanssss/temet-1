import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, RefreshCcw, Download, Calendar, TrendingUp, Clock } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { cn, formatCurrency, formatPercentage } from '../../lib/utils';
import { StockStat, Purchase, Dividend, PortfolioHistory } from '../../types/stock';

type OverviewTabProps = {
  summary: any;
  stockStats: StockStat[];
  purchases: Purchase[];
  dividends: Dividend[];
  history: PortfolioHistory[];
  lastUpdated: Date | null;
  setViewingStockDetails: (id: string) => void;
};

// CSV Export — tüm portföy
function exportPortfolioCSV(stockStats: StockStat[]) {
  const header = 'Hisse,Ad,Sektör,Borsa,Lot,Ort.Maliyet,Güncel Fiyat,Toplam Maliyet,Güncel Değer,K/Z,K/Z %,Temettü\n';
  const rows   = stockStats.map(s =>
    [s.ticker, s.name, s.sector, s.exchange, s.qty,
     s.avgCost.toFixed(2), (s.lastPrice || 0).toFixed(2),
     s.totalCost.toFixed(2), s.currentValue.toFixed(2),
     s.profitLoss.toFixed(2), s.profitLossPct.toFixed(2),
     s.totalDiv.toFixed(2)]
      .map(v => `"${v}"`).join(',')
  ).join('\n');
  const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `portfoy-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function OverviewTab({
  summary, stockStats, purchases, dividends, history, lastUpdated, setViewingStockDetails,
}: OverviewTabProps) {
  const [summaryRange, setSummaryRange] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('all');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getSnapshot = (daysAgo: number) => {
    const target = new Date(today);
    target.setDate(today.getDate() - daysAgo);
    const past = history.filter(h => new Date(h.date) <= target).sort((a, b) => b.date.localeCompare(a.date));
    return past.length > 0 ? past[0] : null;
  };

  const calcPnl = (snap: PortfolioHistory | null) => {
    if (!snap) return null;
    const cur  = summary.totalValue - summary.totalCost;
    const past = snap.totalValue - snap.totalCost;
    const diff = cur - past;
    const pct  = snap.totalValue > 0 ? (diff / snap.totalValue) * 100 : 0;
    return { val: diff, pct };
  };

  const daily   = calcPnl(getSnapshot(1));
  const weekly  = calcPnl(getSnapshot(7));
  const monthly = calcPnl(getSnapshot(30));
  const yearly  = calcPnl(getSnapshot(365));

  const ranges = {
    all:     { label: 'Toplam Değer',    pnl: summary.pnl,        pct: summary.pnlPct },
    daily:   { label: 'Günlük Değişim',  pnl: daily?.val  || 0,   pct: daily?.pct  || 0 },
    weekly:  { label: 'Haftalık Değişim',pnl: weekly?.val || 0,   pct: weekly?.pct || 0 },
    monthly: { label: 'Aylık Değişim',   pnl: monthly?.val|| 0,   pct: monthly?.pct|| 0 },
    yearly:  { label: 'Yıllık Değişim',  pnl: yearly?.val || 0,   pct: yearly?.pct || 0 },
  };

  const order: (keyof typeof ranges)[] = ['all', 'daily', 'weekly', 'monthly', 'yearly'];
  const cycleRange = () => setSummaryRange(r => order[(order.indexOf(r) + 1) % order.length]);
  const cur = ranges[summaryRange];

  const chartData = [...history]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(h => ({
      name: new Date(h.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }),
      'Portföy Değeri': h.totalValue,
      'Net Maliyet':    h.totalCost,
    }));
  if (summary.totalValue > 0) {
    chartData.push({
      name: 'Bugün',
      'Portföy Değeri': summary.totalValue,
      'Net Maliyet':    summary.totalCost,
    });
  }

  const now              = new Date();
  const twelveMonthsAgo  = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const trailingDivs     = dividends.filter(d => new Date(d.date) >= twelveMonthsAgo);
  const trailingAnnualDiv = trailingDivs.reduce((a, d) => a + d.net, 0);
  const estimatedYield   = summary.totalCost > 0 ? (trailingAnnualDiv / summary.totalCost) * 100 : 0;

  const groupedPurchases = purchases.reduce((acc, p) => {
    const month = p.date.substring(0, 7);
    if (!acc[month]) acc[month] = { total: 0, drip: 0 };
    const val = p.qty * p.price;
    acc[month].total += val;
    if (p.isDrip) acc[month].drip += val;
    return acc;
  }, {} as Record<string, { total: number; drip: number }>);
  const sortedMonths = Object.entries(groupedPurchases).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">

      {/* ─── Ana Değer Göstergesi ─── */}
      <div
        className="flex flex-col items-center pt-4 cursor-pointer select-none group active:scale-[0.99] transition-transform"
        onClick={cycleRange}
      >
        <div className="text-slate-400 text-sm mb-2 font-medium group-hover:text-cyan-400 transition-colors flex items-center gap-2">
          {cur.label}
          <RefreshCcw size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-[44px] font-bold text-white mb-2 tracking-tight tabular-nums">
          {formatCurrency(summary.totalValue)}
        </div>
        <div className={cn('text-sm font-semibold flex items-center gap-1.5 px-3 py-1 rounded-full',
          cur.pnl >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
        )}>
          {cur.pnl >= 0 ? '▲' : '▼'}
          {cur.pnl >= 0 ? '+' : ''}{formatCurrency(cur.pnl)} ({formatPercentage(Math.abs(cur.pct))})
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-slate-600">
            <Clock size={10} />
            Son güncelleme: {lastUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {/* ─── Özet Metrikler ─── */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { icon: '💰', label: 'Ödenen Temettü', val: formatCurrency(summary.totalDiv), sub: formatPercentage(summary.totalCost > 0 ? (summary.totalDiv / summary.totalCost) * 100 : 0) + ' verimi', color: 'text-emerald-400' },
          { icon: '📅', label: 'Yıllık Temettü (TTM)', val: formatCurrency(trailingAnnualDiv), sub: formatPercentage(estimatedYield) + ' tahmini', color: 'text-amber-400' },
          { icon: '📈', label: 'Gerçekleşen K/Z', val: formatCurrency(summary.pnl), sub: formatPercentage(summary.pnlPct), color: summary.pnl >= 0 ? 'text-emerald-400' : 'text-red-400' },
          { icon: '⚡', label: 'Günlük K/Z', val: daily ? formatCurrency(daily.val) : '₺0,00', sub: daily ? formatPercentage(daily.pct) : '0,00%', color: !daily || daily.val >= 0 ? 'text-cyan-400' : 'text-red-400' },
        ].map(m => (
          <div key={m.label} className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800/80">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xl">{m.icon}</span>
              <span className={`text-sm font-bold ${m.color}`}>{m.sub}</span>
            </div>
            <div className="text-xl font-bold text-white mb-1">{m.val}</div>
            <div className="text-xs text-slate-500 font-medium">{m.label}</div>
          </div>
        ))}
      </div>

      {/* ─── Portföy Grafiği ─── */}
      {chartData.length > 1 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl h-[280px]"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-slate-300">Portföy Büyüme Eğrisi</h3>
            {stockStats.length > 0 && (
              <button
                onClick={() => exportPortfolioCSV(stockStats)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-500 hover:text-emerald-400 hover:bg-slate-700 transition-colors"
                title="CSV İndir"
              >
                <Download size={13} />
              </button>
            )}
          </div>
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVal"  x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#475569" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#475569" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => '₺' + (v / 1000).toFixed(0) + 'k'} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', color: '#f8fafc', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
                formatter={(v: number) => formatCurrency(v)}
                cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area type="monotone" dataKey="Net Maliyet"    stroke="#475569" strokeWidth={2} fillOpacity={1} fill="url(#colorCost)" />
              <Area type="monotone" dataKey="Portföy Değeri" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" activeDot={{ r: 5, fill: '#06b6d4' }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      ) : history.length === 0 && (
        <div className="p-8 text-center bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
          <div className="text-2xl mb-2">📊</div>
          <div className="text-slate-500 text-sm">Fiyatlar güncellendikçe büyüme grafiği burada görünecek</div>
        </div>
      )}

      {/* ─── Aylık Yatırım Geçmişi ─── */}
      {sortedMonths.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 px-1">Aylık Yatırım Geçmişi</h3>
          <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-3 snap-x">
            {sortedMonths.map(([month, data]) => {
              const net        = data.total - data.drip;
              const isCurrentM = month === new Date().toISOString().substring(0, 7);
              const monthName  = new Date(month + '-01').toLocaleString('tr-TR', { month: 'long', year: 'numeric' });
              return (
                <div key={month} className={`min-w-[260px] snap-start rounded-2xl p-5 border shrink-0 relative overflow-hidden ${
                  isCurrentM ? 'bg-slate-800/80 border-cyan-500/30' : 'bg-slate-900/40 border-slate-800/80'
                }`}>
                  {isCurrentM && <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 blur-3xl rounded-full" />}
                  <div className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isCurrentM ? 'text-cyan-400' : 'text-slate-400'}`}>
                    <Calendar size={13} /> {monthName}
                  </div>
                  <div className="text-2xl font-bold text-white mb-4">{formatCurrency(data.total)}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/50">
                      <div className="text-slate-500 mb-1 flex items-center gap-1"><TrendingUp size={11} /> Net</div>
                      <div className={`font-bold ${isCurrentM ? 'text-cyan-400' : 'text-slate-300'}`}>{formatCurrency(net)}</div>
                    </div>
                    <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/50">
                      <div className="text-slate-500 mb-1 flex items-center gap-1"><RefreshCcw size={11} /> DRIP</div>
                      <div className="text-slate-300 font-bold">{formatCurrency(data.drip)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Hisse Özetleri ─── */}
      {stockStats.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 px-1">Hisse Özetleri</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {stockStats.map(s => (
              <motion.div
                key={s.id}
                whileHover={{ y: -3 }}
                onClick={() => setViewingStockDetails(s.id)}
                className="border border-slate-800/60 p-4 bg-slate-900/40 hover:bg-slate-800/80 hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.05)] transition-all group flex flex-col justify-between cursor-pointer rounded-2xl"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300 group-hover:bg-cyan-500/10 group-hover:text-cyan-400 transition-colors">
                    {s.ticker.substring(0, 2)}
                  </div>
                  <span className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded',
                    s.profitLoss >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  )}>
                    {s.profitLoss >= 0 ? '+' : ''}{formatPercentage(s.profitLossPct)}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-100 group-hover:text-white">{s.ticker}</div>
                  <div className="text-[10px] text-slate-500 truncate mb-2">{s.name}</div>
                  <div className="text-sm font-bold text-white">{formatCurrency(s.currentValue)}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {stockStats.length === 0 && (
        <div className="p-16 text-center">
          <div className="text-4xl mb-4">🚀</div>
          <div className="text-slate-400 font-medium mb-2">Portföyünüz henüz boş</div>
          <div className="text-slate-600 text-sm">Hisseler sekmesinden ilk hissenizi ekleyin</div>
        </div>
      )}
    </motion.div>
  );
}
