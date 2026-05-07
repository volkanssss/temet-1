import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, RefreshCcw, Download, Clock, Calendar, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn, formatCurrency, formatPercentage } from '../../lib/utils';
import { PortfolioHistory } from '../../types/stock';

type OverviewTabProps = {
  summary: any;
  stockStats: any[];
  purchases: any[];
  dividends: any[];
  history: PortfolioHistory[];
  setViewingStockDetails: (id: string) => void;
};

export default function OverviewTab({
  summary,
  stockStats,
  purchases,
  dividends,
  history,
  setViewingStockDetails
}: OverviewTabProps) {
  const [summaryRange, setSummaryRange] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('all');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getSnapshot = (daysAgo: number) => {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - daysAgo);
    const pastSnaps = history.filter(h => new Date(h.date) <= targetDate).sort((a,b) => b.date.localeCompare(a.date));
    return pastSnaps.length > 0 ? pastSnaps[0] : null;
  };

  const calcPnl = (snap: PortfolioHistory | null) => {
    if (!snap) return null;
    const currentPnl = summary.totalValue - summary.totalCost;
    const pastPnl = snap.totalValue - snap.totalCost;
    const pnlChange = currentPnl - pastPnl;
    const pnlPct = snap.totalValue > 0 ? (pnlChange / snap.totalValue) * 100 : 0;
    return { val: pnlChange, pct: pnlPct };
  };

  const daily = calcPnl(getSnapshot(1));
  const weekly = calcPnl(getSnapshot(7));
  const monthly = calcPnl(getSnapshot(30));
  const yearly = calcPnl(getSnapshot(365));

  const ranges = {
    all: { label: 'Tüm Zamanlar Değer', pnl: summary.pnl, pct: summary.pnlPct },
    daily: { label: 'Günlük Değişim', pnl: daily?.val || 0, pct: daily?.pct || 0 },
    weekly: { label: 'Haftalık Değişim', pnl: weekly?.val || 0, pct: weekly?.pct || 0 },
    monthly: { label: 'Aylık Değişim', pnl: monthly?.val || 0, pct: monthly?.pct || 0 },
    yearly: { label: 'Yıllık Değişim', pnl: yearly?.val || 0, pct: yearly?.pct || 0 }
  };

  const currentRange = ranges[summaryRange];

  const cycleRange = () => {
    const order: ('all' | 'daily' | 'weekly' | 'monthly' | 'yearly')[] = ['all', 'daily', 'weekly', 'monthly', 'yearly'];
    const nextIndex = (order.indexOf(summaryRange) + 1) % order.length;
    setSummaryRange(order[nextIndex]);
  };

  const chartData = [...history].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(h => ({
    name: new Date(h.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }),
    'Portföy Değeri': h.totalValue,
    'Net Maliyet': h.totalCost
  }));
  
  if (summary.totalValue > 0) {
    chartData.push({
      name: 'Bugün',
      'Portföy Değeri': summary.totalValue,
      'Net Maliyet': summary.totalCost
    });
  }

  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const recentDivs = dividends.filter(d => new Date(d.date) >= twelveMonthsAgo);
  const trailingAnnualDiv = recentDivs.reduce((a, d) => a + d.net, 0);
  const estimatedYield = summary.totalCost > 0 ? (trailingAnnualDiv / summary.totalCost) * 100 : 0;

  const groupedPurchases = purchases.reduce((acc, p) => {
    const month = p.date.substring(0, 7);
    if (!acc[month]) acc[month] = { total: 0, drip: 0 };
    const value = p.qty * p.price;
    acc[month].total += value;
    if ((p as any).isDrip) acc[month].drip += value;
    return acc;
  }, {} as Record<string, { total: number, drip: number }>);
  const sortedMonths = Object.entries(groupedPurchases).sort((a, b) => b[0].localeCompare(a[0])) as [string, { total: number, drip: number }][];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div 
        className="flex flex-col items-center mb-8 pt-4 cursor-pointer select-none group active:scale-[0.98] transition-transform"
        onClick={cycleRange}
      >
        <div className="w-full flex justify-end pr-4 mb-2">
          <div className="flex items-center gap-1.5 text-slate-400 text-sm font-medium"><Eye size={16} /> TL</div>
        </div>
        <div className="text-slate-500 text-sm mb-1 font-medium group-hover:text-cyan-400 transition-colors flex items-center gap-2">
          {currentRange.label}
          <RefreshCcw size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-[40px] font-bold text-white mb-2 tracking-tight">{formatCurrency(summary.totalValue)}</div>
        <div className={cn("text-sm font-medium flex items-center gap-1", currentRange.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>
          {currentRange.pnl >= 0 ? '↑' : '↓'} {currentRange.pnl >= 0 ? '+' : ''}{formatCurrency(currentRange.pnl)} (%{formatPercentage(currentRange.pct)})
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800/80">
          <div className="flex justify-between items-start mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700"><Download size={14} className="text-slate-300"/></div>
            <div className="text-emerald-400 text-sm font-medium">{formatPercentage(summary.totalCost > 0 ? (summary.totalDiv / summary.totalCost) * 100 : 0)}</div>
          </div>
          <div className="text-xl font-bold text-white mb-1">{formatCurrency(summary.totalDiv)}</div>
          <div className="text-xs text-slate-500 font-medium">Ödenen Temettü</div>
        </div>
        <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800/80">
          <div className="flex justify-between items-start mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700"><Clock size={14} className="text-slate-300"/></div>
            <div className="text-amber-400 text-sm font-medium">{formatPercentage(estimatedYield)}</div>
          </div>
          <div className="text-xl font-bold text-white mb-1">{formatCurrency(trailingAnnualDiv)}</div>
          <div className="text-xs text-slate-500 font-medium">Yıllık Temettü (TTM)</div>
        </div>
        <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800/80">
          <div className="flex justify-between items-start mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1"></div>
            <div className={cn("text-sm font-medium", summary.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>{formatPercentage(summary.pnlPct)}</div>
          </div>
          <div className="text-xl font-bold text-white mb-1">{formatCurrency(summary.pnl)}</div>
          <div className="text-xs text-slate-500 font-medium">Gerçekleşen K/Z</div>
        </div>
        <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800/80">
          <div className="flex justify-between items-start mb-3">
            <div className="w-2 h-2 rounded-full bg-cyan-500 mt-1"></div>
            <div className={cn("text-sm font-medium", !daily || daily.val >= 0 ? "text-cyan-400" : "text-red-400")}>{daily ? formatPercentage(daily.pct) : '0,00%'}</div>
          </div>
          <div className="text-xl font-bold text-white mb-1">{daily ? formatCurrency(daily.val) : '₺0,00'}</div>
          <div className="text-xs text-slate-500 font-medium">Günlük K/Z</div>
        </div>
      </div>

      {chartData.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl mb-8 h-[320px]"
        >
            <h3 className="text-sm font-semibold text-slate-300 mb-6 flex items-center gap-2">
              Portföy Büyüme Eğrisi
            </h3>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#475569" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#475569" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => '₺' + (val/1000).toFixed(0) + 'k'} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', color: '#f8fafc', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '13px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                  itemStyle={{ color: '#f8fafc', fontWeight: 500 }}
                  formatter={(value: number) => formatCurrency(value)}
                  cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Area type="monotone" dataKey="Net Maliyet" stroke="#475569" strokeWidth={2} fillOpacity={1} fill="url(#colorCost)" />
                <Area type="monotone" dataKey="Portföy Değeri" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" activeDot={{ r: 6, strokeWidth: 0, fill: '#06b6d4' }} />
              </AreaChart>
            </ResponsiveContainer>
        </motion.div>
      )}

      {purchases.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 px-1">Aylık Yatırım Geçmişi</h3>
          <div className="flex overflow-x-auto hide-scrollbar gap-4 pb-4 snap-x">
            {sortedMonths.map(([month, data]) => {
              const net = data.total - data.drip;
              const monthDate = new Date(month + '-01');
              const monthName = monthDate.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });
              const isCurrentMonth = month === new Date().toISOString().substring(0, 7);
              return (
                <div key={month} className={`min-w-[300px] snap-start rounded-2xl p-6 border relative overflow-hidden ${isCurrentMonth ? 'bg-slate-800/80 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)]' : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/60 transition-colors'}`}>
                  {isCurrentMonth && <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>}
                  <div className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isCurrentMonth ? 'text-cyan-400' : 'text-slate-400 opacity-80'}`}>
                    <Calendar size={14} /> {monthName} {isCurrentMonth && '(Mevcut)'}
                  </div>
                  <div className={`text-3xl font-bold tracking-tight mb-5 ${isCurrentMonth ? 'text-white' : 'text-white'}`}>{formatCurrency(data.total)}</div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
                      <div className="text-slate-500 font-medium mb-1 flex items-center gap-1.5"><TrendingUp size={12}/> Net Yatırım</div>
                      <div className={isCurrentMonth ? "text-cyan-400 font-bold text-sm" : "text-slate-300 font-bold text-sm"}>{formatCurrency(net)}</div>
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
                      <div className="text-slate-500 font-medium mb-1 flex items-center gap-1.5"><RefreshCcw size={12}/> Temettü (DRIP)</div>
                      <div className="text-slate-300 font-bold text-sm">{formatCurrency(data.drip)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 px-1">Hisse Özetleri</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {stockStats.map(stock => (
              <motion.div 
                key={stock.id} 
                whileHover={{ y: -4 }}
                onClick={() => setViewingStockDetails(stock.id)} 
                className="border border-slate-800/60 p-4 bg-slate-900/40 hover:bg-slate-800/80 hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.05)] transition-all group flex flex-col justify-between cursor-pointer rounded-2xl"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300 group-hover:bg-cyan-500/10 group-hover:text-cyan-400 group-hover:border-cyan-500/20 transition-colors">
                      {stock.ticker.substring(0, 1)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-100 group-hover:text-white transition-colors">{stock.ticker}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-1 group-hover:text-slate-400 transition-colors">{stock.name}</div>
                    </div>
                  </div>
                  <div className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                    stock.profitLoss >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                  )}>
                    {stock.profitLoss >= 0 ? '+' : ''}{formatPercentage(stock.profitLossPct)}
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-[10px] text-slate-500 font-medium">Değer</div>
                  <div className="text-sm text-white font-bold tracking-tight">{formatCurrency(stock.currentValue)}</div>
                </div>
              </motion.div>
            ))}
        </div>
      </div>
    </motion.div>
  );
}
