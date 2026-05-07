import React from 'react';
import { motion } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { formatCurrency, formatCount, formatPercentage } from '../../lib/utils';
import { dbService } from '../../services/db';

type GoalsTabProps = {
  goals: any[];
  summary: any;
  stocks: any[];
  dividends: any[];
  setIsAddingGoal: (v: boolean) => void;
};

export default function GoalsTab({
  goals,
  summary,
  stocks,
  dividends,
  setIsAddingGoal
}: GoalsTabProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold text-slate-200">Vizyon & Hedefler</h2>
        <button 
          onClick={() => setIsAddingGoal(true)}
          className="px-6 py-2 bg-slate-800 text-slate-200 text-sm font-medium rounded-full hover:bg-slate-700 w-full md:w-auto"
        >
          Hedef Koy
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
          {goals.map(g => {
            let current = 0;
            if (g.type === 'portfolio_val') current = summary.totalValue;
            if (g.type === 'total_div') current = summary.totalDiv;
            if (g.type === 'stock_count') current = stocks.length;
            const thisYear = new Date().getFullYear().toString();
            const thisMonth = new Date().toISOString().slice(0, 7);
            if (g.type === 'annual_div') current = dividends.filter(d => d.date.startsWith(thisYear)).reduce((a, d) => a + d.net, 0);
            if (g.type === 'monthly_div') current = dividends.filter(d => d.date.startsWith(thisMonth)).reduce((a, d) => a + d.net, 0);
            
            const progress = g.target > 0 ? Math.min(100, ((current as number) / g.target) * 100) : 0;
            const isCountType = g.type === 'stock_count';

            return (
              <div key={g.id} className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-lg font-bold text-white mb-1">{g.name}</div>
                    <div className="text-xs text-slate-500">
                      {g.type === 'annual_div' ? 'Yıllık Temettü'
                        : g.type === 'monthly_div' ? 'Aylık Temettü'
                        : g.type === 'portfolio_val' ? 'Portföy Değeri'
                        : g.type === 'total_div' ? 'Toplam Temettü'
                        : g.type === 'stock_count' ? 'Hisse Sayısı'
                        : g.type} &bull; {g.date || 'SÜRESİZ'}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className="text-2xl font-bold text-cyan-400 mb-1">{formatPercentage(progress)}</div>
                    <button onClick={() => dbService.remove('goals', g.id)} className="text-[10px] text-slate-500 hover:text-red-400 flex items-center gap-1"><Trash2 size={12}/> SİL</button>
                  </div>
                </div>

                <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                    <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-cyan-500 rounded-full" 
                    />
                </div>
                <div className="flex justify-between text-xs font-medium text-slate-400">
                    <span>{isCountType ? formatCount(current as number) : formatCurrency(current as number)}</span>
                    <span>Hedef: {isCountType ? formatCount(g.target) : formatCurrency(g.target)}</span>
                </div>
              </div>
            );
          })}
          {goals.length === 0 && <div className="p-12 text-center text-slate-500 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">Henüz hedef belirlenmemiş.</div>}
      </div>
    </motion.div>
  );
}
