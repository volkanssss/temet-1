import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PieChart as RePieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, XAxis, YAxis, LineChart, Line, Treemap as ReTreemap,
} from 'recharts';
import { formatCurrency, formatPercentage } from '../../lib/utils';
import { StockStat, Dividend, Purchase, Sale } from '../../types/stock';
import { TrendingUp, TrendingDown, RefreshCcw, HelpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

const COLORS = ['#06b6d4','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#f97316','#14b8a6','#a855f7','#ef4444'];

type AnalyticsTabProps = {
  stockStats: StockStat[];
  dividends: Dividend[];
  purchases: Purchase[];
  sales: Sale[];
  summary: any;
};

const AnalyticsCustomTooltip = ({ active, payload, type }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    const value = payload[0].value || 0;
    const isDividend = type === 'dividend';

    return (
      <div className="bg-slate-950/95 backdrop-blur-md border border-slate-800/80 p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] min-w-[170px] text-xs">
        <p className="text-slate-400 font-extrabold mb-2 text-[10px] uppercase tracking-wider">
          {item.tooltipLabel || item.name}
        </p>
        <div className="flex justify-between items-center gap-4">
          <span className="flex items-center gap-1.5 text-slate-400 font-medium">
            <span className={cn(
              "w-2 h-2 rounded-full",
              isDividend ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" : "bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.4)]"
            )} />
            {isDividend ? 'Net Temettü' : 'Yatırım Miktarı'}
          </span>
          <span className="font-extrabold text-slate-100 tabular-nums">{formatCurrency(value)}</span>
        </div>
      </div>
    );
  }
  return null;
};

const TreemapCustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (!data) return null;
    return (
      <div className="bg-slate-950/95 backdrop-blur-md border border-slate-800/80 p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] min-w-[185px] text-xs">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-extrabold text-slate-100 text-sm">{data.name}</span>
          <span className="text-[10px] text-slate-400 font-semibold bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded-md">
            {data.sector}
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center gap-4">
            <span className="text-slate-400 font-medium">Değer</span>
            <span className="font-extrabold text-slate-200 tabular-nums">{formatCurrency(data.size)}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-slate-400 font-medium">Portföy Oranı</span>
            <span className="font-extrabold text-cyan-400 tabular-nums">%{data.weight.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function AnalyticsTab({ stockStats, dividends, purchases, sales, summary }: AnalyticsTabProps) {
  // Grafik tipi seçimi (Donut / Treemap)
  const [chartType, setChartType] = useState<'donut' | 'treemap'>('donut');
  
  // Tıklanan hisse bilgisi (Donut merkezinde detay göstermek için)
  const [activeStockIndex, setActiveStockIndex] = useState<number | null>(null);

  // Aylık Finansal Seyir Grafiği sekme seçimi ('dividend' | 'investment')
  const [financialChartTab, setFinancialChartTab] = useState<'dividend' | 'investment'>('dividend');

  // ─── Emeklilik Hesaplama State'leri ──────────────────────────────────────
  const [monthlySavings, setMonthlySavings] = useState(5000);   // Aylık ek tasarruf
  const [targetIncome, setTargetIncome]     = useState(25000);  // Hedef aylık temettü
  const [expectedYield, setExpectedYield]   = useState(8);      // Yıllık temettü verimi %
  const [annualGrowth, setAnnualGrowth]     = useState(15);     // Yıllık portföy büyüme oranı %

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
  ).sort().slice(-12).map(([dateStr, net]) => {
    const [year, month] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    const label = date.toLocaleString('tr-TR', { month: 'short' }) + " '" + year.slice(2);
    const tooltipLabel = date.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });
    return { name: label, tooltipLabel, net };
  });

  // Aylık yatırım
  const monthlyInvest = Object.entries(
    purchases.reduce((acc, p) => {
      const m = p.date.slice(0, 7);
      acc[m] = (acc[m] || 0) + p.qty * p.price;
      return acc;
    }, {} as Record<string, number>)
  ).sort().slice(-12).map(([dateStr, val]) => {
    const [year, month] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    const label = date.toLocaleString('tr-TR', { month: 'short' }) + " '" + year.slice(2);
    const tooltipLabel = date.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });
    return { name: label, tooltipLabel, val };
  });

  // Hisse sıralamaları
  const topPerformers = [...stockStats].sort((a, b) => b.profitLossPct - a.profitLossPct);
  const topDivPayers  = [...stockStats].sort((a, b) => b.totalDiv - a.totalDiv).slice(0, 8);

  // Çeşitlendirme skoru (HHI)
  const totalVal = summary.totalValue;
  const hhi = totalVal > 0
    ? stockStats.reduce((acc, s) => acc + Math.pow((s.currentValue / totalVal) * 100, 2), 0)
    : 0;
  const divScore = Math.max(0, 100 - hhi / 100);

  // Gerçekleşen K/Z
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

  // ─── Treemap Veri Formatlama ──────────────────────────────────────────────
  const treemapData = useMemo(() => {
    return stockStats.map((s, i) => ({
      name: s.ticker,
      size: s.currentValue,
      color: COLORS[i % COLORS.length],
      formattedVal: formatCurrency(s.currentValue),
      sector: s.sector,
      weight: totalVal > 0 ? (s.currentValue / totalVal) * 100 : 0,
    }));
  }, [stockStats, totalVal]);

  // Donut üzerinde aktif gösterilen hisse
  const donutActiveStock = useMemo(() => {
    if (activeStockIndex !== null && stockStats[activeStockIndex]) {
      return stockStats[activeStockIndex];
    }
    return stockStats.length > 0 ? stockStats[0] : null;
  }, [activeStockIndex, stockStats]);

  // ─── Emeklilik Simülasyonu Hesaplaması ────────────────────────────────────
  const sim = useMemo(() => {
    const startVal = totalVal || 0;
    const targetVal = (targetIncome * 12) / (expectedYield / 100);
    
    let portfolio = startVal;
    let yearsToFreedom = -1;
    const points: { year: number; value: number }[] = [];
    points.push({ year: 0, value: portfolio });

    // Yıllık büyüme ve temettü birleşimi (aylık simüle edilir)
    const annualRate = (expectedYield / 100) + (annualGrowth / 100);
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;

    for (let y = 1; y <= 25; y++) {
      for (let m = 0; m < 12; m++) {
        portfolio = portfolio * (1 + monthlyRate) + monthlySavings;
      }
      points.push({ year: y, value: portfolio });
      if (portfolio >= targetVal && yearsToFreedom === -1) {
        yearsToFreedom = y;
      }
    }

    return { targetVal, yearsToFreedom, points };
  }, [totalVal, monthlySavings, targetIncome, expectedYield, annualGrowth]);

  // ─── Treemap Özel Çizim Bileşeni ──────────────────────────────────────────
  const CustomizedTreemapContent = (props: any) => {
    const { x, y, width, height, index, name, size, depth } = props;
    if (depth !== 1) return null;
    if (width < 32 || height < 24) return null;
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: COLORS[index % COLORS.length],
            stroke: '#0f172a',
            strokeWidth: 1.5,
            strokeOpacity: 0.95,
          }}
          rx={6}
        />
        <text
          x={x + width / 2}
          y={y + height / 2 - (height > 40 ? 5 : 0)}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#ffffff"
          stroke="none"
          className="font-extrabold text-[10px] md:text-[11px] select-none"
        >
          {name}
        </text>
        {height > 40 && (
          <text
            x={x + width / 2}
            y={y + height / 2 + 8}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(255, 255, 255, 0.7)"
            stroke="none"
            className="font-bold text-[8px] md:text-[9px] select-none"
          >
            {formatCurrency(size)}
          </text>
        )}
      </g>
    );
  };

  // Sağlık ve Risk Raporu Hesaplamaları
  const maxSectorWeight = sectorsData.length > 0 ? ((sectorsData[0][1] as number) / (totalVal || 1)) * 100 : 0;
  const maxStockWeight = stockStats.length > 0 ? (Math.max(...stockStats.map(s => s.currentValue)) / (totalVal || 1)) * 100 : 0;
  const maxStockTicker = stockStats.length > 0 
    ? stockStats.reduce((max, s) => s.currentValue > max.currentValue ? s : max, stockStats[0]).ticker
    : '';

  const sectorRisk = maxSectorWeight > 35;
  const stockRisk = maxStockWeight > 20;
  const diversityRisk = stockStats.length < 4;

  const getRiskAdvice = () => {
    if (stockStats.length === 0) return 'Portföyünüzde henüz hisse bulunmuyor.';
    const advices = [];
    if (sectorRisk) advices.push(`En yoğun sektörünüz olan "${sectorsData[0][0]}" portföyün %${maxSectorWeight.toFixed(0)}'ini kaplıyor.`);
    if (stockRisk) advices.push(`${maxStockTicker} hissesi tek başına portföyün %${maxStockWeight.toFixed(0)}'ini oluşturuyor.`);
    if (diversityRisk) advices.push(`Hisse sayınız (${stockStats.length}) düşük olduğu için risk dağılımı zayıf.`);
    
    if (advices.length === 0) return 'Tebrikler! Portföyünüzün dağılımı, çeşitliliği ve risk seviyesi ideal dengede duruyor.';
    return `Öneri: ${advices.join(' Ayrıca, ')} Dağılımı dengelemek için portföyünüzü çeşitlendirebilirsiniz.`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">

      {/* ─── Üst Kısım: Çeşitlendirme, Risk Raporu ve Sektör Dağılımı ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Çeşitlendirme Skoru */}
        <div className="premium-card p-5 shadow-md border border-slate-800/40 text-center flex flex-col justify-between min-h-[230px]">
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

        {/* Portföy Sağlık Raporu & Risk Analizi */}
        <div className="premium-card p-5 shadow-md border border-slate-800/40 flex flex-col justify-between min-h-[230px]">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-3">Risk & Sağlık Raporu</div>
          
          <div className="space-y-2.5 my-auto">
            {/* Sektör Riski */}
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-slate-400">Sektör Dağılımı:</span>
              <span className={cn(
                "px-2 py-0.5 rounded-lg border",
                sectorRisk 
                  ? "bg-red-500/10 text-red-400 border-red-500/25" 
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
              )}>
                {sectorRisk ? `Yoğun (%${maxSectorWeight.toFixed(0)})` : "Dengeli"}
              </span>
            </div>

            {/* Hisse Riski */}
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-slate-400">Hisse Yoğunluğu:</span>
              <span className={cn(
                "px-2 py-0.5 rounded-lg border",
                stockRisk 
                  ? "bg-red-500/10 text-red-400 border-red-500/25" 
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
              )}>
                {stockRisk ? `${maxStockTicker} (%${maxStockWeight.toFixed(0)})` : "Dengeli"}
              </span>
            </div>

            {/* Çeşitlilik Riski */}
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-slate-400">Kaynak Çeşitliliği:</span>
              <span className={cn(
                "px-2 py-0.5 rounded-lg border",
                diversityRisk 
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/25" 
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
              )}>
                {diversityRisk ? `${stockStats.length} Hisse (Düşük)` : "Yeterli"}
              </span>
            </div>
          </div>

          <div className="text-[10px] leading-relaxed text-slate-400 border-t border-slate-900 pt-2 font-medium">
            {getRiskAdvice()}
          </div>
        </div>

        {/* Sektörel Dağılım */}
        <div className="premium-card p-5 shadow-md border border-slate-800/40 flex flex-col justify-between min-h-[230px]">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-3">Sektörel Dağılım (İlk 4)</div>
          <div className="space-y-3">
            {sectorsData.slice(0, 4).map(([sector, value], i) => (
              <div key={sector}>
                <div className="flex justify-between text-[10px] font-bold text-slate-300 mb-1">
                  <span className="flex items-center gap-1.5 truncate max-w-[130px]">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    {sector}
                  </span>
                  <span className="text-slate-400 tabular-nums">{formatPercentage(totalVal > 0 ? ((value as number) / totalVal) * 100 : 0)}</span>
                </div>
                <div className="h-1.5 bg-slate-950/40 border border-slate-800/40 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${totalVal > 0 ? ((value as number) / totalVal) * 100 : 0}%`,
                      background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]} 0%, ${COLORS[i % COLORS.length]}88 100%)`,
                      boxShadow: `0 0 6px ${COLORS[i % COLORS.length]}33`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Orta Kısım: Dağılım Grafiği (Donut / Treemap Geçişli) ─── */}
      <div className="premium-card p-6 shadow-md border border-slate-800/40">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Portföy Dağılımı</h3>
          <div className="flex bg-slate-950/80 border border-slate-800 p-0.5 rounded-xl text-[10px] font-bold">
            <button
              onClick={() => setChartType('donut')}
              className={cn('px-3.5 py-1.5 rounded-lg transition-colors', chartType === 'donut' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-500')}
            >
              Donut (Mobil/İnteraktif)
            </button>
            <button
              onClick={() => setChartType('treemap')}
              className={cn('px-3.5 py-1.5 rounded-lg transition-colors', chartType === 'treemap' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-500')}
            >
              Treemap (Masaüstü)
            </button>
          </div>
        </div>

        <div className="h-[280px] relative">
          {chartType === 'donut' ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={stockStats}
                    cx="50%"
                    cy="45%"
                    innerRadius={72}
                    outerRadius={98}
                    paddingAngle={2.5}
                    dataKey="currentValue"
                    nameKey="ticker"
                    stroke="none"
                    onMouseEnter={(_, idx) => setActiveStockIndex(idx)}
                    onClick={(_, idx) => setActiveStockIndex(idx)}
                  >
                    {stockStats.map((_, i) => (
                      <Cell 
                        key={i} 
                        fill={COLORS[i % COLORS.length]} 
                        style={{ outline: 'none', cursor: 'pointer' }}
                      />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    content={({ payload }) => (
                      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-3">
                        {payload?.slice(0, 8).map((e: any, i: number) => (
                          <div 
                            key={i} 
                            className="flex items-center gap-1.5 cursor-pointer"
                            onMouseEnter={() => setActiveStockIndex(i)}
                          >
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
                            <span className="text-[10px] font-bold text-slate-300">{e.value}</span>
                            <span className="text-[10px] text-slate-500 font-semibold tabular-nums">
                              {formatPercentage(totalVal > 0 ? (e.payload.currentValue / totalVal) * 100 : 0)}
                            </span>
                          </div>
                        ))}
                        {(payload?.length ?? 0) > 8 && (
                          <span className="text-[9px] text-slate-500 font-bold">+{(payload?.length ?? 0) - 8} hisse</span>
                        )}
                      </div>
                    )}
                  />
                </RePieChart>
              </ResponsiveContainer>
              {/* Donut Merkezindeki Dinamik Değerler */}
              <div 
                className="absolute left-1/2 flex flex-col items-center justify-center pointer-events-none text-center" 
                style={{ top: '45%', transform: 'translate(-50%, -50%)' }}
              >
                {donutActiveStock ? (
                  <>
                    <div className="text-[10px] font-black text-cyan-400 tracking-widest leading-none mb-1">{donutActiveStock.ticker}</div>
                    <div className="text-base font-black text-white tabular-nums leading-none mb-1">{formatCurrency(donutActiveStock.currentValue)}</div>
                    <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Ağırlık: {formatPercentage(totalVal > 0 ? (donutActiveStock.currentValue / totalVal) * 100 : 0)}</div>
                  </>
                ) : (
                  <>
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Toplam</div>
                    <div className="text-lg font-black text-white tabular-nums">{formatCurrency(totalVal)}</div>
                  </>
                )}
              </div>
            </>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ReTreemap
                data={treemapData}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="#0f172a"
                content={<CustomizedTreemapContent />}
              >
                <Tooltip content={<TreemapCustomTooltip />} />
              </ReTreemap>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ─── Günlük Isı Haritası & K/Z Sıralaması ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Isı Haritası (Daily Performance Heatmap) */}
        <div className="premium-card p-6 shadow-md border border-slate-800/40">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-5">Günlük Değişim Isı Haritası</h3>
          <div className="flex flex-wrap gap-2.5 max-h-[240px] overflow-y-auto hide-scrollbar">
            {stockStats.map(s => {
              const isUp = s.dailyChangePct >= 0;
              let bgClass = 'bg-slate-900 border-slate-800 text-slate-400';
              
              if (s.dailyChangePct > 0) {
                if (s.dailyChangePct > 3) bgClass = 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/10';
                else if (s.dailyChangePct > 1.5) bgClass = 'bg-emerald-500/80 border-emerald-500/30 text-emerald-50';
                else bgClass = 'bg-emerald-500/15 border-emerald-500/10 text-emerald-400';
              } else if (s.dailyChangePct < 0) {
                const absVal = Math.abs(s.dailyChangePct);
                if (absVal > 3) bgClass = 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/10';
                else if (absVal > 1.5) bgClass = 'bg-red-500/80 border-red-500/30 text-red-50';
                else bgClass = 'bg-red-500/15 border-red-500/10 text-red-400';
              }
              
              return (
                <div 
                  key={s.id} 
                  className={cn(
                    'flex flex-col items-center justify-center p-3 rounded-2xl border text-center aspect-square min-w-[72px] flex-1 transition-all hover:scale-105 active:scale-95', 
                    bgClass
                  )}
                  title={`${s.ticker} Günlük Değişim`}
                >
                  <span className="font-black text-xs tracking-wider">{s.ticker}</span>
                  <span className="text-[10px] font-extrabold tabular-nums mt-0.5">{isUp ? '+' : ''}{s.dailyChangePct.toFixed(2)}%</span>
                </div>
              );
            })}
            {stockStats.length === 0 && (
              <div className="w-full text-center py-12 text-slate-600 text-xs italic">Isı haritası için hisseniz bulunmuyor.</div>
            )}
          </div>
        </div>

        {/* Hisse K/Z Sıralaması */}
        <div className="premium-card p-6 shadow-md border border-slate-800/40">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">K/Z Sıralaması</h3>
          <div className="space-y-3.5 max-h-[240px] overflow-y-auto hide-scrollbar">
            {topPerformers.map((s, i) => {
              const maxPct = Math.max(...topPerformers.map(x => Math.abs(x.profitLossPct)), 1);
              return (
                <div key={s.id} className="flex items-center gap-3.5">
                  <div className="w-6 text-center text-xs text-slate-500 font-black">{i + 1}</div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-extrabold text-slate-200">{s.ticker}</span>
                      <span className={s.profitLoss >= 0 ? 'text-emerald-400 font-black' : 'text-red-400 font-black'}>
                        {s.profitLoss >= 0 ? '+' : ''}{formatPercentage(s.profitLossPct)}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-950/40 border border-slate-800/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.profitLoss >= 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-red-500 to-pink-500'}`}
                        style={{ width: `${(Math.abs(s.profitLossPct) / maxPct) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Temettü Emekliliği & Finansal Özgürlük Hesaplayıcısı ─── */}
      <div className="premium-card p-6 md:p-8 shadow-lg border border-slate-800/40">
        <div className="flex items-center gap-2 mb-6">
          <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider">Temettü Emekliliği Hesaplayıcısı</h3>
          <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-cyan-500/15">Simülatör</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sliders (Sol Taraf) */}
          <div className="space-y-5 lg:col-span-1">
            {/* Hazır Stratejiler */}
            <div className="space-y-2 mb-2">
              <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider block">Yatırım Stratejisi Presets</span>
              <div className="flex gap-1.5 bg-slate-950/80 border border-slate-900/60 p-1 rounded-xl text-[9px] font-bold">
                {[
                  { label: 'Defansif', yield: 8, growth: 10 },
                  { label: 'Dengeli', yield: 6, growth: 18 },
                  { label: 'Büyüme', yield: 3.5, growth: 28 },
                ].map(p => {
                  const isActive = expectedYield === p.yield && annualGrowth === p.growth;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setExpectedYield(p.yield);
                        setAnnualGrowth(p.growth);
                      }}
                      className={cn(
                        "flex-1 py-1 rounded-lg border transition-all active:scale-[0.97] cursor-pointer",
                        isActive
                          ? "bg-cyan-500 text-slate-950 border-cyan-500 shadow-md shadow-cyan-500/10"
                          : "bg-transparent text-slate-400 border-transparent hover:text-slate-200"
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Aylık Tasarruf */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">Aylık Ek Yatırım</span>
                <span className="text-cyan-400 tabular-nums">{formatCurrency(monthlySavings)}</span>
              </div>
              <input
                type="range"
                min="500"
                max="50000"
                step="500"
                value={monthlySavings}
                onChange={e => setMonthlySavings(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Hedef Aylık Gelir */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">Hedef Aylık Gelir</span>
                <span className="text-cyan-400 tabular-nums">{formatCurrency(targetIncome)}</span>
              </div>
              <input
                type="range"
                min="5000"
                max="250000"
                step="5000"
                value={targetIncome}
                onChange={e => setTargetIncome(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Temettü Verimi */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">Yıllık Temettü Verimi</span>
                <span className="text-cyan-400 tabular-nums">%{expectedYield}</span>
              </div>
              <input
                type="range"
                min="2"
                max="20"
                step="0.5"
                value={expectedYield}
                onChange={e => setExpectedYield(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Portföy Büyümesi */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">Beklenen Yıllık Büyüme (Hisse/Kâr)</span>
                <span className="text-cyan-400 tabular-nums">%{annualGrowth}</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                step="1"
                value={annualGrowth}
                onChange={e => setAnnualGrowth(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>

          {/* Sonuç Panel (Orta / Sağ Taraf) */}
          <div className="lg:col-span-2 flex flex-col justify-between space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center">
                <div className="text-[9px] text-slate-500 uppercase font-black tracking-wider mb-1">Gereken Portföy Büyüklüğü</div>
                <div className="text-xl font-extrabold text-white tabular-nums">{formatCurrency(sim.targetVal)}</div>
                <div className="text-[9px] text-slate-400 font-semibold mt-1">Yıllık %{expectedYield} verim ile</div>
              </div>
              <div className="bg-cyan-500/5 border border-cyan-500/15 rounded-2xl p-4 text-center">
                <div className="text-[9px] text-cyan-500 uppercase font-black tracking-wider mb-1">Özgürlüğe Kalan Süre</div>
                <div className="text-xl font-extrabold text-cyan-400">
                  {sim.yearsToFreedom === -1 ? '25+ Yıl' : `${sim.yearsToFreedom} Yıl`}
                </div>
                <div className="text-[9px] text-slate-400 font-semibold mt-1">Compound (Bileşik) yatırım dahil</div>
              </div>
            </div>

            {/* SVG Grafik Eğrisi */}
            <div className="h-32 bg-slate-950/40 border border-slate-900 rounded-2xl p-4 relative overflow-hidden flex items-end">
              <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
                <defs>
                  <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Hedef Çizgisi */}
                {sim.targetVal > 0 && (
                  <line 
                    x1="0" 
                    y1={30 - Math.min(28, (sim.targetVal / Math.max(...sim.points.map(p => p.value), sim.targetVal)) * 28)}
                    x2="100" 
                    y2={30 - Math.min(28, (sim.targetVal / Math.max(...sim.points.map(p => p.value), sim.targetVal)) * 28)}
                    stroke="#ef4444" 
                    strokeWidth="0.5" 
                    strokeDasharray="1.5 1.5"
                  />
                )}
                {/* Büyüme Alanı Shading */}
                <path
                  d={`M 0 30 L ${sim.points.map((p, i) => `${(i / 25) * 100} ${30 - (p.value / Math.max(...sim.points.map(pt => pt.value), sim.targetVal)) * 28}`).join(' L ')} L 100 30 Z`}
                  fill="url(#simGrad)"
                />
                {/* Büyüme Eğrisi Hat */}
                <path
                  d={`M ${sim.points.map((p, i) => `${(i / 25) * 100} ${30 - (p.value / Math.max(...sim.points.map(pt => pt.value), sim.targetVal)) * 28}`).join(' L ')}`}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="1.2"
                />
                {/* Kesişim Noktası */}
                {sim.yearsToFreedom !== -1 && (
                  <circle 
                    cx={(sim.yearsToFreedom / 25) * 100} 
                    cy={30 - (sim.targetVal / Math.max(...sim.points.map(pt => pt.value), sim.targetVal)) * 28} 
                    r="1.5" 
                    fill="#10b981" 
                    className="animate-pulse"
                  />
                )}
              </svg>
              <div className="absolute top-2 left-4 text-[8px] font-bold text-slate-500 uppercase tracking-widest">Bileşik Getiri Grafiği (25 Yıllık Projeksiyon)</div>
              <div className="absolute top-2 right-4 text-[8px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" /> Hedef Limit
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Gerçekleşen K/Z (Satışlar) ─── */}
      {sales.length > 0 && (
        <div className="premium-card p-6 shadow-md border border-slate-800/40">
          <div className="flex justify-between items-center mb-6 border-b border-slate-800/30 pb-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Gerçekleşen K/Z (Satışlar)</h3>
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
                  <div className="flex-1 h-2.5 bg-slate-950/40 border border-slate-800/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.realizedPnl >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{
                        width: sortedSalesStats.length > 0
                          ? `${Math.min(100, (Math.abs(s.realizedPnl) / Math.max(...sortedSalesStats.map(x => Math.abs(x.realizedPnl)))) * 100)}%`
                          : '0%'
                      }}
                    />
                  </div>
                  <div className={`w-28 text-right text-xs font-black tabular-nums ${s.realizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
                    {s.note && <div className="text-[10px] text-slate-500 mt-1 italic">{s.note}</div>}
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

      {/* ─── Aylık Finansal Seyir (Sekmeli Birleşik Kart) ─── */}
      <div className="premium-card p-6 shadow-md border border-slate-800/40">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Aylık Finansal Seyir</h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Son 12 aydaki finansal hareketlerinizin özeti</p>
          </div>
          <div className="flex bg-slate-950/80 border border-slate-900 p-0.5 rounded-xl text-[10px] font-bold self-stretch sm:self-auto justify-center">
            <button
              onClick={() => setFinancialChartTab('dividend')}
              className={cn(
                'px-4 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer',
                financialChartTab === 'dividend' ? 'bg-emerald-500 text-slate-950 shadow shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-350'
              )}
            >
              Aylık Temettü
            </button>
            <button
              onClick={() => setFinancialChartTab('investment')}
              className={cn(
                'px-4 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer',
                financialChartTab === 'investment' ? 'bg-cyan-500 text-slate-950 shadow shadow-cyan-500/20' : 'text-slate-500 hover:text-slate-350'
              )}
            >
              Aylık Yatırım
            </button>
          </div>
        </div>

        <div className="h-[230px] w-full">
          <AnimatePresence mode="wait">
            {financialChartTab === 'dividend' ? (
              <motion.div
                key="dividend-chart"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="h-full w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyDivs} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" strokeOpacity={0.3} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} tickFormatter={v => '₺' + (v / 1000).toFixed(0) + 'k'} />
                    <Tooltip content={<AnalyticsCustomTooltip type="dividend" />} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />
                    <Bar dataKey="net" fill="#10b981" radius={[6, 6, 0, 0]} name="Net Temettü" />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            ) : (
              <motion.div
                key="investment-chart"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="h-full w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  {monthlyInvest.length > 0 ? (
                    <LineChart data={monthlyInvest} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" strokeOpacity={0.3} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} tickFormatter={v => '₺' + (v / 1000).toFixed(0) + 'k'} />
                      <Tooltip content={<AnalyticsCustomTooltip type="investment" />} />
                      <Line type="monotone" dataKey="val" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4, fill: '#06b6d4', stroke: '#0f172a', strokeWidth: 1 }} activeDot={{ r: 6, fill: '#06b6d4', stroke: '#fff', strokeWidth: 1.5 }} name="Yatırım" />
                    </LineChart>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                      Yatırım verisi bulunmuyor.
                    </div>
                  )}
                </ResponsiveContainer>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── En Çok Temettü Veren Hisseler ─── */}
      {topDivPayers.length > 0 && topDivPayers[0].totalDiv > 0 && (
        <div className="premium-card p-6 shadow-md border border-slate-800/40">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-5">Toplam Temettü — Hisse Bazlı</h3>
          <div className="space-y-3.5">
            {topDivPayers.filter(s => s.totalDiv > 0).map((s, i) => {
              const maxDiv = topDivPayers[0].totalDiv;
              return (
                <div key={s.id} className="flex items-center gap-4">
                  <div className="w-16 text-xs font-bold text-slate-200">{s.ticker}</div>
                  <div className="flex-1 h-2.5 bg-slate-950/40 border border-slate-800/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${(s.totalDiv / maxDiv) * 100}%` }}
                    />
                  </div>
                  <div className="w-24 text-right text-xs font-black text-emerald-400 tabular-nums">{formatCurrency(s.totalDiv)}</div>
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
