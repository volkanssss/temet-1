import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { Dividend, StockHolding } from '../../types/stock';

type CalendarTabProps = {
  dividends: Dividend[];
  stocks: StockHolding[];
};

const TR_MONTHS = [
  'Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
  'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık',
];
const TR_DAYS = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

export default function CalendarTab({ dividends, stocks }: CalendarTabProps) {
  const now   = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // Bu ayın temettüleri
  const monthStr   = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthDivs  = dividends.filter(d => d.date.startsWith(monthStr));
  const monthTotal = monthDivs.reduce((a, d) => a + d.net, 0);

  // Takvim grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Pazar
  const daysCount = new Date(year, month + 1, 0).getDate();
  // JS: 0=Sunday → dönüştür: Pzt=0
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  // Gün → temettüler
  const divsByDay = monthDivs.reduce((acc, d) => {
    const day = parseInt(d.date.split('-')[2]);
    if (!acc[day]) acc[day] = [];
    acc[day].push(d);
    return acc;
  }, {} as Record<number, Dividend[]>);

  // Yıllık özet
  const yearStr  = year.toString();
  const yearDivs = dividends.filter(d => d.date.startsWith(yearStr));
  const yearTotal = yearDivs.reduce((a, d) => a + d.net, 0);
  const byMonth   = yearDivs.reduce((acc, d) => {
    const m = parseInt(d.date.split('-')[1]) - 1;
    acc[m] = (acc[m] || 0) + d.net;
    return acc;
  }, {} as Record<number, number>);
  const maxMonthVal = Math.max(...Object.values(byMonth), 1);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-200">Temettü Takvimi</h2>
          <p className="text-sm text-slate-500">{TR_MONTHS[month]} {year} — {formatCurrency(monthTotal)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:bg-slate-700 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-slate-200 font-bold text-sm w-28 text-center">
            {TR_MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:bg-slate-700 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Takvim Grid */}
      <div className="premium-card overflow-hidden shadow-md">
        {/* Gün başlıkları */}
        <div className="grid grid-cols-7 border-b border-slate-800/40 bg-slate-800/20">
          {TR_DAYS.map(d => (
            <div key={d} className="py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">{d}</div>
          ))}
        </div>

        {/* Günler */}
        <div className="grid grid-cols-7">
          {/* Boş hücreler */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`e-${i}`} className="p-2 min-h-[72px] border-b border-r border-slate-800/20 bg-slate-950/10" />
          ))}

          {/* Gerçek günler */}
          {Array.from({ length: daysCount }, (_, i) => i + 1).map(day => {
            const isToday    = year === now.getFullYear() && month === now.getMonth() && day === now.getDate();
            const hasDivs    = !!divsByDay[day];
            const dayDivs    = divsByDay[day] || [];
            const dayTotal   = dayDivs.reduce((a, d) => a + d.net, 0);
            const col = (startOffset + day - 1) % 7;
            const isLastCol  = col === 6;

            return (
              <div
                key={day}
                className={`p-1 sm:p-2.5 min-h-[56px] sm:min-h-[80px] border-b border-slate-800/40 ${!isLastCol ? 'border-r' : ''} ${
                  isToday ? 'bg-cyan-500/5' : hasDivs ? 'bg-emerald-500/5' : ''
                } transition-colors`}
              >
                <div className={`text-[10px] sm:text-xs font-bold mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'text-slate-400'
                }`}>
                  {day}
                </div>
                {dayDivs.slice(0, 2).map((d, i) => (
                  <div key={i} className="text-[8px] sm:text-[9px] bg-emerald-500/20 text-emerald-450 font-bold px-1.5 py-0.5 rounded-lg mb-1 truncate border border-emerald-500/10">
                    {d.ticker}
                    <span className="hidden sm:inline"> {formatCurrency(d.net)}</span>
                  </div>
                ))}
                {dayDivs.length > 2 && (
                  <div className="text-[8px] sm:text-[9px] text-slate-500 font-bold px-1">+{dayDivs.length - 2} daha</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Yıllık Özet */}
      <div className="premium-card p-6 shadow-md border border-slate-800/40">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xs font-bold text-slate-355 uppercase tracking-wider">{year} Yıllık Dağılım</h3>
          <span className="text-sm font-extrabold text-emerald-455 tabular-nums">{formatCurrency(yearTotal)}</span>
        </div>
        <div className="grid grid-cols-12 gap-2 items-end h-20">
          {TR_MONTHS.map((name, i) => {
            const val = byMonth[i] || 0;
            const pct = val > 0 ? Math.max((val / maxMonthVal) * 100, 8) : 3;
            const isThisMon = i === month;
            return (
              <div key={i} className="flex flex-col items-center gap-2">
                <div
                  className={`w-full rounded-t-lg transition-all ${isThisMon ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : val > 0 ? 'bg-emerald-600 hover:bg-emerald-555' : 'bg-slate-800/40'}`}
                  style={{ height: `${pct}%` }}
                  title={val > 0 ? `${name}: ${formatCurrency(val)}` : ''}
                />
                <span className={`text-[9px] font-bold ${isThisMon ? 'text-cyan-400' : 'text-slate-500'}`}>
                  {name.slice(0, 3)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bu ayın detayı */}
      {monthDivs.length > 0 && (
        <div className="premium-card p-6 shadow-md border border-slate-800/40">
          <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider mb-5">
            {TR_MONTHS[month]} Ödemeleri ({monthDivs.length} kayıt)
          </h3>
          <div className="space-y-3">
            {monthDivs.sort((a, b) => a.date.localeCompare(b.date)).map(d => (
              <div key={d.id} className="flex justify-between items-center bg-slate-900/30 p-4 rounded-2xl border border-slate-800/30 hover:scale-[1.005] transition-transform duration-300">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center font-bold text-xs text-slate-355 border border-slate-700/20">
                    {d.ticker.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-100 text-sm">{d.ticker}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{d.date} • <span className="font-semibold text-slate-450">{d.qty} lot</span> • <span className="font-semibold text-slate-450">{d.type}</span></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-base text-emerald-400 tabular-nums">{formatCurrency(d.net)}</div>
                  <div className="text-[10px] text-slate-550 font-semibold mt-0.5">₺{d.ps}/hisse</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {dividends.length === 0 && (
        <div className="p-16 text-center premium-card">
          <div className="text-3xl mb-3">📅</div>
          <div className="text-slate-550 font-semibold">Temettü kaydı ekleyince takvim burada görünecek.</div>
        </div>
      )}
    </motion.div>
  );
}
