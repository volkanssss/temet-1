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

// ─── DB Service ──────────────────────────────────────────────────────────────
export const dbService = {
  /** Belirli bir tablodaki tüm kayıtları çeker (kullanıcıya ait) */
  async list(table: string): Promise<any[]> {
    const { data, error } = await supabase.from(table).select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(toCamel);
  },

  /** Yeni kayıt ekler */
  async add(table: string, payload: Record<string, any>): Promise<any> {
    const userId = await getUserId();
    const row = { ...toSnake(payload), user_id: userId, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from(table).insert(row).select().single();
    if (error) throw error;
    return toCamel(data);
  },

  /** Mevcut kaydı günceller */
  async update(table: string, id: string, payload: Record<string, any>): Promise<void> {
    const row = { ...toSnake(payload), updated_at: new Date().toISOString() };
    const { error } = await supabase.from(table).update(row).eq('id', id);
    if (error) throw error;
  },

  /** Kaydı siler — stocks için cascade (purchases + dividends) */
  async remove(table: string, id: string): Promise<void> {
    if (table === 'stocks') {
      // Önce ilişkili kayıtları sil (FK ON DELETE CASCADE varsa zaten olur,
      // ama güvence için elle de siliyoruz)
      const { error: pe } = await supabase.from('purchases').delete().eq('stock_id', id);
      if (pe) throw pe;
      const { error: de } = await supabase.from('dividends').delete().eq('stock_id', id);
      if (de) throw de;
    }
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  },

  /** Portfolio History için Upsert (Günde 1 kayıt) */
  async upsertHistory(date: string, totalValue: number, totalCost: number): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('portfolio_history').upsert({
      user_id: userId,
      date,
      total_value: totalValue,
      total_cost: totalCost,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,date' });
    if (error) throw error;
  },

  /**
   * Gerçek zamanlı abonelik.
   * İlk yüklemede veriyi çeker, sonra değişikliklerde tekrar çeker.
   * Dashboard.tsx ile aynı arayüzü korur.
   */
  subscribe(table: string, callback: (data: any[]) => void): () => void {
    // İlk yükleme
    this.list(table).then(callback).catch(console.error);

    // Realtime kanal
    const channel = supabase
      .channel(`realtime_${table}_${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        this.list(table).then(callback).catch(console.error);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
};
