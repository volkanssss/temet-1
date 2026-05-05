import { useState } from 'react';
import { loginWithGoogle } from '../lib/supabase';
import { motion } from 'motion/react';

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
    <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        <div className="mb-8 flex justify-center">
          <div className="w-16 h-16 bg-[#141414] text-[#E4E3E0] flex items-center justify-center font-serif italic text-3xl">P.</div>
        </div>

        <h1 className="text-4xl font-bold tracking-tighter uppercase mb-2">Live Portfolio</h1>
        <p className="font-serif italic text-sm opacity-50 mb-8 tracking-widest uppercase">Professional Asset Management</p>

        <div className="border border-[#141414] p-8 mb-4">
          <p className="font-sans text-xs uppercase tracking-widest mb-8 opacity-60">
            Türk ve global hisselerinizi, temettülerinizi ve finansal hedeflerinizi güvenle takip edin.
          </p>

          {error && (
            <div className="mb-4 p-3 border border-red-400 text-red-700 text-xs font-mono">{error}</div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 bg-[#141414] text-[#E4E3E0] font-mono text-[10px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? 'Yönlendiriliyor...' : 'Google ile Giriş Yap'}
          </button>
        </div>

        <div className="text-[10px] font-mono opacity-30 uppercase tracking-tighter">
          &copy; 2026 Professional Ledger System
        </div>
      </motion.div>
    </div>
  );
}
