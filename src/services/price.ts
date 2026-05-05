/**
 * Hisse fiyatlarını Python FastAPI sunucusundan çeker.
 * Sunucu: python/main.py (localhost:8000)
 * Dev modda Vite proxy /api → localhost:8000 yönlendirir.
 */

const API_BASE = import.meta.env.VITE_PRICE_API_URL || '/api';

export async function fetchStockPrice(ticker: string, exchange = 'BIST'): Promise<number | null> {
  try {
    const res = await fetch(`${API_BASE}/price/${encodeURIComponent(ticker)}?exchange=${exchange}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.price ?? null;
  } catch {
    return null;
  }
}

export async function fetchStockPricesBatch(
  stocks: { ticker: string; exchange: string }[]
): Promise<Record<string, number | null>> {
  try {
    const res = await fetch(`${API_BASE}/prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stocks }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}
