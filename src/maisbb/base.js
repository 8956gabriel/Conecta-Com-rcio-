// MAIS BB DIGITAL — dados (Supabase), regras e utilidades
import { useEffect, useState } from "react";
import { supabase, supabaseConfigurado } from "../supabaseClient";
import { PUBLICOS_BASE, MESES_PADRAO, ROTINA_PADRAO, DICAS, GRUPOS, SEMANA, gerarMensagem } from "./conteudo.js";

export const TAB = {
  usuarios: ["maisbb_usuarios", "nome", true], convites: ["maisbb_convites", "criado_em", false], config: ["maisbb_config", "id", true],
  servicos: ["maisbb_servicos", "nome", true], publicos: ["maisbb_publicos", "nome", true], clientes: ["maisbb_clientes", "criado_em", false],
  atendimentos: ["maisbb_atendimentos", "numero", false], prospeccoes: ["maisbb_prospeccoes", "data", false], locais: ["maisbb_locais", "criado_em", false],
  campanhas: ["maisbb_campanhas", "criado_em", false], publicacoes: ["maisbb_publicacoes", "criado_em", false], calendario: ["maisbb_calendario", "mes", true],
  datas: ["maisbb_datas", "data", true], plano: ["maisbb_plano", "data", true], tarefas: ["maisbb_tarefas", "data", true], metas: ["maisbb_metas", "criado_em", true],
  desafios: ["maisbb_desafios", "criado_em", false], participantes: ["maisbb_participantes", "pontos", false], sorteios: ["maisbb_sorteios", "realizado_em", false],
  dicas: ["maisbb_dicas", "criado_em", false], conhecimento: ["maisbb_conhecimento", "titulo", true], treino: ["maisbb_treino_resultados", "criado_em", false],
};
const PK = { plano: "data", calendario: "mes", publicos: "chave", config: "id" };

export function useDadosMaisBB(ativo) {
  const [d, setD] = useState(null);
  const [erro, setErro] = useState(null);
  const carregar = async () => {
    const res = await Promise.all(Object.entries(TAB).map(async ([k, [t, ord, asc]]) => {
      const todos = [];
      for (let de = 0; ; de += 1000) {
        const { data, error } = await supabase.from(t).select("*").order(ord, { ascending: asc }).range(de, de + 999);
        if (error) return [k, [], error];
        todos.push(...data);
        if (data.length < 1000) break;
      }
      return [k, todos];
    }));
    const e = res.find((r) => r[2]);
    setErro(e ? `${e[0]}: ${e[2].message}` : null);
    setD(Object.fromEntries(res.map(([k, v]) => [k, v])));
  };
  useEffect(() => { if (ativo && supabaseConfigurado) carregar(); }, [ativo]);
  const salvar = async (k, id, dados) => {
    const [t] = TAB[k]; const pk = PK[k] || "id";
    const q = ["plano", "calendario", "publicos"].includes(k) ? supabase.from(t).upsert({ ...dados, [pk]: id ?? dados[pk] }).select().single()
      : id != null ? supabase.from(t).update(dados).eq(pk, id).select().single() : supabase.from(t).insert(dados).select().single();
    const { data, error } = await q;
    if (error) throw error;
    setD((x) => ({ ...x, [k]: x[k].some((r) => r[pk] === data[pk]) ? x[k].map((r) => (r[pk] === data[pk] ? data : r)) : [data, ...x[k]] }));
    return data;
  };
  const apagar = async (k, id) => {
    const [t] = TAB[k]; const pk = PK[k] || "id";
    const { error } = await supabase.from(t).delete().eq(pk, id);
    if (error) throw error;
    setD((x) => ({ ...x, [k]: x[k].filter((r) => r[pk] !== id) }));
  };
  return { d, setD, carregar, salvar, apagar, erro };
}

export const msgErro = (e) => {
  const m = e?.message || String(e);
  if (/maisbb_clientes_cpf_uk|duplicate key/i.test(m)) return "Já existe um registro com esses dados (possível duplicidade).";
  if (/row-level security|permission denied/i.test(m)) return "Sem permissão para esta ação (somente administrador).";
  return m;
};

// ------------------------------------------------------------------ datas
export const isoData = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
export const hojeISO = () => isoData(new Date());
export const dataLocal = (iso) => new Date(`${String(iso).slice(0, 10)}T12:00:00`);
export const dataBR = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "—");
export const diasEntre = (a, b = new Date()) => Math.floor((dataLocal(isoData(b)) - dataLocal(isoData(a))) / 864e5);
export const soDigitos = (s) => String(s || "").replace(/\D/g, "");
export const zap = (s) => soDigitos(s).slice(-11);
export function periodo(p, ref = new Date()) {
  const h = new Date(ref);
  if (p === "dia") return { de: isoData(h), ate: isoData(h) };
  if (p === "semana") { const i = new Date(h); i.setDate(h.getDate() - ((h.getDay() + 6) % 7)); const f = new Date(i); f.setDate(i.getDate() + 6); return { de: isoData(i), ate: isoData(f) }; }
  if (p === "ano") return { de: `${h.getFullYear()}-01-01`, ate: `${h.getFullYear()}-12-31` };
  return { de: isoData(new Date(h.getFullYear(), h.getMonth(), 1)), ate: isoData(new Date(h.getFullYear(), h.getMonth() + 1, 0)) };
}
const dentro = (d, p) => d && String(d).slice(0, 10) >= p.de && String(d).slice(0, 10) <= p.ate;

// ------------------------------------------------------------------ públicos (sistema + personalizados)
export function listaPublicos(d) {
  const custom = Object.fromEntries((d?.publicos || []).map((p) => [p.chave, p]));
  const base = PUBLICOS_BASE.map((p) => (custom[p.chave] ? { ...p, ...custom[p.chave], conteudo: { ...p.conteudo, ...(custom[p.chave].conteudo || {}) }, personalizado: false } : p));
  const novos = (d?.publicos || []).filter((p) => p.personalizado && !PUBLICOS_BASE.some((b) => b.chave === p.chave));
  return [...base, ...novos].filter((p) => p.ativo !== false);
}
export const nomeGrupo = (g) => GRUPOS[g]?.nome || g || "Outros";

// ------------------------------------------------------------------ calendário, plano de 30 dias e estratégia do dia
export const mesConteudo = (d, mes) => ({ ...MESES_PADRAO[mes], ...((d?.calendario || []).find((c) => c.mes === mes)?.conteudo || {}) });
export const rotina = (d) => ({ ...ROTINA_PADRAO, ...((d?.config || [])[0]?.rotina || {}) });

function rnd(seed) { let x = seed % 2147483647; if (x <= 0) x += 2147483646; return () => (x = (x * 16807) % 2147483647) / 2147483647; }
export function planoDoDia(d, iso, semente = 0) {
  const dt = dataLocal(iso);
  const mes = mesConteudo(d, dt.getMonth() + 1);
  const r = rotina(d)[dt.getDay()];
  const pubs = listaPublicos(d);
  const dy = Math.floor((dt - new Date(dt.getFullYear(), 0, 0)) / 864e5);
  const ra = rnd(dy * 31 + semente * 7919 + 1);
  let pub;
  if (dt.getDay() === 3) pub = pubs.filter((p) => ["professores", "aposentados", "servidores", "trabalhadores", "empreendedores"].includes(p.grupo))[Math.floor(ra() * 1000) % 25];
  else pub = pubs[Math.floor(ra() * 1000) % pubs.length];
  pub = pub || pubs[0];
  const servAtivos = (d?.servicos || []).filter((s) => s.ativo && (pub.conteudo.servicos || []).includes(s.categoria));
  const servico = servAtivos.length ? servAtivos[Math.floor(ra() * 1000) % servAtivos.length].nome : (pub.conteudo.servicos || [])[0] || "serviços do correspondente";
  const acoesDia = {
    1: ["Revisar resultados da semana anterior no painel", `Separar a lista de retornos de ${pub.nome.toLowerCase()}`, "Definir a meta da semana"],
    2: [`Visitar 3 locais onde estão ${pub.nome.toLowerCase()}: ${(pub.conteudo.onde || []).slice(0, 2).join(", ")}`, "Fazer 5 contatos autorizados", "Registrar cada contato na Prospecção"],
    3: [`Usar a página do público "${pub.nome}" no Radar`, "Enviar a mensagem pronta para contatos autorizados", "Agendar 2 atendimentos"],
    4: ["Fazer os retornos pendentes da agenda", "Ligar para clientes interessados", "Registrar resultados"],
    5: [`Publicar no status a arte do tema "${mes.tema}"`, "Postar nas redes sociais", "Preparar as mensagens da próxima semana"],
    6: ["Conferir metas e ranking", "Atualizar indicadores", "Planejar a próxima semana"],
    0: ["Descanso"],
  }[dt.getDay()];
  return {
    data: iso, dia: SEMANA[dt.getDay()], foco: r?.titulo || "DESCANSO", publico: pub.nome, publicoChave: pub.chave, grupo: pub.grupo,
    objetivo: dt.getDay() === 0 ? "Descanso" : `${(r?.titulo || "").toLowerCase().replace(/^./, (c) => c.toUpperCase())}: ${mes.objetivo}`,
    estrategia: `${pub.conteudo.apresentar} Tema do mês: ${mes.tema}.`,
    servico, acoes: acoesDia,
    acao: acoesDia[0],
    mensagem: gerarMensagem({ tipo: "primeira", estilo: "amigavel", publico: pub.nome, servico }),
    meta: dt.getDay() === 0 ? "—" : { 1: "Plano da semana definido", 2: "5 contatos registrados", 3: "3 contatos com o público do dia", 4: "Todos os retornos do dia feitos", 5: "2 publicações", 6: "Indicadores atualizados" }[dt.getDay()],
    dica: dicaDoDia(d, iso),
    proximo: dt.getDay() === 6 ? "Segunda: planejamento da semana" : `Amanhã: ${(rotina(d)[(dt.getDay() + 1) % 7]?.titulo || "descanso").toLowerCase()}`,
  };
}
export function planoSalvoOuGerado(d, iso) {
  const salvo = (d?.plano || []).find((p) => p.data === iso);
  const base = planoDoDia(d, iso, salvo?.conteudo?.semente || 0);
  return { ...base, ...(salvo?.conteudo || {}), _salvo: salvo };
}

export function todasDicas(d) {
  return [...DICAS.map(([categoria, texto], i) => ({ id: `s${i}`, categoria, texto })), ...(d?.dicas || []).filter((x) => x.ativo)];
}
export function dicaDoDia(d, iso = hojeISO()) {
  const l = todasDicas(d); const dt = dataLocal(iso);
  const n = Math.floor((dt - new Date(2026, 0, 1)) / 864e5);
  return l[((n % l.length) + l.length) % l.length];
}

// ------------------------------------------------------------------ indicadores
export function indicadores(d, p, usuarioId = null) {
  const de = (x, k) => !usuarioId || x[k] === usuarioId;
  const at = (d?.atendimentos || []).filter((a) => dentro(a.data, p) && de(a, "atendente"));
  const pr = (d?.prospeccoes || []).filter((a) => dentro(a.data, p) && de(a, "responsavel"));
  const cl = (d?.clientes || []).filter((c) => dentro(c.criado_em, p) && de(c, "responsavel"));
  const tf = (d?.tarefas || []).filter((t) => dentro(t.data, p) && de(t, "responsavel"));
  const visitasLocais = (d?.locais || []).filter((l) => dentro(l.data_visita, p)).length;
  const ret = tf.filter((t) => t.tipo === "retorno");
  return {
    atendimentos: at.length,
    concluidos: at.filter((a) => a.resultado === "concluido").length,
    resolvidos: at.filter((a) => ["concluido", "orientado", "encaminhado"].includes(a.resultado)).length,
    novos_clientes: cl.length,
    prospeccoes: pr.length,
    contatos: pr.reduce((s, x) => s + Number(x.contatos || 0), 0),
    interessados: pr.reduce((s, x) => s + Number(x.interessados || 0), 0) + cl.filter((c) => c.oportunidade === "interessado").length,
    visitas: pr.filter((x) => ["visita", "presencial"].includes(x.tipo)).length + (usuarioId ? 0 : visitasLocais),
    retornos: ret.filter((t) => t.concluida).length,
    retornosTotal: ret.length,
    retornosNoPrazo: ret.filter((t) => t.concluida && t.concluida_em && isoData(t.concluida_em) <= t.data).length,
    campanhas: (d?.campanhas || []).filter((c) => c.status !== "planejada" && (dentro(c.inicio, p) || dentro(c.fim, p))).length,
  };
}
export function pontuacao(d, k) {
  const pt = { atendimento: 1, atendimento_concluido: 2, novo_cliente: 3, prospeccao: 2, visita: 2, retorno: 1, ...((d?.config || [])[0]?.pontuacao || {}) };
  return k.atendimentos * pt.atendimento + k.concluidos * pt.atendimento_concluido + k.novos_clientes * pt.novo_cliente + k.prospeccoes * pt.prospeccao + k.visitas * pt.visita + k.retornos * pt.retorno;
}
export function progressoMeta(d, m) {
  const p = periodo(m.periodo);
  const k = indicadores(d, p, m.usuario_id || null);
  const v = k[m.indicador] ?? 0;
  return { valor: v, pct: m.alvo ? Math.min(100, Math.round((100 * v) / m.alvo)) : 0, ...p };
}
export const NOMES_INDICADOR = { atendimentos: "Atendimentos", novos_clientes: "Novos clientes", prospeccoes: "Prospecções", visitas: "Visitas", retornos: "Retornos", campanhas: "Campanhas", interessados: "Clientes interessados" };

// ------------------------------------------------------------------ sorteio auditável
export async function sha256(txt) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
export async function sortear(participantes) {
  const lista = [...participantes].sort((a, b) => a.id.localeCompare(b.id)).map((p) => ({ id: p.id, nome: p.nome, pontos: p.pontos }));
  const hashLista = await sha256(JSON.stringify(lista));
  const sem = [...crypto.getRandomValues(new Uint8Array(16))].map((x) => x.toString(16).padStart(2, "0")).join("");
  const h = await sha256(sem + hashLista);
  const idx = Number(BigInt(`0x${h}`) % BigInt(lista.length));
  return { lista, hashLista, semente: sem, indice: idx, ganhador: lista[idx], protocolo: `MBB-${hojeISO().replace(/-/g, "")}-${sem.slice(0, 8).toUpperCase()}` };
}

export async function enviarArquivo(file, pasta) {
  if (file.size > 10 * 1024 * 1024) throw new Error("Arquivo maior que 10 MB.");
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${pasta}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("maisbb").upload(path, file, { contentType: file.type || undefined });
  if (error) throw error;
  return path;
}
export const urlArquivo = (path) => (path ? supabase.storage.from("maisbb").getPublicUrl(path).data.publicUrl : "");
