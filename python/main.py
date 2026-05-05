"""
Temettü Takip — Fiyat Sunucusu
yfinance ile BIST & global hisse fiyatları çeker.

Başlatmak için:
  pip install -r requirements.txt
  python main.py
  veya: start.bat
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import asyncio
from concurrent.futures import ThreadPoolExecutor

app = FastAPI(title="Fiyat Sunucusu", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

executor = ThreadPoolExecutor(max_workers=10)


def _build_symbol(ticker: str, exchange: str) -> str:
    """Borsa koduna göre Yahoo Finance sembolü oluşturur."""
    exchange = exchange.upper()
    if exchange == "BIST":
        return ticker.upper() + ".IS"
    elif exchange == "LSE":
        return ticker.upper() + ".L"
    elif exchange == "TSX":
        return ticker.upper() + ".TO"
    return ticker.upper()


def _fetch_price_sync(symbol: str) -> float | None:
    """Senkron yfinance çağrısı — thread pool'da çalışır."""
    try:
        ticker = yf.Ticker(symbol)
        price = ticker.fast_info.last_price
        if price and price > 0:
            return round(float(price), 4)
        # fast_info başarısız olursa history dene
        hist = ticker.history(period="1d")
        if not hist.empty:
            return round(float(hist["Close"].iloc[-1]), 4)
        return None
    except Exception:
        return None


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/price/{ticker}")
async def get_price(ticker: str, exchange: str = "BIST"):
    """Tek hisse fiyatı döner."""
    symbol = _build_symbol(ticker, exchange)
    loop = asyncio.get_event_loop()
    price = await loop.run_in_executor(executor, _fetch_price_sync, symbol)
    return {"ticker": ticker, "symbol": symbol, "price": price}


@app.post("/prices")
async def get_prices_batch(payload: dict):
    """
    Toplu fiyat çekme. Body:
      { "stocks": [{"ticker": "TUPRS", "exchange": "BIST"}, ...] }
    """
    stocks = payload.get("stocks", [])
    if not stocks:
        return {}

    symbols = [(s["ticker"], s.get("exchange", "BIST"), _build_symbol(s["ticker"], s.get("exchange", "BIST"))) for s in stocks]

    loop = asyncio.get_event_loop()
    tasks = [loop.run_in_executor(executor, _fetch_price_sync, sym) for _, _, sym in symbols]
    prices = await asyncio.gather(*tasks)

    return {ticker: price for (ticker, _, _), price in zip(symbols, prices)}


@app.get("/info/{ticker}")
async def get_stock_info(ticker: str, exchange: str = "BIST"):
    try:
        # BIST için sonuna .IS ekle (eğer yoksa)
        symbol = ticker.upper()
        if exchange == "BIST" and not symbol.endswith(".IS"):
            symbol += ".IS"
        
        stock = yf.Ticker(symbol)
        info = stock.info
        
        return {
            "name": info.get("longName") or info.get("shortName") or ticker.upper(),
            "sector": info.get("sector", "Diğer"),
            "exchange": exchange,
            "success": True
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
