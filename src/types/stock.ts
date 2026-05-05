export type StockSymbol = string;

export interface StockHolding {
  id: string;
  ticker: StockSymbol;
  name: string;
  exchange: string;
  sector: string;
  notes?: string;
  lastPrice?: number;
  updatedAt?: string;
}

export interface Purchase {
  id: string;
  stockId: string;
  date: string;
  qty: number;
  price: number;
  note?: string;
}

export interface Dividend {
  id: string;
  stockId: string;
  ticker: string;
  date: string;
  ps: number;
  qty: number;
  tax: number;
  gross: number;
  net: number;
  type: string;
  note?: string;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  type: 'monthly_div' | 'annual_div' | 'portfolio_val' | 'total_div' | 'stock_count';
  date?: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalInvestment: number;
  totalProfitLoss: number;
  profitLossPercentage: number;
  totalDividends: number;
}
