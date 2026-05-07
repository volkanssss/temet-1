import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Download } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { Dividend } from '../../types/stock';

type DividendsTabProps = {
  dividends: Dividend[];
  searchQuery: string;
  setIsAddingDividend: (v: boolean) => void;
  onDeleteDividend: (id: string) => void;
};

// CSV Export
function exportDividendsCSV(dividends: Dividend[]) {
  const header = 'Tarih,Hisse,Hisse Başı,Lot,Net (₺),Stopaj,Brüt,Tür,Not\n';
  const rows = dividends
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(d =>
      [d.date, d.ticker, d.ps, d.qty, d.net, d.tax, d.gross, d.type, d.note || '']
        .map(v => `"${v}"`)
        .join(',')
    )
    .join('\n');
  const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `temettu-gecmis-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DividendsTab({ dividends, searchQuery, setIsAddingDividend, onDeleteDividend }: DividendsTabProps) {
  const thisYear  = new Date().getFullYear().toString();
  const thisMonth = new Date().toISOString().slice(0, 7);

  const yearDivs   = dividends.filter(d => d.date.startsWith(thisYear));
  const yearTotal  = yearDivs.reduce((a, d) => a + d.net, 0);
  const monthTotal = dividends.filter(d => d.date.startsWith(thisMonth)).reduce((a, d) => a + d.net, 0);
  const monthlyAvg = yearTotal / (new Date().getMonth() + 1);
  const allTime    = dividends.reduce((a, d) => a + d.net, 0);

  // Arama filtresi
  const q        = searchQuery.toLowerCase();
  const filtered = q
    ? dividends.filter(d => d.ticker.toLowerCase().includes(q) || (d.note || '').toLowerCase().includes(q))
    : dividends;

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

  // Aylar (tüm 12 ay)
  const allMonths = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    return `${thisYear}-${m}`;
  });
  const maxMonth = Math.max(...Object.values(byMonth), 1);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Özet Kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: `${thisYear} Toplam`, value: yearTotal, sub: `${yearDivs.length} ödeme` },
          { label: 'Bu Ay',             value: monthTotal,  sub: `${thisMonth.slice(5)} ayı` },
          { label: 'Aylık Ort.',        value: monthlyAvg,  sub: 'Bu yıl ortalaması' },
          { label: 'Tüm Zaman',         value: allTime,     sub: `${dividends.length} toplam` },
        ].map(card => (
          <div key={card.label} className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800">
            <div className="text-slate-500 text-xs font-medium mb-1">{card.label}</div>
            <div className="text-2xl font-bold text-white mb-1">{formatCurrency(card.value)}</div>
            <div className="text-[10px] text-slate-600">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Aylık Bar Chart (12 ay) */}
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">{thisYear} — Aylık Dağılım</h3>
        <div className="flex items-end gap-1.5 h-24">
          {allMonths.map(m => {
            const val  = byMonth[m] || 0;
            const pct  = val > 0 ? (val / maxMonth) * 100 : 0;
            const name = new Date(m + '-01').toLocaleString('tr-TR', { month: 'short' });
            const isThis = m === thisMonth;
            return (
              <div key={m} className="flex-1 flex flex-col items-center gap-1 group">
                <div
                  className={`w-full rounded-t transition-all ${isThis ? 'bg-cyan-500' : val > 0 ? 'bg-slate-600 group-hover:bg-slate-500' : 'bg-slate-800/50'}`}
                  style={{ height: `${Math.max(pct, val > 0 ? 8 : 2)}%` }}
                  title={val > 0 ? formatCurrency(val) : ''}
                />
                <span className={`text-[9px] font-medium ${isThis ? 'text-cyan-400' : 'text-slate-600'}`}>{name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hisse Başına */}
      {Object.keys(byStock).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 px-1">Hisse Başına Toplam</h3>
          <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-3 snap-x">
            {Object.entries(byStock)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([ticker, total]) => (
                <div key={ticker} className="min-w-[140px] snap-start bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col gap-1 shrink-0">
                  <div className="font-bold text-white">{ticker}</div>
                  <div className="font-medium text-emerald-400">{formatCurrency(total as number)}</div>
                  <div className="text-[10px] text-slate-600">
                    {dividends.filter(d => d.ticker === ticker).length} ödeme
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Liste + Butonlar */}
      <div className="flex justify-between items-center px-1">
        <h2 className="text-xl font-semibold text-slate-200">
          Geçmiş Ödemeler
          {q && <span className="text-sm font-normal text-slate-500 ml-2">({filtered.length} sonuç)</span>}
        </h2>
        <div className="flex gap-2">
          {dividends.length > 0 && (
            <button
              onClick={() => exportDividendsCSV(dividends)}
              className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 transition-colors"
              title="CSV olarak indir"
            >
              <Download size={15} />
            </button>
          )}
          <button
            onClick={() => setIsAddingDividend(true)}
            className="px-4 py-2 bg-slate-800 text-slate-200 text-sm font-medium rounded-full hover:bg-slate-700 transition-colors"
          >
            + Temettü Ekle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {[...filtered]
          .sort((a, b) => b.date.localeCompare(a.date))
          .map(d => (
            <div key={d.id} className="bg-slate-900/40 rounded-2xl border border-slate-800 p-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                  {d.ticker.slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="font-bold text-slate-100">{d.ticker}</div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">{d.type}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {d.date} • {d.qty} LOT • ₺{d.ps}/hisse
                    {d.tax > 0 && <span className="ml-2 text-slate-600">Stopaj: {formatCurrency(d.tax)}</span>}
                  </div>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <div className="text-lg font-bold text-emerald-400">{formatCurrency(d.net)}</div>
                <button
                  onClick={() => onDeleteDividend(d.id)}
                  className="text-[10px] text-slate-600 hover:text-red-400 mt-1 transition-colors"
                >
                  sil
                </button>
              </div>
            </div>
          ))}
        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <div className="text-3xl mb-3">💰</div>
            <div className="text-slate-500">{q ? 'Aramanıza uygun kayıt bulunamadı.' : 'Henüz temettü kaydı yok.'}</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
