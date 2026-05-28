import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { dbService } from '../../services/db';
import { StockHolding } from '../../types/stock';
import { formatCurrency } from '../../lib/utils';

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

  // DRIP States
  const [isDrip, setIsDrip] = useState(false);
  const [dripPrice, setDripPrice] = useState('');
  const [dripQty, setDripQty] = useState('');

  // ps × qty değişince net'i otomatik hesapla
  const handleAutoCalc = (newPs: string, newQty: string) => {
    const p = parseFloat(newPs);
    const q = parseFloat(newQty);
    if (!isNaN(p) && !isNaN(q) && p > 0 && q > 0) {
      const calculatedNet = (p * q).toFixed(2);
      setNet(calculatedNet);
      
      // DRIP miktarını da güncelle
      if (isDrip && dripPrice) {
        const dp = parseFloat(dripPrice);
        if (!isNaN(dp) && dp > 0) {
          setDripQty(Math.floor(parseFloat(calculatedNet) / dp).toString());
        }
      }
    }
  };

  const handleDripPriceChange = (priceVal: string) => {
    setDripPrice(priceVal);
    const p = parseFloat(priceVal);
    const n = parseFloat(net);
    if (!isNaN(p) && p > 0 && !isNaN(n) && n > 0) {
      setDripQty(Math.floor(n / p).toString());
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

            if (isDrip) {
              const dQty = Number(dripQty);
              const dPrice = Number(dripPrice);
              if (isNaN(dQty) || dQty <= 0 || isNaN(dPrice) || dPrice <= 0) {
                onError('DRIP geri alım adet ve fiyatı 0\'dan büyük olmalıdır!');
                return;
              }
              if (dQty * dPrice > netVal) {
                onError('Geri alım tutarı, net temettü tutarından büyük olamaz!');
                return;
              }
            }

            // 1. Temettü Ekle
            const newDiv = await dbService.add('dividends', {
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

            // 2. Geri Alım (DRIP) seçilmişse
            if (isDrip) {
              const dQty = Number(dripQty);
              const dPrice = Number(dripPrice);
              
              const newPurchase = await dbService.add('purchases', {
                stockId: selectedStockId,
                qty: dQty,
                price: dPrice,
                date: data.date,
                note: `Temettü ödemesiyle otomatik geri alım. [DIV_REF:${newDiv.id}]`,
                isDrip: true,
              });

              // Temettü kaydını güncelle (çift yönlü silme desteği için)
              await dbService.update('dividends', newDiv.id, {
                note: `${data.note || ''} [DRIP_REF:${newPurchase.id}]`.trim()
              });
            }

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
                const stock = stocks.find(s => s.id === e.target.value);
                if (isDrip && stock?.lastPrice) {
                  setDripPrice(stock.lastPrice.toString());
                  const n = parseFloat(net);
                  if (!isNaN(n) && n > 0) {
                    setDripQty(Math.floor(n / stock.lastPrice).toString());
                  }
                }
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
              onChange={e => {
                setNet(e.target.value);
                const n = parseFloat(e.target.value);
                if (isDrip && dripPrice && !isNaN(n) && n > 0) {
                  const dp = parseFloat(dripPrice);
                  if (dp > 0) {
                    setDripQty(Math.floor(n / dp).toString());
                  }
                }
              }}
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

          {/* DRIP seçeneği */}
          <div className="pt-2 border-t border-slate-800/60">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={isDrip}
                onChange={e => {
                  setIsDrip(e.target.checked);
                  if (e.target.checked && selectedStockId) {
                    const stock = stocks.find(s => s.id === selectedStockId);
                    const defaultPrice = stock?.lastPrice || 1;
                    setDripPrice(defaultPrice.toString());
                    const n = parseFloat(net);
                    if (!isNaN(n) && n > 0) {
                      setDripQty(Math.floor(n / defaultPrice).toString());
                    }
                  }
                }}
                className="w-4 h-4 rounded accent-emerald-500"
              />
              <div>
                <div className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">
                  Temettü ile Geri Alım Yap (DRIP)
                </div>
                <div className="text-xs text-slate-500">Bu temettü ile otomatik hisse alımı kaydet</div>
              </div>
            </label>
          </div>

          {isDrip && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Birim Alım Fiyatı (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required={isDrip}
                    value={dripPrice}
                    onChange={e => handleDripPriceChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-sm outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Alınan Lot (Adet)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required={isDrip}
                    value={dripQty}
                    onChange={e => setDripQty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-sm outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between">
                <span>Tahmini kalan nakit:</span>
                <span className="font-semibold text-slate-400">
                  {formatCurrency(Math.max(0, (parseFloat(net) || 0) - (parseFloat(dripQty) || 0) * (parseFloat(dripPrice) || 0)))}
                </span>
              </div>
            </div>
          )}

          <Input label="Not (opsiyonel)" name="note" placeholder="Açıklama..." />
        </div>
      </Modal>
    </AnimatePresence>
  );
}

