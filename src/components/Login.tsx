import { useState } from 'react';
import { loginWithGoogle, supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCcw, Mail, Lock, Eye, EyeOff } from 'lucide-react';

type AuthMode = 'login' | 'register';

export default function Login() {
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState<string | null>(null);
  const [mode,     setMode]     = useState<AuthMode>('login');
  const [showPass, setShowPass] = useState(false);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

  const handleGoogle = async () => {
    setLoading(true); setError(null);
    const { error: err } = await loginWithGoogle();
    if (err) { setError('Google girişi başarısız: ' + err.message); setLoading(false); }
  };

  const handleEmail = async () => {
    if (!email || !password) { setError('E-posta ve şifre gerekli!'); return; }
    if (password.length < 6)  { setError('Şifre en az 6 karakter olmalıdır!'); return; }

    setLoading(true); setError(null); setSuccess(null);
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        setSuccess('Doğrulama e-postası gönderildi. Lütfen e-postanızı kontrol edin.');
        setLoading(false);
        return;
      }
    } catch (err: any) {
      setError(err.message || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    localStorage.setItem('guestMode', 'true');
    window.dispatchEvent(new Event('guestModeChanged'));
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-violet-500/6 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full text-center relative z-10"
      >
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 p-0.5 bg-slate-900">
            <img src="/icon.png" alt="Logo" className="w-full h-full object-cover rounded-[14px]" />
          </div>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Temettü Takip</h1>
        <p className="text-slate-500 text-xs font-semibold tracking-[0.2em] uppercase mb-8">Premium Portföy Analizi</p>

        {/* Card */}
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl shadow-2xl space-y-4">

          {/* Tab switcher */}
          <div className="flex bg-slate-800/50 p-1 rounded-xl mb-2">
            {(['login', 'register'] as AuthMode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === m
                    ? 'bg-slate-700 text-white shadow'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {m === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl text-left"
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl text-left"
              >
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* E-posta + Şifre */}
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              placeholder="E-posta adresiniz"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
            />
          </div>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Şifreniz (min. 6 karakter)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEmail()}
              disabled={loading}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 pl-10 pr-10 text-sm text-slate-200 outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPass(s => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {/* E-posta ile giriş butonu */}
          <button
            onClick={handleEmail}
            disabled={loading}
            className="w-full py-3 bg-cyan-500 text-slate-950 font-bold text-sm rounded-xl hover:bg-cyan-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <RefreshCcw size={16} className="animate-spin" /> : (mode === 'login' ? '→ Giriş Yap' : '→ Hesap Oluştur')}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-xs text-slate-600">veya</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full py-3 bg-slate-800 text-white font-medium text-sm rounded-xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
            Google ile Devam Et
          </button>

          {/* Misafir */}
          <button
            onClick={handleGuest}
            disabled={loading}
            className="w-full py-3 bg-transparent border border-slate-800 text-slate-500 font-medium text-sm rounded-xl hover:border-slate-700 hover:text-slate-400 transition-all disabled:opacity-50"
          >
            Misafir Olarak Devam Et
          </button>

          <p className="text-[10px] text-slate-600 leading-relaxed">
            Misafir modunda veriler yalnızca tarayıcınızda saklanır.
          </p>
        </div>

        <div className="mt-8 text-[10px] text-slate-700 font-bold uppercase tracking-widest">
          © 2026 Temettü Takip Sistemi
        </div>
      </motion.div>
    </div>
  );
}
