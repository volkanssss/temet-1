/**
 * Hisse fiyatlarını çeker.
 * Öncelik sırası:
 * 1. Python FastAPI sunucusu (VITE_PRICE_API_URL veya /api proxy)
 * 2. Yahoo Finance doğrudan (CORS proxy fallback) - sunucu yoksa otomatik devreye girer
 */

const API_BASE = import.meta.env.VITE_PRICE_API_URL || '/api';

// Yahoo Finance doğrudan çekme (CORS proxy ile)
async function fetchFromYahoo(ticker: string, exchange: string): Promise<number | null> {
  const symbol = exchange === 'BIST' ? `${ticker}.IS` : ticker;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
  const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  try {
    const res = await fetch(proxy, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return price ?? null;
  } catch {
    return null;
  }
}

export async function fetchStockPrice(ticker: string, exchange = 'BIST'): Promise<number | null> {
  try {
    const res = await fetch(`${API_BASE}/price/${encodeURIComponent(ticker)}?exchange=${exchange}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error('server error');
    const data = await res.json();
    return data.price ?? null;
  } catch {
    // Python sunucusu yoksa Yahoo Finance'ten doğrudan çek
    return fetchFromYahoo(ticker, exchange);
  }
}

export async function fetchStockPricesBatch(
  stocks: { ticker: string; exchange: string }[]
): Promise<Record<string, number | null>> {
  if (stocks.length === 0) return {};
  
  // Önce Python sunucusunu dene
  try {
    const res = await fetch(`${API_BASE}/prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stocks }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) return await res.json();
  } catch {
    // Sunucu yok, fallback'e geç
  }

  // Fallback: Yahoo Finance'ten paralel çek
  const results = await Promise.all(
    stocks.map(async ({ ticker, exchange }) => ({
      ticker,
      price: await fetchFromYahoo(ticker, exchange),
    }))
  );
  return Object.fromEntries(results.map(({ ticker, price }) => [ticker, price]));
}

export async function fetchStockInfo(
  ticker: string,
  exchange: string = 'BIST'
): Promise<{ name: string; sector: string; success: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/info/${ticker}?exchange=${exchange}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return await res.json();
  } catch {
    // Sunucu yok
  }
  return { name: '', sector: 'Diğer', success: false };
}
