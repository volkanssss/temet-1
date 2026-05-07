import React, { useState, useCallback, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { dbService } from '../../services/db';
import { fetchStockInfo, BIST_STOCKS } from '../../services/price';

// Tüm sektörler — price.ts ile senkronize
export const ALL_SECTORS = [
  'Enerji', 'Banka', 'Sanayi', 'Teknoloji', 'Holding',
  'Gıda', 'Perakende', 'Ulaşım', 'GYO', 'Otomotiv',
  'Savunma', 'Kimya', 'Tarım', 'Hizmet', 'Diğer',
];

export const EXCHANGES = ['BIST', 'NYSE', 'NASDAQ', 'LSE', 'XETRA', 'Euronext', 'TSX'];

interface AddStockModalProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function AddStockModal({ onClose, onSuccess, onError }: AddStockModalProps) {
  const [data, setData] = useState({ ticker: '', name: '', sector: 'Diğer', exchange: 'BIST' });
  const [infoLoading, setInfoLoading] = useState(false);

  // Debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTickerChange = useCallback((val: string, exchange: string) => {
    setData(prev => ({ ...prev, ticker: val }));

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 2) return;

    debounceRef.current = setTimeout(async () => {
      setInfoLoading(true);
      try {
        const info = await fetchStockInfo(val, exchange);
        if (info.success && info.name) {
          setData(prev => ({ ...prev, name: info.name, sector: info.sector || prev.sector }));
        }
      } catch {
        // sessiz geç
      } finally {
        setInfoLoading(false);
      }
    }, 500); // 500ms debounce
  }, []);

  return (
    <AnimatePresence>
      <Modal
        title="Hisse Ekle"
        onClose={onClose}
        onSave={async () => {
          if (!data.ticker.trim()) {
            onError('Hisse kodu giriniz!');
            return;
          }
          try {
            const ticker = data.ticker.toUpperCase().trim();
            await dbService.add('stocks', {
              ticker,
              name: data.name || ticker,
              exchange: data.exchange,
              sector: data.sector,
            });
            onClose();
            onSuccess(`${ticker} portföye eklendi!`);
          } catch (err: any) {
            onError(err.message || 'Hisse eklenemedi!');
          }
        }}
        saveLabel="Portföye Ekle"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Borsa"
              name="exchange"
              value={data.exchange}
              onChange={e => setData(prev => ({ ...prev, exchange: e.target.value }))}
              options={EXCHANGES}
            />
            <Input
              label="Hisse Kodu"
              name="ticker"
              placeholder="TUPRS"
              required
              autoFocus
              value={data.ticker}
              onChange={e => handleTickerChange(e.target.value.toUpperCase(), data.exchange)}
            />
          </div>

          <Input
            label={infoLoading ? 'Şirket Adı (aranıyor...)' : 'Şirket Adı'}
            name="name"
            placeholder="Otomatik doldurulur"
            value={data.name}
            hint="Hisse kodu girilince otomatik aranır"
            onChange={e => setData(prev => ({ ...prev, name: e.target.value }))}
          />

          <Select
            label="Sektör"
            name="sector"
            value={data.sector}
            onChange={e => setData(prev => ({ ...prev, sector: e.target.value }))}
            options={ALL_SECTORS}
          />

          {/* Öneri Listesi */}
          {data.ticker.length >= 1 && data.exchange === 'BIST' && (() => {
            const suggestions = Object.entries(BIST_STOCKS)
              .filter(([t]) => t.startsWith(data.ticker.toUpperCase()) && t !== data.ticker.toUpperCase())
              .slice(0, 5);
            if (!suggestions.length) return null;
            return (
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Öneriler</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map(([t, info]) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setData({ ticker: t, name: info.name, sector: info.sector, exchange: data.exchange });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      <span className="font-bold">{t}</span>
                      <span className="text-slate-500 ml-1">{info.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </Modal>
    </AnimatePresence>
  );
}
