import React from 'react';
import { AnimatePresence } from 'motion/react';
import Modal from '../ui/Modal';
import { StockStat, Purchase, Dividend } from '../../types/stock';
import { formatCurrency, formatPercentage } from '../../lib/utils';
import { cn } from '../../lib/utils';

interface StockDetailModalProps {
  stat: StockStat | null;
  purchases: Purchase[];
  dividends: Dividend[];
  onClose: () => void;
  onAddPurchase: () => void;
  onAddSale: () => void;
  onAddDividend: () => void;
  onDeleteStock: () => void;
}

export default function StockDetailModal({
  stat,
  purchases,
  dividends,
  onClose,
  onAddPurchase,
  onAddSale,
  onAddDividend,
  onDeleteStock,
}: StockDetailModalProps) {
  if (!stat) return null;

  const sPurchases = purchases.filter(p => p.stockId === stat.id).sort((a, b) => b.date.localeCompare(a.date));
  const sDividends = dividends.filter(d => d.stockId === stat.id).sort((a, b) => b.date.localeCompare(a.date));

  const costOnYield = stat.totalCost > 0 ? (stat.totalDiv / stat.totalCost) * 100 : 0;

  return (
    <AnimatePresence>
      <Modal
        title={`${stat.ticker} — Detay`}
        onClose={onClose}
        onSave={async () => { onClose(); }}
        saveLabel="✕ Kapat"
        size="lg"
      >
        <div className="space-y-5">
          {/* Başlık */}
          <div>
            <div className="text-xl font-bold text-slate-100">{stat.name}</div>
            <div className="text-sm text-slate-400">{stat.exchange} • {stat.sector}</div>
          </div>

          {/* Ana Metrikler */}
          <div className="flex justify-between items-center bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
            <div>
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Güncel Değer</div>
              <div className="text-2xl font-bold text-white">{formatCurrency(stat.currentValue)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Toplam K/Z</div>
              <div className={cn('text-xl font-bold', stat.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {stat.profitLoss >= 0 ? '▲' : '▼'} {formatPercentage(Math.abs(stat.profitLossPct))}
              </div>
              <div className={cn('text-sm font-medium', stat.profitLoss >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                {stat.profitLoss >= 0 ? '+' : ''}{formatCurrency(stat.profitLoss)}
              </div>
            </div>
          </div>

          {/* Detay Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Anlık Fiyat',       value: stat.lastPrice ? formatCurrency(stat.lastPrice) : '---', color: '' },
              { label: 'Ort. Maliyet',      value: formatCurrency(stat.avgCost), color: '' },
              { label: 'Toplam Lot',         value: `${stat.qty} LOT`, color: '' },
              { label: 'Toplam Maliyet',     value: formatCurrency(stat.totalCost), color: '' },
              { label: 'Toplam Temettü',     value: formatCurrency(stat.totalDiv), color: 'text-emerald-400' },
              { label: 'Maliyete Temettü Verimi', value: formatPercentage(costOnYield), color: 'text-emerald-400' },
            ].map(m => (
              <div key={m.label} className="bg-slate-800/30 p-3 rounded-xl border border-slate-800/50">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">{m.label}</div>
                <div className={cn('text-sm font-semibold', m.color || 'text-slate-200')}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Son Alımlar / Temettüler */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Son Alımlar</h3>
              <div className="space-y-2 max-h-[140px] overflow-y-auto hide-scrollbar">
                {sPurchases.slice(0, 5).map(p => (
                  <div key={p.id} className="flex justify-between items-center bg-slate-950/30 p-2.5 rounded-lg border border-slate-800/40 text-xs">
                    <div>
                      <div className="text-slate-300 font-medium">{p.qty} Lot</div>
                      <div className="text-slate-500">{formatCurrency(p.price)}/lot</div>
                    </div>
                    <div className="text-slate-500 text-right">{p.date}</div>
                  </div>
                ))}
                {sPurchases.length === 0 && <div className="text-center py-4 text-slate-600 text-xs italic">Kayıt yok.</div>}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Son Temettüler</h3>
              <div className="space-y-2 max-h-[140px] overflow-y-auto hide-scrollbar">
                {sDividends.slice(0, 5).map(d => (
                  <div key={d.id} className="flex justify-between items-center bg-emerald-500/5 p-2.5 rounded-lg border border-emerald-500/10 text-xs">
                    <div>
                      <div className="text-emerald-400 font-medium">{formatCurrency(d.net)}</div>
                      <div className="text-slate-500">{d.qty} lot</div>
                    </div>
                    <div className="text-slate-500 text-right">{d.date}</div>
                  </div>
                ))}
                {sDividends.length === 0 && <div className="text-center py-4 text-slate-600 text-xs italic">Kayıt yok.</div>}
              </div>
            </div>
          </div>

          {/* Aksiyonlar */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
            <button type="button" onClick={onAddPurchase}
              className="py-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors">
              + ALIM EKLE
            </button>
            <button type="button" onClick={onAddSale}
              className="py-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-amber-500/20 hover:text-amber-400 transition-colors">
              - SATIŞ EKLE
            </button>
            <button type="button" onClick={onAddDividend}
              className="py-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors">
              ₺ TEMETTÜ EKLE
            </button>
            <button type="button" onClick={onDeleteStock}
              className="py-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-red-500/20 hover:text-red-400 transition-colors">
              🗑 HİSSE SİL
            </button>
          </div>
        </div>
      </Modal>
    </AnimatePresence>
  );
}
