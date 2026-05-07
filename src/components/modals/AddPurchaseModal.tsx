import React from 'react';
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
  const stock = stocks.find(s => s.id === stockId);

  return (
    <AnimatePresence>
      <Modal
        title={stock ? `Alım Ekle — ${stock.ticker}` : 'Alım Ekle'}
        onClose={onClose}
        onSave={async data => {
          try {
            if (!stockId) {
              onError('Hisse seçilmedi!');
              return;
            }
            const qty   = Number(data.qty);
            const price = Number(data.price);
            if (qty <= 0 || price <= 0) {
              onError('Adet ve fiyat 0\'dan büyük olmalıdır!');
              return;
            }
            await dbService.add('purchases', {
              stockId,
              qty,
              price,
              date:   data.date,
              note:   data.note || '',
              isDrip: data.isDrip === 'on',
            });
            onClose();
            onSuccess(`${qty} lot alım eklendi!`);
          } catch (err: any) {
            onError(err.message || 'Alım eklenemedi!');
          }
        }}
        saveLabel="Alımı Kaydet"
      >
        <div className="space-y-4">
          {stock && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center font-bold text-sm text-slate-200">
                {stock.ticker.slice(0, 2)}
              </div>
              <div>
                <div className="font-bold text-slate-100 text-sm">{stock.ticker}</div>
                <div className="text-xs text-slate-500">{stock.name} • {stock.exchange}</div>
              </div>
            </div>
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
