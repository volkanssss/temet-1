-- ============================================================
-- Temettü Takip — Supabase Schema
-- Supabase dashboard → SQL Editor → bu dosyayı çalıştır
-- ============================================================

-- STOCKS
CREATE TABLE IF NOT EXISTS stocks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ticker      TEXT NOT NULL CHECK (char_length(ticker) <= 16),
  name        TEXT NOT NULL CHECK (char_length(name) <= 100),
  exchange    TEXT NOT NULL CHECK (char_length(exchange) <= 20),
  sector      TEXT,
  notes       TEXT,
  last_price  FLOAT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- PURCHASES
CREATE TABLE IF NOT EXISTS purchases (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stock_id   UUID REFERENCES stocks(id) ON DELETE CASCADE NOT NULL,
  date       DATE NOT NULL,
  qty        FLOAT NOT NULL CHECK (qty > 0),
  price      FLOAT NOT NULL CHECK (price >= 0),
  note       TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DIVIDENDS
CREATE TABLE IF NOT EXISTS dividends (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stock_id   UUID REFERENCES stocks(id) ON DELETE CASCADE NOT NULL,
  ticker     TEXT NOT NULL,
  date       DATE NOT NULL,
  ps         FLOAT NOT NULL CHECK (ps >= 0),
  qty        FLOAT NOT NULL CHECK (qty > 0),
  tax        FLOAT DEFAULT 0 CHECK (tax >= 0),
  gross      FLOAT CHECK (gross >= 0),
  net        FLOAT NOT NULL CHECK (net >= 0),
  type       TEXT DEFAULT 'Nakit',
  note       TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GOALS
CREATE TABLE IF NOT EXISTS goals (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL CHECK (char_length(name) <= 100),
  target     FLOAT NOT NULL CHECK (target >= 0),
  type       TEXT NOT NULL,
  date       DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE stocks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE dividends ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals     ENABLE ROW LEVEL SECURITY;

-- Stocks policies
CREATE POLICY "stocks_select" ON stocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "stocks_insert" ON stocks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stocks_update" ON stocks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "stocks_delete" ON stocks FOR DELETE USING (auth.uid() = user_id);

-- Purchases policies
CREATE POLICY "purchases_select" ON purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "purchases_insert" ON purchases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "purchases_update" ON purchases FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "purchases_delete" ON purchases FOR DELETE USING (auth.uid() = user_id);

-- Dividends policies
CREATE POLICY "dividends_select" ON dividends FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "dividends_insert" ON dividends FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dividends_update" ON dividends FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "dividends_delete" ON dividends FOR DELETE USING (auth.uid() = user_id);

-- Goals policies
CREATE POLICY "goals_select" ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "goals_insert" ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_update" ON goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "goals_delete" ON goals FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Enable Realtime (Supabase dashboard'da da açık olmalı)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE stocks;
ALTER PUBLICATION supabase_realtime ADD TABLE purchases;
ALTER PUBLICATION supabase_realtime ADD TABLE dividends;
ALTER PUBLICATION supabase_realtime ADD TABLE goals;
