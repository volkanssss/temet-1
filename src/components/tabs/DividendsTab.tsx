import React from 'react';
import { motion } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { dbService } from '../../services/db';

type DividendsTabProps = {
  dividends: any[];
  setIsAddingDividend: (v: boolean) => void;
};

export default function DividendsTab({
  dividends,
  setIsAddingDividend
}: DividendsTabProps) {
  const thisYear = new Date().getFullYear().toString();
  const yearDivs = dividends.filter(d => d.date.startsWith(thisYear));
  const yearTotal = yearDivs.reduce((a, d) => a + d.net, 0);
  const monthlyAvg = yearTotal / (new Date().getMonth() + 1);
  const allTimeTotal = dividends.reduce((a, d) => a + d.net, 0);
  const dripDivs = dividends.filter(d => (d as any).isDrip);
  const dripTotal = dripDivs.reduce((a, d) => a + d.net, 0);

  const byStock = dividends.reduce((acc, d) => {
    acc[d.ticker] = (acc[d.ticker] || 0) + d.net;
    return acc;
  }, {} as Record<string, number>);

  const byMonth = dividends
    .filter(d => d.date.startsWith(thisYear))
    .reduce((acc, d) => {
      const m = d.date.slice(0, 7);
      acc[m] = (acc[m] || 0) + d.net;
      return acc;
    }, {} as Record<string, number>);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Özet Kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800">
          <div className="text-slate-500 text-xs font-medium mb-1">{thisYear} Toplam</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(yearTotal)}</div>
        </div>
        <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800">
          <div className="text-slate-500 text-xs font-medium mb-1">Aylık Ort.</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(monthlyAvg)}</div>
        </div>
        <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800">
          <div className="text-slate-500 text-xs font-medium mb-1">Tüm Zaman</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(allTimeTotal)}</div>
        </div>
        <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700">
          <div className="text-cyan-400 text-xs font-medium mb-1">DRIP Geri Alım</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(dripTotal)}</div>
        </div>
      </div>

      {/* Aylık Dağılım */}
      {Object.keys(byMonth).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-4 px-1">{thisYear} — Aylık Dağılım</h3>
          <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-4 snap-x">
            {Object.entries(byMonth).sort().map(([month, total]) => (
              <div key={month} className="min-w-[140px] snap-start bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-slate-400 mb-1">
                  {new Date(month + '-01').toLocaleString('tr-TR', { month: 'long' })}
                </div>
                <div className="text-lg font-bold text-white">{formatCurrency(total as number)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hisse Başına Toplam */}
      {Object.keys(byStock).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-4 px-1">Hisse Başına Temettü</h3>
          <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-4 snap-x">
            {Object.entries(byStock).sort((a,b) => (b[1] as number)-(a[1] as number)).map(([ticker, total]) => (
              <div key={ticker} className="min-w-[160px] snap-start bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col gap-1">
                <div className="font-bold text-white">{ticker}</div>
                <div className="font-medium text-emerald-400">{formatCurrency(total as number)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liste Başlığı + Ekle Butonu */}
      <div className="flex justify-between items-center mb-4 px-1">
        <h2 className="text-xl font-semibold text-slate-200">Geçmiş Ödemeler</h2>
        <button 
          onClick={() => setIsAddingDividend(true)}
          className="px-5 py-2 bg-slate-800 text-slate-200 text-sm font-medium rounded-full hover:bg-slate-700"
        >
          Temettü Ekle
        </button>
      </div>
      
      <div className="grid grid-cols-1 gap-3">
          {[...dividends].sort((a,b) => b.date.localeCompare(a.date)).map(d => (
            <div key={d.id} className="bg-slate-900/40 rounded-2xl border border-slate-800 p-5 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-lg text-slate-300">{d.ticker.slice(0,1)}</div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-bold text-slate-100">{d.ticker}</div>
                    {(d as any).isDrip && <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md">DRIP</span>}
                  </div>
                  <div className="text-xs text-slate-500">{d.date} &bull; {d.qty} LOT &bull; ₺{d.ps}/HİSSE</div>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <div className="text-xl font-bold text-emerald-400">{formatCurrency(d.net)}</div>
                <button onClick={() => dbService.remove('dividends', d.id)} className="text-[10px] text-slate-500 hover:text-red-400 mt-1 flex items-center gap-1"><Trash2 size={12}/> SİL</button>
              </div>
            </div>
          ))}
          {dividends.length === 0 && <div className="p-12 text-center text-slate-500 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">Henüz ödeme kaydı yok.</div>}
      </div>
    </motion.div>
  );
}
