import { useState } from 'react';
import { loginWithGoogle } from '../lib/supabase';
import { motion } from 'motion/react';
import { RefreshCcw } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const { error: err } = await loginWithGoogle();
    if (err) {
      setError('Giriş başarısız: ' + err.message);
      setLoading(false);
    }
    // Başarılıysa Supabase redirect yapar — loading state devam eder
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center relative z-10"
      >
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 p-0.5 bg-slate-900">
            <img src="/icon.png" alt="Logo" className="w-full h-full object-cover rounded-[14px]" />
          </div>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Temettü Takip</h1>
        <p className="text-slate-500 text-xs font-semibold tracking-[0.2em] uppercase mb-10">Premium Portföy Analizi</p>

        <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
          <p className="text-slate-400 text-sm mb-10 leading-relaxed">
            Hisselerinizi, temettülerinizi ve finansal hedeflerinizi şık ve modern bir arayüzle takip edin.
          </p>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">{error}</div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 bg-white text-slate-950 font-bold text-sm rounded-2xl hover:bg-slate-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-white/5"
          >
            {loading ? (
              <RefreshCcw size={18} className="animate-spin" />
            ) : (
              <>
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                Google ile Giriş Yap
              </>
            )}
          </button>
        </div>

        <div className="mt-10 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
          &copy; 2026 Temettü Takip Sistemi
        </div>
      </motion.div>
    </div>
  );
}
