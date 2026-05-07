import React from 'react';
import { motion } from 'motion/react';
import { Trash2, Target, TrendingUp, Award } from 'lucide-react';
import { formatCurrency, formatCount, formatPercentage } from '../../lib/utils';
import { Goal, Dividend, StockHolding, PortfolioSummary } from '../../types/stock';
import { cn } from '../../lib/utils';

type GoalsTabProps = {
  goals: Goal[];
  summary: PortfolioSummary;
  stocks: StockHolding[];
  dividends: Dividend[];
  setIsAddingGoal: (v: boolean) => void;
  onDeleteGoal: (id: string) => void;
};

const GOAL_LABELS: Record<string, string> = {
  annual_div:   '📅 Yıllık Temettü',
  monthly_div:  '🗓️ Aylık Temettü',
  portfolio_val:'💼 Portföy Değeri',
  total_div:    '💰 Toplam Temettü',
  stock_count:  '📊 Hisse Sayısı',
};

const MILESTONE_COLORS = [
  'from-cyan-500 to-blue-500',
  'from-emerald-500 to-teal-500',
  'from-violet-500 to-purple-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
];

export default function GoalsTab({ goals, summary, stocks, dividends, setIsAddingGoal, onDeleteGoal }: GoalsTabProps) {
  const thisYear  = new Date().getFullYear().toString();
  const thisMonth = new Date().toISOString().slice(0, 7);

  function getCurrent(g: Goal): number {
    if (g.type === 'portfolio_val') return (summary as any).totalValue;
    if (g.type === 'total_div')    return (summary as any).totalDiv;
    if (g.type === 'stock_count')  return stocks.length;
    if (g.type === 'annual_div')   return dividends.filter(d => d.date.startsWith(thisYear)).reduce((a, d) => a + d.net, 0);
    if (g.type === 'monthly_div')  return dividends.filter(d => d.date.startsWith(thisMonth)).reduce((a, d) => a + d.net, 0);
    return 0;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-200">Vizyon & Hedefler</h2>
          <p className="text-sm text-slate-500 mt-0.5">Finansal hedeflerinize olan ilerlemenizi takip edin</p>
        </div>
        <button
          onClick={() => setIsAddingGoal(true)}
          className="px-5 py-2.5 bg-cyan-500 text-slate-950 text-sm font-bold rounded-full hover:bg-cyan-400 transition-all w-full md:w-auto flex justify-center items-center gap-2 shadow-lg shadow-cyan-500/20"
        >
          <Target size={15} /> Hedef Koy
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {goals.map((g, idx) => {
          const current   = getCurrent(g);
          const progress  = g.target > 0 ? Math.min(100, (current / g.target) * 100) : 0;
          const isCount   = g.type === 'stock_count';
          const isDone    = progress >= 100;
          const gradient  = MILESTONE_COLORS[idx % MILESTONE_COLORS.length];

          // Kalan gün hesabı
          const daysLeft = g.date
            ? Math.ceil((new Date(g.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;

          return (
            <div key={g.id} className={cn(
              'rounded-2xl border p-6 relative overflow-hidden',
              isDone
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-slate-900/50 border-slate-800'
            )}>
              {/* Background glow for completed */}
              {isDone && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
              )}

              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {isDone && <Award size={18} className="text-emerald-400" />}
                    <div className="text-lg font-bold text-white">{g.name}</div>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    {GOAL_LABELS[g.type] || g.type}
                    {g.date && (
                      <>
                        <span>•</span>
                        <span className={daysLeft !== null && daysLeft < 30 ? 'text-amber-400' : ''}>
                          {daysLeft !== null && daysLeft >= 0
                            ? `${daysLeft} gün kaldı`
                            : daysLeft !== null
                            ? 'Süre doldu'
                            : g.date}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={cn('text-2xl font-bold', isDone ? 'text-emerald-400' : 'text-cyan-400')}>
                    {formatPercentage(progress)}
                  </div>
                  <button
                    onClick={() => onDeleteGoal(g.id)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
                />
              </div>

              <div className="flex justify-between text-xs font-medium text-slate-400">
                <span className="text-slate-300">
                  {isCount ? formatCount(current) : formatCurrency(current)}
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp size={11} />
                  Hedef: {isCount ? formatCount(g.target) : formatCurrency(g.target)}
                </span>
              </div>
            </div>
          );
        })}
        {goals.length === 0 && (
          <div className="p-16 text-center rounded-2xl border border-dashed border-slate-800">
            <div className="text-4xl mb-4">🎯</div>
            <div className="text-slate-400 font-medium mb-2">Henüz hedef belirlenmemiş</div>
            <div className="text-slate-600 text-sm">Finansal hedeflerinizi belirleyerek ilerlemenizi takip edin</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
