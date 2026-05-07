import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { cn, formatCurrency, formatPercentage } from '../../lib/utils';
import { dbService } from '../../services/db';

type PortfolioTabProps = {
  stocks: any[];
  stockStats: any[];
  loading: boolean;
  searchQuery: string;
  setIsAddingStock: (v: boolean) => void;
  setViewingStockDetails: (id: string) => void;
  setSelectedStockId: (id: string) => void;
  setIsAddingPurchase: (v: boolean) => void;
  setViewingPurchases: (id: string) => void;
};

type SortField = 'ticker' | 'sector' | 'qty' | 'avgCost' | 'lastPrice' | 'currentValue' | 'profitLossPct';
type SortDirection = 'asc' | 'desc';

export default function PortfolioTab({
  stocks,
  stockStats,
  loading,
  searchQuery,
  setIsAddingStock,
  setViewingStockDetails,
  setSelectedStockId,
  setIsAddingPurchase,
  setViewingPurchases
}: PortfolioTabProps) {
  const [sortField, setSortField] = useState<SortField>('currentValue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedAndFilteredStocks = useMemo(() => {
    let filtered = stocks;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.ticker.toLowerCase().includes(q) || 
        s.name.toLowerCase().includes(q) || 
        s.sector.toLowerCase().includes(q)
      );
    }

    return filtered.map(s => ({
      ...s,
      stats: stockStats.find(x => x.id === s.id) || {}
    })).sort((a, b) => {
      let valA: any = a[sortField] ?? a.stats[sortField] ?? 0;
      let valB: any = b[sortField] ?? b.stats[sortField] ?? 0;
      
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [stocks, stockStats, searchQuery, sortField, sortDirection]);

  return (
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

      {loading && stocks.length > 0 && (
        <div className="text-xs text-slate-400 animate-pulse mb-2">Fiyatlar güncelleniyor...</div>
      )}

      {/* Masaüstü Görünümü (Tablo) */}
      <div className="hidden md:block overflow-x-auto bg-slate-900/50 rounded-2xl border border-slate-800">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-xs text-slate-400 bg-slate-800/50 uppercase">
            <tr>
              <th className="px-6 py-4 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('ticker')}>
                Hisse {sortField === 'ticker' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-4 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('sector')}>
                Sektör {sortField === 'sector' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-4 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('qty')}>
                Adet {sortField === 'qty' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-4 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('avgCost')}>
                Ort. Maliyet {sortField === 'avgCost' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-4 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('lastPrice')}>
                Güncel Fiyat {sortField === 'lastPrice' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-4 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('currentValue')}>
                Güncel Değer {sortField === 'currentValue' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-4 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('profitLossPct')}>
                K/Z {sortField === 'profitLossPct' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-4 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sortedAndFilteredStocks.map(s => {
              const stats = s.stats;
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
                      {(stats?.profitLoss || 0) >= 0 ? '↑' : '↓'} {formatPercentage(Math.abs(stats?.profitLossPct || 0))}
                    </div>
                  </td>
                  <td className="px-6 py-4 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setSelectedStockId(s.id); setIsAddingPurchase(true); }} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-slate-700" title="Alım Ekle"><Plus size={14}/></button>
                    <button onClick={() => setViewingPurchases(s.id)} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-blue-400 hover:bg-slate-700" title="Alımları Yönet"><Edit2 size={14}/></button>
                    <button 
                      onClick={() => {
                        if (window.confirm(`${s.ticker} portföyünüzden silinecektir. Emin misiniz?`)) {
                          dbService.remove('stocks', s.id);
                        }
                      }} 
                      className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-red-400 hover:bg-slate-700" 
                      title="Sil"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobil Görünümü (Kartlar) */}
      <div className="md:hidden space-y-4">
        {sortedAndFilteredStocks.map(s => {
          const stats = s.stats;
          return (
            <div 
              key={s.id} 
              onClick={() => setViewingStockDetails(s.id)}
              className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 space-y-4 active:scale-[0.98] transition-transform"
            >
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div>
                    <div className="font-bold text-lg text-slate-100">{s.ticker}</div>
                    <div className="text-xs text-slate-500">{s.name}</div>
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded-md text-xs font-medium h-fit mt-1",
                    (stats?.profitLoss || 0) >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                  )}>
                    {(stats?.profitLoss || 0) >= 0 ? '↑' : '↓'} {formatPercentage(Math.abs(stats?.profitLossPct || 0))}
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`${s.ticker} portföyünüzden silinecektir. Emin misiniz?`)) {
                      dbService.remove('stocks', s.id);
                    }
                  }}
                  className="p-2 -mt-1 -mr-1 text-slate-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
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
      {stocks.length > 0 && sortedAndFilteredStocks.length === 0 && <div className="p-12 text-center text-slate-500">Aramanıza uygun hisse bulunamadı.</div>}
    </motion.div>
  );
}
