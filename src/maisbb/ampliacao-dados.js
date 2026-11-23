// =============================================================================
// Acesso aos dados das ferramentas novas (Treinamento ANEPS, Modelos de
// formulário, Sorteios mensais). Fica separado do useDados() original para que
// a plataforma antiga continue funcionando mesmo antes de o SQL novo ser rodado.
// Em modo demonstração (sem Supabase) tudo funciona só na memória.
// =============================================================================
import { supabase, supabaseConfigurado } from "../supabaseClient";
import { MODULOS_ANEPS, MODELOS_SUGERIDOS } from "./aneps-conteudo.js";

export const ANEPS_PADRAO = { ponto_acerto: 10, bonus_conclusao: 20, bonus_80: 50, bonus_100: 100, tempo: { rapido: 15, intermediario: 30, completo: 45 }, certificacao: "ANEPS" };
export const MODALIDADES = { rapido: { l: "Simulado rápido", n: 10 }, intermediario: { l: "Simulado intermediário", n: 20 }, completo: { l: "Simulado completo", n: 30 }, exercicio: { l: "Exercícios do módulo", n: 5 } };
export const faltaBanco = (e) => /does not exist|schema cache|Could not find the function|maisbb_aneps|maisbb_form|maisbb_sorteio/i.test(e?.message || String(e || ""));

// ----------------------------------------------------------------- modo demonstração (memória)
const demo = { modulos: [], materiais: [], questoes: [], tentativas: [], modelos: [], sorteios: [], fotos: [], cfg: { aneps: ANEPS_PADRAO, galeria_sorteios: true } };
let demoPronto = false;
function prepararDemo() {
  if (demoPronto) return; demoPronto = true;
  MODULOS_ANEPS.forEach((m, i) => {
    const id = `mod-${i + 1}`;
    demo.modulos.push({ id, ordem: m.ordem, titulo: m.titulo, descricao: m.descricao, teoria: m.teoria, resumo: m.resumo, ativo: true });
    m.questoes.forEach((q, j) => demo.questoes.push({ id: `q-${i + 1}-${j + 1}`, modulo_id: id, enunciado: q.e, alternativas: q.a, correta: q.c, comentario: q.cm, uso: q.uso || "simulado", dificuldade: "media", ativo: true }));
  });
  MODELOS_SUGERIDOS.forEach((m, i) => demo.modelos.push({ id: `fm-${i}`, ordem: i + 1, ativo: true, ...m }));
}
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const embaralhar = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };

// ----------------------------------------------------------------- TREINAMENTO ANEPS
export async function carregarAneps() {
  if (!supabaseConfigurado) { prepararDemo(); return { modulos: [...demo.modulos], materiais: [...demo.materiais], questoes: demo.questoes.filter((q) => q.uso === "estudo"), todasQuestoes: [...demo.questoes], tentativas: [...demo.tentativas].reverse(), ranking: rankingLocal() }; }
  const sel = (t, ord, asc = true) => supabase.from(t).select("*").order(ord, { ascending: asc }).limit(5000);
  const [mo, ma, qu, te, rk] = await Promise.all([
    sel("maisbb_aneps_modulos", "ordem"), sel("maisbb_aneps_materiais", "ordem"), sel("maisbb_aneps_questoes", "criado_em"),
    supabase.from("maisbb_aneps_tentativas").select("id,user_id,modalidade,modulo_id,detalhe,acertos,total,pct,pontos,tempo_seg,tempo_limite_seg,fora_do_tempo,status,iniciado_em,finalizado_em").order("iniciado_em", { ascending: false }).limit(2000),
    supabase.rpc("maisbb_aneps_ranking"),
  ]);
  const erro = [mo, ma, qu, te, rk].find((r) => r.error)?.error;
  if (erro) throw erro;
  return { modulos: mo.data, materiais: ma.data, questoes: qu.data.filter((q) => q.uso === "estudo" && q.ativo), todasQuestoes: qu.data, tentativas: te.data, ranking: rk.data };
}

function rankingLocal() {
  const fin = demo.tentativas.filter((t) => t.status === "finalizada" && t.modalidade !== "exercicio");
  const pts = fin.reduce((s, t) => s + t.pontos, 0);
  return [{ user_id: "demo", nome: "Demonstração", pontos: pts, simulados: fin.length, media: fin.length ? Math.round((10 * fin.reduce((s, t) => s + Number(t.pct), 0)) / fin.length) / 10 : 0 }];
}

export async function iniciarSimulado(modalidade, moduloId = null) {
  if (supabaseConfigurado) { const { data, error } = await supabase.rpc("maisbb_aneps_iniciar", { p_modalidade: modalidade, p_modulo: moduloId }); if (error) throw error; return data; }
  prepararDemo();
  const n = MODALIDADES[modalidade].n;
  const pool = demo.questoes.filter((q) => q.ativo && q.uso === "simulado" && (!moduloId || q.modulo_id === moduloId));
  if (!pool.length) throw new Error("Ainda não há questões cadastradas para este simulado.");
  const qs = embaralhar(pool).slice(0, n);
  demo.tentativas.forEach((t) => { if (t.status === "em_andamento") t.status = "abandonada"; });
  const lim = modalidade === "exercicio" ? null : (demo.cfg.aneps.tempo?.[modalidade] || n * 2) * 60;
  const t = { id: uid(), user_id: "demo", modalidade, modulo_id: moduloId, questoes: qs.map((q) => q.id), total: qs.length, tempo_limite_seg: lim, regras: { ...demo.cfg.aneps }, status: "em_andamento", iniciado_em: new Date().toISOString() };
  demo.tentativas.push(t);
  const nm = Object.fromEntries(demo.modulos.map((m) => [m.id, m.titulo]));
  return { id: t.id, modalidade, total: t.total, tempo_limite_seg: lim, iniciado_em: t.iniciado_em, questoes: qs.map((q) => ({ id: q.id, enunciado: q.enunciado, alternativas: q.alternativas, modulo: nm[q.modulo_id] })) };
}

export async function finalizarSimulado(id, respostas) {
  if (supabaseConfigurado) { const { data, error } = await supabase.rpc("maisbb_aneps_finalizar", { p_tentativa: id, p_respostas: respostas }); if (error) throw error; return data; }
  const t = demo.tentativas.find((x) => x.id === id);
  if (!t) throw new Error("Simulado não encontrado.");
  if (t.status === "abandonada") throw new Error("Este simulado foi substituído por outro mais recente e não pode mais ser enviado.");
  const qs = t.questoes.map((qid) => demo.questoes.find((q) => q.id === qid));
  if (t.status === "em_andamento") {
    const seg = Math.max(0, Math.round((Date.now() - new Date(t.iniciado_em)) / 1000));
    const atraso = t.tempo_limite_seg != null && seg > t.tempo_limite_seg + 90;
    const ac = qs.filter((q) => respostas[q.id] === q.correta).length;
    const pct = Math.round((1000 * ac) / Math.max(t.total, 1)) / 10; const w = t.regras;
    let pts = 0;
    if (t.modalidade !== "exercicio") { pts = ac * w.ponto_acerto; if (!atraso) pts += w.bonus_conclusao + (pct >= 100 ? w.bonus_100 : pct >= 80 ? w.bonus_80 : 0); }
    Object.assign(t, { respostas, acertos: ac, pct, pontos: pts, tempo_seg: seg, fora_do_tempo: atraso, status: "finalizada", finalizado_em: new Date().toISOString(), detalhe: qs.map((q) => ({ q: q.id, modulo_id: q.modulo_id, ok: respostas[q.id] === q.correta })) });
  }
  const nm = Object.fromEntries(demo.modulos.map((m) => [m.id, m.titulo]));
  return { ...t, gabarito: qs.map((q) => ({ id: q.id, enunciado: q.enunciado, alternativas: q.alternativas, correta: q.correta, resposta: t.respostas?.[q.id] ?? null, comentario: q.comentario, modulo: nm[q.modulo_id] })) };
}

// CRUD genérico das tabelas novas (somente administrador grava — garantido pelo RLS)
const TABELAS = { modulos: "maisbb_aneps_modulos", materiais: "maisbb_aneps_materiais", questoes: "maisbb_aneps_questoes", modelos: "maisbb_form_modelos", sorteios: "maisbb_sorteios_mensais", fotos: "maisbb_sorteio_fotos" };
const DEMO_K = { modulos: "modulos", materiais: "materiais", questoes: "questoes", modelos: "modelos", sorteios: "sorteios", fotos: "fotos" };
export async function gravar(tab, id, dados) {
  if (!supabaseConfigurado) { prepararDemo(); const lista = demo[DEMO_K[tab]]; if (id) { const r = lista.find((x) => x.id === id); Object.assign(r, dados); return r; } const r = { id: uid(), criado_em: new Date().toISOString(), ...dados }; lista.push(r); return r; }
  const q = id ? supabase.from(TABELAS[tab]).update(dados).eq("id", id) : supabase.from(TABELAS[tab]).insert(dados);
  const { data, error } = await q.select().single();
  if (error) throw error; return data;
}
export async function gravarVarios(tab, linhas) {
  if (!linhas.length) return [];
  if (!supabaseConfigurado) { prepararDemo(); return Promise.all(linhas.map((l) => gravar(tab, null, l))); }
  const { data, error } = await supabase.from(TABELAS[tab]).insert(linhas).select();
  if (error) throw error; return data;
}
export async function excluir(tab, id) {
  if (!supabaseConfigurado) { const l = demo[DEMO_K[tab]]; const i = l.findIndex((x) => x.id === id); if (i >= 0) l.splice(i, 1); return; }
  const { error } = await supabase.from(TABELAS[tab]).delete().eq("id", id);
  if (error) throw error;
}

// Instala os 9 módulos e as questões iniciais (não duplica o que já existe)
export async function instalarConteudoInicial() {
  const { modulos: atuais, todasQuestoes } = await carregarAneps();
  let nm = 0, nq = 0;
  for (const m of MODULOS_ANEPS) {
    let mod = atuais.find((x) => x.titulo.trim().toLowerCase() === m.titulo.toLowerCase());
    if (!mod) { mod = await gravar("modulos", null, { ordem: m.ordem, titulo: m.titulo, descricao: m.descricao, teoria: m.teoria, resumo: m.resumo, ativo: true }); nm++; }
    const existentes = new Set(todasQuestoes.filter((q) => q.modulo_id === mod.id).map((q) => q.enunciado.trim()));
    const novas = m.questoes.filter((q) => !existentes.has(q.e.trim())).map((q) => ({ modulo_id: mod.id, enunciado: q.e, alternativas: q.a, correta: q.c, comentario: q.cm, uso: q.uso || "simulado", dificuldade: "media", ativo: true }));
    await gravarVarios("questoes", novas); nq += novas.length;
  }
  return { nm, nq };
}

export async function salvarConfigAneps(aneps) {
  if (!supabaseConfigurado) { demo.cfg.aneps = aneps; return; }
  const { error } = await supabase.from("maisbb_config").update({ aneps }).eq("id", 1);
  if (error) throw error;
}
export async function lerConfigNova() {
  if (!supabaseConfigurado) return { ...demo.cfg };
  const { data, error } = await supabase.from("maisbb_config").select("aneps, galeria_sorteios").eq("id", 1).single();
  if (error) throw error; return { aneps: { ...ANEPS_PADRAO, ...(data?.aneps || {}), tempo: { ...ANEPS_PADRAO.tempo, ...(data?.aneps?.tempo || {}) } }, galeria_sorteios: !!data?.galeria_sorteios };
}

// ----------------------------------------------------------------- MODELOS DE FORMULÁRIO
export async function carregarModelos() {
  if (!supabaseConfigurado) { prepararDemo(); return [...demo.modelos]; }
  const { data, error } = await supabase.from("maisbb_form_modelos").select("*").order("ordem").order("nome");
  if (error) throw error; return data;
}

// ----------------------------------------------------------------- SORTEIOS MENSAIS E GALERIA (bucket privado)
const BUCKET = "maisbb-sorteios";
export async function carregarSorteios() {
  if (!supabaseConfigurado) { prepararDemo(); return { sorteios: demo.sorteios.map((x) => ({ ...x, _foto: x.foto_path, _fotoGanhador: x.foto_ganhador_path })), fotos: demo.fotos.map((x) => ({ ...x, _url: x.path })), liberada: true }; }
  const [s, f, lib] = await Promise.all([
    supabase.from("maisbb_sorteios_mensais").select("*").order("ano", { ascending: false }).order("mes", { ascending: false }),
    supabase.from("maisbb_sorteio_fotos").select("*").order("ano", { ascending: false }).order("mes").order("criado_em"),
    supabase.rpc("maisbb_galeria_liberada"),
  ]);
  const erro = [s, f, lib].find((r) => r.error)?.error; if (erro) throw erro;
  // links temporários (1 hora) para as imagens do bucket privado
  const paths = [...new Set([...s.data.flatMap((x) => [x.foto_path, x.foto_ganhador_path]), ...f.data.map((x) => x.path)].filter(Boolean))];
  const urls = {};
  for (let i = 0; i < paths.length; i += 100) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths.slice(i, i + 100), 3600);
    (data || []).forEach((d) => { if (d.signedUrl) urls[d.path] = d.signedUrl; });
  }
  const u = (p) => (p ? urls[p] || null : null);
  return { sorteios: s.data.map((x) => ({ ...x, _foto: u(x.foto_path), _fotoGanhador: u(x.foto_ganhador_path) })), fotos: f.data.map((x) => ({ ...x, _url: u(x.path) })), liberada: !!lib.data };
}
export async function enviarFotoSorteio(file, ano, mes) {
  if (!supabaseConfigurado) return { path: URL.createObjectURL(file), url: URL.createObjectURL(file) };
  if (!/^image\//.test(file.type)) throw new Error("Envie somente imagens (JPG, PNG, WEBP).");
  if (file.size > 10 * 1024 * 1024) throw new Error("Imagem acima de 10 MB.");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${ano}/${String(mes).padStart(2, "0")}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return { path };
}
export async function apagarArquivoSorteio(path) {
  if (!supabaseConfigurado || !path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
export async function definirGaleriaLiberada(v) {
  if (!supabaseConfigurado) { demo.cfg.galeria_sorteios = v; return; }
  const { error } = await supabase.from("maisbb_config").update({ galeria_sorteios: v }).eq("id", 1);
  if (error) throw error;
}
