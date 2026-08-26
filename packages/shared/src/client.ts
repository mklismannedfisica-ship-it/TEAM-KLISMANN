import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: Parameters<typeof createClient>[2]
): SupabaseClient<Database> {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase URL e Anon Key são obrigatórios. Configure as variáveis de ambiente do projeto."
    );
  }
  return createClient<Database>(url, anonKey, options);
}
