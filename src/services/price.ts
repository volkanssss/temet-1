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
  EKGYO: { name: 'Emlak Konut GYO', sector: 'GYO' },
  SNGYO: { name: 'Sinpaş GYO', sector: 'GYO' },

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
};

// ─── Yahoo Finance Symbol ───────────────────────────────────────────────────
function toYahooSymbol(ticker: string, exchange: string): string {
  if (exchange === 'BIST') return `${ticker}.IS`;
  if (exchange === 'LSE') return `${ticker}.L`;
  return ticker;
}

// ─── Yahoo Finance v8 (doğrudan + proxy fallback) ──────────────────────────
async function fetchYahooPrice(ticker: string, exchange: string): Promise<number | null> {
  const symbol = toYahooSymbol(ticker, exchange);

  // 1. Vite dev proxy veya Vercel serverless üzerinden dene (CORS yok)
  try {
    const res = await fetch(`/api/prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stocks: [{ ticker, exchange }] }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      const price = data[ticker];
      if (price != null && price > 0) return Math.round(price * 100) / 100;
    }
  } catch { /* fallback */ }

  // 2. Yahoo Finance v8 — query1
  const endpoints = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
  ];
  const proxies = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?url=',
  ];

  for (const proxy of proxies) {
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(proxy + encodeURIComponent(endpoint), {
          signal: AbortSignal.timeout(7000),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price != null && price > 0) return Math.round(price * 100) / 100;
      } catch { continue; }
    }
  }

  return null;
}

// ─── Tek hisse fiyatı ───────────────────────────────────────────────────────
export async function fetchStockPrice(ticker: string, exchange = 'BIST'): Promise<number | null> {
  return fetchYahooPrice(ticker, exchange);
}

// ─── Toplu fiyat çekme (tam paralel, gecikme yok) ──────────────────────────
export async function fetchStockPricesBatch(
  stocks: { ticker: string; exchange: string }[]
): Promise<Record<string, number | null>> {
  if (stocks.length === 0) return {};

  // Önce sunucu-taraflı batch endpoint'i dene (tek istek, en hızlı)
  try {
    const res = await fetch(`/api/prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stocks }),
      signal: AbortSignal.timeout(20000),
    });
    if (res.ok) {
      const data = await res.json();
      // Tüm ticker'lar geldi mi kontrol et
      const allFetched = stocks.every(s => data[s.ticker] != null);
      if (allFetched) return data;
      // Kısmi sonuç — eksikleri tek tek tamamla
      const missing = stocks.filter(s => data[s.ticker] == null);
      const extras = await Promise.all(
        missing.map(async s => ({ ticker: s.ticker, price: await fetchYahooPrice(s.ticker, s.exchange) }))
      );
      extras.forEach(e => { data[e.ticker] = e.price; });
      return data;
    }
  } catch { /* fallback */ }

  // Sunucu yok — hepsini paralel olarak proxy üzerinden çek
  const results = await Promise.all(
    stocks.map(async s => ({
      ticker: s.ticker,
      price: await fetchYahooPrice(s.ticker, s.exchange),
    }))
  );

  return Object.fromEntries(results.map(r => [r.ticker, r.price]));
}

// ─── Hisse bilgisi (ad + sektör) ───────────────────────────────────────────
export async function fetchStockInfo(
  ticker: string,
  exchange: string = 'BIST'
): Promise<{ name: string; sector: string; success: boolean }> {
  const symbol = ticker.toUpperCase();

  // 1. Yerel BIST listesinden anında bul
  if (BIST_STOCKS[symbol]) {
    return { ...BIST_STOCKS[symbol], success: true };
  }

  // 2. Yahoo Finance Search API (proxy üzerinden)
  try {
    const yahooSymbol = exchange === 'BIST' ? `${symbol}.IS` : symbol;
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${yahooSymbol}&quotesCount=1&newsCount=0`;
    const proxies = [
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?url=',
    ];
    for (const proxy of proxies) {
      try {
        const res = await fetch(proxy + encodeURIComponent(url), { signal: AbortSignal.timeout(5000) });
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
      } catch { continue; }
    }
  } catch { /* fallback */ }

  return { name: '', sector: 'Diğer', success: false };
}
