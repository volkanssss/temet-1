import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  RefreshCcw,
  Trash2,
  LogOut,
  CheckCircle,
  AlertCircle,
  Search,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, logout } from '../lib/supabase';
import { dbService } from '../services/db';
import { fetchStockInfo } from '../services/price';
import { cn, formatCurrency, formatPercentage } from '../lib/utils';
import { usePortfolio } from '../hooks/usePortfolio';

import OverviewTab from './tabs/OverviewTab';
import PortfolioTab from './tabs/PortfolioTab';
import DividendsTab from './tabs/DividendsTab';
import AnalyticsTab from './tabs/AnalyticsTab';
import GoalsTab from './tabs/GoalsTab';

type Tab = 'dash' | 'pf' | 'div' | 'an' | 'goal';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('dash');
  const [searchQuery, setSearchQuery] = useState('');
  
  const {
    stocks,
    purchases,
    dividends,
    goals,
    history,
    stockStats,
    summary,
    loading,
    refreshPrices
  } = usePortfolio();

  const [isAddingStock, setIsAddingStock] = useState(false);
  const [isAddingPurchase, setIsAddingPurchase] = useState(false);
  const [isAddingDividend, setIsAddingDividend] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [viewingPurchases, setViewingPurchases] = useState<string | null>(null);
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [viewingStockDetails, setViewingStockDetails] = useState<string | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);

  const [newStockData, setNewStockData] = useState({ ticker: '', name: '', sector: 'Diğer', exchange: 'BIST' });

  const [toast, setToast] = useState<{msg: string, ok: boolean} | null>(null);
  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const [userName, setUserName] = useState('');
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserName(data.session?.user?.user_metadata?.full_name || data.session?.user?.email || 'Misafir');
    });
  }, []);

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Handle Ctrl+K for search focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search');
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-slate-700 selection:text-white transition-colors duration-300">
      <div className="w-full">
        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "fixed top-4 right-4 z-[200] flex items-center gap-3 px-5 py-3 rounded-xl font-medium text-sm shadow-xl border",
                toast.ok
                  ? "bg-slate-800 text-slate-100 border-slate-700"
                  : "bg-red-900/50 text-red-200 border-red-800"
              )}
            >
              {toast.ok ? <CheckCircle size={16} className="text-emerald-400" /> : <AlertCircle size={16} className="text-red-400" />}
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header & Pill Navigation */}
        <header className="px-6 pt-12 pb-6 flex flex-col gap-6 sticky top-0 z-20 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 transition-colors duration-300">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-slate-800">
                <img src="/icon.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-widest leading-none mb-1">
                  Temettü Takip &bull; {userName}
                </div>
                <h1 className="text-xl font-bold text-white leading-none">
                  {activeTab === 'dash' && 'Genel Bakış'}
                  {activeTab === 'pf' && 'Hisseler'}
                  {activeTab === 'div' && 'Temettüler'}
                  {activeTab === 'an' && 'İşlemler'}
                  {activeTab === 'goal' && 'Hedefler'}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto flex-1 md:flex-none">
              <div className="relative flex-1 md:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  id="global-search"
                  type="text" 
                  placeholder="Hisse ara... (Cmd+K)" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-full py-2 pl-9 pr-4 text-sm text-slate-200 outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-10 h-10 flex-shrink-0 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
                title="Tema Değiştir"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              
              <button 
                onClick={refreshPrices}
                disabled={loading}
                className="w-10 h-10 flex-shrink-0 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
                title="Fiyatları Güncelle"
              >
                <RefreshCcw size={16} className={cn(loading && "animate-spin")} /> 
              </button>

              <button onClick={() => {
                if (localStorage.getItem('guestMode') === 'true') {
                  localStorage.removeItem('guestMode');
                  window.dispatchEvent(new Event('guestModeChanged'));
                } else {
                  logout();
                }
              }} className="w-10 h-10 flex-shrink-0 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-red-500/20 transition-all" title="Çıkış Yap">
                <LogOut size={16} />
              </button>
            </div>
          </div>

          {/* Pill Navigation */}
          <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
            {[
              { id: 'dash', label: 'Genel Bakış' },
              { id: 'pf', label: 'Hisseler' },
              { id: 'div', label: 'Temettüler' },
              { id: 'an', label: 'İşlemler' },
              { id: 'goal', label: 'Hedefler' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={cn(
                  "px-5 py-2 rounded-full whitespace-nowrap font-medium text-sm transition-all",
                  activeTab === tab.id 
                    ? "bg-cyan-500 text-slate-950" 
                    : "bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
          {activeTab === 'dash' && (
            <OverviewTab 
              summary={summary}
              stockStats={stockStats}
              purchases={purchases}
              dividends={dividends}
              history={history}
              setViewingStockDetails={setViewingStockDetails}
            />
          )}

          {activeTab === 'pf' && (
            <PortfolioTab 
              stocks={stocks}
              stockStats={stockStats}
              loading={loading}
              searchQuery={searchQuery}
              setIsAddingStock={setIsAddingStock}
              setViewingStockDetails={setViewingStockDetails}
              setSelectedStockId={setSelectedStockId}
              setIsAddingPurchase={setIsAddingPurchase}
              setViewingPurchases={setViewingPurchases}
            />
          )}

          {activeTab === 'div' && (
            <DividendsTab 
              dividends={dividends}
              setIsAddingDividend={setIsAddingDividend}
            />
          )}

          {activeTab === 'an' && (
            <AnalyticsTab 
              stockStats={stockStats}
              dividends={dividends}
              summary={summary}
            />
          )}

          {activeTab === 'goal' && (
            <GoalsTab 
              goals={goals}
              summary={summary}
              stocks={stocks}
              dividends={dividends}
              setIsAddingGoal={setIsAddingGoal}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {viewingStockDetails && (() => {
          const s = stockStats.find(x => x.id === viewingStockDetails);
          if (!s) return null;
          const sPurchases = purchases.filter(p => p.stockId === s.id).sort((a,b) => b.date.localeCompare(a.date));
          const sDividends = dividends.filter(d => d.stockId === s.id).sort((a,b) => b.date.localeCompare(a.date));

          return (
            <Modal 
              title={`${s.ticker} Detay`} 
              onClose={() => setViewingStockDetails(null)} 
              onSave={async () => { setViewingStockDetails(null); }}
            >
              <div className="space-y-6">
                <div>
                  <div className="text-xl font-bold text-slate-100">{s.name}</div>
                  <div className="text-sm text-slate-400 font-medium">{s.exchange} &bull; {s.sector}</div>
                </div>

                <div className="flex justify-between items-center bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                  <div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Güncel Değer</div>
                    <div className="text-2xl font-bold text-white">{formatCurrency(s.currentValue)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Toplam K/Z</div>
                    <div className={cn("text-lg font-bold", s.profitLoss >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {s.profitLoss >= 0 ? '↑' : '↓'} {formatPercentage(Math.abs(s.profitLossPct))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-800/50">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Anlık Fiyat</div>
                    <div className="text-sm font-semibold text-slate-200">{s.lastPrice ? formatCurrency(s.lastPrice) : '---'}</div>
                  </div>
                  <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-800/50">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Ort. Maliyet</div>
                    <div className="text-sm font-semibold text-slate-200">{formatCurrency(s.avgCost)}</div>
                  </div>
                  <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-800/50">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Toplam Adet</div>
                    <div className="text-sm font-semibold text-slate-200">{s.qty} LOT</div>
                  </div>
                  <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-800/50">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Maliyetine Temettü Verimi</div>
                    <div className="text-sm font-semibold text-emerald-400">%{formatPercentage(s.totalCost > 0 ? (s.totalDiv / s.totalCost) * 100 : 0)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Son İşlemler</h3>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1 hide-scrollbar">
                      {sPurchases.slice(0, 5).map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-slate-950/30 p-3 rounded-xl border border-slate-800/40 text-xs">
                          <div className="text-slate-300 font-medium">{p.qty} Lot</div>
                          <div className="text-slate-500">{p.date}</div>
                        </div>
                      ))}
                      {sPurchases.length === 0 && <div className="text-center py-4 text-slate-600 text-xs italic">Kayıt yok.</div>}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Son Temettüler</h3>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1 hide-scrollbar">
                      {sDividends.slice(0, 5).map(d => (
                        <div key={d.id} className="flex justify-between items-center bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 text-xs">
                          <div className="text-emerald-400 font-medium">{formatCurrency(d.net)}</div>
                          <div className="text-slate-500">{d.date}</div>
                        </div>
                      ))}
                      {sDividends.length === 0 && <div className="text-center py-4 text-slate-600 text-xs italic">Kayıt yok.</div>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => { setSelectedStockId(s.id); setViewingStockDetails(null); setIsAddingPurchase(true); }}
                    className="flex-1 min-w-[100px] py-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 transition-colors"
                  >
                    ALIM EKLE
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setViewingStockDetails(null); setIsAddingDividend(true); }}
                    className="flex-1 min-w-[100px] py-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors"
                  >
                    TEMETTÜ EKLE
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      if (window.confirm(`${s.ticker} portföyünüzden silinecektir. Emin misiniz?`)) {
                        dbService.remove('stocks', s.id);
                        setViewingStockDetails(null);
                      }
                    }}
                    className="flex-1 min-w-[100px] py-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-red-500/20 hover:text-red-400 transition-colors"
                  >
                    HİSSE SİL
                  </button>
                </div>
              </div>
            </Modal>
          );
        })()}

        {isAddingStock && (
          <Modal 
            title="Hisse Ekle" 
            onClose={() => { 
              setIsAddingStock(false); 
              setNewStockData({ ticker: '', name: '', sector: 'Diğer', exchange: 'BIST' }); 
            }} 
            onSave={async () => {
              if (!newStockData.ticker) {
                showToast('Hisse kodu giriniz!', false);
                return;
              }
              try {
                const ticker = newStockData.ticker.toUpperCase();
                await dbService.add('stocks', {
                  ticker,
                  name: newStockData.name || ticker,
                  exchange: newStockData.exchange || 'BIST',
                  sector: newStockData.sector || 'Diğer'
                });
                setIsAddingStock(false);
                setNewStockData({ ticker: '', name: '', sector: 'Diğer', exchange: 'BIST' });
                showToast(`${ticker} portföye eklendi!`);
              } catch (err: any) {
                showToast(err.message || 'Hisse eklenemedi!', false);
              }
            }}
          >
            <div className="space-y-4">
              <Input 
                label="Hisse Kodu (örn: TUPRS)" 
                name="ticker" 
                placeholder="Kodu yazın..."
                required 
                autoFocus
                value={newStockData.ticker}
                onChange={async (e) => {
                  const val = e.target.value.toUpperCase();
                  setNewStockData(prev => ({ ...prev, ticker: val }));
                  
                  if (val.length >= 2) {
                    setInfoLoading(true);
                    try {
                      const info = await fetchStockInfo(val, newStockData.exchange);
                      if (info.success && info.name) {
                        setNewStockData(prev => ({ 
                          ...prev, 
                          name: info.name, 
                          sector: info.sector || prev.sector
                        }));
                      }
                    } catch (err) {
                      console.error('Info fetch failed', err);
                    } finally {
                      setInfoLoading(false);
                    }
                  }
                }}
              />
              <Input 
                label={infoLoading ? 'Şirket Adı (aranıyor...)' : 'Şirket Adı (Otomatik dolar)'} 
                name="name" 
                value={newStockData.name}
                onChange={(e) => setNewStockData(prev => ({ ...prev, name: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-4">
                <Select 
                  label="Borsa" 
                  name="exchange" 
                  value={newStockData.exchange}
                  onChange={(e) => setNewStockData(prev => ({ ...prev, exchange: e.target.value }))}
                  options={['BIST', 'NYSE', 'NASDAQ', 'LSE']} 
                />
                <Select 
                  label="Sektör" 
                  name="sector" 
                  value={newStockData.sector}
                  onChange={(e) => setNewStockData(prev => ({ ...prev, sector: e.target.value }))}
                  options={['Enerji', 'Banka', 'Sanayi', 'Teknoloji', 'Holding', 'Gıda', 'Diğer']} 
                />
              </div>
            </div>
          </Modal>
        )}

        {isAddingPurchase && (
          <Modal title="Alım Ekle" onClose={() => setIsAddingPurchase(false)} onSave={async (data) => {
             await dbService.add('purchases', {
               stockId: selectedStockId,
               qty: Number(data.qty),
               price: Number(data.price),
               date: data.date,
               note: data.note,
               isDrip: data.isDrip === 'on'
             });
             setIsAddingPurchase(false);
          }}>
            <div className="space-y-4">
               <Input label="Tarih" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
               <div className="grid grid-cols-2 gap-4">
                 <Input label="Adet / Lot" name="qty" type="number" required />
                 <Input label="Birim Fiyat (₺)" name="price" type="number" step="0.01" required />
               </div>
               <Input label="Not" name="note" />
               <div className="flex items-center gap-2 pt-2">
                 <input type="checkbox" id="isDrip" name="isDrip" className="w-4 h-4 accent-cyan-500 bg-slate-900 border-slate-800 rounded" />
                 <label htmlFor="isDrip" className="text-sm text-slate-400 font-medium cursor-pointer">Bu alım temettü geliriyle yapıldı (DRIP)</label>
               </div>
            </div>
          </Modal>
        )}

        {isAddingDividend && (
          <Modal title="Temettü Kaydı" onClose={() => setIsAddingDividend(false)} onSave={async (data) => {
             const stock = stocks.find(s => s.id === data.stockId);
             await dbService.add('dividends', {
               stockId: data.stockId,
               ticker: stock?.ticker,
               date: data.date,
               ps: Number(data.ps),
               qty: Number(data.qty),
               net: Number(data.net),
               type: data.type,
               tax: Number(data.tax || 0),
               gross: Number(data.net) + Number(data.tax || 0),
               note: data.note
             });
             setIsAddingDividend(false);
          }}>
             <div className="space-y-4">
                <Select label="Hisse" name="stockId" options={stocks.map(s => ({ label: s.ticker, value: s.id }))} />
                <Input label="Tarih" name="date" type="date" required />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Hisse Başı (Net)" name="ps" type="number" step="0.0001" required />
                  <Input label="Lot Sayısı" name="qty" type="number" required />
                </div>
                <Input label="Net Toplam (₺)" name="net" type="number" step="0.01" required />
                <Select label="Tür" name="type" options={['Nakit', 'Hisse', 'Ara Ödeme']} />
             </div>
          </Modal>
        )}

        {isAddingGoal && (
          <Modal title="Varlık Hedefi" onClose={() => setIsAddingGoal(false)} onSave={async (data) => {
            await dbService.add('goals', {
              name: data.name,
              target: Number(data.target),
              type: data.type,
              date: data.date
            });
            setIsAddingGoal(false);
          }}>
            <div className="space-y-4">
              <Input label="Hedef Adı" name="name" required />
              <Select label="Tür" name="type" options={[
                { label: 'Yıllık Temettü', value: 'annual_div' },
                { label: 'Aylık Temettü', value: 'monthly_div' },
                { label: 'Portföy Değeri', value: 'portfolio_val' },
                { label: 'Toplam Temettü', value: 'total_div' },
                { label: 'Hisse Sayısı', value: 'stock_count' }
              ]} />
              <Input label="Hedef Rakam" name="target" type="number" required />
              <Input label="Hedef Tarihi" name="date" type="date" />
            </div>
          </Modal>
        )}

        {viewingPurchases && (
          <Modal title="Alımları Yönet" onClose={() => setViewingPurchases(null)} onSave={async () => setViewingPurchases(null)}>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {purchases.filter(p => p.stockId === viewingPurchases).length === 0 ? (
                <div className="text-center font-serif italic opacity-50 py-4">Bu hisseye ait alım kaydı bulunamadı.</div>
              ) : (
                purchases
                  .filter(p => p.stockId === viewingPurchases)
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-slate-950/50 border border-slate-800 p-4 rounded-xl mb-3">
                      <div>
                        <div className="font-bold text-lg text-slate-200">{p.qty} Lot</div>
                        <div className="text-xs text-slate-500">
                          {p.date} &bull; Birim: {formatCurrency(p.price)}
                          {p.isDrip && <span className="ml-2 text-emerald-400 font-medium">(DRIP)</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="font-bold text-lg text-emerald-400">{formatCurrency(p.qty * p.price)}</div>
                        <button 
                          type="button"
                          onClick={() => {
                            dbService.remove('purchases', p.id);
                            showToast('Alım kaydı silindi');
                          }} 
                          className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
                          title="Bu alımı sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function Modal({ title, children, onClose, onSave }: { title: string, children: React.ReactNode, onClose: () => void, onSave: (data?: any) => Promise<void> | void }) {
  const [saving, setSaving] = useState(false);

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div 
        initial={{ y: 20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-8 shadow-2xl overflow-hidden"
      >
        <h2 className="text-2xl font-bold text-white mb-6 border-b border-slate-800 pb-4">{title}</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (saving) return;
          setSaving(true);
          try {
            const fd = new FormData(e.currentTarget);
            await onSave(Object.fromEntries(fd.entries()));
          } finally {
            setSaving(false);
          }
        }}>
          {children}
          <div className="flex gap-4 mt-8 pt-6 border-t border-slate-800">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors disabled:opacity-50">İptal</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-colors disabled:opacity-50">
              {saving ? 'KAYDEDİLİYOR...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <input {...props} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-cyan-500 transition-colors" />
    </div>
  );
}

function Select({ label, options, ...props }: { label: string, options: (string | { label: string, value: string })[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <select {...props} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-cyan-500 transition-colors appearance-none cursor-pointer">
        {options.map(opt => typeof opt === 'string' ? <option key={opt} value={opt}>{opt}</option> : <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}
