export default async function handler(req, res) {
  // Sadece POST destekle
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { stocks } = req.body;
    if (!stocks || !Array.isArray(stocks)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const results = {};

    // Promise.all ile paralel ve hızlıca Vercel sunucusundan Yahoo'yu çek
    await Promise.all(stocks.map(async (stock) => {
      try {
        const symbol = stock.exchange === 'BIST' ? `${stock.ticker}.IS` : stock.ticker;
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          }
        });

        if (!response.ok) {
          results[stock.ticker] = null;
          return;
        }

        const data = await response.json();
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        results[stock.ticker] = price || null;
      } catch (err) {
        results[stock.ticker] = null;
      }
    }));

    // Cors ayarlari (Eger Vercel baska domaine servis edecekse)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
