export async function fetchStockPrice(ticker: string, exchange: string = 'BIST'): Promise<number | null> {
  let sym = ticker;
  if (exchange === 'BIST') sym = ticker + '.IS';
  else if (exchange === 'LSE') sym = ticker + '.L';
  
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`,
  ];
  
  const proxies = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?'
  ];

  for (const proxy of proxies) {
    for (const url of urls) {
      try {
        const response = await fetch(proxy + encodeURIComponent(url), {
          signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) continue;
        
        const data = await response.json();
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        
        if (price && price > 0) {
          return Math.round(price * 100) / 100;
        }
      } catch (error) {
        continue;
      }
    }
  }
  
  return null;
}
