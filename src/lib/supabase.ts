import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente do Supabase usado pelas telas (lado do navegador).
// As duas variáveis vêm das Environment Variables da Vercel
// (ou do arquivo .env.local quando rodando no seu computador).
// A chave pode vir com o nome antigo (ANON_KEY) ou com o nome novo que o
// Supabase mostra no botão "Connect" (PUBLISHABLE_KEY). Os dois funcionam.

function chavePublica(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

let cliente: SupabaseClient | null = null;

export function variaveisConfiguradas(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && chavePublica(),
  );
}

export function supabase(): SupabaseClient {
  if (cliente) return cliente;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = chavePublica();
  if (!url || !chave) {
    throw new Error(
      "Variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) não configuradas. Veja o README.",
    );
  }
  cliente = createClient(url, chave);
  return cliente;
}
