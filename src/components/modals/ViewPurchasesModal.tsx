import React from 'react';
import { AnimatePresence } from 'motion/react';
import { Trash2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { dbService } from '../../services/db';
import { Purchase } from '../../types/stock';
import { formatCurrency } from '../../lib/utils';

interface ViewPurchasesModalProps {
  stockId: string | null;
  stockTicker: string;
  purchases: Purchase[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function ViewPurchasesModal({
  stockId,
  stockTicker,
  purchases,
  onClose,
  onSuccess,
  onError,
}: ViewPurchasesModalProps) {
  const filtered = purchases
    .filter(p => p.stockId === stockId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleDelete = async (p: Purchase) => {
    try {
      await dbService.remove('purchases', p.id);
      
      // DRIP ise ilişkili temettü kaydını da sil
      if (p.isDrip) {
        try {
          const allDividends = await dbService.list('dividends');
          const targetDiv = allDividends.find(d => d.note && d.note.includes(`[DRIP_REF:${p.id}]`));
          if (targetDiv) {
            await dbService.remove('dividends', targetDiv.id);
          }
        } catch (divErr) {
          console.error('İlişkili temettü silinemedi:', divErr);
        }
      }

      onSuccess('Alım kaydı silindi.');
    } catch (err: any) {
      onError(err.message || 'Silme işlemi başarısız!');
    }
  };

  return (
    <AnimatePresence>
      <Modal
        title={`${stockTicker} — Alım Geçmişi`}
        onClose={onClose}
        onSave={async () => onClose()}
        saveLabel="Kapat"
        size="lg"
      >
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-500 italic">
              Bu hisseye ait alım kaydı bulunamadı.
            </div>
          ) : (
            <>
              {/* Özet */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-800/50 p-3 rounded-xl text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Toplam Lot</div>
                  <div className="font-bold text-white">{filtered.reduce((s, p) => s + p.qty, 0)}</div>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-xl text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Toplam Maliyet</div>
                  <div className="font-bold text-white">{formatCurrency(filtered.reduce((s, p) => s + p.qty * p.price, 0))}</div>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-xl text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">İşlem Sayısı</div>
                  <div className="font-bold text-white">{filtered.length}</div>
                </div>
              </div>

              {filtered.map(p => (
                <div key={p.id} className="flex justify-between items-center bg-slate-950/50 border border-slate-800 p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-200">
                      {p.qty}
                    </div>
                    <div>
                      <div className="text-slate-200 font-medium">{p.qty} Lot</div>
                      <div className="text-xs text-slate-500">
                        {p.date} • {formatCurrency(p.price)}/lot
                        {p.isDrip && <span className="ml-2 text-emerald-400 font-bold">DRIP</span>}
                      </div>
                      {p.note && <div className="text-xs text-slate-600 mt-0.5">{p.note}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold text-emerald-400">{formatCurrency(p.qty * p.price)}</div>
                      <div className="text-[10px] text-slate-500">Toplam</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
                      className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
                      title="Bu alımı sil"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </Modal>
    </AnimatePresence>
  );
}
