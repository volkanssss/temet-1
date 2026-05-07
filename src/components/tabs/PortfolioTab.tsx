import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';
import { cn, formatCurrency, formatPercentage } from '../../lib/utils';
import { StockStat, StockHolding, Purchase } from '../../types/stock';

type PortfolioTabProps = {
  stocks: StockHolding[];
  stockStats: StockStat[];
  loading: boolean;
  searchQuery: string;
  setIsAddingStock: (v: boolean) => void;
  setViewingStockDetails: (id: string) => void;
  setSelectedStockId: (id: string) => void;
  setIsAddingPurchase: (v: boolean) => void;
  setIsAddingSale: (v: boolean) => void;
  setViewingPurchases: (id: string) => void;
  onDeleteStock: (id: string, ticker: string) => void;
};

type SortField = 'ticker' | 'sector' | 'qty' | 'avgCost' | 'lastPrice' | 'currentValue' | 'profitLossPct';
type SortDir   = 'asc' | 'desc';

export default function PortfolioTab({
  stocks, stockStats, loading, searchQuery,
  setIsAddingStock, setViewingStockDetails,
  setSelectedStockId, setIsAddingPurchase, setIsAddingSale,
  setViewingPurchases, onDeleteStock,
}: PortfolioTabProps) {
  const [sortField, setSortField] = useState<SortField>('currentValue');
  const [sortDir,   setSortDir]   = useState<SortDir>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedFiltered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    let list = stockStats.filter(s =>
      !q ||
      s.ticker.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.sector.toLowerCase().includes(q)
    );
    list = [...list].sort((a, b) => {
      let vA: any = a[sortField] ?? 0;
      let vB: any = b[sortField] ?? 0;
      if (typeof vA === 'string') vA = vA.toLowerCase();
      if (typeof vB === 'string') vB = vB.toLowerCase();
      if (vA < vB) return sortDir === 'asc' ? -1 : 1;
      if (vA > vB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [stockStats, searchQuery, sortField, sortDir]);

  const SortBtn = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="px-4 py-3 font-medium cursor-pointer hover:text-white transition-colors whitespace-nowrap select-none"
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortField === field
          ? <span className="text-cyan-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
          : <ArrowUpDown size={11} className="opacity-30" />}
      </span>
    </th>
  );

  // Özet
  const totalValue = stockStats.reduce((a, s) => a + s.currentValue, 0);
  const totalPnl   = stockStats.reduce((a, s) => a + s.profitLoss, 0);
  const totalCost  = stockStats.reduce((a, s) => a + s.totalCost, 0);
  const pnlPct     = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Başlık + Ekle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-200">Varlık Listesi</h2>
          {stocks.length > 0 && (
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span>{stocks.length} hisse</span>
              <span className={cn(totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400', 'font-medium')}>
                {totalPnl >= 0 ? '▲' : '▼'} {formatPercentage(Math.abs(pnlPct))} ({totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)})
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsAddingStock(true)}
          className="px-5 py-2.5 rounded-full bg-cyan-500 text-slate-950 font-bold text-sm hover:bg-cyan-400 transition-all w-full md:w-auto flex justify-center items-center gap-2 shadow-lg shadow-cyan-500/20"
        >
          <Plus size={15} /> Hisse Ekle <span className="opacity-50 text-xs font-normal">(N)</span>
        </button>
      </div>

      {loading && stocks.length > 0 && (
        <div className="text-xs text-slate-400 animate-pulse flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
          Fiyatlar güncelleniyor...
        </div>
      )}

      {/* ─── Desktop Tablo ─────────────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto bg-slate-900/50 rounded-2xl border border-slate-800">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-400 bg-slate-800/50 uppercase">
            <tr>
              <SortBtn field="ticker"       label="Hisse"        />
              <SortBtn field="sector"       label="Sektör"       />
              <SortBtn field="qty"          label="Lot"          />
              <SortBtn field="avgCost"      label="Ort. Maliyet" />
              <SortBtn field="lastPrice"    label="Fiyat"        />
              <SortBtn field="currentValue" label="Değer"        />
              <SortBtn field="profitLossPct" label="K/Z %"       />
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {sortedFiltered.map(s => (
              <tr
                key={s.id}
                onClick={() => setViewingStockDetails(s.id)}
                className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
              >
                <td className="px-4 py-3.5">
                  <div className="font-bold text-slate-100 group-hover:text-white">{s.ticker}</div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{s.name}</div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-xs px-2 py-1 rounded-md bg-slate-800/80 text-slate-400">{s.sector}</span>
                </td>
                <td className="px-4 py-3.5 font-medium text-slate-200">{s.qty}</td>
                <td className="px-4 py-3.5 text-slate-300">{formatCurrency(s.avgCost)}</td>
                <td className="px-4 py-3.5 text-slate-300">
                  {s.lastPrice
                    ? formatCurrency(s.lastPrice)
                    : <span className="text-[10px] text-slate-600 bg-slate-800 px-2 py-1 rounded">—</span>}
                </td>
                <td className="px-4 py-3.5 font-bold text-white">{formatCurrency(s.currentValue)}</td>
                <td className="px-4 py-3.5">
                  <span className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold',
                    s.profitLoss >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  )}>
                    {s.profitLoss >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {formatPercentage(Math.abs(s.profitLossPct))}
                  </span>
                </td>
                <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <button onClick={() => { setSelectedStockId(s.id); setIsAddingPurchase(true); }}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 transition-colors" title="Alım Ekle">
                      <Plus size={13} />
                    </button>
                    <button onClick={() => { setSelectedStockId(s.id); setIsAddingSale(true); }}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-700 transition-colors" title="Satış Ekle">
                      <TrendingDown size={13} />
                    </button>
                    <button onClick={() => setViewingPurchases(s.id)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-blue-400 hover:bg-slate-700 transition-colors" title="Alımları Gör">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => onDeleteStock(s.id, s.ticker)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors" title="Sil">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── Mobil Kartlar ─────────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {sortedFiltered.map(s => (
          <div
            key={s.id}
            onClick={() => setViewingStockDetails(s.id)}
            className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 space-y-3 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-lg text-slate-100">{s.ticker}</div>
                <div className="text-xs text-slate-500">{s.name} • {s.sector}</div>
              </div>
              <span className={cn(
                'px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1',
                s.profitLoss >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              )}>
                {s.profitLoss >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {formatPercentage(Math.abs(s.profitLossPct))}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><div className="text-slate-500 mb-0.5">Adet</div><div className="text-slate-200 font-medium">{s.qty} lot</div></div>
              <div><div className="text-slate-500 mb-0.5">Ort. Maliyet</div><div className="text-slate-200 font-medium">{formatCurrency(s.avgCost)}</div></div>
              <div><div className="text-slate-500 mb-0.5">Güncel Fiyat</div><div className="text-slate-200 font-medium">{s.lastPrice ? formatCurrency(s.lastPrice) : '---'}</div></div>
              <div><div className="text-slate-500 mb-0.5">Güncel Değer</div><div className="text-white font-bold">{formatCurrency(s.currentValue)}</div></div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800/60" onClick={e => e.stopPropagation()}>
              <button onClick={() => { setSelectedStockId(s.id); setIsAddingPurchase(true); }}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center gap-1.5 text-xs font-medium hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors">
                <Plus size={13} /> Alım
              </button>
              <button onClick={() => { setSelectedStockId(s.id); setIsAddingSale(true); }}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center gap-1.5 text-xs font-medium hover:bg-amber-500/20 hover:text-amber-400 transition-colors">
                <TrendingDown size={13} /> Satış
              </button>
              <button onClick={() => setViewingPurchases(s.id)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center gap-1.5 text-xs font-medium hover:bg-blue-500/20 hover:text-blue-400 transition-colors">
                <Edit2 size={13} /> Yönet
              </button>
              <button onClick={() => onDeleteStock(s.id, s.ticker)}
                className="p-2 rounded-xl bg-slate-800 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {stocks.length === 0 && (
        <div className="p-16 text-center">
          <div className="text-4xl mb-4">💼</div>
          <div className="text-slate-400 font-medium mb-2">Henüz hisse eklenmemiş</div>
          <div className="text-slate-600 text-sm">Portföyünüzü oluşturmak için "Hisse Ekle" butonuna tıklayın</div>
        </div>
      )}
      {stocks.length > 0 && sortedFiltered.length === 0 && (
        <div className="p-12 text-center text-slate-500">
          Aramanıza uygun hisse bulunamadı.
        </div>
      )}
    </motion.div>
  );
}
