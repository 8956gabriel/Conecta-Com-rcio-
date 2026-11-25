// =============================================================================
// SALA DO EMPREENDEDOR — RETROSPECTIVA DO ANO (linha do tempo)
//   • AbaRetrospectiva      → aba da área do atendente / administração
//   • RetrospectivaPublica  → seção da página pública (só aparece se o gestor ligar)
//
// Monta sozinha, mês a mês, tudo o que a Sala fez no ano:
//   atendimentos (fichas + totais do GISE, sem contar em dobro), eventos,
//   cursos e mutirões do Calendário, estratégias, Selo Sebrae e os "marcos"
//   lançados à mão (inauguração, parceria, prêmio, visita...).
// Tabelas novas: ver supabase-sala-retrospectiva.sql.
// =============================================================================
import React, { useEffect, useMemo, useState } from "react";
import {
  History, PlusCircle, Pencil, Trash2, Download, Copy, Globe, EyeOff, X, Camera, Sparkles, Users, CalendarDays, Target, Award, ClipboardList,
} from "lucide-react";
import { supabase, supabaseConfigurado } from "./supabaseClient";
import { exportarPDF } from "./central/motor.js";

const R = {
  blue: "var(--cor-principal, #0A5AA8)", blueHex: "#0A5AA8", blueDeep: "var(--cor-principal-profunda, #052A4D)", blueTint: "#EAF2FB", blueTint2: "#F5F9FD",
  ink: "#0E2233", muted: "#5C7186", soft: "#8896A6", line: "#DCE7F2", danger: "#B4462F", green: "#1E8E5A", amber: "#F5B700",
};
const MES_NOME = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const hojeISO = () => new Date().toLocaleDateString("sv-SE");
const dataBR = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—");
const diaMes = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "");
const num = (n) => Number(n || 0).toLocaleString("pt-BR");
const inputCls = "font-body text-sm border rounded-lg px-3 py-2.5 outline-none bg-white w-full";
const inputStyle = { borderColor: R.line };
const faltaTabela = (e) => /relation|schema cache|column/i.test(e?.message || "");

// Tipos de marco (lançados à mão)
export const TIPOS_MARCO = {
  conquista: { r: "Conquista", emoji: "🏆", c: "#C99700" },
  inauguracao: { r: "Inauguração", emoji: "🎉", c: "#E0457B" },
  parceria: { r: "Parceria", emoji: "🤝", c: "#0EA5A5" },
  capacitacao: { r: "Capacitação", emoji: "🎓", c: "#7E5BEF" },
  evento: { r: "Evento", emoji: "📣", c: "#0A5AA8" },
  visita: { r: "Visita", emoji: "👥", c: "#1E8E5A" },
  outro: { r: "Outro", emoji: "⭐", c: "#5C7186" },
};
// Itens que vêm do Calendário
const TIPOS_CAL = {
  evento: { r: "Evento", emoji: "📅", c: "#0A5AA8" },
  mutirao: { r: "Mutirão", emoji: "🧰", c: "#7E5BEF" },
  curso: { r: "Curso", emoji: "🎓", c: "#0EA5A5" },
  comercio: { r: "Data do comércio", emoji: "🛍️", c: "#E8A23D" },
};

// Modo demonstração (sem Supabase)
const demo = { marcos: [] };

// -----------------------------------------------------------------------------
// Monta a retrospectiva a partir dos dados brutos
// -----------------------------------------------------------------------------
export function montarRetrospectiva({ ano, fichas = [], totais = [], eventos = [], estrategias = [], marcos = [] }) {
  const hoje = hojeISO();
  const anoAtual = new Date().getFullYear();
  const ultimoMes = ano < anoAtual ? 11 : ano === anoAtual ? new Date().getMonth() : -1;
  const doAno = (iso) => String(iso || "").startsWith(`${ano}-`);
  const mesDe = (iso) => Number(String(iso).slice(5, 7)) - 1;

  // Atendimentos: fichas + totais lançados (em cada mês/assunto vale o MAIOR — igual ao Relatório)
  const g = {};
  fichas.forEach((a) => { if (!doAno(a.data)) return; const k = `${mesDe(a.data)}|${a.categoria || "Outros"}`; g[k] = (g[k] || 0) + 1; });
  totais.forEach((t) => {
    if (Number(t.ano) !== Number(ano)) return;
    const k = `${Number(t.mes) - 1}|${t.categoria || "Outros"}`;
    g[k] = Math.max(g[k] || 0, Number(t.total) || 0);
  });
  const porMes = Array(12).fill(0);
  const porMesCat = Array.from({ length: 12 }, () => ({}));
  const porCat = {};
  Object.entries(g).forEach(([k, v]) => {
    const [m, cat] = [Number(k.split("|")[0]), k.slice(k.indexOf("|") + 1)];
    if (m < 0 || m > 11 || !v) return;
    porMes[m] += v; porMesCat[m][cat] = (porMesCat[m][cat] || 0) + v; porCat[cat] = (porCat[cat] || 0) + v;
  });
  const total = porMes.reduce((s, v) => s + v, 0);
  const topCats = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
  const melhorIdx = porMes.reduce((best, v, i) => (v > porMes[best] ? i : best), 0);

  // Empreendedores diferentes e canais (só das fichas)
  const fichasAno = fichas.filter((a) => doAno(a.data));
  const pessoas = new Set(fichasAno.map((a) => String(a.documento || "").replace(/\D/g, "") || String(a.nome || "").trim().toLowerCase()).filter(Boolean));
  const canais = {};
  fichasAno.forEach((a) => { canais[a.canal || "presencial"] = (canais[a.canal || "presencial"] || 0) + 1; });

  // Itens da linha do tempo
  const itens = [];
  marcos.filter((m) => doAno(m.data)).forEach((m) => {
    const t = TIPOS_MARCO[m.tipo] || TIPOS_MARCO.outro;
    itens.push({ chave: `m-${m.id}`, origem: "marco", data: m.data, emoji: t.emoji, cor: t.c, rotulo: t.r, titulo: m.titulo, descricao: m.descricao, foto: m.foto_url, publicar: m.publicar, bruto: m });
  });
  eventos.filter((e) => doAno(e.data) && e.data <= hoje && TIPOS_CAL[e.tipo]).forEach((e) => {
    const t = TIPOS_CAL[e.tipo];
    itens.push({ chave: `e-${e.id}`, origem: "calendario", data: e.data, emoji: t.emoji, cor: t.c, rotulo: t.r, titulo: e.titulo, descricao: e.descricao, publicar: e.publicar });
  });
  estrategias.forEach((e) => {
    if (e.status === "concluida") {
      const d = e.data_fim || e.data_inicio;
      if (doAno(d) && d <= hoje) itens.push({ chave: `s-${e.id}`, origem: "estrategia", data: d, emoji: "✅", cor: R.green, rotulo: "Estratégia concluída", titulo: e.titulo, descricao: e.objetivo, publicar: e.publicar });
    } else if (e.status === "em_andamento" && doAno(e.data_inicio) && e.data_inicio <= hoje) {
      itens.push({ chave: `s-${e.id}`, origem: "estrategia", data: e.data_inicio, emoji: "🚀", cor: "#E8A23D", rotulo: "Estratégia iniciada", titulo: e.titulo, descricao: e.objetivo, publicar: e.publicar });
    }
  });
  itens.sort((a, b) => a.data.localeCompare(b.data) || (a.origem === "marco" ? -1 : 1));

  const meses = [];
  for (let m = 0; m <= ultimoMes; m += 1) {
    const cats = Object.entries(porMesCat[m]).sort((a, b) => b[1] - a[1]);
    meses.push({ m, atendimentos: porMes[m], topCat: cats[0] || null, itens: itens.filter((i) => mesDe(i.data) === m) });
  }

  const contar = (f) => itens.filter(f).length;
  return {
    ano, total, porMes, topCats, meses, itens,
    melhorMes: total ? { m: melhorIdx, v: porMes[melhorIdx] } : null,
    maiorMes: Math.max(1, ...porMes),
    pessoas: pessoas.size, canais, fichas: fichasAno.length,
    eventos: contar((i) => i.origem === "calendario" && i.rotulo !== "Curso"),
    cursos: contar((i) => i.origem === "calendario" && i.rotulo === "Curso"),
    estrategias: contar((i) => i.origem === "estrategia" && i.rotulo === "Estratégia concluída"),
    marcos: contar((i) => i.origem === "marco"),
  };
}

function textoResumo(r, selo) {
  const linhas = [`📊 *Retrospectiva ${r.ano} — Sala do Empreendedor de Ivatuba*`, ""];
  if (r.total) linhas.push(`✅ ${num(r.total)} atendimentos realizados`);
  if (r.pessoas) linhas.push(`👥 ${num(r.pessoas)} empreendedores atendidos`);
  if (r.eventos) linhas.push(`📅 ${r.eventos} eventos e mutirões`);
  if (r.cursos) linhas.push(`🎓 ${r.cursos} cursos`);
  if (r.estrategias) linhas.push(`🎯 ${r.estrategias} ações/estratégias concluídas`);
  if (r.melhorMes) linhas.push(`🔥 Mês mais movimentado: ${MES_NOME[r.melhorMes.m]} (${num(r.melhorMes.v)} atendimentos)`);
  if (r.topCats.length) linhas.push(`🔎 Assunto mais procurado: ${r.topCats[0][0]}`);
  if (selo) linhas.push(`${selo.emoji} Selo Sebrae: ${selo.r} (${selo.pontos.toFixed(0)} pontos com evidência)`);
  const marcos = r.itens.filter((i) => i.origem === "marco");
  if (marcos.length) {
    linhas.push("", "*Momentos marcantes:*");
    marcos.forEach((i) => linhas.push(`${i.emoji} ${diaMes(i.data)} — ${i.titulo}`));
  }
  linhas.push("", "Obrigado a todos os empreendedores que passaram pela Sala! 💙");
  return linhas.join("\n");
}

// -----------------------------------------------------------------------------
// Peças visuais compartilhadas
// -----------------------------------------------------------------------------
function Numero({ valor, rotulo, icon: Icon }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.10)" }}>
      <div className="flex items-center gap-1.5 text-white/70"><Icon size={14} /><span className="font-body text-[11px] font-bold uppercase tracking-wide">{rotulo}</span></div>
      <p className="font-display font-extrabold text-3xl md:text-4xl mt-1">{valor}</p>
    </div>
  );
}

function Capa({ r, selo, publico }) {
  const destaques = [
    r.melhorMes && `🔥 Mês mais movimentado: ${MES_NOME[r.melhorMes.m]} (${num(r.melhorMes.v)})`,
    r.topCats[0] && `🔎 Assunto mais procurado: ${r.topCats[0][0]}`,
    selo && `${selo.emoji} Selo Sebrae ${selo.r}`,
  ].filter(Boolean);
  return (
    <div className="rounded-3xl p-6 md:p-8 text-white relative overflow-hidden" style={{ background: `linear-gradient(125deg, ${R.blueDeep}, ${R.blue})` }}>
      <div aria-hidden className="absolute -right-16 -top-16 w-64 h-64 rounded-full" style={{ background: "rgba(245,183,0,0.18)" }} />
      <div aria-hidden className="absolute right-28 -bottom-24 w-56 h-56 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="relative">
        <span className="inline-flex items-center gap-2 font-body text-[11px] font-bold uppercase tracking-[0.16em] px-3 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.14)" }}>
          <Sparkles size={13} /> {publico ? "O que fizemos juntos" : "Retrospectiva"}
        </span>
        <h2 className="font-display font-extrabold text-3xl md:text-5xl mt-3 leading-tight">Retrospectiva {r.ano}</h2>
        <p className="font-body text-sm md:text-base mt-1 text-white/80">Tudo o que a Sala do Empreendedor de Ivatuba fez no ano, mês a mês.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <Numero valor={num(r.total)} rotulo="Atendimentos" icon={ClipboardList} />
          {r.pessoas > 0 && !publico ? <Numero valor={num(r.pessoas)} rotulo="Empreendedores" icon={Users} /> : <Numero valor={r.marcos} rotulo="Momentos marcantes" icon={Sparkles} />}
          <Numero valor={r.eventos + r.cursos} rotulo="Eventos e cursos" icon={CalendarDays} />
          <Numero valor={r.estrategias} rotulo="Ações concluídas" icon={Target} />
        </div>
        {destaques.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {destaques.map((d) => <span key={d} className="font-body text-xs font-bold rounded-full px-3 py-1.5" style={{ background: "rgba(255,255,255,0.14)" }}>{d}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

function LinhaDoTempo({ r, onEditar, onApagar }) {
  if (!r.meses.length) {
    return <p className="font-body text-sm text-center py-10" style={{ color: R.muted }}>Esse ano ainda não começou na linha do tempo.</p>;
  }
  return (
    <div className="relative mt-6">
      <div aria-hidden className="absolute left-[19px] top-2 bottom-2 w-0.5" style={{ background: R.line }} />
      {r.meses.map((mes) => {
        const vazio = !mes.itens.length && !mes.atendimentos;
        return (
          <div key={mes.m} className="relative pl-12 pb-6">
            <span className="absolute left-0 top-0 w-10 h-10 rounded-full flex items-center justify-center font-display font-extrabold text-xs border-4 border-white shadow"
              style={vazio ? { background: R.blueTint, color: R.soft } : { background: R.blue, color: "#fff" }}>
              {MES_NOME[mes.m].slice(0, 3)}
            </span>
            <div className="flex items-center gap-3 flex-wrap pt-1.5">
              <h3 className="font-display font-extrabold text-lg" style={{ color: vazio ? R.soft : R.ink }}>{MES_NOME[mes.m]}</h3>
              {mes.atendimentos > 0 && (
                <span className="font-body text-xs font-bold rounded-full px-2.5 py-1" style={{ background: R.blueTint, color: R.blueHex }}>
                  {num(mes.atendimentos)} atendimento{mes.atendimentos === 1 ? "" : "s"}
                </span>
              )}
              {r.melhorMes && r.melhorMes.m === mes.m && <span className="font-body text-[11px] font-bold rounded-full px-2.5 py-1" style={{ background: "#FFF7D6", color: "#8A6A00" }}>🔥 mês recorde</span>}
            </div>
            {mes.atendimentos > 0 && (
              <div className="mt-2 max-w-md">
                <div className="h-2 rounded-full overflow-hidden" style={{ background: R.blueTint }}>
                  <div className="h-full rounded-full" style={{ width: `${(mes.atendimentos / r.maiorMes) * 100}%`, background: R.blue }} />
                </div>
                {mes.topCat && <p className="font-body text-[11px] mt-1" style={{ color: R.muted }}>Mais procurado: {mes.topCat[0]} ({num(mes.topCat[1])})</p>}
              </div>
            )}
            {vazio && <p className="font-body text-xs mt-1" style={{ color: R.soft }}>Sem registros neste mês.</p>}
            {mes.itens.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-2.5 mt-3">
                {mes.itens.map((i) => (
                  <div key={i.chave} className={`rounded-2xl border bg-white overflow-hidden ${i.origem === "marco" ? "shadow-sm" : ""}`} style={{ borderColor: i.origem === "marco" ? `${i.cor}66` : R.line }}>
                    {i.foto && <img src={i.foto} alt={i.titulo} className="w-full h-40 object-cover" loading="lazy" />}
                    <div className="p-3.5 flex gap-3 items-start">
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: `${i.cor}14` }}>{i.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${i.cor}1A`, color: i.cor }}>{i.rotulo}</span>
                          <span className="font-body text-[11px]" style={{ color: R.soft }}>{dataBR(i.data)}</span>
                          {onEditar && i.publicar === false && <span title="Não aparece na página pública" className="inline-flex"><EyeOff size={12} color={R.soft} /></span>}
                        </div>
                        <p className="font-display font-bold text-sm mt-1" style={{ color: R.ink }}>{i.titulo}</p>
                        {i.descricao && <p className="font-body text-xs mt-0.5 whitespace-pre-line" style={{ color: R.muted }}>{i.descricao}</p>}
                      </div>
                      {onEditar && i.origem === "marco" && (
                        <div className="flex flex-col gap-1 shrink-0">
                          <button onClick={() => onEditar(i.bruto)} title="Editar" className="p-1.5 rounded-lg hover:bg-slate-100"><Pencil size={13} color={R.muted} /></button>
                          <button onClick={() => onApagar(i.bruto)} title="Apagar" className="p-1.5 rounded-lg hover:bg-slate-100"><Trash2 size={13} color={R.danger} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Carregamento
// -----------------------------------------------------------------------------
function useDadosRetrospectiva(ano, { publico = false, fichasDemo = [], recarga = 0, ativo = true } = {}) {
  const [dados, setDados] = useState(null);
  useEffect(() => {
    if (!ativo) { setDados(null); return undefined; }
    if (!supabaseConfigurado) {
      setDados({ fichas: publico ? [] : fichasDemo, totais: [], eventos: [], estrategias: [], marcos: demo.marcos.filter((m) => !publico || m.publicar), selo: [], faltaMarcos: false });
      return;
    }
    let vivo = true;
    setDados(null);
    const ini = `${ano}-01-01`, fim = `${ano}-12-31`;
    const lista = (q) => q.then(({ data, error }) => ({ data: error ? [] : data || [], error }));
    let qEv = supabase.from("sala_calendario").select("id,data,titulo,descricao,tipo,publicar").gte("data", ini).lte("data", fim);
    let qEst = supabase.from("sala_estrategias").select("id,titulo,objetivo,status,data_inicio,data_fim,publicar");
    let qMar = supabase.from("sala_marcos").select("*").gte("data", ini).lte("data", fim).order("data");
    if (publico) { qEv = qEv.eq("publicar", true); qEst = qEst.eq("publicar", true); qMar = qMar.eq("publicar", true); }
    Promise.all([
      publico ? Promise.resolve({ data: [] }) : lista(supabase.from("sala_atendimentos").select("data,categoria,canal,documento,nome").gte("data", ini).lte("data", fim).limit(20000)),
      lista(supabase.from("sala_atendimentos_totais").select("ano,mes,categoria,total").eq("ano", ano).limit(5000)),
      lista(qEv), lista(qEst), lista(qMar),
      publico ? Promise.resolve({ data: [] }) : lista(supabase.from("sala_selo_itens").select("pontos,status").eq("ciclo", ano)),
    ]).then(([f, t, e, s, m, selo]) => {
      if (!vivo) return;
      setDados({ fichas: f.data, totais: t.data, eventos: e.data, estrategias: s.data, marcos: m.data, selo: selo.data, faltaMarcos: faltaTabela(m.error) });
    });
    return () => { vivo = false; };
  }, [ano, publico, recarga, ativo]);
  return dados;
}

function calcularSelo(itens) {
  const total = (itens || []).reduce((s, i) => s + Number(i.pontos || 0), 0);
  if (!total) return null;
  const prontos = itens.filter((i) => i.status === "concluido").reduce((s, i) => s + Number(i.pontos || 0), 0);
  const pontos = (prontos * 100) / total;
  const f = pontos >= 100 - 1e-9 ? { r: "Diamante", emoji: "💎" } : pontos >= 90 ? { r: "Ouro", emoji: "🥇" } : pontos >= 81 ? { r: "Prata", emoji: "🥈" } : pontos >= 75 ? { r: "Bronze", emoji: "🥉" } : { r: "em preparação", emoji: "⏳" };
  return { ...f, pontos };
}

// =============================================================================
// ABA DA ÁREA DO ATENDENTE
// =============================================================================
export function AbaRetrospectiva({ ctx }) {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [recarga, setRecarga] = useState(0);
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const fichasDemo = useMemo(() => ctx.atendimentos || [], [ctx.atendimentos]);
  const dados = useDadosRetrospectiva(ano, { fichasDemo, recarga });

  const anos = useMemo(() => {
    const set = new Set([anoAtual, anoAtual - 1]);
    (ctx.totais || []).forEach((t) => { if (Number(t.total) > 0) set.add(Number(t.ano)); });
    return [...set].sort((a, b) => b - a);
  }, [ctx.totais, anoAtual]);

  const r = useMemo(() => (dados ? montarRetrospectiva({ ano, ...dados }) : null), [dados, ano]);
  const selo = useMemo(() => calcularSelo(dados?.selo), [dados]);
  const publica = !!ctx.config?.retrospectiva_publica;

  const novoMarco = () => setForm({ data: hojeISO(), titulo: "", descricao: "", tipo: "conquista", foto_url: "", publicar: true });

  const salvarMarco = async () => {
    if (!form.titulo.trim() || !form.data) { ctx.avisar("Preencha a data e o título.", "erro"); return; }
    const reg = { data: form.data, titulo: form.titulo.trim(), descricao: form.descricao?.trim() || null, tipo: form.tipo, foto_url: form.foto_url || null, publicar: !!form.publicar };
    if (!supabaseConfigurado) {
      demo.marcos = form.id ? demo.marcos.map((m) => (m.id === form.id ? { ...m, ...reg } : m)) : [...demo.marcos, { ...reg, id: `demo-${Date.now()}` }];
      setForm(null); setRecarga((n) => n + 1); return;
    }
    setSalvando(true);
    const { error } = form.id ? await supabase.from("sala_marcos").update(reg).eq("id", form.id) : await supabase.from("sala_marcos").insert(reg);
    setSalvando(false);
    if (error) { ctx.avisar(faltaTabela(error) ? "Falta rodar o arquivo supabase-sala-retrospectiva.sql no Supabase." : "Não consegui salvar: " + error.message, "erro"); return; }
    ctx.avisar(form.id ? "Marco atualizado." : "Marco adicionado à linha do tempo.");
    if (Number(form.data.slice(0, 4)) !== ano) setAno(Number(form.data.slice(0, 4)));
    setForm(null); setRecarga((n) => n + 1);
  };

  const apagarMarco = async (m) => {
    if (!window.confirm(`Apagar o marco "${m.titulo}"?`)) return;
    if (!supabaseConfigurado) { demo.marcos = demo.marcos.filter((x) => x.id !== m.id); setRecarga((n) => n + 1); return; }
    const { error } = await supabase.from("sala_marcos").delete().eq("id", m.id);
    if (error) { ctx.avisar("Não consegui apagar: " + error.message, "erro"); return; }
    ctx.avisar("Marco apagado."); setRecarga((n) => n + 1);
  };

  const enviarFoto = async (e) => {
    const arq = e.target.files?.[0]; e.target.value = "";
    if (!arq) return;
    if (!supabaseConfigurado) { setForm((f) => ({ ...f, foto_url: URL.createObjectURL(arq) })); return; }
    setSalvando(true);
    const caminho = `sala-marcos/${Date.now()}-${arq.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error } = await supabase.storage.from("uploads").upload(caminho, arq, { contentType: arq.type });
    setSalvando(false);
    if (error) { ctx.avisar("Não consegui enviar a foto: " + error.message, "erro"); return; }
    setForm((f) => ({ ...f, foto_url: supabase.storage.from("uploads").getPublicUrl(caminho).data.publicUrl }));
  };

  const alternarPublica = async () => {
    const novo = !publica;
    if (!supabaseConfigurado) { ctx.setConfig((c) => ({ ...c, retrospectiva_publica: novo })); return; }
    const { error } = await supabase.from("sala_config").update({ retrospectiva_publica: novo }).eq("id", 1);
    if (error) { ctx.avisar(faltaTabela(error) ? "Falta rodar o arquivo supabase-sala-retrospectiva.sql no Supabase." : "Não consegui alterar: " + error.message, "erro"); return; }
    ctx.setConfig((c) => ({ ...c, retrospectiva_publica: novo }));
    ctx.avisar(novo ? "Retrospectiva publicada na página pública." : "Retrospectiva escondida da página pública.");
  };

  const copiarResumo = () => {
    try { navigator.clipboard?.writeText(textoResumo(r, selo)); ctx.avisar("Resumo copiado — é só colar no WhatsApp ou nas redes."); } catch { ctx.avisar("Não consegui copiar.", "erro"); }
  };

  const pdf = () => {
    const resumo = [
      ["Atendimentos realizados", num(r.total)],
      ...(r.pessoas ? [["Empreendedores diferentes (fichas)", num(r.pessoas)]] : []),
      ["Eventos e mutirões", String(r.eventos)],
      ["Cursos", String(r.cursos)],
      ["Estratégias concluídas", String(r.estrategias)],
      ["Momentos marcantes", String(r.marcos)],
      ...(r.melhorMes ? [["Mês mais movimentado", `${MES_NOME[r.melhorMes.m]} (${num(r.melhorMes.v)})`]] : []),
      ...r.topCats.slice(0, 3).map(([c, v], i) => [`${i + 1}º assunto mais procurado`, `${c} (${num(v)})`]),
      ...(selo ? [["Selo Sebrae (estimativa interna)", `${selo.r} · ${selo.pontos.toFixed(0)} pontos com evidência`]] : []),
    ];
    const secoes = [
      { titulo: "Resumo do ano", cabecalho: ["Indicador", "Valor"], linhas: resumo },
      { titulo: "Atendimentos mês a mês", cabecalho: ["Mês", "Atendimentos", "Assunto mais procurado"], linhas: r.meses.map((m) => [MES_NOME[m.m], num(m.atendimentos), m.topCat ? `${m.topCat[0]} (${num(m.topCat[1])})` : "—"]) },
    ];
    if (r.itens.length) secoes.push({ titulo: "Linha do tempo", cabecalho: ["Data", "Tipo", "O quê", "Detalhes"], linhas: r.itens.map((i) => [dataBR(i.data), i.rotulo, i.titulo, i.descricao || ""]) });
    exportarPDF(`retrospectiva-sala-do-empreendedor-${ano}`, `Retrospectiva ${ano} — Sala do Empreendedor`, secoes, "Atendimentos: fichas registradas + totais lançados (GISE). Eventos, estratégias e marcos lançados na plataforma.", "Sala do Empreendedor · Ivatuba-PR");
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
        <div>
          <p className="font-body text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: R.blue }}>Linha do tempo</p>
          <h2 className="font-display font-extrabold text-xl md:text-2xl mt-1" style={{ color: R.ink }}>Retrospectiva da Sala</h2>
          <p className="font-body text-sm mt-1" style={{ color: R.muted }}>Montada sozinha com os atendimentos, o Calendário, as Estratégias e o Selo. Acrescente os momentos marcantes que não estão no sistema.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="font-body text-xs font-bold border rounded-lg px-3 py-2 bg-white" style={inputStyle}>
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={novoMarco} className="font-body text-xs font-bold rounded-lg px-3 py-2 inline-flex items-center gap-1.5 text-white" style={{ background: R.blue }}><PlusCircle size={14} /> Momento marcante</button>
          <button onClick={copiarResumo} disabled={!r} className="font-body text-xs font-bold rounded-lg px-3 py-2 inline-flex items-center gap-1.5 bg-white border disabled:opacity-50" style={{ borderColor: R.line, color: R.blue }}><Copy size={14} /> Copiar resumo</button>
          <button onClick={pdf} disabled={!r} className="font-body text-xs font-bold rounded-lg px-3 py-2 inline-flex items-center gap-1.5 bg-white border disabled:opacity-50" style={{ borderColor: R.line, color: R.blue }}><Download size={14} /> PDF</button>
        </div>
      </div>

      {dados?.faltaMarcos && (
        <div className="rounded-xl border p-3 mb-4 font-body text-xs" style={{ borderColor: "#F3D9A4", background: "#FFF8E6", color: "#7A5A00" }}>
          Para lançar momentos marcantes e publicar a retrospectiva, rode uma vez o arquivo <b>supabase-sala-retrospectiva.sql</b> no SQL Editor do Supabase. O resto já funciona.
        </div>
      )}

      <div className="rounded-2xl border p-3.5 mb-4 flex items-center justify-between gap-3 flex-wrap bg-white" style={{ borderColor: R.line }}>
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: publica ? "#E7F6EE" : R.blueTint2 }}>{publica ? <Globe size={16} color={R.green} /> : <EyeOff size={16} color={R.soft} />}</span>
          <div>
            <p className="font-display font-bold text-sm" style={{ color: R.ink }}>{publica ? "Aparece na página pública" : "Só a equipe vê"}</p>
            <p className="font-body text-[11px]" style={{ color: R.muted }}>Na página pública entram só os totais publicados e os itens marcados como públicos. Nomes e CPF nunca aparecem.</p>
          </div>
        </div>
        {ctx.gerir
          ? <button onClick={alternarPublica} className="font-body text-xs font-bold rounded-lg px-3 py-2 border bg-white" style={{ borderColor: R.line, color: publica ? R.danger : R.green }}>{publica ? "Esconder do público" : "Mostrar no site"}</button>
          : <span className="font-body text-[11px]" style={{ color: R.soft }}>Só o gestor liga ou desliga.</span>}
      </div>

      {form && (
        <div className="rounded-2xl border p-4 md:p-5 mb-5 bg-white shadow-sm" style={{ borderColor: R.line }}>
          <div className="flex items-center justify-between mb-3">
            <p className="font-display font-extrabold text-base" style={{ color: R.ink }}>{form.id ? "Editar momento marcante" : "Novo momento marcante"}</p>
            <button onClick={() => setForm(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} color={R.muted} /></button>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <label className="flex flex-col gap-1"><span className="font-body text-xs font-bold" style={{ color: R.ink }}>Data</span>
              <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className={inputCls} style={inputStyle} /></label>
            <label className="flex flex-col gap-1"><span className="font-body text-xs font-bold" style={{ color: R.ink }}>Tipo</span>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={inputCls} style={inputStyle}>
                {Object.entries(TIPOS_MARCO).map(([k, t]) => <option key={k} value={k}>{t.emoji} {t.r}</option>)}
              </select></label>
            <label className="flex flex-col gap-1"><span className="font-body text-xs font-bold" style={{ color: R.ink }}>Título</span>
              <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex.: Inauguração da nova sala" className={inputCls} style={inputStyle} /></label>
            <label className="flex flex-col gap-1 md:col-span-3"><span className="font-body text-xs font-bold" style={{ color: R.ink }}>O que aconteceu (opcional)</span>
              <textarea rows={2} value={form.descricao || ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Conte em poucas palavras: quem participou, resultado, número de pessoas..." className={inputCls} style={inputStyle} /></label>
          </div>
          <div className="flex items-center gap-3 flex-wrap mt-3">
            <label className="font-body text-xs font-bold rounded-lg px-3 py-2 inline-flex items-center gap-1.5 bg-white border cursor-pointer" style={{ borderColor: R.line, color: R.blue }}>
              <Camera size={14} /> {form.foto_url ? "Trocar foto" : "Adicionar foto"}
              <input type="file" accept="image/*" className="hidden" onChange={enviarFoto} />
            </label>
            {form.foto_url && (
              <span className="inline-flex items-center gap-2">
                <img src={form.foto_url} alt="" className="h-10 w-14 object-cover rounded-md border" style={{ borderColor: R.line }} />
                <button onClick={() => setForm({ ...form, foto_url: "" })} className="font-body text-[11px] font-bold" style={{ color: R.danger }}>Tirar foto</button>
              </span>
            )}
            <label className="font-body text-xs inline-flex items-center gap-1.5" style={{ color: R.ink }}>
              <input type="checkbox" checked={!!form.publicar} onChange={(e) => setForm({ ...form, publicar: e.target.checked })} /> Pode aparecer na página pública
            </label>
            <div className="flex-1" />
            <button onClick={() => setForm(null)} className="font-body text-xs font-bold rounded-lg px-3 py-2 border bg-white" style={{ borderColor: R.line, color: R.muted }}>Cancelar</button>
            <button onClick={salvarMarco} disabled={salvando} className="font-body text-xs font-bold rounded-lg px-4 py-2 text-white disabled:opacity-50" style={{ background: R.blue }}>{salvando ? "Salvando..." : "Salvar"}</button>
          </div>
        </div>
      )}

      {!r ? (
        <div className="py-16 text-center font-body text-sm" style={{ color: R.muted }}><History size={22} className="mx-auto mb-2" color={R.blueHex} />Montando a retrospectiva...</div>
      ) : (
        <>
          <Capa r={r} selo={selo} />
          {selo && (
            <div className="rounded-2xl border p-4 mt-4 flex items-center gap-3 bg-white" style={{ borderColor: R.line }}>
              <span className="text-3xl">{selo.emoji}</span>
              <div>
                <p className="font-display font-bold text-sm" style={{ color: R.ink }}><Award size={14} className="inline -mt-0.5 mr-1" color={R.blueHex} />Selo Sebrae {ano}: {selo.r}</p>
                <p className="font-body text-xs" style={{ color: R.muted }}>{selo.pontos.toFixed(0)} de 100 pontos com evidência pronta (estimativa interna — quem dá a nota é o Comitê do Sebrae).</p>
              </div>
            </div>
          )}
          <LinhaDoTempo r={r} onEditar={(m) => setForm({ ...m, descricao: m.descricao || "", foto_url: m.foto_url || "" })} onApagar={apagarMarco} />
        </>
      )}
    </div>
  );
}

// =============================================================================
// SEÇÃO DA PÁGINA PÚBLICA
// =============================================================================
export function RetrospectivaPublica({ config }) {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const ligada = !!config?.retrospectiva_publica;
  const dados = useDadosRetrospectiva(ano, { publico: true, ativo: ligada });
  const r = useMemo(() => (dados && ligada ? montarRetrospectiva({ ano, ...dados }) : null), [dados, ano, ligada]);
  if (!ligada || !r) return null;
  if (!r.total && !r.itens.length && ano === anoAtual) return null;
  return (
    <section id="sala-retrospectiva" className="max-w-6xl mx-auto px-4 md:px-6 mt-10 scroll-mt-20">
      <div className="flex justify-end mb-2">
        <select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="font-body text-xs font-bold border rounded-lg px-3 py-1.5 bg-white" style={inputStyle} aria-label="Ano da retrospectiva">
          {[anoAtual, anoAtual - 1].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <Capa r={r} publico />
      <LinhaDoTempo r={r} />
    </section>
  );
}
