import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';
import { cn, formatCurrency, formatPercentage } from '../../lib/utils';
import { StockStat, StockHolding } from '../../types/stock';

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
        {/* Desktop ekle butonu (mobilde FAB kullanılıyor) */}
        <button
          onClick={() => setIsAddingStock(true)}
          className="hidden md:flex px-5 py-2.5 rounded-full bg-cyan-500 text-slate-950 font-bold text-sm hover:bg-cyan-400 transition-all items-center gap-2 shadow-lg shadow-cyan-500/20"
        >
          <Plus size={15} /> Hisse Ekle <span className="opacity-50 text-xs font-normal">(N)</span>
        </button>
      </div>

      {/* ─── Desktop Tablo ─────────────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto premium-card">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="text-[10px] text-slate-400 bg-slate-800/40 uppercase tracking-wider">
            <tr>
              <SortBtn field="ticker"       label="Hisse"        />
              <SortBtn field="sector"       label="Sektör"       />
              <SortBtn field="qty"          label="Lot"          />
              <SortBtn field="avgCost"      label="Ort. Maliyet" />
              <SortBtn field="lastPrice"    label="Fiyat"        />
              <SortBtn field="currentValue" label="Değer"        />
              <SortBtn field="profitLossPct" label="K/Z %"       />
              <th className="px-6 py-4 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {sortedFiltered.map(s => (
              <tr
                key={s.id}
                onClick={() => setViewingStockDetails(s.id)}
                className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
              >
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-100 group-hover:text-white transition-colors">{s.ticker}</div>
                  <div className="text-[10px] text-slate-500 font-semibold truncate max-w-[140px] mt-0.5">{s.name}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/60 text-slate-400 border border-slate-700/20">{s.sector}</span>
                </td>
                <td className="px-6 py-4 font-bold text-slate-200 tabular-nums">{s.qty}</td>
                <td className="px-6 py-4 text-slate-300 tabular-nums">{formatCurrency(s.avgCost)}</td>
                <td className="px-6 py-4 text-slate-300 tabular-nums">
                  {s.lastPrice
                    ? formatCurrency(s.lastPrice)
                    : <span className="text-[10px] text-slate-600 bg-slate-900 px-2 py-1 rounded border border-slate-800/50">—</span>}
                </td>
                <td className="px-6 py-4 font-extrabold text-white tabular-nums">{formatCurrency(s.currentValue)}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border',
                    s.profitLoss >= 0 
                      ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10' 
                      : 'bg-red-500/5 text-red-400 border-red-500/10'
                  )}>
                    {s.profitLoss >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {formatPercentage(Math.abs(s.profitLossPct))}
                  </span>
                </td>
                <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-end gap-1.5">
                    <button onClick={() => { setSelectedStockId(s.id); setIsAddingPurchase(true); }}
                      className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 hover:border-emerald-500/30 transition-all border border-slate-700/30 active:scale-95" title="Alım Ekle">
                      <Plus size={13} />
                    </button>
                    <button onClick={() => { setSelectedStockId(s.id); setIsAddingSale(true); }}
                      className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-amber-400 hover:bg-slate-700 hover:border-amber-500/30 transition-all border border-slate-700/30 active:scale-95" title="Satış Ekle">
                      <TrendingDown size={13} />
                    </button>
                    <button onClick={() => setViewingPurchases(s.id)}
                      className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-blue-400 hover:bg-slate-700 hover:border-blue-500/30 transition-all border border-slate-700/30 active:scale-95" title="Alımları Gör">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => onDeleteStock(s.id, s.ticker)}
                      className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-red-400 hover:bg-slate-700 hover:border-red-500/30 transition-all border border-slate-700/30 active:scale-95" title="Sil">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── Mobil Kartlar (Premium Tasarım) ──────────────────────── */}
      <div className="md:hidden space-y-4">
        {sortedFiltered.map((s, idx) => {
          const isUp     = s.profitLoss >= 0;
          const pnlColor = isUp ? 'text-emerald-400' : 'text-red-400';
          const pnlBg    = isUp ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/10';
          const weight   = totalValue > 0 ? (s.currentValue / totalValue) * 100 : 0;

          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              onClick={() => setViewingStockDetails(s.id)}
              className="premium-card overflow-hidden active:scale-[0.985] transition-all cursor-pointer border border-slate-800/50 shadow-md"
            >
              {/* ── Üst: Ticker + K/Z Badge ── */}
              <div className="px-6 pt-6 pb-4 flex justify-between items-start">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-650 flex items-center justify-center font-bold text-sm text-slate-200 shrink-0">
                    {s.ticker.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-extrabold text-base text-white">{s.ticker}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 max-w-[180px] truncate font-medium">{s.name}</div>
                  </div>
                </div>
                <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 ${pnlBg}`}>
                  {isUp ? <TrendingUp size={11} className={pnlColor} /> : <TrendingDown size={11} className={pnlColor} />}
                  <span className={pnlColor}>{isUp ? '+' : ''}{formatPercentage(Math.abs(s.profitLossPct))}</span>
                </div>
              </div>

              {/* ── Değer Satırı ── */}
              <div className="px-6 pb-4 flex justify-between items-end">
                <div>
                  <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Güncel Değer</div>
                  <div className="text-2xl font-black text-white tabular-nums">{formatCurrency(s.currentValue)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">K/Z</div>
                  <div className={`text-base font-extrabold ${pnlColor} tabular-nums`}>
                    {isUp ? '+' : ''}{formatCurrency(s.profitLoss)}
                  </div>
                </div>
              </div>

              {/* ── Portföy Ağırlık Çubuğu ── */}
              <div className="px-6 pb-4">
                <div className="flex justify-between text-[9px] text-slate-500 mb-1.5 font-bold uppercase tracking-wider">
                  <span>Portföy Ağırlığı</span>
                  <span className="text-slate-400">{weight.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-slate-950/40 border border-slate-800/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                    style={{ width: `${Math.min(weight, 100)}%` }}
                  />
                </div>
              </div>

              {/* ── Detay 4'lü Grid ── */}
              <div className="px-6 pb-5 grid grid-cols-4 gap-2.5">
                {[
                  { label: 'Lot',        value: `${s.qty}` },
                  { label: 'Ort. Mal.', value: formatCurrency(s.avgCost) },
                  { label: 'Fiyat',     value: s.lastPrice ? formatCurrency(s.lastPrice) : '—' },
                  { label: 'Sektör',    value: s.sector },
                ].map(item => (
                  <div key={item.label} className="bg-slate-950/30 rounded-2xl py-3 px-2 text-center border border-slate-800/30">
                    <div className="text-[8px] text-slate-500 uppercase font-bold mb-1.5 leading-tight tracking-wide">{item.label}</div>
                    <div className="text-[10px] font-extrabold text-slate-200 truncate">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* ── Alt Aksiyon Butonları (44px min dokunma) ── */}
              <div className="flex border-t border-slate-800/40" onClick={e => e.stopPropagation()}>
                {[
                  { label: 'Alım',  icon: <Plus size={16} />,          color: 'hover:text-emerald-400 hover:bg-emerald-500/5 active:bg-emerald-500/10', action: () => { setSelectedStockId(s.id); setIsAddingPurchase(true); } },
                  { label: 'Satış', icon: <TrendingDown size={16} />,   color: 'hover:text-amber-400 hover:bg-amber-500/5 active:bg-amber-500/10',   action: () => { setSelectedStockId(s.id); setIsAddingSale(true); } },
                  { label: 'Yönet', icon: <Edit2 size={16} />,          color: 'hover:text-cyan-400 hover:bg-cyan-500/5 active:bg-cyan-500/10',     action: () => setViewingPurchases(s.id) },
                  { label: 'Sil',   icon: <Trash2 size={16} />,         color: 'hover:text-red-400 hover:bg-red-500/5 active:bg-red-500/10',        action: () => onDeleteStock(s.id, s.ticker) },
                ].map((btn, i) => (
                  <React.Fragment key={btn.label}>
                    {i > 0 && <div className="w-px bg-slate-800/40 shrink-0" />}
                    <button
                      onClick={btn.action}
                      className={cn(
                        'flex-1 py-4 flex flex-col items-center justify-center gap-1.5 text-slate-400 transition-colors',
                        btn.color
                      )}
                    >
                      {btn.icon}
                      <span className="text-[9px] font-bold uppercase tracking-wider">{btn.label}</span>
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Boş durum */}
      {stocks.length === 0 && (
        <div className="py-20 text-center premium-card">
          <div className="text-5xl mb-4">💼</div>
          <div className="text-slate-400 font-bold mb-2">Portföyünüz henüz boş</div>
          <div className="text-slate-500 text-sm mb-8">İlk hissenizi ekleyerek başlayın</div>
          <button
            onClick={() => setIsAddingStock(true)}
            className="px-8 py-3.5 bg-cyan-500 text-slate-950 font-bold text-sm rounded-2xl hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20"
          >
            + İlk Hisseyi Ekle
          </button>
        </div>
      )}
      {stocks.length > 0 && sortedFiltered.length === 0 && (
        <div className="p-12 text-center text-slate-500 premium-card">
          Aramanıza uygun hisse bulunamadı.
        </div>
      )}
    </motion.div>
  );
}
