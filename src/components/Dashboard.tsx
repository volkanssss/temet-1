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
  Edit2
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
  Area
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
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

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

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Sidebar navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="pl-16">
        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "fixed top-4 right-4 z-[200] flex items-center gap-3 px-5 py-3 border font-mono text-xs uppercase tracking-widest",
                toast.ok
                  ? "bg-[#141414] text-[#E4E3E0] border-[#141414]"
                  : "bg-red-50 text-red-700 border-red-400"
              )}
            >
              {toast.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <header className="border-b border-[#141414] p-8 flex justify-between items-end bg-[#E4E3E0]/80 backdrop-blur sticky top-0 z-20">
          <div>
            <div className="font-serif italic text-xs opacity-50 uppercase tracking-widest mb-1">
              Portfolio Ledger &bull; {userName}
            </div>
            <h1 className="text-4xl font-bold tracking-tighter uppercase leading-none">
              {activeTab === 'dash' && 'Özet'}
              {activeTab === 'pf' && 'Portföy'}
              {activeTab === 'div' && 'Temettüler'}
              {activeTab === 'an' && 'Analiz'}
              {activeTab === 'goal' && 'Hedefler'}
            </h1>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={refreshPrices}
              disabled={loading}
              className="px-6 py-3 border border-[#141414] flex items-center gap-2 hover:bg-[#141414] hover:text-white transition-all font-mono uppercase text-[10px] tracking-widest"
            >
              <RefreshCcw size={12} className={cn(loading && "animate-spin")} /> 
              {loading ? "GÜNCELLENİYOR..." : "LİVE SYNC"}
            </button>
            <button onClick={logout} className="p-3 border border-[#141414] hover:bg-red-500 hover:text-white transition-all">
              <LogOut size={14} />
            </button>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto">
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
                const monthly = calcPnl(getSnapshot(30));
                const yearly = calcPnl(getSnapshot(365));

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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="border border-[#141414] p-4 bg-white/50">
                        <div className="font-serif italic text-[10px] uppercase opacity-50 mb-1">Günlük K/Z</div>
                        {daily ? (
                           <div className={cn("font-mono text-lg font-bold", daily.val >= 0 ? "text-green-700" : "text-red-700")}>
                             {daily.val >= 0 ? '+' : ''}{formatCurrency(daily.val)}
                             <div className="text-xs">{daily.val >= 0 ? '▲' : '▼'} {formatPercentage(daily.pct)}</div>
                           </div>
                        ) : <div className="font-mono text-sm opacity-30 mt-2">Veri Bekleniyor</div>}
                      </div>
                      <div className="border border-[#141414] p-4 bg-white/50">
                        <div className="font-serif italic text-[10px] uppercase opacity-50 mb-1">Aylık K/Z</div>
                        {monthly ? (
                           <div className={cn("font-mono text-lg font-bold", monthly.val >= 0 ? "text-green-700" : "text-red-700")}>
                             {monthly.val >= 0 ? '+' : ''}{formatCurrency(monthly.val)}
                             <div className="text-xs">{monthly.val >= 0 ? '▲' : '▼'} {formatPercentage(monthly.pct)}</div>
                           </div>
                        ) : <div className="font-mono text-sm opacity-30 mt-2">Veri Bekleniyor</div>}
                      </div>
                      <div className="border border-[#141414] p-4 bg-white/50">
                        <div className="font-serif italic text-[10px] uppercase opacity-50 mb-1">Yıllık K/Z</div>
                        {yearly ? (
                           <div className={cn("font-mono text-lg font-bold", yearly.val >= 0 ? "text-green-700" : "text-red-700")}>
                             {yearly.val >= 0 ? '+' : ''}{formatCurrency(yearly.val)}
                             <div className="text-xs">{yearly.val >= 0 ? '▲' : '▼'} {formatPercentage(yearly.pct)}</div>
                           </div>
                        ) : <div className="font-mono text-sm opacity-30 mt-2">Veri Bekleniyor</div>}
                      </div>
                      <div className="border border-[#141414] p-4 bg-[#141414] text-[#E4E3E0]">
                        <div className="font-serif italic text-[10px] uppercase opacity-70 mb-1">Tüm Zamanlar K/Z</div>
                        <div className={cn("font-mono text-lg font-bold", summary.pnl >= 0 ? "text-green-400" : "text-red-400")}>
                          {summary.pnl >= 0 ? '+' : ''}{formatCurrency(summary.pnl)}
                          <div className="text-xs">{summary.pnl >= 0 ? '▲' : '▼'} {formatPercentage(summary.pnlPct)}</div>
                        </div>
                      </div>
                    </div>

                    {chartData.length > 0 && (
                      <div className="border border-[#141414] p-6 bg-white/50 h-[300px]">
                         <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] mb-6">Portföy Büyüme Eğrisi</h3>
                         <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                             <defs>
                               <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#141414" stopOpacity={0.3}/>
                                 <stop offset="95%" stopColor="#141414" stopOpacity={0}/>
                               </linearGradient>
                               <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#9CA3AF" stopOpacity={0.3}/>
                                 <stop offset="95%" stopColor="#9CA3AF" stopOpacity={0}/>
                               </linearGradient>
                             </defs>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                             <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} dy={10} />
                             <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} tickFormatter={(val) => '₺' + (val/1000).toFixed(0) + 'k'} />
                             <Tooltip 
                                contentStyle={{ backgroundColor: '#141414', color: '#E4E3E0', border: 'none', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}
                                itemStyle={{ color: '#E4E3E0' }}
                                formatter={(value: number) => formatCurrency(value)}
                             />
                             <Area type="monotone" dataKey="Net Maliyet" stroke="#9CA3AF" fillOpacity={1} fill="url(#colorCost)" />
                             <Area type="monotone" dataKey="Portföy Değeri" stroke="#141414" strokeWidth={2} fillOpacity={1} fill="url(#colorVal)" />
                           </AreaChart>
                         </ResponsiveContainer>
                      </div>
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
                    <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] mb-4 border-b border-[#141414] pb-2">Aylık Yatırım Geçmişi</h3>
                    <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
                      {sortedMonths.map(([month, data]) => {
                        const net = data.total - data.drip;
                        const monthDate = new Date(month + '-01');
                        const monthName = monthDate.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });
                        const isCurrentMonth = month === new Date().toISOString().substring(0, 7);
                        return (
                          <div key={month} className={`min-w-[280px] snap-start border border-[#141414] p-5 ${isCurrentMonth ? 'bg-[#141414] text-[#E4E3E0]' : 'bg-white/50'}`}>
                            <div className={`font-serif italic text-xs uppercase tracking-widest opacity-60 mb-2 ${isCurrentMonth ? 'text-[#E4E3E0]' : ''}`}>
                              {monthName} {isCurrentMonth && '(Mevcut)'}
                            </div>
                            <div className="font-mono text-2xl font-black mb-2">{formatCurrency(data.total)}</div>
                            <div className={`text-[10px] font-mono grid grid-cols-2 gap-2 opacity-80 ${isCurrentMonth ? 'text-[#E4E3E0]' : ''}`}>
                              <div>
                                <div className="opacity-50">Net Yatırım</div>
                                <div className={isCurrentMonth ? "text-green-400" : "text-green-700"}>{formatCurrency(net)}</div>
                              </div>
                              <div>
                                <div className="opacity-50">DRIP (Temettü)</div>
                                <div>{formatCurrency(data.drip)}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}


              {/* Position Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {stockStats.map(stock => (
                   <div key={stock.id} onClick={() => setActiveTab('pf')} className="border border-[#141414] p-6 hover:bg-[#141414] hover:text-white transition-all group flex justify-between items-center cursor-pointer">
                      <div>
                        <div className="font-mono text-xl font-black mb-1">{stock.ticker}</div>
                        <div className="font-serif italic text-xs opacity-50 group-hover:opacity-100">{stock.name} &bull; {stock.sector}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-lg">{formatCurrency(stock.currentValue)}</div>
                        <div className={cn(
                          "font-mono text-[10px] uppercase",
                          stock.profitLoss >= 0 ? "text-green-700 group-hover:text-green-400" : "text-red-700 group-hover:text-red-400"
                        )}>
                          {stock.profitLoss >= 0 ? '▲' : '▼'} {formatPercentage(stock.profitLossPct)}
                        </div>
                      </div>
                   </div>
                 ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'pf' && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-serif italic text-2xl uppercase tracking-tighter opacity-70">Varlık Listesi</h2>
                  <button 
                    onClick={() => setIsAddingStock(true)}
                    className="px-6 py-2 bg-[#141414] text-white font-mono uppercase text-[10px] tracking-widest hover:opacity-90"
                  >
                    Hisse Ekle
                  </button>
                </div>


                <div className="border border-[#141414]">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#141414] text-[#E4E3E0] font-mono text-[10px] uppercase tracking-widest">
                        <th className="p-4 text-left font-normal border-r border-[#E4E3E0]/10">Hisse</th>
                        <th className="p-4 text-left font-normal border-r border-[#E4E3E0]/10">Sektör</th>
                        <th className="p-4 text-left font-normal border-r border-[#E4E3E0]/10">Adet</th>
                        <th className="p-4 text-left font-normal border-r border-[#E4E3E0]/10">Ort. Maliyet</th>
                        <th className="p-4 text-left font-normal border-r border-[#E4E3E0]/10">Gncel Fiyat</th>
                        <th className="p-4 text-left font-normal border-r border-[#E4E3E0]/10">Gncel Değer</th>
                        <th className="p-4 text-left font-normal border-r border-[#E4E3E0]/10">K/Z</th>
                        <th className="p-4 text-left font-normal">Aksiyon</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stocks.map(s => {
                        const stats = stockStats.find(x => x.id === s.id);
                        return (
                          <tr key={s.id} className="border-b border-[#141414] hover:bg-[#141414]/5 transition-colors group">
                            <td className="p-4 border-r border-[#141414]">
                              <div className="font-mono font-bold">{s.ticker}</div>
                              <div className="text-[10px] opacity-50 truncate max-w-[150px]">{s.name}</div>
                            </td>
                            <td className="p-4 border-r border-[#141414] font-serif italic text-sm">{s.sector}</td>
                            <td className="p-4 border-r border-[#141414] font-mono">{stats?.qty}</td>
                            <td className="p-4 border-r border-[#141414] font-mono">{formatCurrency(stats?.avgCost || 0)}</td>
                            <td className="p-4 border-r border-[#141414] font-mono">
                              {s.lastPrice ? formatCurrency(s.lastPrice) : <span className="opacity-30 text-[10px]">Güncellenmedi</span>}
                            </td>
                            <td className="p-4 border-r border-[#141414] font-mono">{formatCurrency(stats?.currentValue || 0)}</td>
                            <td className={cn(
                              "p-4 border-r border-[#141414] font-mono text-xs",
                              (stats?.profitLoss || 0) >= 0 ? "text-green-700" : "text-red-700"
                            )}>
                              {(stats?.profitLoss || 0) >= 0 ? '▲' : '▼'} {formatPercentage(stats?.profitLossPct || 0)}
                            </td>
                            <td className="p-4 flex gap-2">
                              <button onClick={() => { setSelectedStockId(s.id); setIsAddingPurchase(true); }} className="hover:text-green-600" title="Alım Ekle"><Plus size={16}/></button>
                              <button onClick={() => setViewingPurchases(s.id)} className="hover:text-blue-600" title="Alımları Yönet"><Edit2 size={16}/></button>
                              <button onClick={() => dbService.remove('stocks', s.id)} className="hover:text-red-600" title="Sil (alımlar ve temettüler de silinir)"><Trash2 size={16}/></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {stocks.length === 0 && <div className="p-12 text-center font-serif italic opacity-40">Kayıtlı hisse bulunamadı.</div>}
                </div>
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
                    <div className="grid grid-cols-2 md:grid-cols-4 border border-[#141414] divide-x divide-[#141414]">
                      <div className="p-6">
                        <div className="font-serif italic text-[10px] uppercase opacity-50 mb-1">{thisYear} Toplam</div>
                        <div className="font-mono text-xl font-black">{formatCurrency(yearTotal)}</div>
                      </div>
                      <div className="p-6">
                        <div className="font-serif italic text-[10px] uppercase opacity-50 mb-1">Aylık Ort.</div>
                        <div className="font-mono text-xl font-black">{formatCurrency(monthlyAvg)}</div>
                      </div>
                      <div className="p-6">
                        <div className="font-serif italic text-[10px] uppercase opacity-50 mb-1">Tüm Zaman</div>
                        <div className="font-mono text-xl font-black">{formatCurrency(allTimeTotal)}</div>
                      </div>
                      <div className="p-6 bg-[#141414] text-[#E4E3E0]">
                        <div className="font-serif italic text-[10px] uppercase opacity-70 mb-1">DRIP Geri Alım</div>
                        <div className="font-mono text-xl font-black">{formatCurrency(dripTotal)}</div>
                      </div>
                    </div>

                    {/* Aylık Dağılım ({thisYear}) */}
                    {Object.keys(byMonth).length > 0 && (
                      <div>
                        <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] mb-4 border-b border-[#141414] pb-2">{thisYear} — Aylık Dağılım</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {Object.entries(byMonth).sort().map(([month, total]) => (
                            <div key={month} className="border border-[#141414] p-4">
                              <div className="font-serif italic text-[10px] opacity-50 mb-1">
                                {new Date(month + '-01').toLocaleString('tr-TR', { month: 'long' })}
                              </div>
                              <div className="font-mono font-bold">{formatCurrency(total as number)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Hisse Başına Toplam */}
                    {Object.keys(byStock).length > 0 && (
                      <div>
                        <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] mb-4 border-b border-[#141414] pb-2">Hisse Başına Temettü</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {Object.entries(byStock).sort((a,b) => (b[1] as number)-(a[1] as number)).map(([ticker, total]) => (
                            <div key={ticker} className="border border-[#141414] p-4 flex justify-between items-center">
                              <div className="font-mono font-bold text-sm">{ticker}</div>
                              <div className="font-mono text-green-700">{formatCurrency(total as number)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Liste Başlığı + Ekle Butonu */}
              <div className="flex justify-between items-center">
                <h2 className="font-serif italic text-2xl uppercase tracking-tighter opacity-70">Geçmiş Ödemeler</h2>
                <button 
                  onClick={() => setIsAddingDividend(true)}
                  className="px-6 py-2 bg-[#141414] text-white font-mono uppercase text-[10px] tracking-widest"
                >
                  Temettü Ekle
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                 {dividends.sort((a,b) => b.date.localeCompare(a.date)).map(d => (
                   <div key={d.id} className="border border-[#141414] p-6 flex justify-between items-center">
                     <div className="flex items-center gap-6">
                        <div className="w-12 h-12 border border-[#141414] flex items-center justify-center font-mono font-black text-xl bg-[#141414] text-white">{d.ticker.slice(0,1)}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="font-mono text-lg font-bold">{d.ticker}</div>
                            {(d as any).isDrip && <span className="text-[9px] font-mono uppercase bg-green-100 text-green-800 px-2 py-0.5 border border-green-300">DRIP</span>}
                          </div>
                          <div className="font-serif italic text-xs opacity-50">{d.date} &bull; {d.qty} LOT &bull; ₺{d.ps}/HİSSE</div>
                        </div>
                     </div>
                     <div className="text-right">
                       <div className="font-mono text-2xl font-bold text-green-800">{formatCurrency(d.net)}</div>
                       <button onClick={() => dbService.remove('dividends', d.id)} className="text-[10px] font-mono opacity-30 hover:opacity-100 uppercase tracking-widest mt-1">SİL</button>
                     </div>
                   </div>
                 ))}
                 {dividends.length === 0 && <div className="p-12 text-center border border-dashed border-[#141414] opacity-30 font-serif italic">Henüz ödeme kaydı yok.</div>}
              </div>
            </motion.div>
          )}


          {activeTab === 'an' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div>
                    <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] mb-4 border-b border-[#141414] pb-2">Portföy Dağılımı</h3>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={stockStats}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="currentValue"
                            nameKey="ticker"
                          >
                            {stockStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#141414' : '#666'} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] mb-4 border-b border-[#141414] pb-2">Sektörel Dağılım</h3>
                    <div className="space-y-4 pt-4">
                      {Object.entries(stockStats.reduce((acc, s) => {
                        acc[s.sector] = (acc[s.sector] || 0) + s.currentValue;
                        return acc;
                      }, {} as Record<string, number>)).sort((a: any, b: any) => b[1] - a[1]).map(([sector, value]) => (
                        <div key={sector}>
                          <div className="flex justify-between font-mono text-[10px] uppercase mb-1">
                            <span>{sector}</span>
                            <span>{formatPercentage(((value as number) / (summary.totalValue as number)) * 100)}</span>
                          </div>
                          <div className="h-1 bg-[#141414]/10">
                            <div className="h-full bg-[#141414]" style={{ width: `${((value as number) / (summary.totalValue as number)) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
               </div>

               <div>
                 <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] mb-8 border-b border-[#141414] pb-2">Aylık Temettü Seyri</h3>
                 <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={Object.entries(dividends.reduce((acc, d) => {
                        const month = d.date.slice(0,7);
                        acc[month] = (acc[month] || 0) + d.net;
                        return acc;
                      }, {} as Record<string, number>)).sort().map(([name, net]) => ({ name, net }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ccc" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                        <YAxis axisLine={false} tickLine={false} style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                        <Tooltip />
                        <Bar dataKey="net" fill="#141414" />
                      </BarChart>
                    </ResponsiveContainer>
                 </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'goal' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-serif italic text-2xl uppercase tracking-tighter opacity-70">Vizyon & Hedefler</h2>
                <button 
                  onClick={() => setIsAddingGoal(true)}
                  className="px-6 py-2 bg-[#141414] text-white font-mono uppercase text-[10px] tracking-widest"
                >
                  Hedef Koy
                </button>
              </div>

              <div className="grid grid-cols-1 gap-8">
                 {goals.map(g => {
                   let current = 0;
                   if (g.type === 'portfolio_val') current = summary.totalValue;
                   if (g.type === 'total_div') current = summary.totalDiv;
                   if (g.type === 'stock_count') current = stocks.length;
                   const thisYear = new Date().getFullYear().toString();
                   const thisMonth = new Date().toISOString().slice(0, 7);
                   if (g.type === 'annual_div') current = dividends.filter(d => d.date.startsWith(thisYear)).reduce((a, d) => a + d.net, 0);
                   // Bug #3 fix: monthly_div hesabı
                   if (g.type === 'monthly_div') current = dividends.filter(d => d.date.startsWith(thisMonth)).reduce((a, d) => a + d.net, 0);
                   
                   const progress = Math.min(100, ((current as number) / (g.target as number)) * 100);

                   return (
                     <div key={g.id} className="border-l-4 border-[#141414] bg-[#141414]/5 p-8">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <div className="font-serif italic text-2xl mb-1">{g.name}</div>
                            <div className="font-mono text-[10px] uppercase opacity-50">{g.type.replace('_',' ')} &bull; {g.date || 'SÜRESİZ'}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-3xl font-black">{Math.round(progress)}%</div>
                            <button onClick={() => dbService.remove('goals', g.id)} className="text-[10px] hover:text-red-600">SİL</button>
                          </div>
                        </div>

                        <div className="h-6 border border-[#141414] p-1 mb-2">
                           <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-[#141414]" 
                           />
                        </div>
                        <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest opacity-60">
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
                 <input type="checkbox" id="isDrip" name="isDrip" className="w-4 h-4 accent-[#141414]" />
                 <label htmlFor="isDrip" className="font-serif italic text-sm opacity-80 cursor-pointer">Bu alım temettü geliriyle yapıldı (DRIP)</label>
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
                    <div key={p.id} className="flex justify-between items-center border border-[#141414] p-4 bg-white/50">
                      <div>
                        <div className="font-mono font-bold text-lg">{p.qty} Lot</div>
                        <div className="font-serif italic text-[10px] opacity-70">
                          {p.date} &bull; Birim: {formatCurrency(p.price)}
                          {p.isDrip && <span className="ml-2 text-green-700">(DRIP)</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="font-mono text-lg">{formatCurrency(p.qty * p.price)}</div>
                        <button 
                          type="button"
                          onClick={() => {
                            dbService.remove('purchases', p.id);
                            showToast('Alım kaydı silindi');
                          }} 
                          className="text-red-600 hover:text-red-800"
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

function Sidebar({ activeTab, setActiveTab }: { activeTab: Tab, setActiveTab: (t: Tab) => void }) {
  const items = [
    { id: 'dash' as const, ico: <PieChart size={20}/>, lbl: 'Özet' },
    { id: 'pf' as const, ico: <Briefcase size={20}/>, lbl: 'Varlıklar' },
    { id: 'div' as const, ico: <DollarSign size={20}/>, lbl: 'Gelirler' },
    { id: 'an' as const, ico: <TrendingUp size={20}/>, lbl: 'Analiz' },
    { id: 'goal' as const, ico: <Target size={20}/>, lbl: 'Vizyon' },
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-16 border-r border-[#141414] flex flex-col items-center py-10 gap-10 bg-[#E4E3E0] z-30 overflow-hidden">
      <div className="w-8 h-8 bg-[#141414] text-[#E4E3E0] flex items-center justify-center font-serif italic font-black">P</div>
      <div className="flex flex-col gap-8 flex-1">
        {items.map(item => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "p-3 transition-all relative group",
              activeTab === item.id ? "opacity-100" : "opacity-30 hover:opacity-100"
            )}
          >
            {item.ico}
            <div className="absolute left-16 bg-[#141414] text-[#E4E3E0] text-[10px] px-2 py-1 uppercase tracking-widest hidden group-hover:block whitespace-nowrap z-50">
              {item.lbl}
            </div>
            {activeTab === item.id && <motion.div layoutId="nav-bg" className="absolute left-0 top-0 w-1 h-full bg-[#141414]" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatItem({ label, value, subText, trend, highlight }: { label: string, value: string, subText?: string, trend?: 'up' | 'down', highlight?: boolean }) {
  return (
    <div className={cn("p-8", highlight && "bg-[#141414] text-[#E4E3E0]")}>
      <div className={cn("font-serif italic text-[10px] uppercase tracking-widest mb-1 opacity-50", highlight && "opacity-100")}>{label}</div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-mono font-black tracking-tighter">{value}</div>
        {trend && (
           <div className={cn(
             "text-[10px] font-mono",
             trend === 'up' ? "text-green-700" : "text-red-700"
           )}>
             {trend === 'up' ? '▲' : '▼'} {subText}
           </div>
        )}
      </div>
    </div>
  );
}

function Modal({ title, children, onClose, onSave }: { title: string, children: React.ReactNode, onClose: () => void, onSave: (data?: any) => Promise<void> | void }) {
  const [saving, setSaving] = useState(false);

  return (
    <div
      className="fixed inset-0 bg-[#141414]/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="bg-[#E4E3E0] border border-[#141414] w-full max-w-lg p-10"
      >
        <h2 className="text-3xl font-bold uppercase tracking-tighter mb-8 border-b border-[#141414] pb-4">{title}</h2>
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
          <div className="flex gap-4 mt-12 pt-8 border-t border-[#141414]/10">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-4 border border-[#141414] font-mono text-[10px] uppercase tracking-widest disabled:opacity-50">İptal</button>
            <button type="submit" disabled={saving} className="flex-1 py-4 bg-[#141414] text-[#E4E3E0] font-mono text-[10px] uppercase tracking-widest disabled:opacity-50">
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
    <div className="flex flex-col gap-1">
      <label className="font-serif italic text-[10px] uppercase opacity-50">{label}</label>
      <input {...props} className="bg-transparent border-b border-[#141414] py-2 outline-none font-sans text-sm focus:border-b-2" />
    </div>
  );
}

function Select({ label, options, ...props }: { label: string, options: (string | { label: string, value: string })[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-serif italic text-[10px] uppercase opacity-50">{label}</label>
      <select {...props} className="bg-transparent border-b border-[#141414] py-3 outline-none font-sans text-sm appearance-none">
        {options.map(opt => typeof opt === 'string' ? <option key={opt} value={opt}>{opt}</option> : <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}


