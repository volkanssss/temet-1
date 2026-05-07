export default async function handler(req, res) {
  // CORS — sadece kendi domain'imize izin ver
  const allowedOrigins = [
    'https://volkann.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
  ];
  const origin = req.headers.origin || '';
  const isAllowed = allowedOrigins.some(o => origin.startsWith(o));

  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : allowedOrigins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { stocks } = req.body;
    if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Güvenlik: maksimum 50 hisse
    const safeStocks = stocks.slice(0, 50);
    const results = {};

    // Staggered requests — Yahoo'nun rate limiting'ini aşmak için
    for (let i = 0; i < safeStocks.length; i++) {
      const stock = safeStocks[i];

      // Her istek arasına 120ms gecikme — Yahoo ban'ını önler
      if (i > 0) await new Promise(r => setTimeout(r, 120));

      try {
        const symbol = stock.exchange === 'BIST'
          ? `${stock.ticker}.IS`
          : stock.exchange === 'LSE'
          ? `${stock.ticker}.L`
          : stock.ticker;

        // 2 farklı Yahoo endpoint'i dene
        let price = null;
        const endpoints = [
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
          `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
        ];

        for (const url of endpoints) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);

            const response = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
              },
              signal: controller.signal,
            });
            clearTimeout(timeout);

            if (!response.ok) continue;

            const data = await response.json();
            const p = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
            if (p != null && p > 0) {
              price = Math.round(p * 100) / 100;
              break;
            }
          } catch {
            continue;
          }
        }

        results[stock.ticker] = price;
      } catch {
        results[stock.ticker] = null;
      }
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(results);
  } catch (error) {
    console.error('Price API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
