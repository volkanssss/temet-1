/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, logout } from './lib/supabase';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { RefreshCcw } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    // Mevcut oturumu al
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    // Oturum değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center">
        <RefreshCcw className="animate-spin opacity-20" size={32} />
      </div>
    );
  }

  return session ? <Dashboard /> : <Login />;
}
