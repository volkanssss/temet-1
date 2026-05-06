import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const isPlaceholderUrl = !supabaseUrl || supabaseUrl.includes('YOUR_PROJECT_REF');

if (isPlaceholderUrl || !supabaseAnonKey) {
  console.error(
    '⚠️ Supabase yapılandırması eksik!\n' +
    '1. https://supabase.com → projenizi açın\n' +
    '2. Settings → API → "Project URL" değerini kopyalayın\n' +
    '3. .env dosyasındaki VITE_SUPABASE_URL değerini yapıştırın\n' +
    '4. Uygulamayı yeniden başlatın (npm run dev)'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

export const loginWithGoogle = () =>
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });

export const logout = () => supabase.auth.signOut();
