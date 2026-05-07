import { supabase } from '../lib/supabase';

// ─── camelCase ↔ snake_case yardımcıları ────────────────────────────────────
function toSnake(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k in obj) {
    const sk = k.replace(/([A-Z])/g, '_$1').toLowerCase();
    out[sk] = obj[k];
  }
  return out;
}

function toCamel(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k in obj) {
    const ck = k.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    out[ck] = obj[k];
  }
  return out;
}

async function getUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) throw new Error('Kullanıcı oturumu bulunamadı.');
  return uid;
}

// ─── LocalStorage Helper ──────────────────────────────────────────────────────
export const isGuestMode = () => localStorage.getItem('guestMode') === 'true';

function getLocalTable(table: string): any[] {
  try {
    const data = localStorage.getItem(`guest_${table}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocalTable(table: string, data: any[]) {
  try {
    localStorage.setItem(`guest_${table}`, JSON.stringify(data));
    window.dispatchEvent(new Event(`local_db_update_${table}`));
  } catch (err: any) {
    // localStorage dolu ise (5MB limit) uyar
    if (err.name === 'QuotaExceededError') {
      console.warn('LocalStorage dolu! Bazı veriler kaydedilemedi.');
      throw new Error('Depolama alanı dolu. Lütfen bazı eski kayıtları silin veya giriş yapın.');
    }
    throw err;
  }
}

function generateId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// ─── DB Service ──────────────────────────────────────────────────────────────
export const dbService = {
  /** Belirli bir tablodaki tüm kayıtları çeker */
  async list(table: string): Promise<any[]> {
    if (isGuestMode()) {
      return getLocalTable(table);
    }
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(toCamel);
  },

  /** Yeni kayıt ekler */
  async add(table: string, payload: Record<string, any>): Promise<any> {
    if (isGuestMode()) {
      const rows  = getLocalTable(table);
      const newRow = { ...payload, id: generateId(), updatedAt: new Date().toISOString() };
      setLocalTable(table, [newRow, ...rows]);
      return newRow;
    }
    const userId = await getUserId();
    const row    = { ...toSnake(payload), user_id: userId, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from(table).insert(row).select().single();
    if (error) throw error;
    return toCamel(data);
  },

  /** Mevcut kaydı günceller */
  async update(table: string, id: string, payload: Record<string, any>): Promise<void> {
    if (isGuestMode()) {
      const rows = getLocalTable(table);
      const updatedRows = rows.map(r =>
        r.id === id ? { ...r, ...payload, updatedAt: new Date().toISOString() } : r
      );
      setLocalTable(table, updatedRows);
      return;
    }
    const row = { ...toSnake(payload), updated_at: new Date().toISOString() };
    const { error } = await supabase.from(table).update(row).eq('id', id);
    if (error) throw error;
  },

  /** Kaydı siler — stocks için cascade (purchases + dividends + sales) */
  async remove(table: string, id: string): Promise<void> {
    if (isGuestMode()) {
      if (table === 'stocks') {
        const pRows = getLocalTable('purchases').filter(p => p.stockId !== id);
        setLocalTable('purchases', pRows);
        const dRows = getLocalTable('dividends').filter(d => d.stockId !== id);
        setLocalTable('dividends', dRows);
        const sRows = getLocalTable('sales').filter(s => s.stockId !== id);
        setLocalTable('sales', sRows);
      }
      const rows = getLocalTable(table).filter(r => r.id !== id);
      setLocalTable(table, rows);
      return;
    }
    if (table === 'stocks') {
      const { error: pe } = await supabase.from('purchases').delete().eq('stock_id', id);
      if (pe) throw pe;
      const { error: de } = await supabase.from('dividends').delete().eq('stock_id', id);
      if (de) throw de;
      const { error: se } = await supabase.from('sales').delete().eq('stock_id', id);
      if (se) console.warn('Sales cascade delete:', se); // sales tablosu henüz yoksa sessiz geç
    }
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  },

  /** Portfolio History — Günde 1 kayıt upsert */
  async upsertHistory(date: string, totalValue: number, totalCost: number): Promise<void> {
    if (isGuestMode()) {
      const rows = getLocalTable('portfolio_history');
      const existingIdx = rows.findIndex(r => r.date === date);
      const newRow = { id: generateId(), date, totalValue, totalCost, updatedAt: new Date().toISOString() };
      if (existingIdx >= 0) {
        rows[existingIdx] = { ...rows[existingIdx], totalValue, totalCost, updatedAt: new Date().toISOString() };
      } else {
        rows.push(newRow);
      }
      setLocalTable('portfolio_history', rows);
      return;
    }
    const userId = await getUserId();
    const { error } = await supabase.from('portfolio_history').upsert({
      user_id:     userId,
      date,
      total_value: totalValue,
      total_cost:  totalCost,
      updated_at:  new Date().toISOString(),
    }, { onConflict: 'user_id,date' });
    if (error) throw error;
  },

  /** Gerçek zamanlı abonelik */
  subscribe(table: string, callback: (data: any[]) => void): () => void {
    if (isGuestMode()) {
      this.list(table).then(callback).catch(console.error);
      const listener = () => { this.list(table).then(callback).catch(console.error); };
      window.addEventListener(`local_db_update_${table}`, listener);
      return () => { window.removeEventListener(`local_db_update_${table}`, listener); };
    }

    this.list(table).then(callback).catch(console.error);
    const channel = supabase
      .channel(`realtime_${table}_${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        this.list(table).then(callback).catch(console.error);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
};
