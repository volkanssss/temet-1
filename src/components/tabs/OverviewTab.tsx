import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, RefreshCcw, Download, Calendar, TrendingUp, Clock } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { cn, formatCurrency, formatPercentage } from '../../lib/utils';
import { StockStat, Purchase, Dividend, PortfolioHistory } from '../../types/stock';
import AnimatedNumber from '../ui/AnimatedNumber';

type OverviewTabProps = {
  summary: any;
  stockStats: StockStat[];
  purchases: Purchase[];
  dividends: Dividend[];
  history: PortfolioHistory[];
  lastUpdated: Date | null;
  searchQuery?: string;
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
  summary, stockStats, purchases, dividends, history, lastUpdated, searchQuery = '', setViewingStockDetails,
}: OverviewTabProps) {
  const [summaryRange, setSummaryRange] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('all');

  // ─── Hedef & Kilometre Taşları (Milestones) ───
  const [targetPortfolioVal, setTargetPortfolioVal] = useState(() => {
    return Number(localStorage.getItem('target_portfolio_val')) || 500000;
  });
  const [targetAnnualDiv, setTargetAnnualDiv] = useState(() => {
    return Number(localStorage.getItem('target_annual_div')) || 25000;
  });

  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [editPortfolioVal, setEditPortfolioVal] = useState(targetPortfolioVal);
  const [editAnnualDiv, setEditAnnualDiv] = useState(targetAnnualDiv);

  const handleSaveGoals = () => {
    localStorage.setItem('target_portfolio_val', editPortfolioVal.toString());
    localStorage.setItem('target_annual_div', editAnnualDiv.toString());
    setTargetPortfolioVal(editPortfolioVal);
    setTargetAnnualDiv(editAnnualDiv);
    setIsEditingGoals(false);
  };

  const now              = new Date();
  const twelveMonthsAgo  = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const trailingDivs     = dividends.filter(d => new Date(d.date) >= twelveMonthsAgo);
  const trailingAnnualDiv = trailingDivs.reduce((a, d) => a + d.net, 0);

  const dayStocks = stockStats.filter(s => s.dailyChangePct != null && s.qty > 0);
  const topGainer = dayStocks.length > 0
    ? dayStocks.reduce((max, s) => s.dailyChangePct > max.dailyChangePct ? s : max, dayStocks[0])
    : null;
  const topLoser = dayStocks.length > 0
    ? dayStocks.reduce((min, s) => s.dailyChangePct < min.dailyChangePct ? s : min, dayStocks[0])
    : null;

  const milestones = [
    { id: '1', label: 'Bebek Adımları', desc: '₺10,000 Portföy', achieved: summary.totalValue >= 10000, icon: '🌱' },
    { id: '2', label: 'Çekirdek Portföy', desc: '₺100,000 Portföy', achieved: summary.totalValue >= 100000, icon: '🍀' },
    { id: '3', label: 'Yarı Yol', desc: '₺250,000 Portföy', achieved: summary.totalValue >= 250000, icon: '🧗' },
    { id: '4', label: 'Temettü Çırağı', desc: '₺5,000 Yıllık Temettü', achieved: trailingAnnualDiv >= 5000, icon: '🥉' },
    { id: '5', label: 'Temettü Kalfası', desc: '₺15,000 Yıllık Temettü', achieved: trailingAnnualDiv >= 15000, icon: '🥈' },
    { id: '6', label: 'Pasif Maaş', desc: '₺50,000 Yıllık Temettü', achieved: trailingAnnualDiv >= 50000, icon: '🏆' },
  ];

  const portfolioProgress = targetPortfolioVal > 0 ? (summary.totalValue / targetPortfolioVal) * 100 : 0;
  const dividendProgress = targetAnnualDiv > 0 ? (trailingAnnualDiv / targetAnnualDiv) * 100 : 0;

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

  // Arama filtresi
  const filteredStockStats = searchQuery.trim()
    ? stockStats.filter(s =>
        s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.sector.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : stockStats;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">

      {/* ─── Ana Değer Göstergesi ─── */}
      <div
        className="flex flex-col items-center py-8 px-6 text-center cursor-pointer select-none group active:scale-[0.99] transition-transform premium-card max-w-lg mx-auto"
        onClick={cycleRange}
      >
        <div className="text-slate-400 text-sm mb-3 font-medium group-hover:text-cyan-400 transition-colors flex items-center gap-2">
          {cur.label}
          <RefreshCcw size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-[44px] md:text-[52px] font-extrabold text-white mb-3 tracking-tight tabular-nums bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
          <AnimatedNumber value={summary.totalValue} formatter={formatCurrency} />
        </div>
        <div className={cn('text-sm font-semibold flex items-center gap-1.5 px-4 py-1.5 rounded-full border',
          cur.pnl >= 0 
            ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' 
            : 'text-red-400 bg-red-500/5 border-red-500/10'
        )}>
          {cur.pnl >= 0 ? '▲' : '▼'}
          {cur.pnl >= 0 ? '+' : ''}{formatCurrency(cur.pnl)} ({formatPercentage(Math.abs(cur.pct))})
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-1.5 mt-4 text-[10px] text-slate-500 font-medium">
            <Clock size={11} />
            Son güncelleme: {lastUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {/* Günlük en çok yükselen / düşen hisseler */}
        {dayStocks.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-slate-900 w-full justify-center text-[10px] font-bold">
            {topGainer && topGainer.dailyChangePct > 0 && (
              <div className="flex items-center gap-1.5 bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1 rounded-xl text-emerald-400">
                <span>🚀 En Çok Yükselen:</span>
                <span className="font-black">{topGainer.ticker}</span>
                <span className="tabular-nums">+{topGainer.dailyChangePct.toFixed(2)}%</span>
              </div>
            )}
            {topLoser && topLoser.dailyChangePct < 0 && (
              <div className="flex items-center gap-1.5 bg-red-500/5 border border-red-500/10 px-2.5 py-1 rounded-xl text-red-400">
                <span>📉 En Çok Düşen:</span>
                <span className="font-black">{topLoser.ticker}</span>
                <span className="tabular-nums">{topLoser.dailyChangePct.toFixed(2)}%</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Özet Metrikler ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { icon: '💰', label: 'Ödenen Temettü', val: summary.totalDiv, sub: formatPercentage(summary.totalInvested > 0 ? (summary.totalDiv / summary.totalInvested) * 100 : 0) + ' verimi', color: 'text-emerald-400' },
          { icon: '📅', label: 'Yıllık Temettü (TTM)', val: trailingAnnualDiv, sub: formatPercentage(estimatedYield) + ' tahmini', color: 'text-amber-400' },
          { icon: '📊', label: 'Portföy K/Z', val: summary.pnl, sub: formatPercentage(summary.pnlPct), color: summary.pnl >= 0 ? 'text-emerald-400' : 'text-red-400' },
          { icon: '⚡', label: 'Günlük K/Z', val: daily ? daily.val : 0, sub: daily ? formatPercentage(daily.pct) : '—', color: !daily || daily.val >= 0 ? 'text-cyan-400' : 'text-red-400' },
          { icon: '🔄', label: 'DRIP Geri Alımlar', val: summary.totalDrip || 0, sub: 'Temettüyle alınan', color: 'text-violet-400' },
          { icon: '💸', label: 'Satış K/Z (Gerçek)', val: summary.realizedPnl || 0, sub: (summary.realizedPnl || 0) >= 0 ? 'Gerçekleşen kâr' : 'Gerçekleşen zarar', color: (summary.realizedPnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400' },
        ].map(m => (
          <div key={m.label} className="premium-card card-hover-effect p-6 flex flex-col justify-between min-h-[130px]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-2xl">{m.icon}</span>
              <span className={`text-xs md:text-sm font-bold ${m.color} bg-slate-800/40 px-2.5 py-1 rounded-lg border border-slate-700/20`}>{m.sub}</span>
            </div>
            <div>
              <div className="text-lg md:text-xl font-extrabold text-white mb-1 tabular-nums">
                <AnimatedNumber value={m.val} formatter={formatCurrency} />
              </div>
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{m.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Hedefler & Kilometre Taşları (Milestones) ─── */}
      <div className="premium-card p-6 shadow-md border border-slate-800/40">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Hedeflerim & Kilometre Taşları</h3>
            <span className="text-[9px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-cyan-500/15">Hedef</span>
          </div>
          {!isEditingGoals ? (
            <button
              onClick={() => setIsEditingGoals(true)}
              className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider cursor-pointer"
            >
              Hedefleri Düzenle
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSaveGoals}
                className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-wider cursor-pointer"
              >
                Kaydet
              </button>
              <span className="text-slate-700 text-xs select-none">|</span>
              <button
                onClick={() => {
                  setEditPortfolioVal(targetPortfolioVal);
                  setEditAnnualDiv(targetAnnualDiv);
                  setIsEditingGoals(false);
                }}
                className="text-[10px] font-bold text-slate-550 hover:text-slate-400 transition-colors uppercase tracking-wider cursor-pointer"
              >
                Vazgeç
              </button>
            </div>
          )}
        </div>

        {isEditingGoals ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">Hedef Portföy Değeri (₺)</label>
              <input
                type="number"
                value={editPortfolioVal}
                onChange={e => setEditPortfolioVal(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">Hedef Yıllık Temettü Geliri (₺)</label>
              <input
                type="number"
                value={editAnnualDiv}
                onChange={e => setEditAnnualDiv(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Portföy Değeri Hedefi */}
            <div className="flex items-center gap-5 bg-slate-950/30 border border-slate-900/60 p-5 rounded-2xl">
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none"
                    stroke="#06b6d4"
                    strokeWidth="3"
                    strokeDasharray={`${Math.min(100, portfolioProgress)} 100`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-white tabular-nums">
                  %{Math.round(portfolioProgress)}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-slate-500 font-black uppercase tracking-wider mb-0.5">Portföy Büyüklüğü Hedefi</div>
                <div className="text-base font-black text-white leading-tight mb-1 tabular-nums">
                  {formatCurrency(summary.totalValue)} / <span className="text-slate-400">{formatCurrency(targetPortfolioVal)}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-semibold leading-none">
                  Hedefin %{portfolioProgress.toFixed(1)} kısmına ulaşıldı.
                </div>
              </div>
            </div>

            {/* Yıllık Temettü Hedefi */}
            <div className="flex items-center gap-5 bg-slate-950/30 border border-slate-900/60 p-5 rounded-2xl">
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeDasharray={`${Math.min(100, dividendProgress)} 100`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-white tabular-nums">
                  %{Math.round(dividendProgress)}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-slate-500 font-black uppercase tracking-wider mb-0.5">Yıllık Temettü Geliri Hedefi</div>
                <div className="text-base font-black text-white leading-tight mb-1 tabular-nums">
                  {formatCurrency(trailingAnnualDiv)} / <span className="text-slate-400">{formatCurrency(targetAnnualDiv)}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-semibold leading-none">
                  Hedefin %{dividendProgress.toFixed(1)} kısmına ulaşıldı.
                </div>
              </div>
            </div>

            {/* Kilometre Taşı Rozetleri */}
            <div className="md:col-span-2 border-t border-slate-900/60 pt-5 mt-2">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block mb-3">Kazanılan Rozetler & Kilometre Taşları</span>
              <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-1">
                {milestones.map(m => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-xl border shrink-0 transition-all text-xs font-semibold select-none",
                      m.achieved
                        ? "bg-cyan-500/5 text-cyan-400 border-cyan-500/20 shadow-[0_0_8px_rgba(6,182,212,0.05)]"
                        : "bg-slate-950/20 text-slate-600 border-slate-900/65 opacity-60"
                    )}
                    title={m.desc}
                  >
                    <span className="text-sm">{m.icon}</span>
                    <div className="text-left leading-none">
                      <div className="text-[9px] font-black uppercase tracking-wide">{m.label}</div>
                      <div className="text-[8px] text-slate-550 mt-0.5">{m.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>


      {/* ─── Portföy Grafiği ─── */}
      {chartData.length > 1 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-card p-6 md:p-8 h-[340px] shadow-xl"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Portföy Büyüme Eğrisi</h3>
            {stockStats.length > 0 && (
              <button
                onClick={() => exportPortfolioCSV(stockStats)}
                className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 transition-all border border-slate-700/50 active:scale-95"
                title="CSV İndir"
              >
                <Download size={14} />
              </button>
            )}
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVal"  x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#64748b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" strokeOpacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} tickFormatter={v => '₺' + (v / 1000).toFixed(0) + 'k'} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', color: '#f8fafc', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', fontSize: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)' }}
                  formatter={(v: number) => [formatCurrency(v), '']}
                  cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="Net Maliyet"    stroke="#64748b" strokeWidth={1.5} fillOpacity={1} fill="url(#colorCost)" />
                <Area type="monotone" dataKey="Portföy Değeri" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVal)" activeDot={{ r: 6, fill: '#06b6d4' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      ) : history.length === 0 && (
        <div className="p-10 text-center premium-card border-dashed border-slate-700/50 py-16">
          <div className="text-3xl mb-3">📊</div>
          <div className="text-slate-400 text-sm font-semibold">Fiyatlar güncellendikçe büyüme grafiği burada görünecek</div>
        </div>
      )}

      {/* ─── Aylık Yatırım Geçmişi ─── */}
      {sortedMonths.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">Aylık Yatırım Geçmişi</h3>
          <div className="relative">
            <div className="flex overflow-x-auto hide-scrollbar gap-4 pb-3 snap-x">
              {sortedMonths.map(([month, data]) => {
                const net        = data.total - data.drip;
                const isCurrentM = month === new Date().toISOString().substring(0, 7);
                const monthName  = new Date(month + '-01').toLocaleString('tr-TR', { month: 'long', year: 'numeric' });
                return (
                  <div key={month} className={cn(
                    'min-w-[280px] snap-start premium-card p-6 shrink-0 relative overflow-hidden transition-all duration-300',
                    isCurrentM ? 'border-cyan-500/40 ring-1 ring-cyan-500/10' : ''
                  )}>
                    {isCurrentM && <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 blur-3xl rounded-full" />}
                    <div className={cn('text-sm font-bold mb-3 flex items-center gap-2', isCurrentM ? 'text-cyan-400' : 'text-slate-400')}>
                      <Calendar size={14} /> {monthName}
                    </div>
                    <div className="text-2xl font-extrabold text-white mb-4 tabular-nums">{formatCurrency(data.total)}</div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/40">
                        <div className="text-slate-500 mb-1 flex items-center gap-1 font-semibold uppercase tracking-wider text-[9px]"><TrendingUp size={12} /> Net</div>
                        <div className={cn('font-bold tabular-nums', isCurrentM ? 'text-cyan-400' : 'text-slate-300')}>{formatCurrency(net)}</div>
                      </div>
                      <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/40">
                        <div className="text-slate-500 mb-1 flex items-center gap-1 font-semibold uppercase tracking-wider text-[9px]"><RefreshCcw size={12} /> DRIP</div>
                        <div className="text-slate-300 font-bold tabular-nums">{formatCurrency(data.drip)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Sağa kaydırma gradient ipucu */}
            {sortedMonths.length > 1 && (
              <div className="absolute right-0 top-0 bottom-3 w-12 bg-gradient-to-l from-slate-950/80 to-transparent pointer-events-none rounded-r-3xl" />
            )}
          </div>
        </div>
      )}

      {/* ─── Hisse Özetleri ─── */}
      {filteredStockStats.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">
            Hisse Özetleri
            {searchQuery.trim() && (
              <span className="text-slate-500 font-normal ml-2 normal-case">{filteredStockStats.length} sonuç</span>
            )}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredStockStats.map(s => (
              <motion.div
                key={s.id}
                whileHover={{ y: -4 }}
                onClick={() => setViewingStockDetails(s.id)}
                className="premium-card card-hover-effect p-5 transition-all group flex flex-col justify-between cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-9 h-9 rounded-xl bg-slate-800/50 flex items-center justify-center font-bold text-xs text-slate-300 group-hover:bg-cyan-500/10 group-hover:text-cyan-400 transition-colors border border-slate-700/30">
                    {s.ticker.substring(0, 2)}
                  </div>
                  <span className={cn(
                    'text-[10px] font-extrabold px-2 py-0.5 rounded-md border',
                    s.profitLoss >= 0
                      ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10'
                      : 'bg-red-500/5 text-red-400 border-red-500/10'
                  )}>
                    {s.profitLoss >= 0 ? '+' : ''}{formatPercentage(s.profitLossPct)}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{s.ticker}</div>
                  <div className="text-[10px] text-slate-500 font-semibold truncate mb-2">{s.name}</div>
                  <div className="text-base font-extrabold text-white tabular-nums">{formatCurrency(s.currentValue)}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {stockStats.length > 0 && filteredStockStats.length === 0 && (
        <div className="p-10 text-center premium-card">
          <div className="text-2xl mb-2">🔍</div>
          <div className="text-slate-400 text-sm">Aramanıza uygun hisse bulunamadı.</div>
        </div>
      )}

      {stockStats.length === 0 && (
        <div className="p-16 text-center premium-card py-20">
          <div className="text-4xl mb-4">🚀</div>
          <div className="text-slate-300 font-bold mb-2">Portföyünüz henüz boş</div>
          <div className="text-slate-500 text-sm">Hisseler sekmesinden ilk hissenizi ekleyin</div>
        </div>
      )}
    </motion.div>
  );
}
