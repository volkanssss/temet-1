import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { dbService } from '../services/db';
import { fetchStockPricesBatch } from '../services/price';
import { StockHolding, Purchase, Dividend, Goal, PortfolioHistory, Sale } from '../types/stock';

export function usePortfolio() {
  const [stocks, setStocks] = useState<StockHolding[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [history, setHistory] = useState<PortfolioHistory[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  // Realtime Subscriptions
  useEffect(() => {
    const unsubStocks    = dbService.subscribe('stocks', setStocks);
    const unsubPurchases = dbService.subscribe('purchases', setPurchases);
    const unsubDividends = dbService.subscribe('dividends', setDividends);
    const unsubGoals     = dbService.subscribe('goals', setGoals);
    const unsubHistory   = dbService.subscribe('portfolio_history', setHistory);
    const unsubSales     = dbService.subscribe('sales', setSales);

    return () => {
      unsubStocks();
      unsubPurchases();
      unsubDividends();
      unsubGoals();
      unsubHistory();
      unsubSales();
    };
  }, []);

  // ─── Derived Data ─────────────────────────────────────────────────────────
  const stockStats = useMemo(() => {
    return stocks.map(s => {
      const stockPurchases = purchases.filter(p => p.stockId === s.id);
      const stockSales     = sales.filter(sl => sl.stockId === s.id);

      // Net lot: alımlar - satışlar
      const boughtQty = stockPurchases.reduce((acc, p) => acc + p.qty, 0);
      const soldQty   = stockSales.reduce((acc, sl) => acc + sl.qty, 0);
      const qty       = Math.max(0, boughtQty - soldQty);

      const totalCost    = stockPurchases.reduce((acc, p) => acc + p.qty * p.price, 0);
      const avgCost      = boughtQty > 0 ? totalCost / boughtQty : 0;
      // Elde tutulan lotların maliyeti (satılan lotlar çıkarılmış)
      const remainingCost = avgCost * qty;
      const currentPrice = s.lastPrice || avgCost;
      const currentValue = qty * currentPrice;
      const profitLoss   = currentValue - remainingCost;
      const profitLossPct = remainingCost > 0 ? (profitLoss / remainingCost) * 100 : 0;

      const stockDividends = dividends.filter(d => d.stockId === s.id);
      const totalDiv = stockDividends.reduce((acc, d) => acc + d.net, 0);

      // Gerçekleşen K/Z (satışlardan)
      const realizedPnl = stockSales.reduce((acc, sl) => acc + sl.realizedPnl, 0);

      // DRIP alımları
      const dripPurchases = stockPurchases.filter(p => p.isDrip);
      const totalDrip = dripPurchases.reduce((acc, p) => acc + p.qty * p.price, 0);

      return {
        ...s,
        qty,
        boughtQty,
        soldQty,
        avgCost,
        totalCost,
        remainingCost,
        currentPrice,
        currentValue,
        profitLoss,
        profitLossPct,
        totalDiv,
        realizedPnl,
        totalDrip,
      };
    });
  }, [stocks, purchases, dividends, sales]);

  const summary = useMemo(() => {
    const totalValue    = stockStats.reduce((acc, s) => acc + s.currentValue, 0);
    // Elde tutulan lotların toplam maliyeti (unrealized P&L için)
    const totalCost     = stockStats.reduce((acc, s) => acc + s.remainingCost, 0);
    // Tüm tarihsel alım maliyeti (temettü verimi hesabı için)
    const totalInvested = stockStats.reduce((acc, s) => acc + s.totalCost, 0);
    const totalDiv      = dividends.reduce((acc, d) => acc + d.net, 0);
    const pnl           = totalValue - totalCost;
    const pnlPct        = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
    const realizedPnl   = sales.reduce((acc, s) => acc + s.realizedPnl, 0);

    // DRIP istatistikleri
    const totalDrip = purchases
      .filter(p => p.isDrip)
      .reduce((acc, p) => acc + p.qty * p.price, 0);

    return { totalValue, totalCost, totalInvested, totalDiv, pnl, pnlPct, realizedPnl, totalDrip };
  }, [stockStats, dividends, sales, purchases]);

  // ─── Fiyat Yenileme ────────────────────────────────────────────────────────
  const refreshPrices = useCallback(async () => {
    if (!stocks.length) return false;
    setLoading(true);
    try {
      const priceMap = await fetchStockPricesBatch(
        stocks.map(s => ({ ticker: s.ticker, exchange: s.exchange }))
      );

      await Promise.all(
        stocks.map(s => {
          const price = priceMap[s.ticker];
          if (price != null) return dbService.update('stocks', s.id, { lastPrice: price });
        })
      );

      // Tarihsel veri kaydet
      const newTotalValue = stocks.reduce((acc, s) => {
        const price = priceMap[s.ticker] ?? s.lastPrice ?? 0;
        const stockSales = sales.filter(sl => sl.stockId === s.id);
        const soldQty = stockSales.reduce((sum, sl) => sum + sl.qty, 0);
        const qty = purchases.filter(p => p.stockId === s.id).reduce((sum, p) => sum + p.qty, 0) - soldQty;
        return acc + Math.max(0, qty) * price;
      }, 0);
      const newTotalCost = purchases.reduce((acc, p) => acc + p.qty * p.price, 0);
      const today = new Date().toISOString().split('T')[0];
      await dbService.upsertHistory(today, newTotalValue, newTotalCost);

      setLastUpdated(new Date());
      return true;
    } catch (err) {
      console.error('Fiyat yenileme hatası:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [stocks, purchases, sales]);

  // ─── Memory-Leak-Safe Interval (ref pattern) ──────────────────────────────
  const refreshPricesRef = useRef(refreshPrices);
  useEffect(() => {
    refreshPricesRef.current = refreshPrices;
  }, [refreshPrices]);

  const stocksLengthRef = useRef(stocks.length);
  useEffect(() => {
    stocksLengthRef.current = stocks.length;
  }, [stocks.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now   = new Date();
      const trTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
      const day   = trTime.getUTCDay();
      const hour  = trTime.getUTCHours();
      const min   = trTime.getUTCMinutes();

      const isWeekday    = day >= 1 && day <= 5;
      const isMarketOpen = isWeekday &&
        ((hour > 9 || (hour === 9 && min >= 55)) &&
         (hour < 18 || (hour === 18 && min <= 15)));

      if (isMarketOpen && stocksLengthRef.current > 0) {
        refreshPricesRef.current();
      }
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // ─── İlk Yükleme ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (stocks.length > 0 && !initialFetchDone) {
      refreshPrices();
      setInitialFetchDone(true);
    }
  }, [stocks.length, initialFetchDone, refreshPrices]);

  return {
    stocks,
    purchases,
    dividends,
    goals,
    history,
    sales,
    stockStats,
    summary,
    loading,
    lastUpdated,
    refreshPrices,
  };
}
