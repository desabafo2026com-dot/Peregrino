import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Cliente com a service role key — ignora RLS. Uso restrito a rotas de
// servidor que precisam gravar dados sensíveis sem depender de nenhuma
// política de RLS acessível ao próprio usuário (ex.: status de pagamento),
// e ao webhook do Mercado Pago, que não tem sessão de usuário nenhuma.
// NUNCA importar este arquivo em código que roda no navegador.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada — necessária para processar pagamentos da Romaria Plus."
    );
  }
  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
