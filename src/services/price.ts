// Kapsamlı BIST hisse ve sektör listesi (Anında auto-fill için)
export const BIST_STOCKS: Record<string, { name: string; sector: string }> = {
  // Enerji
  TUPRS: { name: 'Tüpraş', sector: 'Enerji' },
  AYDEM: { name: 'Aydem Enerji', sector: 'Enerji' },
  AKSEN: { name: 'Aksa Enerji', sector: 'Enerji' },
  ENJSA: { name: 'Enerjisa Enerji', sector: 'Enerji' },
  ODAS: { name: 'Odaş Elektrik', sector: 'Enerji' },
  ZOREN: { name: 'Zorlu Enerji', sector: 'Enerji' },
  GALATA: { name: 'Galata Wind Enerji', sector: 'Enerji' },
  BIOEN: { name: 'Biotrend Enerji', sector: 'Enerji' },
  CWENE: { name: 'CW Enerji', sector: 'Enerji' },
  ASTOR: { name: 'Astor Enerji', sector: 'Enerji' },
  ALFAS: { name: 'Alfa Solar Enerji', sector: 'Enerji' },
  SMRTG: { name: 'Smart Güneş Enerjisi', sector: 'Enerji' },
  YEOTK: { name: 'Yeo Teknoloji', sector: 'Enerji' },
  EUPWR: { name: 'Europower Enerji', sector: 'Enerji' },
  NTGAZ: { name: 'Naturelgaz Sanayi', sector: 'Enerji' },
  
  // Havacılık / Hizmet
  CLEBI: { name: 'Çelebi Hava Servisi', sector: 'Hizmet' },
  
  // GYO
  TRGYO: { name: 'Türkiye Reit GYO', sector: 'GYO' },
  
  // Banka
  AKBNK: { name: 'Akbank', sector: 'Banka' },
  GARAN: { name: 'Garanti BBVA', sector: 'Banka' },
  ISCTR: { name: 'İş Bankası (C)', sector: 'Banka' },
  YKBNK: { name: 'Yapı Kredi Bankası', sector: 'Banka' },
  HALKB: { name: 'Halkbank', sector: 'Banka' },
  VAKBN: { name: 'VakıfBank', sector: 'Banka' },
  TSKB: { name: 'TSKB', sector: 'Banka' },
  SKBNK: { name: 'Şekerbank', sector: 'Banka' },
  ALBRK: { name: 'Albaraka Türk', sector: 'Banka' },
  QNBFB: { name: 'QNB Finansbank', sector: 'Banka' },

  // Sanayi / Otomotiv / Demir Çelik
  EREGL: { name: 'Ereğli Demir Çelik', sector: 'Sanayi' },
  KRDMD: { name: 'Kardemir (D)', sector: 'Sanayi' },
  SASA: { name: 'SASA Polyester', sector: 'Sanayi' },
  SISE: { name: 'Şişecam', sector: 'Sanayi' },
  HEKTS: { name: 'Hektaş', sector: 'Tarım' },
  FROTO: { name: 'Ford Otosan', sector: 'Otomotiv' },
  TOASO: { name: 'Tofaş Otomobil', sector: 'Otomotiv' },
  DOAS: { name: 'Doğuş Otomotiv', sector: 'Otomotiv' },
  ARCLK: { name: 'Arçelik', sector: 'Sanayi' },
  VESTL: { name: 'Vestel', sector: 'Sanayi' },
  ASELS: { name: 'Aselsan', sector: 'Savunma' },
  OTKAR: { name: 'Otokar', sector: 'Otomotiv' },
  EGEEN: { name: 'Ege Endüstri', sector: 'Sanayi' },
  KONTR: { name: 'Kontrolmatik Teknoloji', sector: 'Teknoloji' },

  // Perakende / Gıda
  BIMAS: { name: 'BİM Mağazalar', sector: 'Perakende' },
  MGROS: { name: 'Migros', sector: 'Perakende' },
  SOKM: { name: 'Şok Marketler', sector: 'Perakende' },
  AEFES: { name: 'Anadolu Efes', sector: 'Gıda' },
  CCOLA: { name: 'Coca-Cola İçecek', sector: 'Gıda' },
  ULKER: { name: 'Ülker Bisküvi', sector: 'Gıda' },
  TATGD: { name: 'Tat Gıda', sector: 'Gıda' },
  BRYAT: { name: 'Borusan Yatırım', sector: 'Holding' },

  // Holding
  KCHOL: { name: 'Koç Holding', sector: 'Holding' },
  SAHOL: { name: 'Sabancı Holding', sector: 'Holding' },
  ALARK: { name: 'Alarko Holding', sector: 'Holding' },
  DOHOL: { name: 'Doğan Holding', sector: 'Holding' },
  AGHOL: { name: 'Anadolu Grubu Holding', sector: 'Holding' },
  TKFEN: { name: 'Tekfen Holding', sector: 'Holding' },
  GUBRF: { name: 'Gübre Fabrikaları', sector: 'Kimya' },

  // Ulaşım
  THYAO: { name: 'Türk Hava Yolları', sector: 'Ulaşım' },
  PGSUS: { name: 'Pegasus', sector: 'Ulaşım' },
  TAVHL: { name: 'TAV Havalimanları', sector: 'Ulaşım' },

  // İletişim / Teknoloji
  TCELL: { name: 'Turkcell', sector: 'Teknoloji' },
  TTKOM: { name: 'Türk Telekom', sector: 'Teknoloji' },
  MIATK: { name: 'Mia Teknoloji', sector: 'Teknoloji' },
  REEDR: { name: 'Reeder Teknoloji', sector: 'Teknoloji' },
  SNGYO: { name: 'Sinpaş GYO', sector: 'GYO' },
  EKGYO: { name: 'Emlak Konut GYO', sector: 'GYO' },
};

const API_BASE = import.meta.env.VITE_PRICE_API_URL || '/api';

async function fetchFromYahoo(ticker: string, exchange: string): Promise<number | null> {
  const symbol = exchange === 'BIST' ? `${ticker}.IS` : ticker;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
  const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  try {
    const res = await fetch(proxy, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    const yahooData = JSON.parse(data.contents);
    return yahooData?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
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

  const results: { ticker: string, price: number | null }[] = [];
  for (const { ticker, exchange } of stocks) {
    const price = await fetchFromYahoo(ticker, exchange);
    results.push({ ticker, price });
    // allorigins rate limit'e takılmamak için 800ms bekle
    await new Promise(resolve => setTimeout(resolve, 800));
  }
  
  return Object.fromEntries(results.map(({ ticker, price }) => [ticker, price]));
}

export async function fetchStockInfo(
  ticker: string,
  exchange: string = 'BIST'
): Promise<{ name: string; sector: string; success: boolean }> {
  const symbol = ticker.toUpperCase();
  
  // 1. Yerel BIST listesinden anında bul
  if (BIST_STOCKS[symbol]) {
    return { ...BIST_STOCKS[symbol], success: true };
  }

  // 2. Python sunucusu varsa kullan
  try {
    const res = await fetch(`${API_BASE}/info/${ticker}?exchange=${exchange}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return data;
    }
  } catch { /* fallback */ }

  // 3. Yahoo Finance Search API
  try {
    const yahooSymbol = exchange === 'BIST' ? `${symbol}.IS` : symbol;
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${yahooSymbol}&quotesCount=1`;
    const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxy, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      const quote = data?.quotes?.[0];
      if (quote) {
        return {
          name: quote.longname || quote.shortname || symbol,
          sector: quote.industry || 'Diğer',
          success: true,
        };
      }
    }
  } catch { /* fallback */ }

  return { name: '', sector: 'Diğer', success: false };
}
