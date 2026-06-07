import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import { dbService } from '../../services/db';
import { StockHolding } from '../../types/stock';

interface AddPurchaseModalProps {
  stockId: string | null;
  stocks: StockHolding[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function AddPurchaseModal({
  stockId,
  stocks,
  onClose,
  onSuccess,
  onError,
}: AddPurchaseModalProps) {
  const [selectedStockId, setSelectedStockId] = useState<string>(stockId || '');
  const activeStock = stocks.find(s => s.id === (stockId || selectedStockId));

  return (
    <AnimatePresence>
      <Modal
        title={activeStock ? `Alım Ekle — ${activeStock.ticker}` : 'Alım Ekle'}
        onClose={onClose}
        onSave={async data => {
          try {
            const finalStockId = stockId || selectedStockId;
            if (!finalStockId) {
              onError('Lütfen bir hisse seçin!');
              return;
            }
            const currentStock = stocks.find(s => s.id === finalStockId);
            const qty   = Number(data.qty);
            const price = Number(data.price);
            if (qty <= 0 || price <= 0) {
              onError('Adet ve fiyat 0\'dan büyük olmalıdır!');
              return;
            }
            const isDripChecked = data.isDrip === 'on';
            const newPurchase = await dbService.add('purchases', {
              stockId: finalStockId,
              qty,
              price,
              date:   data.date,
              note:   data.note || '',
              isDrip: isDripChecked,
            });

            if (isDripChecked) {
              const netVal = qty * price;
              const newDiv = await dbService.add('dividends', {
                stockId: finalStockId,
                ticker:  currentStock?.ticker || '',
                date:    data.date,
                ps:      price,
                qty:     qty,
                net:     netVal,
                tax:     0,
                gross:   netVal,
                type:    'Nakit',
                note:    `DRIP Alımı otomatik kaydı. ${data.note || ''} [DRIP_REF:${newPurchase.id}]`.trim(),
              });

              // Alım notunu da güncelle (çift yönlü silme için)
              await dbService.update('purchases', newPurchase.id, {
                note: `${data.note || ''} [DIV_REF:${newDiv.id}]`.trim()
              });
            }

            onClose();
            onSuccess(`${qty} lot alım eklendi!`);
          } catch (err: any) {
            onError(err.message || 'Alım eklenemedi!');
          }
        }}
        saveLabel="Alımı Kaydet"
      >
        <div className="space-y-4">
          {!stockId ? (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hisse Seçin</label>
              <select
                value={selectedStockId}
                onChange={e => setSelectedStockId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500 transition-colors"
                required
              >
                <option value="" disabled>Seçiniz...</option>
                {stocks.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.ticker} - {s.name} ({s.exchange})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            activeStock && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center font-bold text-sm text-slate-200">
                  {activeStock.ticker.slice(0, 2)}
                </div>
                <div>
                  <div className="font-bold text-slate-100 text-sm">{activeStock.ticker}</div>
                  <div className="text-xs text-slate-500">{activeStock.name} • {activeStock.exchange}</div>
                </div>
              </div>
            )
          )}

          <Input
            label="İşlem Tarihi"
            name="date"
            type="date"
            required
            defaultValue={new Date().toISOString().split('T')[0]}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Adet / Lot" name="qty" type="number" min="1" step="1" required />
            <Input label="Birim Fiyat (₺)" name="price" type="number" min="0.01" step="0.01" required />
          </div>

          <Input label="Not (opsiyonel)" name="note" placeholder="Neden aldım?" />

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              name="isDrip"
              className="w-4 h-4 rounded accent-cyan-500"
            />
            <div>
              <div className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                DRIP Alımı
              </div>
              <div className="text-xs text-slate-500">Bu alım temettü geliriyle yapıldı</div>
            </div>
          </label>
        </div>
      </Modal>
    </AnimatePresence>
  );
}
