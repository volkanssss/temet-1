import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Temettü Takip Terminali',
          short_name: 'Temettü',
          description: 'Premium Portföy & Temettü Analiz Terminali',
          theme_color: '#020617', // slate-950 equivalent for now
          icons: [
            {
              src: '/icon.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icon.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      }),
      {
        name: 'yahoo-finance-proxy',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/prices' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => body += chunk.toString());
              req.on('end', async () => {
                try {
                  const { stocks } = JSON.parse(body);
                  const results: Record<string, { price: number | null, prevClose: number | null } | null> = {};
                  await Promise.all(stocks.map(async (stock: any) => {
                    try {
                      const symbol = stock.exchange === 'BIST' ? `${stock.ticker}.IS` : stock.ticker;
                      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`, {
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                      });
                      const data = await response.json();
                      const meta = data?.chart?.result?.[0]?.meta;
                      if (meta) {
                        results[stock.ticker] = {
                          price: meta.regularMarketPrice || null,
                          prevClose: meta.chartPreviousClose || null
                        };
                      } else {
                        results[stock.ticker] = null;
                      }
                    } catch {
                      results[stock.ticker] = null;
                    }
                  }));
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(results));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'Internal Error' }));
                }
              });
            } else {
              next();
            }
          });
        }
      }
    ],
  };
});
