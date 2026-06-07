import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, RefreshCcw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
      {/* Özet Kartlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: `${thisYear} Toplam`, value: yearTotal, sub: `${yearDivs.length} ödeme` },
          { label: 'Bu Ay',             value: monthTotal,  sub: `${thisMonth.slice(5)} ayı` },
          { label: 'Aylık Ort.',        value: monthlyAvg,  sub: 'Bu yıl ortalaması' },
          { label: 'Tüm Zaman',         value: allTime,     sub: `${dividends.length} toplam` },
        ].map(card => (
          <div key={card.label} className="premium-card card-hover-effect p-6 shadow-md border border-slate-800/40">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">{card.label}</div>
            <div className="text-2xl font-extrabold text-white mb-1.5 tabular-nums">{formatCurrency(card.value)}</div>
            <div className="text-[10px] text-slate-400 font-semibold">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Aylık Bar Chart (12 ay) */}
      <div className="premium-card p-6 shadow-md border border-slate-800/40">
        <h3 className="text-xs font-bold text-slate-300 mb-5 uppercase tracking-wider">{thisYear} — Aylık Dağılım</h3>
        <div className="flex items-end gap-2 h-28">
          {allMonths.map(m => {
            const val  = byMonth[m] || 0;
            const pct  = val > 0 ? (val / maxMonth) * 100 : 0;
            const name = new Date(m + '-01').toLocaleString('tr-TR', { month: 'short' });
            const isThis = m === thisMonth;
            return (
              <div key={m} className="flex-1 flex flex-col items-center gap-2 group">
                <div
                  className={`w-full rounded-t-lg transition-all ${isThis ? 'bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.4)]' : val > 0 ? 'bg-slate-600 group-hover:bg-slate-500' : 'bg-slate-800/40'}`}
                  style={{ height: `${Math.max(pct, val > 0 ? 8 : 3)}%` }}
                  title={val > 0 ? formatCurrency(val) : ''}
                />
                <span className={`text-[10px] font-bold ${isThis ? 'text-cyan-400' : 'text-slate-500'}`}>{name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── DRIP GERİ ALIM TAKİP ─── */}
      {dripPurchases.length > 0 && (
        <div className="premium-card border border-emerald-500/20 overflow-hidden shadow-md">
          {/* DRIP Başlık */}
          <button
            onClick={() => setShowDrip(s => !s)}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-800/20 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <RefreshCcw size={18} className="text-emerald-400 animate-spin-slow" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  DRIP Geri Alım Takibi
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                    {dripPurchases.length} işlem
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5 font-medium">
                  Temettülerle yeniden yatırım yapılan alımlar
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-lg font-bold text-emerald-400 tabular-nums">{formatCurrency(totalDrip)}</div>
                <div className="text-[10px] text-slate-500 font-semibold">{thisYear}: {formatCurrency(thisYearDrip)}</div>
              </div>
              {showDrip ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
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
                <div className="px-6 pb-6 space-y-5 border-t border-slate-800/40">
                  {/* DRIP Özet */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-5">
                    <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-4 text-center">
                      <div className="text-[9px] text-emerald-500 uppercase font-bold tracking-wider mb-1">Toplam DRIP</div>
                      <div className="text-xl font-bold text-emerald-400 tabular-nums">{formatCurrency(totalDrip)}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">{dripPurchases.length} işlem</div>
                    </div>
                    <div className="bg-slate-800/25 border border-slate-700/30 rounded-2xl p-4 text-center">
                      <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">{thisYear} DRIP</div>
                      <div className="text-xl font-bold text-white tabular-nums">{formatCurrency(thisYearDrip)}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        {dripPurchases.filter(p => p.date.startsWith(thisYear)).length} işlem
                      </div>
                    </div>
                    <div className="bg-slate-800/25 border border-slate-700/30 rounded-2xl p-4 text-center col-span-2 md:col-span-1">
                      <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Hisse Sayısı</div>
                      <div className="text-xl font-bold text-white">{dripStocks.length}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">DRIP yapılan hisse</div>
                    </div>
                  </div>

                  {/* DRIP — Hisse Bazlı */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hisse Bazlı DRIP</h4>
                    {dripStocks.map(stock => {
                      const maxDrip = dripStocks[0].total;
                      return (
                        <div key={stock.ticker} className="bg-slate-950/20 rounded-2xl border border-slate-800/50 p-5">
                          <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3.5">
                              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-sm text-emerald-400">
                                {stock.ticker.slice(0, 2)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-100 text-sm">{stock.ticker}</div>
                                <div className="text-[10px] text-slate-500 font-semibold">{stock.name}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-emerald-400 tabular-nums">{formatCurrency(stock.total)}</div>
                              <div className="text-[10px] text-slate-500 font-medium">{stock.totalQty} lot • {stock.purchases.length} işlem</div>
                            </div>
                          </div>

                          {/* İlerleme çubuğu */}
                          <div className="h-1.5 bg-slate-800/40 rounded-full overflow-hidden mb-4 border border-slate-700/10">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${(stock.total / maxDrip) * 100}%` }}
                            />
                          </div>

                          {/* İşlem detayları */}
                          <div className="space-y-2.5">
                            {[...stock.purchases]
                              .sort((a, b) => b.date.localeCompare(a.date))
                              .map((p, i) => (
                                <div key={i} className="flex justify-between items-center text-xs bg-slate-900/30 px-4 py-2.5 rounded-xl border border-slate-800/30">
                                  <div className="flex items-center gap-2.5">
                                    <RefreshCcw size={10} className="text-emerald-500" />
                                    <span className="text-slate-400 font-medium">{p.date}</span>
                                    <span className="text-slate-300 font-bold tabular-nums">{p.qty} lot</span>
                                    <span className="text-slate-500 font-semibold">@{formatCurrency(p.price)}</span>
                                  </div>
                                  <span className="font-bold text-emerald-400 tabular-nums">{formatCurrency(p.qty * p.price)}</span>
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
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">Hisse Başına Toplam</h3>
          <div className="flex overflow-x-auto hide-scrollbar gap-4 pb-3 snap-x">
            {Object.entries(byStock)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([ticker, total]) => (
                <div key={ticker} className="min-w-[150px] snap-start premium-card p-5 flex flex-col gap-1.5 shrink-0 border border-slate-800/40 shadow-sm">
                  <div className="font-bold text-slate-200">{ticker}</div>
                  <div className="font-extrabold text-emerald-400 tabular-nums">{formatCurrency(total as number)}</div>
                  <div className="text-[10px] text-slate-500 font-semibold">
                    {dividends.filter(d => d.ticker === ticker).length} ödeme
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Liste + Butonlar */}
      <div className="flex justify-between items-center px-1">
        <h2 className="text-lg font-bold text-slate-200 uppercase tracking-wider">
          Geçmiş Ödemeler
          {q && <span className="text-sm font-normal text-slate-500 ml-2">({filtered.length} sonuç)</span>}
        </h2>
        <div className="flex items-center gap-3">
          {dividends.length > 0 && (
            <button
              onClick={() => exportDividendsCSV(dividends)}
              className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 transition-all border border-slate-700/50 active:scale-95"
              title="CSV olarak indir"
            >
              <Download size={14} />
            </button>
          )}
          <button
            onClick={() => setIsAddingDividend(true)}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold uppercase tracking-wider rounded-full transition-all border border-slate-800 active:scale-95 shadow-md"
          >
            + Temettü Ekle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {[...filtered]
          .sort((a, b) => b.date.localeCompare(a.date))
          .map(d => (
            <div key={d.id} className="premium-card p-5 flex justify-between items-center hover:scale-[1.008] transition-transform duration-300 border border-slate-800/40">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-slate-800/50 flex items-center justify-center font-bold text-slate-300 border border-slate-700/20">
                  {d.ticker.slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="font-bold text-slate-100">{d.ticker}</div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700/20">{d.type}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {d.date} • <span className="font-semibold text-slate-400">{d.qty} LOT</span> • <span className="text-slate-400">₺{d.ps}/hisse</span>
                    {d.tax > 0 && <span className="ml-2 text-slate-600">Stopaj: {formatCurrency(d.tax)}</span>}
                  </div>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <div className="text-lg font-extrabold text-emerald-400 tabular-nums">{formatCurrency(d.net)}</div>
                <button
                  onClick={() => onDeleteDividend(d.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800/80 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all border border-slate-700/30 active:scale-95"
                  title="Temettü Sil"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        {filtered.length === 0 && (
          <div className="p-16 text-center premium-card">
            <div className="text-3xl mb-3">💰</div>
            <div className="text-slate-500 font-semibold">{q ? 'Aramanıza uygun kayıt bulunamadı.' : 'Henüz temettü kaydı yok.'}</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
