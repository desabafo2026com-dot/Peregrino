import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente Supabase isolado, que NUNCA persiste sessão no navegador. Usado
// quando um administrador precisa criar a CONTA de outra pessoa (agente ou
// outro administrador) via signUp, sem correr o risco de substituir a
// própria sessão do administrador logado no cliente principal do app.
export function createIsolatedClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}
