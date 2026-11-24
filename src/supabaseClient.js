import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Se as variáveis de ambiente não estiverem configuradas, a plataforma
// continua funcionando em modo demonstração (com dados de exemplo),
// mas login/cadastro e listagens reais só funcionam com o Supabase conectado.
export const supabaseConfigurado = Boolean(url && anonKey);

// Cliente verdadeiro (sempre disponível, mesmo durante a demonstração).
export const supabaseReal = supabaseConfigurado ? createClient(url, anonKey) : null;

// `supabase` é uma ligação "viva": no link de demonstração do Fomento ele é
// trocado por um cliente somente-leitura (ver fomentoDemo.js) e todos os
// módulos que importam `supabase` passam a usar o cliente da demonstração.
export let supabase = supabaseReal;
export let emDemonstracao = false;
export function usarClienteDemonstracao(cliente) {
  supabase = cliente;
  emDemonstracao = true;
}
