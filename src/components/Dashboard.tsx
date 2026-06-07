import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCcw, LogOut, Search, Sun, Moon, CheckCircle, AlertCircle,
  Plus, X, TrendingUp, Coins, Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, logout } from '../lib/supabase';
import { dbService } from '../services/db';
import { cn, formatCurrency, formatPercentage } from '../lib/utils';
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

export default function Dashboard() {
  const [activeTab,        setActiveTab]        = useState<Tab>('dash');
  const [searchQuery,      setSearchQuery]      = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [fabOpen,          setFabOpen]          = useState(false);

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
        setFabOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [refreshPrices]);

  // ─── Pull to Refresh (PTR) ────────────────────────────────────────────────
  const [pullDist, setPullDist] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const startY = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const PULL_THRESHOLD = 90;

  const handlePTRStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  };

  const handlePTRMove = (e: React.TouchEvent) => {
    if (!pulling) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      const dist = Math.min(diff * 0.4, 120);
      setPullDist(dist);
      if (diff > 10 && e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const handlePTREnd = async () => {
    if (!pulling) return;
    setPulling(false);
    if (pullDist >= PULL_THRESHOLD) {
      try {
        await refreshPrices();
        setRefreshed(true);
        setTimeout(() => setRefreshed(false), 1500);
      } catch (err) {
        console.error('Fiyatlar güncellenemedi:', err);
      }
    }
    setPullDist(0);
  };

  // ─── Canlı BIST Çalışma Durumu ──────────────────────────────────────────
  const isMarketOpen = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const trTime = new Date(utc + 3 * 3600000); // UTC+3
    const day = trTime.getDay();
    const hour = trTime.getHours();
    const min = trTime.getMinutes();
    const timeVal = hour * 100 + min;
    return day >= 1 && day <= 5 && timeVal >= 1000 && timeVal <= 1810;
  };
  const marketActive = isMarketOpen();

  // ─── Yıllık Temettü (TTM) Hesaplama ───────────────────────────────────────
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
  const trailingAnnualDiv = dividends
    .filter(d => new Date(d.date) >= twelveMonthsAgo)
    .reduce((a, d) => a + d.net, 0);

  // ─── Mini Stats ───────────────────────────────────────────────────────────
  const miniStats = [
    {
      label: 'Portföy Değeri',
      val: formatCurrency(summary.totalValue),
      icon: '💼',
      color: 'text-cyan-400',
      tab: 'dash' as Tab,
    },
    {
      label: 'Portföy K/Z',
      val: formatCurrency(summary.pnl),
      icon: '📊',
      color: summary.pnl >= 0 ? 'text-emerald-400' : 'text-red-400',
      tab: 'dash' as Tab,
    },
    {
      label: 'Yıllık Temettü',
      val: formatCurrency(trailingAnnualDiv),
      icon: '💰',
      color: 'text-amber-400',
      tab: 'div' as Tab,
    },
    {
      label: 'Hisse Sayısı',
      val: `${stocks.length} Adet`,
      icon: '📈',
      color: 'text-violet-400',
      tab: 'pf' as Tab,
    },
  ];

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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans select-none">

      {/* Backdrop for Expanded FAB */}
      <AnimatePresence>
        {fabOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFabOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px] z-[120] md:hidden"
          />
        )}
      </AnimatePresence>

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
                <div className="flex items-center gap-2 text-slate-500 text-[9px] uppercase font-bold tracking-widest leading-none mb-0.5 truncate">
                  <span className="hidden sm:inline">Temettü Takip • {userName}</span>
                  <span className="sm:hidden">PORTFÖYÜM</span>
                  <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded-full border border-slate-800">
                    <div className={cn("w-1 h-1 rounded-full", marketActive ? "bg-emerald-500 animate-pulse" : "bg-slate-500")} />
                    <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">{marketActive ? "BİST AÇIK" : "BİST KAPALI"}</span>
                  </div>
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

          {/* ── Mobil: Mini Stats Şeridi (Header Altı) ── */}
          {stocks.length > 0 && (
            <div className="md:hidden relative border-t border-slate-900">
              <div className="flex overflow-x-auto hide-scrollbar gap-2 px-4 py-3">
                {miniStats.map((stat, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTab(stat.tab)}
                    className={cn(
                      'flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900/80 border shrink-0 transition-all active:scale-[0.97]',
                      activeTab === stat.tab ? 'border-cyan-500/40 bg-slate-900' : 'border-slate-800/60'
                    )}
                  >
                    <span className="text-sm">{stat.icon}</span>
                    <div className="text-left">
                      <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">{stat.label}</div>
                      <div className={cn('text-xs font-bold font-sans tabular-nums', stat.color)}>{stat.val}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Mobil: Yükleme Göstergesi (Fiyatlar Güncellenirken) ── */}
          {loading && stocks.length > 0 && (
            <div className="md:hidden flex items-center gap-2 px-4 pb-2 text-[10px] text-slate-500">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
              Fiyatlar güncelleniyor...
            </div>
          )}
        </div>
      </header>

      {/* Pull-to-refresh Visual Indicator */}
      <AnimatePresence>
        {(pullDist > 8 || refreshed) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[150] md:hidden"
          >
            <div className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold shadow-xl border backdrop-blur-xl',
              refreshed 
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                : pullDist >= PULL_THRESHOLD 
                  ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' 
                  : 'bg-slate-800/90 border-slate-700 text-slate-400'
            )}>
              <RefreshCcw 
                size={13} 
                className={cn(loading || pullDist >= PULL_THRESHOLD ? 'animate-spin' : '')} 
                style={{ transform: `rotate(${(pullDist / PULL_THRESHOLD) * 180}deg)` }} 
              />
              {refreshed ? 'Güncellendi!' : pullDist >= PULL_THRESHOLD ? 'Bırak ve Güncelle' : 'Aşağı çekerek güncelle'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Content ────────────────────────────────────────────────────────── */}
      <div 
        ref={contentRef} 
        className="px-4 md:px-6 pb-28 md:pb-8 max-w-5xl mx-auto"
        style={{ 
          paddingTop: pullDist > 0 ? `${20 + pullDist * 0.5}px` : '20px', 
          transition: pulling ? 'none' : 'padding-top 0.3s cubic-bezier(0.16, 1, 0.3, 1)' 
        }}
        onTouchStart={handlePTRStart}
        onTouchMove={handlePTRMove}
        onTouchEnd={handlePTREnd}
      >
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
                searchQuery={searchQuery}
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

      {/* ─── Mobil: Speed Dial FAB (Floating Action Button) ───────────────── */}
      <div className="fixed right-4 z-[130] flex flex-col items-end gap-3 md:hidden bottom-[calc(72px+env(safe-area-inset-bottom,0px)+12px)]">
        <AnimatePresence>
          {fabOpen && (
            <div className="flex flex-col items-end gap-3">
              {/* Option 1: Temettü Ekle */}
              <motion.button
                initial={{ opacity: 0, y: 15, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.8 }}
                transition={{ duration: 0.15, delay: 0.05 }}
                onClick={() => { setFabOpen(false); setIsAddingDividend(true); }}
                className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl shadow-xl text-emerald-400 hover:text-white"
              >
                <span className="text-xs font-bold text-slate-300">Temettü Ekle</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Coins size={16} />
                </div>
              </motion.button>

              {/* Option 2: Alım Ekle */}
              <motion.button
                initial={{ opacity: 0, y: 15, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.8 }}
                transition={{ duration: 0.15, delay: 0.1 }}
                onClick={() => { setFabOpen(false); setSelectedStockId(null); setIsAddingPurchase(true); }}
                className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl shadow-xl text-blue-400 hover:text-white"
              >
                <span className="text-xs font-bold text-slate-300">Alım Ekle</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp size={16} />
                </div>
              </motion.button>

              {/* Option 3: Hisse Ekle */}
              <motion.button
                initial={{ opacity: 0, y: 15, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.8 }}
                transition={{ duration: 0.15, delay: 0.15 }}
                onClick={() => { setFabOpen(false); setIsAddingStock(true); }}
                className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl shadow-xl text-cyan-400 hover:text-white"
              >
                <span className="text-xs font-bold text-slate-300">Hisse Ekle</span>
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Briefcase size={16} />
                </div>
              </motion.button>
            </div>
          )}
        </AnimatePresence>

        {/* Main Trigger FAB */}
        <motion.button
          onClick={() => setFabOpen(!fabOpen)}
          animate={{ rotate: fabOpen ? 135 : 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 22 }}
          className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-2xl active:scale-95 transition-transform border border-slate-800/40',
            fabOpen ? 'bg-slate-900 text-slate-400' : 'bg-cyan-500 shadow-cyan-500/35'
          )}
          aria-label="Menüyü Aç"
        >
          <Plus size={24} />
        </motion.button>
      </div>

      {/* ─── Mobil: Bottom Navigation Bar ─────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[90] md:hidden bg-slate-955/98 backdrop-blur-2xl border-t border-slate-900"
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
