import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, RefreshCcw, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { Dividend, Purchase, StockHolding } from '../../types/stock';

type DividendsTabProps = {
  dividends: Dividend[];
  purchases: Purchase[];
  stocks: StockHolding[];
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

export default function DividendsTab({
  dividends, purchases, stocks, searchQuery, setIsAddingDividend, onDeleteDividend,
}: DividendsTabProps) {
  const [showDrip, setShowDrip] = useState(false);

  const thisYear  = new Date().getFullYear().toString();
  const thisMonth = new Date().toISOString().slice(0, 7);

  const yearDivs   = dividends.filter(d => d.date.startsWith(thisYear));
  const yearTotal  = yearDivs.reduce((a, d) => a + d.net, 0);
  const monthTotal = dividends.filter(d => d.date.startsWith(thisMonth)).reduce((a, d) => a + d.net, 0);
  const monthlyAvg = yearTotal / (new Date().getMonth() + 1);
  const allTime    = dividends.reduce((a, d) => a + d.net, 0);

  // DRIP alımları (isDrip = true olan tüm purchase'lar)
  const dripPurchases = purchases.filter(p => p.isDrip);
  const totalDrip     = dripPurchases.reduce((acc, p) => acc + p.qty * p.price, 0);
  const thisYearDrip  = dripPurchases
    .filter(p => p.date.startsWith(thisYear))
    .reduce((acc, p) => acc + p.qty * p.price, 0);

  // DRIP'i hisseye göre grupla
  const dripByStock = dripPurchases.reduce((acc, p) => {
    const stock = stocks.find(s => s.id === p.stockId);
    const ticker = stock?.ticker || p.stockId;
    if (!acc[ticker]) acc[ticker] = { ticker, name: stock?.name || '', purchases: [], total: 0, totalQty: 0 };
    acc[ticker].purchases.push(p);
    acc[ticker].total    += p.qty * p.price;
    acc[ticker].totalQty += p.qty;
    return acc;
  }, {} as Record<string, { ticker: string; name: string; purchases: Purchase[]; total: number; totalQty: number }>);

  const dripStocks = Object.values(dripByStock).sort((a, b) => b.total - a.total);

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

      {/* ─── DRIP GERİ ALIM TAKİP ─── */}
      {dripPurchases.length > 0 && (
        <div className="bg-slate-900/50 rounded-2xl border border-emerald-500/20 overflow-hidden">
          {/* DRIP Başlık */}
          <button
            onClick={() => setShowDrip(s => !s)}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-800/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <RefreshCcw size={18} className="text-emerald-400" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  DRIP Geri Alım Takibi
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                    {dripPurchases.length} işlem
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Temettülerle yeniden yatırım yapılan alımlar
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-lg font-bold text-emerald-400">{formatCurrency(totalDrip)}</div>
                <div className="text-[10px] text-slate-500">{thisYear}: {formatCurrency(thisYearDrip)}</div>
              </div>
              {showDrip ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
            </div>
          </button>

          <AnimatePresence>
            {showDrip && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 space-y-4 border-t border-slate-800">
                  {/* DRIP Özet */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                      <div className="text-[10px] text-emerald-500 uppercase font-bold mb-1">Toplam DRIP</div>
                      <div className="text-xl font-bold text-emerald-400">{formatCurrency(totalDrip)}</div>
                      <div className="text-[10px] text-slate-600">{dripPurchases.length} işlem</div>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                      <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">{thisYear} DRIP</div>
                      <div className="text-xl font-bold text-white">{formatCurrency(thisYearDrip)}</div>
                      <div className="text-[10px] text-slate-600">
                        {dripPurchases.filter(p => p.date.startsWith(thisYear)).length} işlem
                      </div>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center col-span-2 md:col-span-1">
                      <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Hisse Sayısı</div>
                      <div className="text-xl font-bold text-white">{dripStocks.length}</div>
                      <div className="text-[10px] text-slate-600">DRIP yapılan hisse</div>
                    </div>
                  </div>

                  {/* DRIP — Hisse Bazlı */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hisse Bazlı DRIP</h4>
                    {dripStocks.map(stock => {
                      const maxDrip = dripStocks[0].total;
                      return (
                        <div key={stock.ticker} className="bg-slate-950/50 rounded-xl border border-slate-800 p-4">
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-sm text-emerald-400">
                                {stock.ticker.slice(0, 2)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-100 text-sm">{stock.ticker}</div>
                                <div className="text-[10px] text-slate-500">{stock.name}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-emerald-400">{formatCurrency(stock.total)}</div>
                              <div className="text-[10px] text-slate-600">{stock.totalQty} lot • {stock.purchases.length} işlem</div>
                            </div>
                          </div>

                          {/* İlerleme çubuğu */}
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${(stock.total / maxDrip) * 100}%` }}
                            />
                          </div>

                          {/* İşlem detayları */}
                          <div className="space-y-2">
                            {[...stock.purchases]
                              .sort((a, b) => b.date.localeCompare(a.date))
                              .map((p, i) => (
                                <div key={i} className="flex justify-between items-center text-xs bg-slate-900/50 px-3 py-2 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <RefreshCcw size={10} className="text-emerald-500" />
                                    <span className="text-slate-400">{p.date}</span>
                                    <span className="text-slate-300 font-medium">{p.qty} lot</span>
                                    <span className="text-slate-500">@{formatCurrency(p.price)}</span>
                                  </div>
                                  <span className="font-bold text-emerald-400">{formatCurrency(p.qty * p.price)}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

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
