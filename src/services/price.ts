// Yaygın BIST hisseleri için yerel veritabanı (anında auto-fill)
export const BIST_STOCKS: Record<string, { name: string; sector: string }> = {
  TUPRS: { name: 'Tüpraş', sector: 'Enerji' },
  THYAO: { name: 'Türk Hava Yolları', sector: 'Ulaşım' },
  SASA: { name: 'SASA Polyester', sector: 'Sanayi' },
  EREGL: { name: 'Ereğli Demir ve Çelik', sector: 'Sanayi' },
  BIMAS: { name: 'BİM Birleşik Mağazalar', sector: 'Perakende' },
  AKBNK: { name: 'Akbank', sector: 'Banka' },
  GARAN: { name: 'Garanti BBVA', sector: 'Banka' },
  ISCTR: { name: 'İş Bankası', sector: 'Banka' },
  KCHOL: { name: 'Koç Holding', sector: 'Holding' },
  SAHOL: { name: 'Sabancı Holding', sector: 'Holding' },
  YKBNK: { name: 'Yapı ve Kredi Bankası', sector: 'Banka' },
  HALKB: { name: 'Halkbank', sector: 'Banka' },
  VAKBN: { name: 'VakıfBank', sector: 'Banka' },
  ASELS: { name: 'Aselsan', sector: 'Savunma' },
  TOASO: { name: 'Tofaş Türk Otomobil Fabrikası', sector: 'Otomotiv' },
  FROTO: { name: 'Ford Otosan', sector: 'Otomotiv' },
  PETKM: { name: 'Petkim', sector: 'Kimya' },
  EKGYO: { name: 'Emlak Konut GYO', sector: 'GYO' },
  TAVHL: { name: 'TAV Havalimanları', sector: 'Ulaşım' },
  TURSG: { name: 'Türkiye Sigorta', sector: 'Sigorta' },
  PGSUS: { name: 'Pegasus Hava Taşımacılığı', sector: 'Ulaşım' },
  SISE: { name: 'Şişecam', sector: 'Sanayi' },
  ARCLK: { name: 'Arçelik', sector: 'Teknoloji' },
  VESTL: { name: 'Vestel Elektronik', sector: 'Teknoloji' },
  MGROS: { name: 'Migros Ticaret', sector: 'Perakende' },
  TCELL: { name: 'Turkcell', sector: 'Teknoloji' },
  TTKOM: { name: 'Türk Telekom', sector: 'Teknoloji' },
  ENKAI: { name: 'Enka İnşaat', sector: 'İnşaat' },
  OYAKC: { name: 'Oyak Çimento', sector: 'İnşaat' },
  KOZAL: { name: 'Koza Altın İşletmeleri', sector: 'Madencilik' },
  KOZAA: { name: 'Koza Anadolu Metal Madencilik', sector: 'Madencilik' },
  DOHOL: { name: 'Doğan Holding', sector: 'Holding' },
  SOKM: { name: 'Şok Marketler', sector: 'Perakende' },
  ODAS: { name: 'Odaş Elektrik', sector: 'Enerji' },
  CIMSA: { name: 'Çimsa', sector: 'İnşaat' },
  AKCNS: { name: 'Akçansa', sector: 'İnşaat' },
  BRISA: { name: 'Brisa', sector: 'Sanayi' },
  AEFES: { name: 'Anadolu Efes', sector: 'Gıda' },
  ULKER: { name: 'Ülker Bisküvi', sector: 'Gıda' },
  KRDMD: { name: 'Kardemir', sector: 'Sanayi' },
  DOAS: { name: 'Doğuş Otomotiv', sector: 'Otomotiv' },
  EGEEN: { name: 'Ege Endüstri', sector: 'Sanayi' },
  ALARK: { name: 'Alarko Holding', sector: 'Holding' },
  Logo: { name: 'Logo Yazılım', sector: 'Teknoloji' },
  NETAS: { name: 'Netaş Telekomünikasyon', sector: 'Teknoloji' },
  ISDMR: { name: 'İskenderun Demir ve Çelik', sector: 'Sanayi' },
  ZOREN: { name: 'Zorlu Enerji', sector: 'Enerji' },
  GESAN: { name: 'Gensan Enerji', sector: 'Enerji' },
  MPARK: { name: 'MLP Sağlık', sector: 'Sağlık' },
  BIOEN: { name: 'Biotrend Çevre ve Enerji', sector: 'Enerji' },
  AGHOL: { name: 'AG Anadolu Grubu Holding', sector: 'Holding' },
  BANVT: { name: 'Banvit', sector: 'Gıda' },
  CCOLA: { name: 'Coca-Cola İçecek', sector: 'Gıda' },
  TKFEN: { name: 'Tekfen Holding', sector: 'Holding' },
  TSKB: { name: 'Türkiye Sınai Kalkınma Bankası', sector: 'Banka' },
  KLNMA: { name: 'Türkiye Kalkınma Bankası', sector: 'Banka' },
  ENJSA: { name: 'Enerjisa Enerji', sector: 'Enerji' },
  EUPWR: { name: 'Avrupa Yatırım Holding', sector: 'Holding' },
  ISGYO: { name: 'İş GYO', sector: 'GYO' },
  TATGD: { name: 'Tat Gıda', sector: 'Gıda' },
  TRGYO: { name: 'Torunlar GYO', sector: 'GYO' },
  MAVI: { name: 'Mavi Giyim', sector: 'Perakende' },
  GUBRF: { name: 'Gübre Fabrikaları', sector: 'Kimya' },
  KTLEV: { name: 'Katlev', sector: 'Finans' },
};

/**
 * Hisse fiyatlarını çeker.
 * Öncelik: Python sunucusu → Yahoo Finance CORS proxy
 */
const API_BASE = import.meta.env.VITE_PRICE_API_URL || '/api';

async function fetchFromYahoo(ticker: string, exchange: string): Promise<number | null> {
  const symbol = exchange === 'BIST' ? `${ticker}.IS` : ticker;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
  const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  try {
    const res = await fetch(proxy, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

export async function fetchStockPrice(ticker: string, exchange = 'BIST'): Promise<number | null> {
  try {
    const res = await fetch(`${API_BASE}/price/${encodeURIComponent(ticker)}?exchange=${exchange}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      return data.price ?? null;
    }
  } catch { /* fallback */ }
  return fetchFromYahoo(ticker, exchange);
}

export async function fetchStockPricesBatch(
  stocks: { ticker: string; exchange: string }[]
): Promise<Record<string, number | null>> {
  if (stocks.length === 0) return {};
  try {
    const res = await fetch(`${API_BASE}/prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stocks }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) return await res.json();
  } catch { /* fallback */ }

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
  // 1. Yerel BIST listesinden anında bul
  const local = BIST_STOCKS[ticker.toUpperCase()];
  if (local) return { ...local, success: true };

  // 2. Python sunucusu varsa kullan
  try {
    const res = await fetch(`${API_BASE}/info/${ticker}?exchange=${exchange}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return data;
    }
  } catch { /* fallback */ }

  // 3. Yahoo Finance Search API
  try {
    const symbol = exchange === 'BIST' ? `${ticker}.IS` : ticker;
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${symbol}&quotesCount=1`;
    const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxy, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      const quote = data?.quotes?.[0];
      if (quote) {
        return {
          name: quote.longname || quote.shortname || ticker.toUpperCase(),
          sector: quote.industry || 'Diğer',
          success: true,
        };
      }
    }
  } catch { /* hiçbiri çalışmadı */ }

  return { name: '', sector: 'Diğer', success: false };
}
