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
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
        {/* Gün başlıkları */}
        <div className="grid grid-cols-7 border-b border-slate-800">
          {TR_DAYS.map(d => (
            <div key={d} className="py-3 text-center text-[10px] font-bold text-slate-500 uppercase">{d}</div>
          ))}
        </div>

        {/* Günler */}
        <div className="grid grid-cols-7">
          {/* Boş hücreler */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`e-${i}`} className="p-2 min-h-[72px] border-b border-r border-slate-800/50 bg-slate-950/20" />
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
                className={`p-2 min-h-[72px] border-b border-slate-800/50 ${!isLastCol ? 'border-r' : ''} ${
                  isToday ? 'bg-cyan-500/5' : hasDivs ? 'bg-emerald-500/5' : ''
                }`}
              >
                <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
                }`}>
                  {day}
                </div>
                {dayDivs.slice(0, 2).map((d, i) => (
                  <div key={i} className="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-1 py-0.5 rounded mb-0.5 truncate">
                    {d.ticker} {formatCurrency(d.net)}
                  </div>
                ))}
                {dayDivs.length > 2 && (
                  <div className="text-[9px] text-slate-500">+{dayDivs.length - 2} daha</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Yıllık Özet */}
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-slate-300">{year} Yıllık Dağılım</h3>
          <span className="text-sm font-bold text-emerald-400">{formatCurrency(yearTotal)}</span>
        </div>
        <div className="grid grid-cols-12 gap-1 items-end h-16">
          {TR_MONTHS.map((name, i) => {
            const val = byMonth[i] || 0;
            const pct = val > 0 ? Math.max((val / maxMonthVal) * 100, 8) : 2;
            const isThisMon = i === month;
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t transition-all ${isThisMon ? 'bg-cyan-500' : val > 0 ? 'bg-emerald-600' : 'bg-slate-800'}`}
                  style={{ height: `${pct}%` }}
                  title={val > 0 ? `${name}: ${formatCurrency(val)}` : ''}
                />
                <span className={`text-[7px] font-medium ${isThisMon ? 'text-cyan-400' : 'text-slate-600'}`}>
                  {name.slice(0, 3)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bu ayın detayı */}
      {monthDivs.length > 0 && (
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">
            {TR_MONTHS[month]} Ödemeleri ({monthDivs.length} kayıt)
          </h3>
          <div className="space-y-2">
            {monthDivs.sort((a, b) => a.date.localeCompare(b.date)).map(d => (
              <div key={d.id} className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300">
                    {d.ticker.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-100 text-sm">{d.ticker}</div>
                    <div className="text-xs text-slate-500">{d.date} • {d.qty} lot • {d.type}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-400">{formatCurrency(d.net)}</div>
                  <div className="text-[10px] text-slate-600">₺{d.ps}/hisse</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {dividends.length === 0 && (
        <div className="p-12 text-center">
          <div className="text-3xl mb-3">📅</div>
          <div className="text-slate-500">Temettü kaydı ekleyince takvim burada görünecek.</div>
        </div>
      )}
    </motion.div>
  );
}
