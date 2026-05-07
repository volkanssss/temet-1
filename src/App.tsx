/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, logout } from './lib/supabase';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import UpdatePassword from './components/UpdatePassword';
import { RefreshCcw } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isGuest, setIsGuest] = useState<boolean>(localStorage.getItem('guestMode') === 'true');
  const [isRecovery, setIsRecovery] = useState<boolean>(false);

  useEffect(() => {
    // URL'de şifre sıfırlama parametresi var mı kontrol et
    if (window.location.hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    // Mevcut oturumu al
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    // Oturum değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
      
      if (s) {
        localStorage.removeItem('guestMode');
        setIsGuest(false);
      }
    });

    const handleStorage = () => {
      setIsGuest(localStorage.getItem('guestMode') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    // Custom event to catch local changes in the same window
    window.addEventListener('guestModeChanged', handleStorage);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('guestModeChanged', handleStorage);
    };
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center">
        <RefreshCcw className="animate-spin opacity-20" size={32} />
      </div>
    );
  }

  if (isRecovery) {
    return (
      <UpdatePassword 
        onComplete={() => {
          setIsRecovery(false);
          // Temizlemek için hash'i kaldır
          window.history.replaceState(null, '', window.location.pathname);
        }} 
      />
    );
  }

  return (session || isGuest) ? <Dashboard /> : <Login />;
}
