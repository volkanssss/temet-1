import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  RefreshCcw,
  Trash2,
  TrendingUp,
  PieChart,
  Target,
  DollarSign,
  LogOut,
  CheckCircle,
  AlertCircle,
  Briefcase,
  Edit2,
  ChevronDown,
  Eye,
  Download,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, logout } from '../lib/supabase';
import { dbService } from '../services/db';
import { fetchStockPricesBatch, fetchStockInfo } from '../services/price';
import { cn, formatCurrency, formatPercentage } from '../lib/utils';
import { StockHolding, Purchase, Dividend, Goal, PortfolioHistory } from '../types/stock';
import {
  BarChart,
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart as RePieChart,
  Pie,
  AreaChart,
  Area,
  Legend
} from 'recharts';

type Tab = 'dash' | 'pf' | 'div' | 'an' | 'goal';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('dash');
  const [stocks, setStocks] = useState<StockHolding[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [history, setHistory] = useState<PortfolioHistory[]>([]);
  
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [isAddingPurchase, setIsAddingPurchase] = useState(false);
  const [isAddingDividend, setIsAddingDividend] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [viewingPurchases, setViewingPurchases] = useState<string | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [newStockData, setNewStockData] = useState({ ticker: '', name: '', sector: 'Diğer', exchange: 'BIST' });
  const [infoLoading, setInfoLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [viewingStockDetails, setViewingStockDetails] = useState<string | null>(null);
  const [summaryRange, setSummaryRange] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('all');
  const [toast, setToast] = useState<{msg: string, ok: boolean} | null>(null);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Kullanıcı adı
  const [userName, setUserName] = useState('');
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserName(data.session?.user?.user_metadata?.full_name || data.session?.user?.email || '');
    });
  }, []);

  // Realtime Subscriptions
  useEffect(() => {
    const unsubStocks = dbService.subscribe('stocks', setStocks);
    const unsubPurchases = dbService.subscribe('purchases', setPurchases);
    const unsubDividends = dbService.subscribe('dividends', setDividends);
    const unsubGoals = dbService.subscribe('goals', setGoals);
    const unsubHistory = dbService.subscribe('portfolio_history', setHistory);

    return () => {
      unsubStocks();
      unsubPurchases();
      unsubDividends();
      unsubGoals();
      unsubHistory();
    };
  }, []);

  // Derived Data
  const stockStats = useMemo(() => {
    return stocks.map(s => {
      const stockPurchases = purchases.filter(p => p.stockId === s.id);
      const qty = stockPurchases.reduce((acc, p) => acc + p.qty, 0);
      const totalCost = stockPurchases.reduce((acc, p) => acc + p.qty * p.price, 0);
      const avgCost = qty > 0 ? totalCost / qty : 0;
      const currentPrice = s.lastPrice || avgCost;
      const currentValue = qty * currentPrice;
      const profitLoss = currentValue - totalCost;
      const profitLossPct = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;
      
      const stockDividends = dividends.filter(d => d.stockId === s.id);
      const totalDiv = stockDividends.reduce((acc, d) => acc + d.net, 0);

      return {
        ...s,
        qty,
        avgCost,
        totalCost,
        currentPrice,
        currentValue,
        profitLoss,
        profitLossPct,
        totalDiv
      };
    });
  }, [stocks, purchases, dividends]);

  const summary = useMemo(() => {
    const totalValue = stockStats.reduce((acc, s) => acc + s.currentValue, 0);
    const totalCost = stockStats.reduce((acc, s) => acc + s.totalCost, 0);
    const totalDiv = dividends.reduce((acc, d) => acc + d.net, 0);
    const pnl = totalValue - totalCost;
    const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalDiv,
      pnl,
      pnlPct
    };
  }, [stockStats, dividends]);

  const refreshPrices = async () => {
    if (!stocks.length) return;
    setLoading(true);
    try {
      // Toplu paralel çekme (Bug #1 fix)
      const priceMap = await fetchStockPricesBatch(
        stocks.map(s => ({ ticker: s.ticker, exchange: s.exchange }))
      );
      await Promise.all(
        stocks.map(s => {
          const price = priceMap[s.ticker];
          if (price != null) return dbService.update('stocks', s.id, { lastPrice: price });
        })
      );
      
      const newTotalValue = stocks.reduce((acc, s) => {
         const price = priceMap[s.ticker] ?? s.lastPrice ?? 0;
         const qty = purchases.filter(p => p.stockId === s.id).reduce((sum, p) => sum + p.qty, 0);
         return acc + (qty * price);
      }, 0);
      const today = new Date().toISOString().split('T')[0];
      await dbService.upsertHistory(today, newTotalValue, summary.totalCost);

      showToast(`${stocks.length} hisse güncellendi.`);
    } catch {
      showToast('Fiyat güncelleme başarısız.', false);
    } finally {
      setLoading(false);
    }
  };

  // Otomatik 15 dakikada bir güncelle (Borsa saatleri: Hafta içi 09:55 - 18:15 arası TR saati)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const day = now.getDay(); // 0: Pazar, 6: Cumartesi
      const hour = now.getHours();
      const min = now.getMinutes();
      
      // Hafta içi ve (saat 10-18 arası veya 09:55 sonrası)
      const isWeekday = day >= 1 && day <= 5;
      const isMarketOpen = isWeekday && ((hour > 9 || (hour === 9 && min >= 55)) && (hour < 18 || (hour === 18 && min <= 15)));
      
      if (isMarketOpen && stocks.length > 0) {
        refreshPrices();
      }
    }, 15 * 60 * 1000); // 15 dakika
    
    return () => clearInterval(interval);
  }, [stocks.length]);

  // Sayfa yüklendiğinde otomatik ilk veri çekimi
  useEffect(() => {
    if (stocks.length > 0 && !initialFetchDone) {
      refreshPrices();
      setInitialFetchDone(true);
    }
  }, [stocks.length, initialFetchDone]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-slate-700 selection:text-white">
      <div className="w-full">
        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "fixed top-4 right-4 z-[200] flex items-center gap-3 px-5 py-3 rounded-xl font-medium text-sm shadow-xl border",
                toast.ok
                  ? "bg-slate-800 text-slate-100 border-slate-700"
                  : "bg-red-900/50 text-red-200 border-red-800"
              )}
            >
              {toast.ok ? <CheckCircle size={16} className="text-emerald-400" /> : <AlertCircle size={16} className="text-red-400" />}
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header & Pill Navigation */}
        <header className="px-6 pt-12 pb-6 flex flex-col gap-6 sticky top-0 z-20 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-slate-800">
                <img src="/icon.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-widest leading-none mb-1">
                  Temettü Takip &bull; {userName}
                </div>
                <h1 className="text-xl font-bold text-white leading-none">
                  {activeTab === 'dash' && 'Genel Bakış'}
                  {activeTab === 'pf' && 'Hisseler'}
                  {activeTab === 'div' && 'Temettüler'}
                  {activeTab === 'an' && 'İşlemler'}
                  {activeTab === 'goal' && 'Hedefler'}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={refreshPrices}
                disabled={loading}
                className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
              >
                <RefreshCcw size={16} className={cn(loading && "animate-spin")} /> 
              </button>
              <button onClick={logout} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-red-500/20 transition-all">
                <LogOut size={16} />
              </button>
            </div>
          </div>

          {/* Pill Navigation */}
          <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
            {[
              { id: 'dash', label: 'Genel Bakış' },
              { id: 'pf', label: 'Hisseler' },
              { id: 'div', label: 'Temettüler' },
              { id: 'an', label: 'İşlemler' },
              { id: 'goal', label: 'Hedefler' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={cn(
                  "px-5 py-2 rounded-full whitespace-nowrap font-medium text-sm transition-all",
                  activeTab === tab.id 
                    ? "bg-cyan-500 text-slate-950" 
                    : "bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
          {activeTab === 'dash' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              {/* Geçmiş K/Z Analizi & Grafikler */}
              {(() => {
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

                return (
                  <>
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
                           <div className="text-emerald-400 text-sm font-medium">%{formatPercentage(summary.totalCost > 0 ? (summary.totalDiv / summary.totalCost)*100 : 0)}</div>
                         </div>
                         <div className="text-xl font-bold text-white mb-1">{formatCurrency(summary.totalDiv)}</div>
                         <div className="text-xs text-slate-500 font-medium">Ödenen Temettü</div>
                      </div>
                      <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800/80">
                         <div className="flex justify-between items-start mb-3">
                           <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700"><Clock size={14} className="text-slate-300"/></div>
                           <div className="text-amber-400 text-sm font-medium">%0,0</div>
                         </div>
                         <div className="text-xl font-bold text-white mb-1">₺0,00</div>
                         <div className="text-xs text-slate-500 font-medium">Beklenen Temettü</div>
                      </div>
                      <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800/80">
                         <div className="flex justify-between items-start mb-3">
                           <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1"></div>
                           <div className="text-emerald-400 text-sm font-medium">%{formatPercentage(summary.pnlPct)}</div>
                         </div>
                         <div className="text-xl font-bold text-white mb-1">{formatCurrency(summary.pnl)}</div>
                         <div className="text-xs text-slate-500 font-medium">Gerçekleşen K/Z</div>
                      </div>
                      <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800/80">
                         <div className="flex justify-between items-start mb-3">
                           <div className="w-2 h-2 rounded-full bg-cyan-500 mt-1"></div>
                           <div className="text-cyan-400 text-sm font-medium">%{daily ? formatPercentage(daily.pct) : '0,0'}</div>
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
                  </>
                );
              })()}

              {/* Aylık Yatırım Geçmişi */}
              {(() => {
                if (purchases.length === 0) return null;
                const grouped = purchases.reduce((acc, p) => {
                  const month = p.date.substring(0, 7);
                  if (!acc[month]) acc[month] = { total: 0, drip: 0 };
                  const value = p.qty * p.price;
                  acc[month].total += value;
                  if ((p as any).isDrip) acc[month].drip += value;
                  return acc;
                }, {} as Record<string, { total: number, drip: number }>);
                const sortedMonths = Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])) as [string, { total: number, drip: number }][];

                return (
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4 px-1">Aylık Yatırım Geçmişi</h3>
                    <div className="flex overflow-x-auto hide-scrollbar gap-4 pb-4 snap-x">
                      {sortedMonths.map(([month, data]) => {
                        const net = data.total - data.drip;
                        const monthDate = new Date(month + '-01');
                        const monthName = monthDate.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });
                        const isCurrentMonth = month === new Date().toISOString().substring(0, 7);
                        return (
                          <div key={month} className={`min-w-[280px] snap-start rounded-2xl p-5 border ${isCurrentMonth ? 'bg-slate-800 border-slate-700' : 'bg-slate-900/40 border-slate-800/80'}`}>
                            <div className={`text-xs font-medium opacity-60 mb-2 ${isCurrentMonth ? 'text-cyan-400 opacity-100' : 'text-slate-400'}`}>
                              {monthName} {isCurrentMonth && '(Mevcut)'}
                            </div>
                            <div className="text-2xl font-bold text-white mb-3">{formatCurrency(data.total)}</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-slate-950/50 p-2 rounded-lg">
                                <div className="text-slate-500 mb-1">Net Yatırım</div>
                                <div className={isCurrentMonth ? "text-cyan-400 font-medium" : "text-slate-300"}>{formatCurrency(net)}</div>
                              </div>
                              <div className="bg-slate-950/50 p-2 rounded-lg">
                                <div className="text-slate-500 mb-1">Temettü (DRIP)</div>
                                <div className="text-slate-300">{formatCurrency(data.drip)}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}


              {/* Position Grid - Compact */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 px-1">Hisse Özetleri</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                   {stockStats.map(stock => (
                     <motion.div 
                       key={stock.id} 
                       whileHover={{ y: -2, scale: 1.02 }}
                       onClick={() => setViewingStockDetails(stock.id)} 
                       className="border border-slate-800 p-4 bg-slate-900/60 hover:bg-slate-800 transition-all group flex flex-col justify-between cursor-pointer rounded-2xl shadow-sm"
                     >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="text-sm font-bold text-white leading-none">{stock.ticker}</div>
                            <div className="text-[10px] text-slate-500 group-hover:text-slate-400 mt-1 line-clamp-1">{stock.name}</div>
                          </div>
                          <div className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded-md",
                            stock.profitLoss >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                          )}>
                            {stock.profitLoss >= 0 ? '↑' : '↓'} {formatPercentage(stock.profitLossPct)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-right text-slate-300 font-medium">{formatCurrency(stock.currentValue)}</div>
                        </div>
                     </motion.div>
                   ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'pf' && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                  <h2 className="text-xl font-semibold text-slate-200">Varlık Listesi</h2>
                  <button 
                    onClick={() => setIsAddingStock(true)}
                    className="px-6 py-2 rounded-full bg-slate-100 text-slate-900 font-medium text-sm hover:bg-white transition-all w-full md:w-auto flex justify-center items-center gap-2"
                  >
                    <Plus size={16} /> Hisse Ekle
                  </button>
                </div>


                {/* Masaüstü Görünümü (Tablo) */}
                <div className="hidden md:block overflow-x-auto bg-slate-900/50 rounded-2xl border border-slate-800">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="text-xs text-slate-400 bg-slate-800/50 uppercase">
                      <tr>
                        <th className="px-6 py-4 font-medium">Hisse</th>
                        <th className="px-6 py-4 font-medium">Sektör</th>
                        <th className="px-6 py-4 font-medium">Adet</th>
                        <th className="px-6 py-4 font-medium">Ort. Maliyet</th>
                        <th className="px-6 py-4 font-medium">Güncel Fiyat</th>
                        <th className="px-6 py-4 font-medium">Güncel Değer</th>
                        <th className="px-6 py-4 font-medium">K/Z</th>
                        <th className="px-6 py-4 font-medium text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {stocks.map(s => {
                        const stats = stockStats.find(x => x.id === s.id);
                        return (
                          <tr 
                            key={s.id} 
                            onClick={() => setViewingStockDetails(s.id)}
                            className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                          >
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-100">{s.ticker}</div>
                              <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{s.name}</div>
                            </td>
                            <td className="px-6 py-4 text-slate-400">{s.sector}</td>
                            <td className="px-6 py-4 font-medium text-slate-200">{stats?.qty}</td>
                            <td className="px-6 py-4 text-slate-300">{formatCurrency(stats?.avgCost || 0)}</td>
                            <td className="px-6 py-4 text-slate-300">
                              {s.lastPrice ? formatCurrency(s.lastPrice) : <span className="opacity-50 text-[10px] bg-slate-800 px-2 py-1 rounded-md">Güncellenmedi</span>}
                            </td>
                            <td className="px-6 py-4 font-medium text-white">{formatCurrency(stats?.currentValue || 0)}</td>
                            <td className="px-6 py-4">
                              <div className={cn(
                                "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                                (stats?.profitLoss || 0) >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                              )}>
                                {(stats?.profitLoss || 0) >= 0 ? '↑' : '↓'} {formatPercentage(stats?.profitLossPct || 0)}
                              </div>
                            </td>
                            <td className="px-6 py-4 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => { setSelectedStockId(s.id); setIsAddingPurchase(true); }} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-slate-700" title="Alım Ekle"><Plus size={14}/></button>
                              <button onClick={() => setViewingPurchases(s.id)} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-blue-400 hover:bg-slate-700" title="Alımları Yönet"><Edit2 size={14}/></button>
                              <button onClick={() => dbService.remove('stocks', s.id)} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-red-400 hover:bg-slate-700" title="Sil"><Trash2 size={14}/></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobil Görünümü (Kartlar) */}
                <div className="md:hidden space-y-4">
                  {stocks.map(s => {
                    const stats = stockStats.find(x => x.id === s.id);
                    return (
                      <div 
                        key={s.id} 
                        onClick={() => setViewingStockDetails(s.id)}
                        className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 space-y-4 active:scale-[0.98] transition-transform"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-lg text-slate-100">{s.ticker}</div>
                            <div className="text-xs text-slate-500">{s.name}</div>
                          </div>
                          <div className={cn(
                            "px-2 py-1 rounded-md text-xs font-medium",
                            (stats?.profitLoss || 0) >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                          )}>
                            {(stats?.profitLoss || 0) >= 0 ? '↑' : '↓'} {formatPercentage(stats?.profitLossPct || 0)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-slate-500 text-[10px] uppercase font-medium">Adet</div>
                            <div className="text-slate-200 font-medium">{stats?.qty}</div>
                          </div>
                          <div>
                            <div className="text-slate-500 text-[10px] uppercase font-medium">Ort. Maliyet</div>
                            <div className="text-slate-200 font-medium">{formatCurrency(stats?.avgCost || 0)}</div>
                          </div>
                          <div>
                            <div className="text-slate-500 text-[10px] uppercase font-medium">Güncel Fiyat</div>
                            <div className="text-slate-200 font-medium">{s.lastPrice ? formatCurrency(s.lastPrice) : '---'}</div>
                          </div>
                          <div>
                            <div className="text-slate-500 text-[10px] uppercase font-medium">Güncel Değer</div>
                            <div className="text-white font-bold">{formatCurrency(stats?.currentValue || 0)}</div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/60" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => { setSelectedStockId(s.id); setIsAddingPurchase(true); }} className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center gap-2 text-xs font-medium"><Plus size={14}/> Alım</button>
                          <button onClick={() => setViewingPurchases(s.id)} className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center gap-2 text-xs font-medium"><Edit2 size={14}/> Yönet</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {stocks.length === 0 && <div className="p-12 text-center text-slate-500">Kayıtlı hisse bulunamadı.</div>}
             </motion.div>
          )}

          {activeTab === 'div' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              
              {/* Özet Kartlar */}
              {(() => {
                const thisYear = new Date().getFullYear().toString();
                const yearDivs = dividends.filter(d => d.date.startsWith(thisYear));
                const yearTotal = yearDivs.reduce((a, d) => a + d.net, 0);
                const monthsWithData = new Set(yearDivs.map(d => d.date.slice(0,7))).size || 1;
                const monthlyAvg = yearTotal / (new Date().getMonth() + 1);
                const allTimeTotal = dividends.reduce((a, d) => a + d.net, 0);
                const dripDivs = dividends.filter(d => (d as any).isDrip);
                const dripTotal = dripDivs.reduce((a, d) => a + d.net, 0);

                // Hisse başına temettü
                const byStock = dividends.reduce((acc, d) => {
                  acc[d.ticker] = (acc[d.ticker] || 0) + d.net;
                  return acc;
                }, {} as Record<string, number>);

                // Aya göre gruplama
                const byMonth = dividends
                  .filter(d => d.date.startsWith(thisYear))
                  .reduce((acc, d) => {
                    const m = d.date.slice(0, 7);
                    acc[m] = (acc[m] || 0) + d.net;
                    return acc;
                  }, {} as Record<string, number>);

                return (
                  <>
                    {/* Özet Satırı */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800">
                        <div className="text-slate-500 text-xs font-medium mb-1">{thisYear} Toplam</div>
                        <div className="text-2xl font-bold text-white">{formatCurrency(yearTotal)}</div>
                      </div>
                      <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800">
                        <div className="text-slate-500 text-xs font-medium mb-1">Aylık Ort.</div>
                        <div className="text-2xl font-bold text-white">{formatCurrency(monthlyAvg)}</div>
                      </div>
                      <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800">
                        <div className="text-slate-500 text-xs font-medium mb-1">Tüm Zaman</div>
                        <div className="text-2xl font-bold text-white">{formatCurrency(allTimeTotal)}</div>
                      </div>
                      <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700">
                        <div className="text-cyan-400 text-xs font-medium mb-1">DRIP Geri Alım</div>
                        <div className="text-2xl font-bold text-white">{formatCurrency(dripTotal)}</div>
                      </div>
                    </div>

                    {/* Aylık Dağılım ({thisYear}) */}
                    {Object.keys(byMonth).length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-300 mb-4 px-1">{thisYear} — Aylık Dağılım</h3>
                        <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-4 snap-x">
                          {Object.entries(byMonth).sort().map(([month, total]) => (
                            <div key={month} className="min-w-[140px] snap-start bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
                              <div className="text-xs text-slate-400 mb-1">
                                {new Date(month + '-01').toLocaleString('tr-TR', { month: 'long' })}
                              </div>
                              <div className="text-lg font-bold text-white">{formatCurrency(total as number)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Hisse Başına Toplam */}
                    {Object.keys(byStock).length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-300 mb-4 px-1">Hisse Başına Temettü</h3>
                        <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-4 snap-x">
                          {Object.entries(byStock).sort((a,b) => (b[1] as number)-(a[1] as number)).map(([ticker, total]) => (
                            <div key={ticker} className="min-w-[160px] snap-start bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col gap-1">
                              <div className="font-bold text-white">{ticker}</div>
                              <div className="font-medium text-emerald-400">{formatCurrency(total as number)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Liste Başlığı + Ekle Butonu */}
              <div className="flex justify-between items-center mb-4 px-1">
                <h2 className="text-xl font-semibold text-slate-200">Geçmiş Ödemeler</h2>
                <button 
                  onClick={() => setIsAddingDividend(true)}
                  className="px-5 py-2 bg-slate-800 text-slate-200 text-sm font-medium rounded-full hover:bg-slate-700"
                >
                  Temettü Ekle
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                 {dividends.sort((a,b) => b.date.localeCompare(a.date)).map(d => (
                   <div key={d.id} className="bg-slate-900/40 rounded-2xl border border-slate-800 p-5 flex justify-between items-center">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-lg text-slate-300">{d.ticker.slice(0,1)}</div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-bold text-slate-100">{d.ticker}</div>
                            {(d as any).isDrip && <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md">DRIP</span>}
                          </div>
                          <div className="text-xs text-slate-500">{d.date} &bull; {d.qty} LOT &bull; ₺{d.ps}/HİSSE</div>
                        </div>
                     </div>
                     <div className="text-right flex flex-col items-end">
                       <div className="text-xl font-bold text-emerald-400">{formatCurrency(d.net)}</div>
                       <button onClick={() => dbService.remove('dividends', d.id)} className="text-[10px] text-slate-500 hover:text-red-400 mt-1 flex items-center gap-1"><Trash2 size={12}/> SİL</button>
                     </div>
                   </div>
                 ))}
                 {dividends.length === 0 && <div className="p-12 text-center text-slate-500 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">Henüz ödeme kaydı yok.</div>}
              </div>
            </motion.div>
          )}


          {activeTab === 'an' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4">Portföy Dağılımı</h3>
                    <div className="h-[300px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={stockStats}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="currentValue"
                            nameKey="ticker"
                            stroke="none"
                          >
                            {stockStats.map((entry, index) => {
                              const colors = ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#6366f1', '#ec4899'];
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            })}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc' }} 
                            itemStyle={{ color: '#f8fafc' }}
                            formatter={(value: number) => [formatCurrency(value), 'Değer']}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            content={({ payload }) => (
                              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
                                {payload?.map((entry: any, index: number) => (
                                  <div key={`item-${index}`} className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                    <span className="text-[10px] font-bold text-slate-300">{entry.value}</span>
                                    <span className="text-[10px] text-slate-500">%{formatPercentage(((entry.payload.currentValue / summary.totalValue) * 100))}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          />
                        </RePieChart>
                      </ResponsiveContainer>
                      
                      {/* Center Label */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-12">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Toplam</div>
                        <div className="text-lg font-bold text-white leading-tight">{formatCurrency(summary.totalValue)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4">Sektörel Dağılım</h3>
                    <div className="space-y-4 pt-2">
                      {Object.entries(stockStats.reduce((acc, s) => {
                        acc[s.sector] = (acc[s.sector] || 0) + s.currentValue;
                        return acc;
                      }, {} as Record<string, number>)).sort((a: any, b: any) => b[1] - a[1]).map(([sector, value], i) => (
                        <div key={sector}>
                          <div className="flex justify-between text-xs font-medium text-slate-300 mb-2">
                            <span>{sector}</span>
                            <span className="text-slate-400">{formatPercentage(((value as number) / (summary.totalValue as number)) * 100)}</span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${((value as number) / (summary.totalValue as number)) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
               </div>

               <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                 <h3 className="text-sm font-semibold text-slate-300 mb-6">Aylık Temettü Seyri</h3>
                 <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={Object.entries(dividends.reduce((acc, d) => {
                        const month = d.date.slice(0,7);
                        acc[month] = (acc[month] || 0) + d.net;
                        return acc;
                      }, {} as Record<string, number>)).sort().map(([name, net]) => ({ name, net }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '10px', fill: '#64748b' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} style={{ fontSize: '10px', fill: '#64748b' }} tickFormatter={(val) => '₺' + (val/1000).toFixed(0) + 'k'} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc' }} cursor={{ fill: '#1e293b' }} formatter={(val: number) => formatCurrency(val)} />
                        <Bar dataKey="net" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                 </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'goal' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="text-xl font-semibold text-slate-200">Vizyon & Hedefler</h2>
                <button 
                  onClick={() => setIsAddingGoal(true)}
                  className="px-6 py-2 bg-slate-800 text-slate-200 text-sm font-medium rounded-full hover:bg-slate-700 w-full md:w-auto"
                >
                  Hedef Koy
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                 {goals.map(g => {
                   let current = 0;
                   if (g.type === 'portfolio_val') current = summary.totalValue;
                   if (g.type === 'total_div') current = summary.totalDiv;
                   if (g.type === 'stock_count') current = stocks.length;
                   const thisYear = new Date().getFullYear().toString();
                   const thisMonth = new Date().toISOString().slice(0, 7);
                   if (g.type === 'annual_div') current = dividends.filter(d => d.date.startsWith(thisYear)).reduce((a, d) => a + d.net, 0);
                   if (g.type === 'monthly_div') current = dividends.filter(d => d.date.startsWith(thisMonth)).reduce((a, d) => a + d.net, 0);
                   
                   const progress = Math.min(100, ((current as number) / (g.target as number)) * 100);

                   return (
                     <div key={g.id} className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="text-lg font-bold text-white mb-1">{g.name}</div>
                            <div className="text-xs text-slate-500">{g.type.replace('_',' ')} &bull; {g.date || 'SÜRESİZ'}</div>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            <div className="text-2xl font-bold text-cyan-400 mb-1">{Math.round(progress)}%</div>
                            <button onClick={() => dbService.remove('goals', g.id)} className="text-[10px] text-slate-500 hover:text-red-400 flex items-center gap-1"><Trash2 size={12}/> SİL</button>
                          </div>
                        </div>

                        <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                           <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-cyan-500 rounded-full" 
                           />
                        </div>
                        <div className="flex justify-between text-xs font-medium text-slate-400">
                           <span>{formatCurrency(current)}</span>
                           <span>Hedef: {formatCurrency(g.target)}</span>
                        </div>
                     </div>
                   );
                 })}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {viewingStockDetails && (() => {
          const s = stockStats.find(x => x.id === viewingStockDetails);
          if (!s) return null;
          const sPurchases = purchases.filter(p => p.stockId === s.id).sort((a,b) => b.date.localeCompare(a.date));
          const sDividends = dividends.filter(d => d.stockId === s.id).sort((a,b) => b.date.localeCompare(a.date));

          return (
            <Modal 
              title={`${s.ticker} Detay`} 
              onClose={() => setViewingStockDetails(null)} 
              onSave={() => setViewingStockDetails(null)}
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                  <div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Güncel Değer</div>
                    <div className="text-2xl font-bold text-white">{formatCurrency(s.currentValue)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Toplam K/Z</div>
                    <div className={cn("text-lg font-bold", s.profitLoss >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {s.profitLoss >= 0 ? '↑' : '↓'} {formatPercentage(s.profitLossPct)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-800/50">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Maliyet</div>
                    <div className="text-sm font-semibold text-slate-200">{formatCurrency(s.avgCost)}</div>
                  </div>
                  <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-800/50">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Adet</div>
                    <div className="text-sm font-semibold text-slate-200">{s.qty} LOT</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Son İşlemler</h3>
                  <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1 hide-scrollbar">
                    {sPurchases.slice(0, 5).map(p => (
                      <div key={p.id} className="flex justify-between items-center bg-slate-950/30 p-3 rounded-xl border border-slate-800/40 text-xs">
                        <div className="text-slate-300 font-medium">{p.qty} Lot Alım</div>
                        <div className="text-slate-500">{p.date}</div>
                      </div>
                    ))}
                    {sPurchases.length === 0 && <div className="text-center py-4 text-slate-600 text-xs italic">İşlem kaydı yok.</div>}
                  </div>
                </div>

                {sDividends.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Temettü Geçmişi</h3>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1 hide-scrollbar">
                      {sDividends.map(d => (
                        <div key={d.id} className="flex justify-between items-center bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 text-xs">
                          <div className="text-emerald-400 font-medium">{formatCurrency(d.net)}</div>
                          <div className="text-slate-500">{d.date}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => { setSelectedStockId(s.id); setIsAddingPurchase(true); }}
                    className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 transition-colors"
                  >
                    ALIM EKLE
                  </button>
                  <button 
                    onClick={() => dbService.remove('stocks', s.id).then(() => setViewingStockDetails(null))}
                    className="p-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </Modal>
          );
        })()}

        {isAddingStock && (
          <Modal 
            title="Hisse Ekle" 
            onClose={() => { 
              setIsAddingStock(false); 
              setNewStockData({ ticker: '', name: '', sector: 'Diğer', exchange: 'BIST' }); 
            }} 
            onSave={async () => {
              if (!newStockData.ticker) {
                showToast('Hisse kodu giriniz!', false);
                return;
              }
              try {
                const ticker = newStockData.ticker.toUpperCase();
                await dbService.add('stocks', {
                  ticker,
                  name: newStockData.name || ticker,
                  exchange: newStockData.exchange || 'BIST',
                  sector: newStockData.sector || 'Diğer'
                });
                setIsAddingStock(false);
                setNewStockData({ ticker: '', name: '', sector: 'Diğer', exchange: 'BIST' });
                showToast(`${ticker} portföye eklendi!`);
              } catch (err: any) {
                showToast(err.message || 'Hisse eklenemedi!', false);
              }
            }}
          >
            <div className="space-y-4">
              <Input 
                label="Hisse Kodu (örn: TUPRS)" 
                name="ticker" 
                placeholder="Kodu yazın..."
                required 
                autoFocus
                value={newStockData.ticker}
                onChange={async (e) => {
                  const val = e.target.value.toUpperCase();
                  setNewStockData(prev => ({ ...prev, ticker: val }));
                  
                  if (val.length >= 2) {
                    setInfoLoading(true);
                    try {
                      const info = await fetchStockInfo(val, newStockData.exchange);
                      if (info.success && info.name) {
                        setNewStockData(prev => ({ 
                          ...prev, 
                          name: info.name, 
                          sector: info.sector || prev.sector
                        }));
                      }
                    } catch (err) {
                      console.error('Info fetch failed', err);
                    } finally {
                      setInfoLoading(false);
                    }
                  }
                }}
              />
              <Input 
                label={infoLoading ? 'Şirket Adı (aranıyor...)' : 'Şirket Adı (Otomatik dolar)'} 
                name="name" 
                value={newStockData.name}
                onChange={(e) => setNewStockData(prev => ({ ...prev, name: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-4">
                <Select 
                  label="Borsa" 
                  name="exchange" 
                  value={newStockData.exchange}
                  onChange={(e) => setNewStockData(prev => ({ ...prev, exchange: e.target.value }))}
                  options={['BIST', 'NYSE', 'NASDAQ', 'LSE']} 
                />
                <Select 
                  label="Sektör" 
                  name="sector" 
                  value={newStockData.sector}
                  onChange={(e) => setNewStockData(prev => ({ ...prev, sector: e.target.value }))}
                  options={['Enerji', 'Banka', 'Sanayi', 'Teknoloji', 'Holding', 'Gıda', 'Diğer']} 
                />
              </div>
            </div>
          </Modal>
        )}

        {isAddingPurchase && (
          <Modal title="Alım Ekle" onClose={() => setIsAddingPurchase(false)} onSave={async (data) => {
             await dbService.add('purchases', {
               stockId: selectedStockId,
               qty: Number(data.qty),
               price: Number(data.price),
               date: data.date,
               note: data.note,
               isDrip: data.isDrip === 'on'
             });
             setIsAddingPurchase(false);
          }}>
            <div className="space-y-4">
               <Input label="Tarih" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
               <div className="grid grid-cols-2 gap-4">
                 <Input label="Adet / Lot" name="qty" type="number" required />
                 <Input label="Birim Fiyat (₺)" name="price" type="number" step="0.01" required />
               </div>
               <Input label="Not" name="note" />
               <div className="flex items-center gap-2 pt-2">
                 <input type="checkbox" id="isDrip" name="isDrip" className="w-4 h-4 accent-cyan-500 bg-slate-900 border-slate-800 rounded" />
                 <label htmlFor="isDrip" className="text-sm text-slate-400 font-medium cursor-pointer">Bu alım temettü geliriyle yapıldı (DRIP)</label>
               </div>
            </div>
          </Modal>
        )}

        {isAddingDividend && (
          <Modal title="Temettü Kaydı" onClose={() => setIsAddingDividend(false)} onSave={async (data) => {
             const stock = stocks.find(s => s.id === data.stockId);
             await dbService.add('dividends', {
               stockId: data.stockId,
               ticker: stock?.ticker,
               date: data.date,
               ps: Number(data.ps),
               qty: Number(data.qty),
               net: Number(data.net),
               type: data.type,
               tax: Number(data.tax || 0),
               gross: Number(data.net) + Number(data.tax || 0),
               note: data.note
             });
             setIsAddingDividend(false);
          }}>
             <div className="space-y-4">
                <Select label="Hisse" name="stockId" options={stocks.map(s => ({ label: s.ticker, value: s.id }))} />
                <Input label="Tarih" name="date" type="date" required />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Hisse Başı (Net)" name="ps" type="number" step="0.0001" required />
                  <Input label="Lot Sayısı" name="qty" type="number" required />
                </div>
                <Input label="Net Toplam (₺)" name="net" type="number" step="0.01" required />
                <Select label="Tür" name="type" options={['Nakit', 'Hisse', 'Ara Ödeme']} />
             </div>
          </Modal>
        )}

        {isAddingGoal && (
          <Modal title="Varlık Hedefi" onClose={() => setIsAddingGoal(false)} onSave={async (data) => {
            await dbService.add('goals', {
              name: data.name,
              target: Number(data.target),
              type: data.type,
              date: data.date
            });
            setIsAddingGoal(false);
          }}>
            <div className="space-y-4">
              <Input label="Hedef Adı" name="name" required />
              <Select label="Tür" name="type" options={[
                { label: 'Yıllık Temettü', value: 'annual_div' },
                { label: 'Aylık Temettü', value: 'monthly_div' },
                { label: 'Portföy Değeri', value: 'portfolio_val' },
                { label: 'Toplam Temettü', value: 'total_div' },
                { label: 'Hisse Sayısı', value: 'stock_count' }
              ]} />
              <Input label="Hedef Rakam" name="target" type="number" required />
              <Input label="Hedef Tarihi" name="date" type="date" />
            </div>
          </Modal>
        )}

        {viewingPurchases && (
          <Modal title="Alımları Yönet" onClose={() => setViewingPurchases(null)} onSave={() => setViewingPurchases(null)}>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {purchases.filter(p => p.stockId === viewingPurchases).length === 0 ? (
                <div className="text-center font-serif italic opacity-50 py-4">Bu hisseye ait alım kaydı bulunamadı.</div>
              ) : (
                purchases
                  .filter(p => p.stockId === viewingPurchases)
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-slate-950/50 border border-slate-800 p-4 rounded-xl mb-3">
                      <div>
                        <div className="font-bold text-lg text-slate-200">{p.qty} Lot</div>
                        <div className="text-xs text-slate-500">
                          {p.date} &bull; Birim: {formatCurrency(p.price)}
                          {p.isDrip && <span className="ml-2 text-emerald-400 font-medium">(DRIP)</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="font-bold text-lg text-emerald-400">{formatCurrency(p.qty * p.price)}</div>
                        <button 
                          type="button"
                          onClick={() => {
                            dbService.remove('purchases', p.id);
                            showToast('Alım kaydı silindi');
                          }} 
                          className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
                          title="Bu alımı sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function Modal({ title, children, onClose, onSave }: { title: string, children: React.ReactNode, onClose: () => void, onSave: (data?: any) => Promise<void> | void }) {
  const [saving, setSaving] = useState(false);

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div 
        initial={{ y: 20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-8 shadow-2xl overflow-hidden"
      >
        <h2 className="text-2xl font-bold text-white mb-6 border-b border-slate-800 pb-4">{title}</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (saving) return;
          setSaving(true);
          try {
            const fd = new FormData(e.currentTarget);
            await onSave(Object.fromEntries(fd.entries()));
          } finally {
            setSaving(false);
          }
        }}>
          {children}
          <div className="flex gap-4 mt-8 pt-6 border-t border-slate-800">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors disabled:opacity-50">İptal</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-colors disabled:opacity-50">
              {saving ? 'KAYDEDİLİYOR...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <input {...props} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-cyan-500 transition-colors" />
    </div>
  );
}

function Select({ label, options, ...props }: { label: string, options: (string | { label: string, value: string })[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <select {...props} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-cyan-500 transition-colors appearance-none cursor-pointer">
        {options.map(opt => typeof opt === 'string' ? <option key={opt} value={opt}>{opt}</option> : <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}


