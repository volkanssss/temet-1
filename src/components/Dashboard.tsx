import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCcw, LogOut, Search, Sun, Moon, CheckCircle, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, logout } from '../lib/supabase';
import { dbService } from '../services/db';
import { cn } from '../lib/utils';
import { usePortfolio } from '../hooks/usePortfolio';
import { StockStat } from '../types/stock';

// Tabs
import OverviewTab   from './tabs/OverviewTab';
import PortfolioTab  from './tabs/PortfolioTab';
import DividendsTab  from './tabs/DividendsTab';
import AnalyticsTab  from './tabs/AnalyticsTab';
import GoalsTab      from './tabs/GoalsTab';
import CalendarTab   from './tabs/CalendarTab';
import AiTab         from './tabs/AiTab';

// Modals
import AddStockModal    from './modals/AddStockModal';
import AddPurchaseModal from './modals/AddPurchaseModal';
import AddDividendModal from './modals/AddDividendModal';
import AddGoalModal     from './modals/AddGoalModal';
import AddSaleModal     from './modals/AddSaleModal';
import ViewPurchasesModal from './modals/ViewPurchasesModal';
import StockDetailModal from './modals/StockDetailModal';
import ConfirmDialog    from './ui/ConfirmDialog';

type Tab = 'dash' | 'pf' | 'div' | 'an' | 'goal' | 'cal' | 'ai';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dash', label: 'Genel Bakış', icon: '📊' },
  { id: 'pf',   label: 'Hisseler',    icon: '💼' },
  { id: 'div',  label: 'Temettüler',  icon: '💰' },
  { id: 'an',   label: 'Analitik',    icon: '📈' },
  { id: 'goal', label: 'Hedefler',    icon: '🎯' },
  { id: 'cal',  label: 'Takvim',      icon: '📅' },
  { id: 'ai',   label: 'AI Asistan',  icon: '🤖' },
];

export default function Dashboard() {
  const [activeTab,   setActiveTab]   = useState<Tab>('dash');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    stocks, purchases, dividends, goals, history,
    stockStats, summary, loading, lastUpdated, refreshPrices,
  } = usePortfolio();

  // ─── Modal States ─────────────────────────────────────────────────────────
  const [isAddingStock,    setIsAddingStock]    = useState(false);
  const [isAddingPurchase, setIsAddingPurchase] = useState(false);
  const [isAddingDividend, setIsAddingDividend] = useState(false);
  const [isAddingGoal,     setIsAddingGoal]     = useState(false);
  const [isAddingSale,     setIsAddingSale]     = useState(false);
  const [viewingPurchases, setViewingPurchases] = useState<string | null>(null);
  const [viewingStockDetails, setViewingStockDetails] = useState<string | null>(null);
  const [selectedStockId,  setSelectedStockId]  = useState<string | null>(null);

  // ─── Confirm Dialog ───────────────────────────────────────────────────────
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirm({ open: true, title, message, onConfirm });
  };

  // ─── Toast ────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ─── User Name ────────────────────────────────────────────────────────────
  const [userName, setUserName] = useState('');
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserName(data.session?.user?.user_metadata?.full_name || data.session?.user?.email || 'Misafir');
    });
  }, []);

  // ─── Theme ────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // ─── Keyboard Shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) setIsAddingStock(true);
      if (e.key === 'd' && !e.metaKey && !e.ctrlKey) setIsAddingDividend(true);
      if (e.key === 'r' && !e.metaKey && !e.ctrlKey) refreshPrices();
      if (e.key === 'Escape') {
        setIsAddingStock(false); setIsAddingPurchase(false);
        setIsAddingDividend(false); setIsAddingGoal(false);
        setIsAddingSale(false); setViewingPurchases(null);
        setViewingStockDetails(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [refreshPrices]);

  // ─── Selected stat helper ─────────────────────────────────────────────────
  const selectedStat = viewingStockDetails
    ? (stockStats.find(x => x.id === viewingStockDetails) as StockStat | undefined) ?? null
    : null;

  const saleTargetStat = isAddingSale && selectedStockId
    ? (stockStats.find(x => x.id === selectedStockId) as StockStat | undefined) ?? null
    : null;

  const viewingPurchasesTicker = viewingPurchases
    ? (stocks.find(s => s.id === viewingPurchases)?.ticker ?? '')
    : '';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* ─── Toast ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              'fixed top-4 right-4 z-[300] flex items-center gap-3 px-5 py-3 rounded-xl font-medium text-sm shadow-xl border',
              toast.ok
                ? 'bg-slate-800 text-slate-100 border-slate-700'
                : 'bg-red-900/60 text-red-200 border-red-800'
            )}
          >
            {toast.ok
              ? <CheckCircle size={16} className="text-emerald-400 shrink-0" />
              : <AlertCircle size={16} className="text-red-400 shrink-0" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── ConfirmDialog ─────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onConfirm={() => { confirm.onConfirm(); setConfirm(c => ({ ...c, open: false })); }}
        onCancel={() => setConfirm(c => ({ ...c, open: false }))}
      />

      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <header className="px-4 md:px-6 pt-8 pb-4 sticky top-0 z-20 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-5xl mx-auto flex flex-col gap-4">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-800 shrink-0">
                <img src="/icon.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-widest leading-none mb-0.5">
                  Temettü Takip • {userName}
                </div>
                <h1 className="text-lg font-bold text-white leading-none">
                  {TABS.find(t => t.id === activeTab)?.label}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-1 md:flex-none">
              {/* Arama */}
              <div className="relative flex-1 md:w-60">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="global-search"
                  type="text"
                  placeholder="Ara... (Ctrl+K)"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-full py-2 pl-8 pr-4 text-sm text-slate-200 outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              {/* Son güncelleme */}
              {lastUpdated && (
                <div className="hidden md:block text-[10px] text-slate-600 whitespace-nowrap">
                  {lastUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}

              {/* Tema */}
              <button
                onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                className="w-9 h-9 shrink-0 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
                title="Tema Değiştir (T)"
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>

              {/* Fiyat Yenile */}
              <button
                onClick={refreshPrices}
                disabled={loading}
                className="w-9 h-9 shrink-0 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
                title="Fiyatları Güncelle (R)"
              >
                <RefreshCcw size={15} className={cn(loading && 'animate-spin')} />
              </button>

              {/* Çıkış */}
              <button
                onClick={() => {
                  if (localStorage.getItem('guestMode') === 'true') {
                    localStorage.removeItem('guestMode');
                    window.dispatchEvent(new Event('guestModeChanged'));
                  } else {
                    logout();
                  }
                }}
                className="w-9 h-9 shrink-0 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Çıkış Yap"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex overflow-x-auto hide-scrollbar gap-1.5 pb-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-2 rounded-full whitespace-nowrap font-medium text-sm transition-all flex items-center gap-1.5 shrink-0',
                  activeTab === tab.id
                    ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                )}
              >
                <span className="text-base leading-none">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ─── Content ────────────────────────────────────────────────────────── */}
      <div className="px-4 md:px-6 py-6 max-w-5xl mx-auto pb-24">
        {activeTab === 'dash' && (
          <OverviewTab
            summary={summary}
            stockStats={stockStats as StockStat[]}
            purchases={purchases}
            dividends={dividends}
            history={history}
            lastUpdated={lastUpdated}
            setViewingStockDetails={setViewingStockDetails}
          />
        )}
        {activeTab === 'pf' && (
          <PortfolioTab
            stocks={stocks}
            stockStats={stockStats as StockStat[]}
            loading={loading}
            searchQuery={searchQuery}
            setIsAddingStock={setIsAddingStock}
            setViewingStockDetails={setViewingStockDetails}
            setSelectedStockId={setSelectedStockId}
            setIsAddingPurchase={setIsAddingPurchase}
            setIsAddingSale={setIsAddingSale}
            setViewingPurchases={setViewingPurchases}
            onDeleteStock={(id, ticker) => {
              showConfirm(
                `${ticker} Silinecek`,
                `${ticker} hissesi ve tüm alım/temettü kayıtları kalıcı olarak silinecektir. Bu işlem geri alınamaz.`,
                async () => {
                  try {
                    await dbService.remove('stocks', id);
                    showToast(`${ticker} portföyden silindi.`);
                  } catch (err: any) {
                    showToast('Silme başarısız: ' + err.message, false);
                  }
                }
              );
            }}
          />
        )}
        {activeTab === 'div' && (
          <DividendsTab
            dividends={dividends}
            searchQuery={searchQuery}
            setIsAddingDividend={setIsAddingDividend}
            onDeleteDividend={(id) => {
              showConfirm('Temettü Silinecek', 'Bu temettü kaydı silinecektir. Emin misiniz?', async () => {
                try {
                  await dbService.remove('dividends', id);
                  showToast('Temettü kaydı silindi.');
                } catch (err: any) {
                  showToast('Silme başarısız: ' + err.message, false);
                }
              });
            }}
          />
        )}
        {activeTab === 'an' && (
          <AnalyticsTab
            stockStats={stockStats as StockStat[]}
            dividends={dividends}
            purchases={purchases}
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
            onDeleteGoal={(id) => {
              showConfirm('Hedef Silinecek', 'Bu hedef kalıcı olarak silinecektir.', async () => {
                try {
                  await dbService.remove('goals', id);
                  showToast('Hedef silindi.');
                } catch (err: any) {
                  showToast('Silme başarısız: ' + err.message, false);
                }
              });
            }}
          />
        )}
        {activeTab === 'cal' && (
          <CalendarTab dividends={dividends} stocks={stocks} />
        )}
        {activeTab === 'ai' && (
          <AiTab
            summary={summary}
            stockStats={stockStats as StockStat[]}
            dividends={dividends}
            goals={goals}
          />
        )}
      </div>

      {/* ─── Modals ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isAddingStock && (
          <AddStockModal
            onClose={() => setIsAddingStock(false)}
            onSuccess={showToast}
            onError={msg => showToast(msg, false)}
          />
        )}
        {isAddingPurchase && (
          <AddPurchaseModal
            stockId={selectedStockId}
            stocks={stocks}
            onClose={() => setIsAddingPurchase(false)}
            onSuccess={showToast}
            onError={msg => showToast(msg, false)}
          />
        )}
        {isAddingDividend && (
          <AddDividendModal
            stocks={stocks}
            onClose={() => setIsAddingDividend(false)}
            onSuccess={showToast}
            onError={msg => showToast(msg, false)}
          />
        )}
        {isAddingGoal && (
          <AddGoalModal
            onClose={() => setIsAddingGoal(false)}
            onSuccess={showToast}
            onError={msg => showToast(msg, false)}
          />
        )}
        {isAddingSale && saleTargetStat && (
          <AddSaleModal
            stockStat={saleTargetStat}
            onClose={() => setIsAddingSale(false)}
            onSuccess={showToast}
            onError={msg => showToast(msg, false)}
          />
        )}
        {viewingPurchases && (
          <ViewPurchasesModal
            stockId={viewingPurchases}
            stockTicker={viewingPurchasesTicker}
            purchases={purchases}
            onClose={() => setViewingPurchases(null)}
            onSuccess={showToast}
            onError={msg => showToast(msg, false)}
          />
        )}
        {viewingStockDetails && selectedStat && (
          <StockDetailModal
            stat={selectedStat}
            purchases={purchases}
            dividends={dividends}
            onClose={() => setViewingStockDetails(null)}
            onAddPurchase={() => {
              setSelectedStockId(selectedStat.id);
              setViewingStockDetails(null);
              setIsAddingPurchase(true);
            }}
            onAddSale={() => {
              setSelectedStockId(selectedStat.id);
              setViewingStockDetails(null);
              setIsAddingSale(true);
            }}
            onAddDividend={() => {
              setViewingStockDetails(null);
              setIsAddingDividend(true);
            }}
            onDeleteStock={() => {
              setViewingStockDetails(null);
              showConfirm(
                `${selectedStat.ticker} Silinecek`,
                `${selectedStat.ticker} ve tüm verileri kalıcı olarak silinecektir.`,
                async () => {
                  try {
                    await dbService.remove('stocks', selectedStat.id);
                    showToast(`${selectedStat.ticker} silindi.`);
                  } catch (err: any) {
                    showToast('Silme başarısız: ' + err.message, false);
                  }
                }
              );
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
