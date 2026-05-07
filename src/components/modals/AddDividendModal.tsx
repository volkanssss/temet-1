import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { dbService } from '../../services/db';
import { StockHolding } from '../../types/stock';

interface AddDividendModalProps {
  stocks: StockHolding[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function AddDividendModal({ stocks, onClose, onSuccess, onError }: AddDividendModalProps) {
  const [selectedStockId, setSelectedStockId] = useState('');
  const [ps, setPs]       = useState('');
  const [qty, setQty]     = useState('');
  const [net, setNet]     = useState('');
  const [tax, setTax]     = useState('0');

  // ps × qty değişince net'i otomatik hesapla
  const handleAutoCalc = (newPs: string, newQty: string) => {
    const p = parseFloat(newPs);
    const q = parseFloat(newQty);
    if (!isNaN(p) && !isNaN(q) && p > 0 && q > 0) {
      setNet((p * q).toFixed(2));
    }
  };

  return (
    <AnimatePresence>
      <Modal
        title="Temettü Kaydı"
        onClose={onClose}
        onSave={async data => {
          try {
            if (!selectedStockId) {
              onError('Lütfen bir hisse seçin!');
              return;
            }
            const stock = stocks.find(s => s.id === selectedStockId);
            const netVal   = Number(data.net);
            const taxVal   = Number(data.tax || 0);
            const psVal    = Number(data.ps);
            const qtyVal   = Number(data.qty);

            if (psVal <= 0 || qtyVal <= 0 || netVal <= 0) {
              onError('Hisse başı, lot sayısı ve net tutar 0\'dan büyük olmalıdır!');
              return;
            }

            await dbService.add('dividends', {
              stockId: selectedStockId,
              ticker:  stock?.ticker || '',
              date:    data.date,
              ps:      psVal,
              qty:     qtyVal,
              net:     netVal,
              tax:     taxVal,
              gross:   netVal + taxVal,
              type:    data.type,
              note:    data.note || '',
            });
            onClose();
            onSuccess(`Temettü kaydedildi! Net: ₺${netVal.toFixed(2)}`);
          } catch (err: any) {
            onError(err.message || 'Temettü kaydedilemedi!');
          }
        }}
        saveLabel="Temettüyü Kaydet"
      >
        <div className="space-y-4">
          {/* Hisse Seçimi */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Hisse <span className="text-red-400">*</span>
            </label>
            <select
              required
              value={selectedStockId}
              onChange={e => {
                setSelectedStockId(e.target.value);
                // Seçilen hissenin lot sayısını otomatik doldur (opsiyonel)
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-cyan-500 transition-colors appearance-none"
            >
              <option value="" disabled>Hisse seçin...</option>
              {stocks.map(s => (
                <option key={s.id} value={s.id}>{s.ticker} — {s.name}</option>
              ))}
            </select>
          </div>

          <Input label="Ödeme Tarihi" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Hisse Başı Net (₺)"
              name="ps"
              type="number"
              step="0.0001"
              min="0"
              required
              value={ps}
              onChange={e => {
                setPs(e.target.value);
                handleAutoCalc(e.target.value, qty);
              }}
            />
            <Input
              label="Lot Sayısı"
              name="qty"
              type="number"
              min="1"
              step="1"
              required
              value={qty}
              onChange={e => {
                setQty(e.target.value);
                handleAutoCalc(ps, e.target.value);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Net Toplam (₺)"
              name="net"
              type="number"
              step="0.01"
              required
              value={net}
              hint="ps × lot otomatik hesaplanır"
              onChange={e => setNet(e.target.value)}
            />
            <Input
              label="Stopaj Vergisi (₺)"
              name="tax"
              type="number"
              step="0.01"
              min="0"
              value={tax}
              onChange={e => setTax(e.target.value)}
            />
          </div>

          <Select
            label="Temettü Türü"
            name="type"
            options={[
              { label: 'Nakit Temettü', value: 'Nakit' },
              { label: 'Hisse Temettü', value: 'Hisse' },
              { label: 'Ara Ödeme', value: 'Ara Ödeme' },
              { label: 'Fon Dağıtımı', value: 'Fon' },
            ]}
            defaultValue="Nakit"
          />

          <Input label="Not (opsiyonel)" name="note" placeholder="Açıklama..." />
        </div>
      </Modal>
    </AnimatePresence>
  );
}
