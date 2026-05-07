import React from 'react';
import { motion } from 'motion/react';
import { PieChart as RePieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts';
import { formatCurrency, formatPercentage } from '../../lib/utils';

type AnalyticsTabProps = {
  stockStats: any[];
  dividends: any[];
  summary: any;
};

export default function AnalyticsTab({
  stockStats,
  dividends,
  summary
}: AnalyticsTabProps) {
  const sectorsData = Object.entries(stockStats.reduce((acc, s) => {
    acc[s.sector] = (acc[s.sector] || 0) + s.currentValue;
    return acc;
  }, {} as Record<string, number>)).sort((a: any, b: any) => b[1] - a[1]);

  const monthlyDividends = Object.entries(dividends.reduce((acc, d) => {
    const month = d.date.slice(0,7);
    acc[month] = (acc[month] || 0) + d.net;
    return acc;
  }, {} as Record<string, number>)).sort().map(([name, net]) => ({ name, net }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Portföy Dağılımı</h3>
          <div className="h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={stockStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="currentValue"
                  nameKey="ticker"
                  stroke="none"
                >
                  {stockStats.map((entry, index) => {
                    const colors = ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#6366f1', '#ec4899'];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  })}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc' }} 
                  itemStyle={{ color: '#f8fafc' }}
                  formatter={(value: number) => [formatCurrency(value), 'Değer']}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  content={({ payload }) => (
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
                      {payload?.map((entry: any, index: number) => (
                        <div key={`item-${index}`} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-[10px] font-bold text-slate-300">{entry.value}</span>
                          <span className="text-[10px] text-slate-500">{formatPercentage(summary.totalValue > 0 ? (entry.payload.currentValue / summary.totalValue) * 100 : 0)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                />
              </RePieChart>
            </ResponsiveContainer>
            
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-12">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Toplam</div>
              <div className="text-lg font-bold text-white leading-tight">{formatCurrency(summary.totalValue)}</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Sektörel Dağılım</h3>
          <div className="space-y-4 pt-2">
            {sectorsData.map(([sector, value], i) => (
              <div key={sector}>
                <div className="flex justify-between text-xs font-medium text-slate-300 mb-2">
                  <span>{sector}</span>
                  <span className="text-slate-400">{formatPercentage(summary.totalValue > 0 ? ((value as number) / summary.totalValue) * 100 : 0)}</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${summary.totalValue > 0 ? ((value as number) / summary.totalValue) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <h3 className="text-sm font-semibold text-slate-300 mb-6">Aylık Temettü Seyri</h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyDividends}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '10px', fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} style={{ fontSize: '10px', fill: '#64748b' }} tickFormatter={(val) => '₺' + (val/1000).toFixed(0) + 'k'} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc' }} cursor={{ fill: '#1e293b' }} formatter={(val: number) => formatCurrency(val)} />
              <Bar dataKey="net" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
