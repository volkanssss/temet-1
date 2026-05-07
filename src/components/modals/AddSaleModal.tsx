import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { dbService } from '../../services/db';
import { StockStat } from '../../types/stock';
import { formatCurrency } from '../../lib/utils';

interface AddSaleModalProps {
  stockStat: StockStat | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function AddSaleModal({ stockStat, onClose, onSuccess, onError }: AddSaleModalProps) {
  const [qty, setQty]     = useState('');
  const [price, setPrice] = useState(stockStat?.lastPrice?.toString() || '');

  if (!stockStat) return null;

  const saleQty    = parseFloat(qty) || 0;
  const salePrice  = parseFloat(price) || 0;
  const costBasis  = saleQty * stockStat.avgCost;
  const proceeds   = saleQty * salePrice;
  const pnl        = proceeds - costBasis;
  const pnlPct     = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

  return (
    <AnimatePresence>
      <Modal
        title={`Satış — ${stockStat.ticker}`}
        onClose={onClose}
        onSave={async data => {
          try {
            const sQty   = Number(data.qty);
            const sPrice = Number(data.price);

            if (sQty <= 0 || sPrice <= 0) {
              onError('Adet ve fiyat 0\'dan büyük olmalıdır!');
              return;
            }
            if (sQty > stockStat.qty) {
              onError(`Elinizde sadece ${stockStat.qty} lot var!`);
              return;
            }

            const rPnl      = sQty * sPrice - sQty * stockStat.avgCost;
            const rCostBasis = sQty * stockStat.avgCost;

            // Satışı kaydet
            await dbService.add('sales', {
              stockId:     stockStat.id,
              ticker:      stockStat.ticker,
              date:        data.date,
              qty:         sQty,
              price:       sPrice,
              costBasis:   rCostBasis,
              realizedPnl: rPnl,
              note:        data.note || '',
            });

            // Alımlardan düş (FIFO: en eski alımları önce sat)
            // Basit yaklaşım: purchase'a negatif qty ekle yerine
            // purchase lot'larını kademeli olarak sil/güncelle
            // (Bu MVP versiyonu — satışı ayrı bir tablo olarak kaydediyoruz)

            onClose();
            onSuccess(`${sQty} lot ${stockStat.ticker} satıldı! ${rPnl >= 0 ? '+' : ''}${formatCurrency(rPnl)} K/Z`);
          } catch (err: any) {
            onError(err.message || 'Satış kaydedilemedi!');
          }
        }}
        saveLabel="Satışı Kaydet"
      >
        <div className="space-y-4">
          {/* Özet */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Elinizdeki</div>
              <div className="font-bold text-white">{stockStat.qty} Lot</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Ort. Maliyet</div>
              <div className="font-bold text-white">{formatCurrency(stockStat.avgCost)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Güncel Fiyat</div>
              <div className="font-bold text-white">{stockStat.lastPrice ? formatCurrency(stockStat.lastPrice) : '---'}</div>
            </div>
          </div>

          <Input label="Satış Tarihi" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Satılacak Lot"
              name="qty"
              type="number"
              min="1"
              max={stockStat.qty}
              step="1"
              required
              value={qty}
              onChange={e => setQty(e.target.value)}
              hint={`Max: ${stockStat.qty} lot`}
            />
            <Input
              label="Satış Fiyatı (₺)"
              name="price"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={price}
              onChange={e => setPrice(e.target.value)}
            />
          </div>

          <Input label="Not (opsiyonel)" name="note" placeholder="Satış nedeni..." />

          {/* Canlı P/L Önizleme */}
          {saleQty > 0 && salePrice > 0 && (
            <div className={`rounded-xl border p-4 ${pnl >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <div className="text-xs text-slate-400 font-bold uppercase mb-2">Tahmini Sonuç</div>
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div>
                  <div className="text-slate-500 mb-1">Maliyet</div>
                  <div className="font-bold text-slate-200">{formatCurrency(costBasis)}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Gelir</div>
                  <div className="font-bold text-slate-200">{formatCurrency(proceeds)}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">K/Z</div>
                  <div className={`font-bold text-lg ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                  </div>
                  <div className={`text-[10px] ${pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </AnimatePresence>
  );
}
