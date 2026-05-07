import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { dbService } from '../services/db';
import { fetchStockPricesBatch } from '../services/price';
import { StockHolding, Purchase, Dividend, Goal, PortfolioHistory } from '../types/stock';

export function usePortfolio() {
  const [stocks, setStocks] = useState<StockHolding[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [history, setHistory] = useState<PortfolioHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  // Realtime Subscriptions
  useEffect(() => {
    const unsubStocks = dbService.subscribe('stocks', setStocks);
    const unsubPurchases = dbService.subscribe('purchases', setPurchases);
    const unsubDividends = dbService.subscribe('dividends', setDividends);
    const unsubGoals = dbService.subscribe('goals', setGoals);
    const unsubHistory = dbService.subscribe('portfolio_history', setHistory);

    return () => {
      unsubStocks();
      unsubPurchases();
      unsubDividends();
      unsubGoals();
      unsubHistory();
    };
  }, []);

  // Derived Data
  const stockStats = useMemo(() => {
    return stocks.map(s => {
      const stockPurchases = purchases.filter(p => p.stockId === s.id);
      const qty = stockPurchases.reduce((acc, p) => acc + p.qty, 0);
      const totalCost = stockPurchases.reduce((acc, p) => acc + p.qty * p.price, 0);
      const avgCost = qty > 0 ? totalCost / qty : 0;
      const currentPrice = s.lastPrice || avgCost;
      const currentValue = qty * currentPrice;
      const profitLoss = currentValue - totalCost;
      const profitLossPct = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;
      
      const stockDividends = dividends.filter(d => d.stockId === s.id);
      const totalDiv = stockDividends.reduce((acc, d) => acc + d.net, 0);

      return {
        ...s,
        qty,
        avgCost,
        totalCost,
        currentPrice,
        currentValue,
        profitLoss,
        profitLossPct,
        totalDiv
      };
    });
  }, [stocks, purchases, dividends]);

  const summary = useMemo(() => {
    const totalValue = stockStats.reduce((acc, s) => acc + s.currentValue, 0);
    const totalCost = stockStats.reduce((acc, s) => acc + s.totalCost, 0);
    const totalDiv = dividends.reduce((acc, d) => acc + d.net, 0);
    const pnl = totalValue - totalCost;
    const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalDiv,
      pnl,
      pnlPct
    };
  }, [stockStats, dividends]);

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

      const newTotalValue = stocks.reduce((acc, s) => {
        const price = priceMap[s.ticker] ?? s.lastPrice ?? 0;
        const qty = purchases.filter(p => p.stockId === s.id).reduce((sum, p) => sum + p.qty, 0);
        return acc + (qty * price);
      }, 0);
      const newTotalCost = purchases.reduce((acc, p) => acc + p.qty * p.price, 0);
      const today = new Date().toISOString().split('T')[0];
      await dbService.upsertHistory(today, newTotalValue, newTotalCost);

      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [stocks, purchases]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const trTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
      const day = trTime.getUTCDay();
      const hour = trTime.getUTCHours();
      const min = trTime.getUTCMinutes();

      const isWeekday = day >= 1 && day <= 5;
      const isMarketOpen = isWeekday &&
        ((hour > 9 || (hour === 9 && min >= 55)) && (hour < 18 || (hour === 18 && min <= 15)));

      if (isMarketOpen && stocks.length > 0) {
        refreshPrices();
      }
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [stocks.length, refreshPrices]);

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
    stockStats,
    summary,
    loading,
    refreshPrices
  };
}
