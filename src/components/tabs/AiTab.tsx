import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Bot, User, Sparkles, RefreshCcw } from 'lucide-react';
import { formatCurrency, formatPercentage } from '../../lib/utils';
import { StockStat, Dividend, Goal } from '../../types/stock';

type AiTabProps = {
  summary: any;
  stockStats: StockStat[];
  dividends: Dividend[];
  goals: Goal[];
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_PROMPTS = [
  '📊 Portföyümü analiz et',
  '💰 Temettü gelirim nasıl görünüyor?',
  '🎯 Hedeflerime ulaşmak için ne yapmalıyım?',
  '📈 Çeşitlendirme önerisi ver',
  '🔮 Önümüzdeki yıl temettü tahmini yap',
  '⚠️ Risklerimi değerlendir',
];

export default function AiTab({ summary, stockStats, dividends, goals }: AiTabProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Merhaba! Ben portföy asistanınızım 🤖\n\nPortföyünüz hakkında soru sorabilir, analiz isteyebilir veya yatırım tavsiyesi alabilirsiniz.\n\nAşağıdaki hızlı sorulardan birini seçin veya kendi sorunuzu yazın.`,
    },
  ]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Portföy context'ini hazırla
  const buildContext = () => {
    const thisYear = new Date().getFullYear().toString();
    const yearDivs = dividends.filter(d => d.date.startsWith(thisYear));
    const yearTotal = yearDivs.reduce((a, d) => a + d.net, 0);
    const topStocks = [...stockStats].sort((a, b) => b.currentValue - a.currentValue).slice(0, 10);
    const sectors   = stockStats.reduce((acc, s) => { acc[s.sector] = (acc[s.sector] || 0) + s.currentValue; return acc; }, {} as Record<string, number>);

    return `
Sen bir Türk yatırım portföy asistanısın. Kullanıcının portföy bilgileri:

PORTFÖY ÖZETİ:
- Toplam Değer: ${formatCurrency(summary.totalValue)}
- Net Maliyet: ${formatCurrency(summary.totalCost)}
- Toplam K/Z: ${formatCurrency(summary.pnl)} (${formatPercentage(summary.pnlPct)})
- Tüm Zamanlar Temettü: ${formatCurrency(summary.totalDiv)}
- ${thisYear} Temettü Geliri: ${formatCurrency(yearTotal)}
- Hisse Sayısı: ${stockStats.length}

HISSELER (ilk 10):
${topStocks.map(s => `- ${s.ticker} (${s.sector}): ${formatCurrency(s.currentValue)}, K/Z: ${formatPercentage(s.profitLossPct)}, Temettü: ${formatCurrency(s.totalDiv)}`).join('\n')}

SEKTÖREL DAĞILIM:
${Object.entries(sectors).map(([s, v]) => `- ${s}: ${formatCurrency(v as number)} (${formatPercentage(summary.totalValue > 0 ? ((v as number) / summary.totalValue) * 100 : 0)})`).join('\n')}

HEDEFLER:
${goals.length > 0 ? goals.map(g => `- ${g.name}: Hedef ${g.type === 'stock_count' ? g.target + ' hisse' : formatCurrency(g.target)}`).join('\n') : 'Henüz hedef belirlenmemiş.'}

Türkçe, kısa ve net cevaplar ver. Finansal tavsiye verirken dikkatli ol, genel bilgi niteliğinde olduğunu belirt.
    `.trim();
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const apiKey = (window as any).__GEMINI_API_KEY__ || import.meta.env?.VITE_GEMINI_API_KEY || '';

    if (!apiKey) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Gemini API anahtarı bulunamadı. Lütfen `.env` dosyasına `VITE_GEMINI_API_KEY` ekleyin ve uygulamayı yeniden başlatın.',
      }]);
      setLoading(false);
      return;
    }

    try {
      const systemCtx = buildContext();
      const allMsgs = [
        { role: 'user',  parts: [{ text: systemCtx + '\n\nKullanıcı sorusu: ' + text }] },
      ];

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: allMsgs }),
          signal: AbortSignal.timeout(30000),
        }
      );

      if (!res.ok) throw new Error('API hatası: ' + res.status);
      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Yanıt alınamadı.';

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Hata: ${err.message || 'Gemini API\'ye bağlanılamadı.'}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
            <Sparkles size={20} className="text-violet-400" />
            AI Portföy Asistanı
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Gemini 2.0 Flash destekli · Portföyünüzü analiz eder</p>
        </div>
        <button
          onClick={() => setMessages([{ role: 'assistant', content: 'Sohbet sıfırlandı. Nasıl yardımcı olabilirim?' }])}
          className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          title="Sohbeti Sıfırla"
        >
          <RefreshCcw size={14} />
        </button>
      </div>

      {/* Mesaj Alanı */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden flex flex-col" style={{ height: '420px' }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'assistant' ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-700 text-slate-300'
              }`}>
                {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'assistant'
                  ? 'bg-slate-800/80 text-slate-200 rounded-tl-sm'
                  : 'bg-cyan-500 text-slate-950 font-medium rounded-tr-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                <Bot size={16} className="text-violet-400" />
              </div>
              <div className="bg-slate-800/80 px-4 py-3 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-800 p-3 flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Portföyünüz hakkında soru sorun..."
            disabled={loading}
            className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-violet-500 transition-colors disabled:opacity-50 placeholder:text-slate-600"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-xl bg-violet-500 text-white flex items-center justify-center hover:bg-violet-400 transition-colors disabled:opacity-50 shrink-0"
          >
            <Send size={15} />
          </button>
        </div>
      </div>

      {/* Hızlı Sorular */}
      <div className="space-y-2">
        <p className="text-xs text-slate-500 uppercase font-bold px-1">Hızlı Sorular</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              disabled={loading}
              className="px-3 py-2 rounded-full bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* API Key Uyarısı */}
      <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 text-xs text-violet-300">
        <strong>💡 Kurulum:</strong> AI asistanı için{' '}
        <code className="bg-violet-500/20 px-1 rounded">VITE_GEMINI_API_KEY</code>{' '}
        değerini <code className="bg-violet-500/20 px-1 rounded">.env.local</code> dosyasına ekleyin.{' '}
        Gemini API anahtarı için:{' '}
        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline hover:text-white">
          aistudio.google.com
        </a>
      </div>
    </motion.div>
  );
}
