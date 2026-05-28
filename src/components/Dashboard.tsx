import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCcw, LogOut, Search, Sun, Moon, CheckCircle, AlertCircle,
  Plus, X, TrendingUp,
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
import CalendarTab   from './tabs/CalendarTab';

// Modals
import AddStockModal    from './modals/AddStockModal';
import AddPurchaseModal from './modals/AddPurchaseModal';
import AddDividendModal from './modals/AddDividendModal';
import AddSaleModal     from './modals/AddSaleModal';
import ViewPurchasesModal from './modals/ViewPurchasesModal';
import StockDetailModal from './modals/StockDetailModal';
import ConfirmDialog    from './ui/ConfirmDialog';

type Tab = 'dash' | 'pf' | 'div' | 'an' | 'cal';

const TABS: { id: Tab; label: string; short: string; icon: string }[] = [
  { id: 'dash', label: 'Genel Bakış', short: 'Bakış',   icon: '📊' },
  { id: 'pf',   label: 'Hisseler',    short: 'Hisse',   icon: '💼' },
  { id: 'div',  label: 'Temettüler',  short: 'Temettü', icon: '💰' },
  { id: 'an',   label: 'Analitik',    short: 'Analiz',  icon: '📈' },
  { id: 'cal',  label: 'Takvim',      short: 'Takvim',  icon: '📅' },
];

// FAB config — hangi sekme için FAB gösterilsin
const FAB_CONFIG: Partial<Record<Tab, { icon: React.ReactNode; label: string; color: string }>> = {
  pf:   { icon: <Plus size={22} />,       label: 'Hisse Ekle',   color: 'bg-cyan-500 shadow-cyan-500/40' },
  div:  { icon: <Plus size={22} />,       label: 'Temettü Ekle', color: 'bg-emerald-500 shadow-emerald-500/40' },
};

export default function Dashboard() {
  const [activeTab,        setActiveTab]        = useState<Tab>('dash');
  const [searchQuery,      setSearchQuery]      = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const {
    stocks, purchases, dividends, goals, history, sales,
    stockStats, summary, loading, lastUpdated, refreshPrices,
  } = usePortfolio();

  // ─── Modal States ─────────────────────────────────────────────────────────
  const [isAddingStock,    setIsAddingStock]    = useState(false);
  const [isAddingPurchase, setIsAddingPurchase] = useState(false);
  const [isAddingDividend, setIsAddingDividend] = useState(false);
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
      if (e.key === 't' && !e.metaKey && !e.ctrlKey) setTheme(th => th === 'dark' ? 'light' : 'dark');
      if (e.key === 'Escape') {
        setIsAddingStock(false); setIsAddingPurchase(false);
        setIsAddingDividend(false);
        setIsAddingSale(false); setViewingPurchases(null);
        setViewingStockDetails(null); setShowMobileSearch(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [refreshPrices]);

  // ─── FAB aksiyonu ─────────────────────────────────────────────────────────
  const handleFab = () => {
    if (activeTab === 'pf')   setIsAddingStock(true);
    if (activeTab === 'div')  setIsAddingDividend(true);
  };

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

  const fabConfig = FAB_CONFIG[activeTab];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">

      {/* ─── Toast ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={cn(
              'fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl font-medium text-sm shadow-2xl border',
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

      {/* ─── Mobile Search Overlay ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showMobileSearch && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="fixed top-0 left-0 right-0 z-[200] bg-slate-950/98 backdrop-blur-xl border-b border-slate-800 px-4 py-3 flex gap-3 items-center md:hidden"
          >
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              id="mobile-search"
              autoFocus
              type="text"
              placeholder="Hisse, sektör, not ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-slate-200 text-base outline-none placeholder:text-slate-600"
            />
            <button
              onClick={() => { setShowMobileSearch(false); setSearchQuery(''); }}
              className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400"
            >
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-[100] bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/60">
        <div className="max-w-5xl mx-auto">

          {/* ── Üst Satır ── */}
          <div className="flex items-center gap-3 px-4 md:px-6 pt-4 pb-3">
            {/* Logo + Başlık */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-xl overflow-hidden border border-slate-800 shrink-0">
                <img src="/icon.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <div className="text-slate-500 text-[9px] uppercase font-bold tracking-widest leading-none mb-0.5 truncate hidden sm:block">
                  Temettü Takip • {userName}
                </div>
                <h1 className="text-base md:text-lg font-bold text-white leading-none truncate">
                  {TABS.find(t => t.id === activeTab)?.label}
                </h1>
              </div>
            </div>

            {/* Sağ Aksiyonlar */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Desktop Arama */}
              <div className="relative hidden md:block w-52">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="global-search"
                  type="text"
                  placeholder="Ara... (Ctrl+K)"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-full py-2 pl-8 pr-4 text-sm text-slate-200 outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              {/* Mobil Arama Butonu */}
              <button
                onClick={() => setShowMobileSearch(true)}
                className="md:hidden w-9 h-9 rounded-full bg-slate-800/70 flex items-center justify-center text-slate-400 active:scale-95 transition-all"
                aria-label="Ara"
              >
                <Search size={15} />
              </button>

              {/* Son güncelleme (desktop) */}
              {lastUpdated && (
                <div className="hidden md:flex items-center gap-1 text-[10px] text-slate-600 whitespace-nowrap">
                  {lastUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}

              {/* Tema */}
              <button
                onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                className="w-9 h-9 shrink-0 rounded-full bg-slate-800/70 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 active:scale-95 transition-all"
                title="Tema Değiştir (T)"
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>

              {/* Fiyat Yenile */}
              <button
                onClick={refreshPrices}
                disabled={loading}
                className="w-9 h-9 shrink-0 rounded-full bg-slate-800/70 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-40"
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
                className="w-9 h-9 shrink-0 rounded-full bg-slate-800/70 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 active:scale-95 transition-all"
                title="Çıkış Yap"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>

          {/* ── Desktop Tab Bar ── */}
          <div className="hidden md:flex overflow-x-auto hide-scrollbar gap-1.5 px-6 pb-3">
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
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ── Mobil: Yükleme Göstergesi ── */}
          {loading && stocks.length > 0 && (
            <div className="md:hidden flex items-center gap-2 px-4 pb-2 text-[10px] text-slate-500">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
              Fiyatlar güncelleniyor...
            </div>
          )}
        </div>
      </header>

      {/* ─── Content ────────────────────────────────────────────────────────── */}
      <div className="px-4 md:px-6 pt-5 pb-28 md:pb-8 max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
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
                purchases={purchases}
                stocks={stocks}
                searchQuery={searchQuery}
                setIsAddingDividend={setIsAddingDividend}
                onDeleteDividend={(id) => {
                  const divItem = dividends.find(d => d.id === id);
                  const hasDripRef = divItem?.note?.match(/\[DRIP_REF:([^\]]+)\]/);
                  const dripPurchaseId = hasDripRef ? hasDripRef[1] : null;

                  showConfirm(
                    'Temettü Silinecek',
                    dripPurchaseId
                      ? 'Bu temettü kaydı bir DRIP alımı ile ilişkilidir. Silerseniz ilişkili alım kaydı da silinecektir. Emin misiniz?'
                      : 'Bu temettü kaydı silinecektir. Emin misiniz?',
                    async () => {
                      try {
                        await dbService.remove('dividends', id);
                        if (dripPurchaseId) {
                          try {
                            await dbService.remove('purchases', dripPurchaseId);
                          } catch (pErr) {
                            console.error('İlişkili alım silinemedi:', pErr);
                          }
                        }
                        showToast('Temettü kaydı silindi.');
                      } catch (err: any) {
                        showToast('Silme başarısız: ' + err.message, false);
                      }
                    }
                  );
                }}
              />
            )}
            {activeTab === 'an' && (
              <AnalyticsTab
                stockStats={stockStats as StockStat[]}
                dividends={dividends}
                purchases={purchases}
                sales={sales}
                summary={summary}
              />
            )}
            {activeTab === 'cal' && (
              <CalendarTab dividends={dividends} stocks={stocks} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── Mobil: FAB (Floating Action Button) ───────────────────────────── */}
      <AnimatePresence>
        {fabConfig && (
          <motion.button
            key={activeTab}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={handleFab}
            className={cn(
              'fixed right-4 z-[90] md:hidden w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl active:scale-95 transition-transform',
              fabConfig.color,
              'bottom-[calc(72px+env(safe-area-inset-bottom,0px)+12px)]'
            )}
            aria-label={fabConfig.label}
          >
            {fabConfig.icon}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ─── Mobil: Bottom Navigation Bar ─────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[90] md:hidden bg-slate-950/98 backdrop-blur-2xl border-t border-slate-800/60"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex h-16">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  // Haptic feedback (destekleniyorsa)
                  if ('vibrate' in navigator) navigator.vibrate(10);
                }}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-all active:scale-90"
                aria-label={tab.label}
              >
                {/* Aktif gösterge */}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-cyan-500 rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}

                {/* İkon */}
                <motion.span
                  animate={{ scale: isActive ? 1.15 : 1, y: isActive ? -1 : 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="text-lg leading-none"
                >
                  {tab.icon}
                </motion.span>

                {/* Etiket */}
                <span className={cn(
                  'text-[9px] font-semibold leading-none transition-colors',
                  isActive ? 'text-cyan-400' : 'text-slate-600'
                )}>
                  {tab.short}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

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
