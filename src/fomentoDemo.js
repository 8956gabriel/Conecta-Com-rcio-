// =============================================================================
// CLIENTE DA DEMONSTRAÇÃO (somente visualização) — fomento-ivatuba.vercel.app/demo
//
// Imita o cliente do Supabase para que todo o módulo do Fomento funcione sem
// alterações, mas:
//   • leituras de tabelas públicas (linhas, materiais, config, ranking) vão ao
//     banco normalmente;
//   • leituras de tabelas internas vêm da função fomento_demo_dados, que já
//     devolve tudo mascarado pelo banco (nome só com a inicial, sem documentos
//     nem contatos);
//   • qualquer gravação, upload, login ou IA é recusado.
// =============================================================================
import { supabaseReal } from "./supabaseClient";

export const MSG_DEMO = "Demonstração: somente visualização — nada é salvo.";
const ERRO = { message: MSG_DEMO, code: "demo" };
const PUBLICAS = new Set(["fomento_modulo_config", "fomento_linhas", "fomento_materiais", "fomento_ranking_oficial"]);

export function criarClienteDemonstracao(token) {
  const cache = new Map();
  const carregarTabela = (t) => {
    if (!cache.has(t)) {
      cache.set(t, supabaseReal.rpc("fomento_demo_dados", { p_token: token, p_tabela: t }).then(({ data, error }) => {
        if (error) { cache.delete(t); if (/demo_expirada/.test(error.message)) window.dispatchEvent(new Event("fomento-demo-expirou")); return []; }
        return Array.isArray(data) ? data : [];
      }));
    }
    return cache.get(t);
  };

  const from = (tabela) => {
    const chamadas = [];
    const st = { escrita: false, filtros: [], ordens: [], de: null, ate: null, limite: null, unico: null };
    const executar = async () => {
      if (st.escrita) return { data: null, error: ERRO, status: 403 };
      if (PUBLICAS.has(tabela)) {
        let q = supabaseReal.from(tabela);
        for (const [m, a] of chamadas) q = q[m](...a);
        return q;
      }
      let linhas = [...(await carregarTabela(tabela))];
      for (const [op, col, val] of st.filtros) {
        linhas = linhas.filter((r) => {
          const v = r[col];
          if (op === "eq") return String(v) === String(val);
          if (op === "neq") return String(v) !== String(val);
          if (op === "in") return (val || []).map(String).includes(String(v));
          if (op === "is") return val === null ? v == null : v === val;
          if (op === "gte") return v != null && v >= val;
          if (op === "lte") return v != null && v <= val;
          if (op === "gt") return v != null && v > val;
          if (op === "lt") return v != null && v < val;
          return true;
        });
      }
      if (st.ordens.length) {
        linhas.sort((a, b) => {
          for (const [col, asc] of st.ordens) {
            const x = a[col], y = b[col];
            if (x === y) continue;
            if (x == null) return 1;
            if (y == null) return -1;
            return (x < y ? -1 : 1) * (asc ? 1 : -1);
          }
          return 0;
        });
      }
      if (st.de != null) linhas = linhas.slice(st.de, st.ate + 1);
      if (st.limite != null) linhas = linhas.slice(0, st.limite);
      if (st.unico === "maybe") return { data: linhas[0] || null, error: null };
      if (st.unico === "single") return linhas[0] ? { data: linhas[0], error: null } : { data: null, error: { message: "Registro não encontrado." } };
      return { data: linhas, error: null, count: linhas.length };
    };

    const builder = new Proxy({}, {
      get(_, m) {
        if (m === "then") return (ok, falha) => executar().then(ok, falha);
        if (m === "catch") return (falha) => executar().catch(falha);
        if (m === "finally") return (f) => executar().finally(f);
        return (...a) => {
          chamadas.push([m, a]);
          if (["insert", "update", "upsert", "delete"].includes(m)) st.escrita = true;
          else if (["eq", "neq", "in", "is", "gte", "lte", "gt", "lt"].includes(m)) st.filtros.push([m, a[0], a[1]]);
          else if (m === "order") st.ordens.push([a[0], a[1]?.ascending !== false]);
          else if (m === "range") { st.de = a[0]; st.ate = a[1]; }
          else if (m === "limit") st.limite = a[0];
          else if (m === "maybeSingle") st.unico = "maybe";
          else if (m === "single") st.unico = "single";
          return builder;
        };
      },
    });
    return builder;
  };

  return {
    from,
    rpc: async (nome) => {
      if (nome === "fomento_resumo_publico") return supabaseReal.rpc(nome);
      if (nome === "fomento_pode_acessar" || nome === "fomento_pode_gerir") return { data: true, error: null };
      return { data: null, error: ERRO };
    },
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithPassword: async () => ({ data: null, error: ERRO }),
      signOut: async () => ({ error: null }),
      updateUser: async () => ({ data: null, error: ERRO }),
      resetPasswordForEmail: async () => ({ data: null, error: ERRO }),
    },
    storage: {
      from: (bucket) => ({
        upload: async () => ({ data: null, error: ERRO }),
        remove: async () => ({ data: null, error: ERRO }),
        getPublicUrl: (caminho) => supabaseReal.storage.from(bucket).getPublicUrl(caminho),
        createSignedUrl: async () => ({ data: null, error: ERRO }),
      }),
    },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: () => {},
  };
}

// Passe da visita (vale 24h neste navegador)
const CHAVE = "fomento-demo-passe";
export function lerPasse() {
  try {
    const p = JSON.parse(localStorage.getItem(CHAVE) || "null");
    if (p && p.token && Date.now() - p.em < 23 * 3600 * 1000) return p;
  } catch { /* */ }
  return null;
}
export function salvarPasse(p) { try { localStorage.setItem(CHAVE, JSON.stringify({ ...p, em: Date.now() })); } catch { /* */ } }
export function apagarPasse() { try { localStorage.removeItem(CHAVE); } catch { /* */ } }
export function marcarPagina(token, pagina) {
  if (!token || !supabaseReal) return;
  supabaseReal.rpc("fomento_demo_pagina", { p_token: token, p_pagina: pagina }).then(() => {}, () => {});
}
