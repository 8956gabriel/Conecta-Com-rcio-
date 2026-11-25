// =============================================================================
// SALA DO EMPREENDEDOR — AVISOS E PUBLICAÇÕES (modelos padrão)
//   • AbaAvisos       → área do atendente: escolhe o modelo, preenche e publica
//   • AvisosPublicos  → página pública: avisos ativos (e faixa de "Sala fechada")
//
// Modelos: vaga de emprego, licitação, curso/palestra, mutirão, sala fechada,
// horário especial, prazo do MEI e aviso geral. Cada um gera título + texto
// padronizados (também prontos para o WhatsApp) e pode virar notícia no
// Conecta Comércio. Tabela: ver supabase-sala-avisos.sql.
// =============================================================================
import React, { useEffect, useMemo, useState } from "react";
import { Copy, Pencil, Trash2, X, Camera, ExternalLink, Megaphone, CopyPlus, Archive, Eye, EyeOff, Star } from "lucide-react";
import { supabase, supabaseConfigurado } from "./supabaseClient";

const A = {
  blue: "var(--cor-principal, #0A5AA8)", blueHex: "#0A5AA8", blueDeep: "var(--cor-principal-profunda, #052A4D)", blueTint: "#EAF2FB", blueTint2: "#F5F9FD",
  ink: "#0E2233", muted: "#5C7186", soft: "#8896A6", line: "#DCE7F2", danger: "#B4462F", green: "#1E8E5A",
};
const inputCls = "font-body text-sm border rounded-lg px-3 py-2.5 outline-none bg-white w-full";
const inputStyle = { borderColor: A.line };
const hojeISO = () => new Date().toLocaleDateString("sv-SE");
const dataBR = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "");
const semana = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long" }) : "");
const faltaTabela = (e) => /relation|schema cache|column/i.test(e?.message || "");
const linha = (emoji, rotulo, valor) => (valor ? `${emoji} ${rotulo ? `${rotulo}: ` : ""}${valor}` : null);
const juntar = (...l) => l.flat().filter((x) => x !== null && x !== undefined && x !== false).join("\n").replace(/\n{3,}/g, "\n\n").trim();
const periodo = (ini, fim) => (ini && fim && ini !== fim ? `de ${dataBR(ini)} a ${dataBR(fim)}` : ini ? `${semana(ini)}, ${dataBR(ini)}` : "");

// -----------------------------------------------------------------------------
// MODELOS PADRÃO
// -----------------------------------------------------------------------------
export const MODELOS_AVISO = {
  vaga: {
    r: "Vaga de emprego", emoji: "💼", c: "#1E8E5A", link: "Como se candidatar (link)", botao: "Candidatar-se",
    campos: [
      { k: "cargo", r: "Cargo / função", obrig: true, ph: "Ex.: Atendente de loja" },
      { k: "empresa", r: "Empresa", ph: "Ex.: Mercado Central (ou deixe em branco)" },
      { k: "quantidade", r: "Nº de vagas", tipo: "number", ph: "1" },
      { k: "salario", r: "Salário", ph: "Ex.: R$ 1.800 + vale-alimentação" },
      { k: "horario", r: "Horário de trabalho", ph: "Ex.: seg a sáb, 8h às 17h" },
      { k: "requisitos", r: "Requisitos", tipo: "textarea", ph: "Ex.: ensino médio, experiência com caixa" },
      { k: "beneficios", r: "Benefícios", ph: "Ex.: vale-transporte, comissão" },
      { k: "contato", r: "Como se candidatar", obrig: true, ph: "Ex.: entregar currículo na Sala do Empreendedor ou WhatsApp (44) 9..." },
      { k: "prazo", r: "Inscrições até", tipo: "date" },
    ],
    titulo: (c) => `Vaga: ${c.cargo || ""}${Number(c.quantidade) > 1 ? ` (${c.quantidade} vagas)` : ""}`,
    texto: (c) => juntar(
      `💼 *VAGA DE EMPREGO${c.empresa ? ` — ${c.empresa}` : ""}*`, "",
      linha("👤", "Cargo", c.cargo), linha("🔢", "Vagas", c.quantidade), linha("💰", "Salário", c.salario), linha("🕗", "Horário", c.horario),
      c.requisitos ? `📋 Requisitos:\n${c.requisitos}` : null, linha("🎁", "Benefícios", c.beneficios), "",
      linha("📩", "Como se candidatar", c.contato), c.prazo ? `⏳ Inscrições até ${dataBR(c.prazo)}` : null, "",
      "Divulgação: Sala do Empreendedor de Ivatuba",
    ),
    fim: (c) => c.prazo || null,
  },
  licitacao: {
    r: "Licitação / compra pública", emoji: "🏛️", c: "#7E5BEF", link: "Link do edital", botao: "Ver edital",
    campos: [
      { k: "orgao", r: "Órgão", ph: "Prefeitura Municipal de Ivatuba", padrao: "Prefeitura Municipal de Ivatuba" },
      { k: "modalidade", r: "Modalidade", tipo: "select", opcoes: ["Pregão eletrônico", "Pregão presencial", "Dispensa de licitação", "Chamamento público", "Concorrência", "Credenciamento", "Outra"] },
      { k: "numero", r: "Número", ph: "Ex.: 012/2026" },
      { k: "objeto", r: "O que vai ser comprado (objeto)", obrig: true, tipo: "textarea", ph: "Ex.: aquisição de gêneros alimentícios para a merenda escolar" },
      { k: "data", r: "Data da abertura", tipo: "date", obrig: true },
      { k: "hora", r: "Horário", tipo: "time" },
      { k: "local", r: "Onde / plataforma", ph: "Ex.: Portal de Compras Públicas ou Paço Municipal" },
      { k: "exclusivo", r: "Exclusivo para ME/EPP/MEI?", tipo: "select", opcoes: ["", "Sim", "Não"] },
    ],
    titulo: (c) => `Licitação: ${(c.objeto || "").split("\n")[0].slice(0, 90)}`,
    texto: (c) => juntar(
      `🏛️ *OPORTUNIDADE DE VENDER PARA ${String(c.orgao || "a Prefeitura").toUpperCase()}*`, "",
      linha("📄", "", [c.modalidade, c.numero && `nº ${c.numero}`].filter(Boolean).join(" ")), linha("🛒", "Objeto", c.objeto),
      c.data ? `📅 Abertura: ${dataBR(c.data)}${c.hora ? ` às ${c.hora}` : ""}` : null, linha("📍", "Onde", c.local),
      c.exclusivo === "Sim" ? "✅ Exclusivo para ME, EPP e MEI" : null, "",
      "Quer participar e não sabe por onde começar? A Sala do Empreendedor ajuda com cadastro, documentos e proposta. É gratuito!",
    ),
    fim: (c) => c.data || null,
  },
  curso: {
    r: "Curso / palestra / oficina", emoji: "🎓", c: "#0EA5A5", link: "Link de inscrição", botao: "Inscrever-se",
    campos: [
      { k: "tema", r: "Tema", obrig: true, ph: "Ex.: Vendas pelo WhatsApp" },
      { k: "parceiro", r: "Realização / parceiro", ph: "Ex.: Sebrae, SENAC" },
      { k: "data", r: "Data", tipo: "date", obrig: true },
      { k: "hora", r: "Horário", tipo: "time" },
      { k: "local", r: "Local", ph: "Ex.: Casa da Cultura" },
      { k: "vagas", r: "Vagas", tipo: "number" },
      { k: "publico", r: "Para quem", ph: "Ex.: MEIs e comerciantes" },
      { k: "inscricao", r: "Como se inscrever", ph: "Ex.: pelo WhatsApp da Sala" },
    ],
    titulo: (c) => `Curso: ${c.tema || ""}`,
    texto: (c) => juntar(
      `🎓 *${String(c.tema || "Curso").toUpperCase()}*`, c.parceiro ? `Realização: ${c.parceiro}` : null, "",
      c.data ? `📅 ${semana(c.data)}, ${dataBR(c.data)}${c.hora ? ` às ${c.hora}` : ""}` : null, linha("📍", "Local", c.local),
      linha("👥", "Para quem", c.publico), linha("🎟️", "Vagas", c.vagas), linha("📝", "Inscrições", c.inscricao), "",
      "Gratuito! Participe e fortaleça o seu negócio. 💙",
    ),
    fim: (c) => c.data || null,
  },
  mutirao: {
    r: "Mutirão / atendimento especial", emoji: "🧰", c: "#E0457B",
    campos: [
      { k: "tema", r: "Tema", obrig: true, ph: "Ex.: Declaração Anual do MEI" },
      { k: "inicio", r: "Começa em", tipo: "date", obrig: true },
      { k: "fim", r: "Termina em", tipo: "date" },
      { k: "horario", r: "Horário", ph: "Ex.: 8h às 17h" },
      { k: "local", r: "Local", ph: "Ex.: Sala do Empreendedor" },
      { k: "levar", r: "O que levar", tipo: "textarea", ph: "Ex.: CPF, senha gov.br, notas do ano" },
    ],
    titulo: (c) => `Mutirão: ${c.tema || ""}`,
    texto: (c) => juntar(
      `🧰 *MUTIRÃO: ${String(c.tema || "").toUpperCase()}*`, "",
      c.inicio ? `📅 ${periodo(c.inicio, c.fim)}` : null, linha("🕗", "Horário", c.horario), linha("📍", "Local", c.local),
      c.levar ? `📌 Traga:\n${c.levar}` : null, "", "Atendimento gratuito na Sala do Empreendedor de Ivatuba.",
    ),
    fim: (c) => c.fim || c.inicio || null,
  },
  sala_fechada: {
    r: "Sala fechada", emoji: "🔒", c: "#B4462F", faixa: true,
    campos: [
      { k: "inicio", r: "Fechada a partir de", tipo: "date", obrig: true },
      { k: "fim", r: "Até (inclusive)", tipo: "date" },
      { k: "motivo", r: "Motivo", tipo: "select", opcoes: ["Feriado", "Ponto facultativo", "Capacitação da equipe", "Recesso de fim de ano", "Manutenção", "Outro"] },
      { k: "detalhe", r: "Detalhe (opcional)", ph: "Ex.: Dia de Nossa Senhora Aparecida" },
      { k: "retorno", r: "Volta a atender em", tipo: "date" },
      { k: "contato", r: "Canal para urgências", ph: "Ex.: WhatsApp (44) 9...", padraoConfig: "whatsapp" },
    ],
    titulo: (c) => `Sala fechada ${c.fim && c.fim !== c.inicio ? `de ${dataBR(c.inicio)} a ${dataBR(c.fim)}` : `em ${dataBR(c.inicio)}`}`,
    texto: (c) => juntar(
      "🔒 *AVISO: SALA DO EMPREENDEDOR FECHADA*", "",
      c.inicio ? `📅 ${periodo(c.inicio, c.fim)}` : null, linha("📌", "Motivo", [c.motivo, c.detalhe].filter(Boolean).join(" — ")),
      c.retorno ? `✅ Voltamos a atender ${semana(c.retorno)}, ${dataBR(c.retorno)}.` : null, linha("📲", "Urgências", c.contato), "",
      "Os serviços online (DAS, nota fiscal, declaração) continuam funcionando normalmente.",
    ),
    inicio: (c) => { if (!c.inicio) return null; const d = new Date(`${c.inicio}T12:00:00`); d.setDate(d.getDate() - 3); const x = d.toLocaleDateString("sv-SE"); return x < hojeISO() ? hojeISO() : x; },
    fim: (c) => c.fim || c.inicio || null,
  },
  horario: {
    r: "Horário especial", emoji: "🕗", c: "#E8A23D",
    campos: [
      { k: "inicio", r: "Data (ou início)", tipo: "date", obrig: true },
      { k: "fim", r: "Até", tipo: "date" },
      { k: "horario", r: "Novo horário", obrig: true, ph: "Ex.: das 8h às 12h" },
      { k: "motivo", r: "Motivo", ph: "Ex.: véspera de feriado" },
    ],
    titulo: (c) => `Horário especial ${c.fim && c.fim !== c.inicio ? `de ${dataBR(c.inicio)} a ${dataBR(c.fim)}` : `em ${dataBR(c.inicio)}`}`,
    texto: (c) => juntar(
      "🕗 *HORÁRIO ESPECIAL DE ATENDIMENTO*", "",
      c.inicio ? `📅 ${periodo(c.inicio, c.fim)}` : null, linha("⏰", "Atendimento", c.horario), linha("📌", "Motivo", c.motivo), "",
      "Sala do Empreendedor de Ivatuba",
    ),
    inicio: (c) => { if (!c.inicio) return null; const d = new Date(`${c.inicio}T12:00:00`); d.setDate(d.getDate() - 3); const x = d.toLocaleDateString("sv-SE"); return x < hojeISO() ? hojeISO() : x; },
    fim: (c) => c.fim || c.inicio || null,
  },
  prazo_mei: {
    r: "Prazo / lembrete do MEI", emoji: "🧾", c: "#0A5AA8", link: "Link do serviço", botao: "Acessar",
    campos: [
      { k: "tema", r: "Assunto", tipo: "select", obrig: true, opcoes: ["DAS do mês", "Declaração Anual (DASN-SIMEI)", "Parcelamento de débitos", "Regularização (Dívida Ativa)", "Nota fiscal (NFS-e)", "Outro"] },
      { k: "data", r: "Data limite", tipo: "date", obrig: true },
      { k: "mensagem", r: "Recado", tipo: "textarea", ph: "Ex.: Quem pagar em atraso paga multa e juros. Precisa de ajuda? Venha até a Sala." },
    ],
    titulo: (c) => `Prazo do MEI: ${c.tema || ""} até ${dataBR(c.data)}`,
    texto: (c) => juntar(
      `🧾 *ATENÇÃO, MEI: ${String(c.tema || "").toUpperCase()}*`, "",
      c.data ? `⏳ Prazo: ${semana(c.data)}, ${dataBR(c.data)}` : null, c.mensagem || null, "",
      "Dúvidas? A Sala do Empreendedor de Ivatuba ajuda de graça.",
    ),
    fim: (c) => c.data || null,
  },
  aviso: {
    r: "Aviso geral", emoji: "📢", c: "#425A70", link: "Link (opcional)", botao: "Saiba mais",
    campos: [
      { k: "titulo", r: "Título", obrig: true, ph: "Ex.: Novo serviço na Sala" },
      { k: "mensagem", r: "Mensagem", obrig: true, tipo: "textarea", ph: "Escreva o aviso" },
    ],
    titulo: (c) => c.titulo || "",
    texto: (c) => juntar(`📢 *${String(c.titulo || "").toUpperCase()}*`, "", c.mensagem || null),
    fim: () => null,
  },
};

const demo = { avisos: [] };

function estadoDe(a, hoje = hojeISO()) {
  if (!a.publicar) return { r: "Rascunho", c: A.soft, k: "rascunho" };
  if (a.fim && a.fim < hoje) return { r: "Encerrado", c: A.soft, k: "encerrado" };
  if (a.inicio > hoje) return { r: `Programado p/ ${dataBR(a.inicio)}`, c: "#7E5BEF", k: "programado" };
  return { r: "No ar", c: A.green, k: "ativo" };
}

// -----------------------------------------------------------------------------
// Cartão (usado no público e na prévia)
// -----------------------------------------------------------------------------
function TextoLongo({ texto, limite = 260 }) {
  const [aberto, setAberto] = useState(false);
  const limpo = String(texto || "").replace(/\*/g, "");
  const longo = limpo.length > limite;
  return (
    <>
      <p className={`font-body text-xs mt-1.5 whitespace-pre-line ${longo && !aberto ? "line-clamp-6" : ""}`} style={{ color: "#425A70" }}>{limpo}</p>
      {longo && <button onClick={() => setAberto(!aberto)} className="font-body text-[11px] font-bold mt-1" style={{ color: A.blueHex }}>{aberto ? "ver menos" : "ver mais"}</button>}
    </>
  );
}

function CartaoAviso({ a }) {
  const m = MODELOS_AVISO[a.modelo] || MODELOS_AVISO.aviso;
  return (
    <div className="rounded-2xl border bg-white overflow-hidden flex flex-col" style={{ borderColor: a.destaque ? m.c : A.line, boxShadow: a.destaque ? `0 0 0 1px ${m.c}` : undefined }}>
      {a.imagem_url && <img src={a.imagem_url} alt={a.titulo} className="w-full h-40 object-cover" loading="lazy" />}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${m.c}1A`, color: m.c }}>{m.emoji} {m.r}</span>
          {a.destaque && <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#FFF7D6", color: "#8A6A00" }}>★ Destaque</span>}
        </div>
        <p className="font-display font-extrabold text-base mt-2 leading-snug" style={{ color: A.ink }}>{a.titulo}</p>
        <TextoLongo texto={(a.texto || "").split("\n").slice(1).join("\n").trim() || a.texto} />
        {a.link_url && (
          <a href={a.link_url} target="_blank" rel="noopener noreferrer" className="mt-3 self-start font-body text-xs font-bold rounded-lg px-3 py-2 inline-flex items-center gap-1.5 text-white" style={{ background: m.c }}>
            {m.botao || "Abrir"} <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// PÁGINA PÚBLICA
// =============================================================================
export function AvisosPublicos() {
  const [avisos, setAvisos] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) { setAvisos(demo.avisos); return; }
    const hoje = hojeISO();
    supabase.from("sala_avisos").select("*").eq("publicar", true).lte("inicio", hoje).or(`fim.is.null,fim.gte.${hoje}`).order("destaque", { ascending: false }).order("inicio", { ascending: false }).limit(30)
      .then(({ data, error }) => setAvisos(error ? [] : data || []));
  }, []);
  const ativos = (avisos || []).filter((a) => estadoDe(a).k === "ativo");
  if (!ativos.length) return null;
  const faixas = ativos.filter((a) => MODELOS_AVISO[a.modelo]?.faixa || a.modelo === "horario");
  const cards = ativos.filter((a) => !faixas.includes(a));
  return (
    <>
      {faixas.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 md:px-6 mt-5 flex flex-col gap-2">
          {faixas.map((a) => {
            const m = MODELOS_AVISO[a.modelo];
            return (
              <div key={a.id} className="rounded-2xl border p-4 flex gap-3 items-start" style={{ borderColor: `${m.c}55`, background: `${m.c}10` }}>
                <span className="text-2xl leading-none">{m.emoji}</span>
                <div className="min-w-0">
                  <p className="font-display font-extrabold text-sm md:text-base" style={{ color: m.c }}>{a.titulo}</p>
                  <p className="font-body text-xs mt-1 whitespace-pre-line" style={{ color: "#425A70" }}>{String(a.texto || "").replace(/\*/g, "").split("\n").slice(1).join("\n").trim()}</p>
                </div>
              </div>
            );
          })}
        </section>
      )}
      {cards.length > 0 && (
        <section id="sala-avisos" className="max-w-6xl mx-auto px-4 md:px-6 mt-10 scroll-mt-20">
          <div className="mb-4">
            <p className="font-body text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: A.blue }}>Mural da Sala</p>
            <h2 className="font-display font-extrabold text-xl md:text-2xl mt-1" style={{ color: A.ink }}>Avisos, vagas e oportunidades</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cards.map((a) => <CartaoAviso key={a.id} a={a} />)}
          </div>
        </section>
      )}
    </>
  );
}

// =============================================================================
// ABA DA ÁREA DO ATENDENTE
// =============================================================================
export function AbaAvisos({ ctx }) {
  const [lista, setLista] = useState(null);
  const [falta, setFalta] = useState(false);
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [filtro, setFiltro] = useState("ativo");

  const carregar = () => {
    if (!supabaseConfigurado) { setLista([...demo.avisos]); return; }
    supabase.from("sala_avisos").select("*").order("criado_em", { ascending: false }).limit(500).then(({ data, error }) => {
      setFalta(faltaTabela(error)); setLista(error ? [] : data || []);
    });
  };
  useEffect(carregar, []);

  const novo = (modelo, base = null) => {
    const m = MODELOS_AVISO[modelo];
    const campos = {};
    m.campos.forEach((f) => { campos[f.k] = base?.campos?.[f.k] ?? (f.padraoConfig ? ctx.config?.[f.padraoConfig] || "" : f.padrao || (f.tipo === "select" ? f.opcoes[0] : "")); });
    setForm({ modelo, campos, link_url: base?.link_url || "", imagem_url: base?.imagem_url || "", destaque: modelo === "sala_fechada", publicar: true, no_conecta: ["vaga", "licitacao", "curso", "mutirao"].includes(modelo), inicio: "", fim: "", textoManual: null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const editar = (a) => {
    setForm({ ...a, campos: { ...(a.campos || {}) }, link_url: a.link_url || "", imagem_url: a.imagem_url || "", inicio: a.inicio || "", fim: a.fim || "", textoManual: a.texto });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const m = form ? MODELOS_AVISO[form.modelo] || MODELOS_AVISO.aviso : null;
  const titulo = form ? m.titulo(form.campos).trim() : "";
  const textoGerado = form ? m.texto(form.campos) : "";
  const texto = form?.textoManual ?? textoGerado;
  const inicio = form ? form.inicio || (m.inicio ? m.inicio(form.campos) : null) || hojeISO() : "";
  const fim = form ? form.fim || (m.fim ? m.fim(form.campos) : null) || "" : "";

  const salvar = async () => {
    const faltando = m.campos.filter((f) => f.obrig && !String(form.campos[f.k] || "").trim()).map((f) => f.r);
    if (faltando.length) { ctx.avisar(`Preencha: ${faltando.join(", ")}`, "erro"); return; }
    const reg = {
      modelo: form.modelo, titulo, texto, campos: form.campos, link_url: form.link_url || null, imagem_url: form.imagem_url || null,
      inicio, fim: fim || null, destaque: !!form.destaque, publicar: !!form.publicar, no_conecta: !!form.no_conecta, criado_por_nome: form.criado_por_nome || ctx.meuNome,
    };
    if (!supabaseConfigurado) {
      demo.avisos = form.id ? demo.avisos.map((x) => (x.id === form.id ? { ...x, ...reg } : x)) : [{ ...reg, id: `demo-${Date.now()}`, criado_em: new Date().toISOString() }, ...demo.avisos];
      setForm(null); carregar(); ctx.avisar("Publicado (modo demonstração)."); return;
    }
    setSalvando(true);
    // Notícia no Conecta Comércio
    let noticia_id = form.noticia_id || null;
    let avisoConecta = "";
    if (reg.no_conecta && reg.publicar) {
      const noticia = { titulo: reg.titulo, conteudo: String(reg.texto || "").replace(/\*/g, ""), imagem_url: reg.imagem_url, link_url: reg.link_url, origem: "sala" };
      const r = noticia_id ? await supabase.from("noticias").update(noticia).eq("id", noticia_id).select("id").maybeSingle() : await supabase.from("noticias").insert(noticia).select("id").single();
      if (r.error) avisoConecta = " (não consegui publicar no Conecta Comércio: " + (faltaTabela(r.error) ? "falta rodar supabase-sala-avisos.sql" : r.error.message) + ")";
      else noticia_id = r.data?.id || noticia_id;
    } else if (noticia_id) {
      await supabase.from("noticias").delete().eq("id", noticia_id);
      noticia_id = null;
    }
    const { error } = form.id ? await supabase.from("sala_avisos").update({ ...reg, noticia_id }).eq("id", form.id) : await supabase.from("sala_avisos").insert({ ...reg, noticia_id });
    setSalvando(false);
    if (error) { ctx.avisar(faltaTabela(error) ? "Falta rodar o arquivo supabase-sala-avisos.sql no Supabase." : "Não consegui salvar: " + error.message, "erro"); return; }
    ctx.avisar((reg.publicar ? "Publicado!" : "Rascunho salvo.") + avisoConecta, avisoConecta ? "erro" : "ok");
    setForm(null); carregar();
  };

  const atualizar = async (a, campos, msg) => {
    if (!supabaseConfigurado) { demo.avisos = demo.avisos.map((x) => (x.id === a.id ? { ...x, ...campos } : x)); carregar(); return; }
    const { error } = await supabase.from("sala_avisos").update(campos).eq("id", a.id);
    if (error) { ctx.avisar("Não consegui alterar: " + error.message, "erro"); return; }
    ctx.avisar(msg); carregar();
  };
  const encerrar = (a) => { const ontem = new Date(); ontem.setDate(ontem.getDate() - 1); atualizar(a, { fim: ontem.toLocaleDateString("sv-SE") }, "Aviso encerrado — saiu da página pública."); };
  const apagar = async (a) => {
    if (!window.confirm(`Apagar "${a.titulo}"?${a.noticia_id ? " A notícia no Conecta Comércio também será apagada." : ""}`)) return;
    if (!supabaseConfigurado) { demo.avisos = demo.avisos.filter((x) => x.id !== a.id); carregar(); return; }
    if (a.noticia_id) await supabase.from("noticias").delete().eq("id", a.noticia_id);
    const { error } = await supabase.from("sala_avisos").delete().eq("id", a.id);
    if (error) { ctx.avisar("Não consegui apagar: " + error.message, "erro"); return; }
    ctx.avisar("Apagado."); carregar();
  };
  const copiar = (t) => { try { navigator.clipboard?.writeText(t); ctx.avisar("Texto copiado — é só colar no WhatsApp ou nas redes."); } catch { ctx.avisar("Não consegui copiar.", "erro"); } };

  const enviarFoto = async (e) => {
    const arq = e.target.files?.[0]; e.target.value = "";
    if (!arq) return;
    if (!supabaseConfigurado) { setForm((f) => ({ ...f, imagem_url: URL.createObjectURL(arq) })); return; }
    setSalvando(true);
    const caminho = `sala-avisos/${Date.now()}-${arq.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error } = await supabase.storage.from("uploads").upload(caminho, arq, { contentType: arq.type });
    setSalvando(false);
    if (error) { ctx.avisar("Não consegui enviar a imagem: " + error.message, "erro"); return; }
    setForm((f) => ({ ...f, imagem_url: supabase.storage.from("uploads").getPublicUrl(caminho).data.publicUrl }));
  };

  const contagem = useMemo(() => {
    const c = { ativo: 0, programado: 0, encerrado: 0, rascunho: 0 };
    (lista || []).forEach((a) => { c[estadoDe(a).k] += 1; });
    return c;
  }, [lista]);
  const visiveis = (lista || []).filter((a) => !filtro || estadoDe(a).k === filtro);

  return (
    <div>
      <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
        <div>
          <p className="font-body text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: A.blue }}>Comunicação</p>
          <h2 className="font-display font-extrabold text-xl md:text-2xl mt-1" style={{ color: A.ink }}>Avisos e publicações</h2>
          <p className="font-body text-sm mt-1" style={{ color: A.muted }}>Escolha um modelo, preencha os campos e publique. Aparece na página pública da Sala (e, se marcar, nas notícias do Conecta Comércio) e sai sozinho no fim do prazo.</p>
        </div>
      </div>

      {falta && (
        <div className="rounded-xl border p-3 mb-4 font-body text-xs" style={{ borderColor: "#F3D9A4", background: "#FFF8E6", color: "#7A5A00" }}>
          Para salvar e publicar, rode uma vez o arquivo <b>supabase-sala-avisos.sql</b> no SQL Editor do Supabase.
        </div>
      )}

      {/* MODELOS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Object.entries(MODELOS_AVISO).map(([k, mm]) => (
          <button key={k} onClick={() => novo(k)} className="rounded-2xl border bg-white p-3 text-left hover:shadow-md transition-shadow" style={{ borderColor: form?.modelo === k && !form?.id ? mm.c : A.line }}>
            <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: `${mm.c}14` }}>{mm.emoji}</span>
            <span className="block font-display font-bold text-sm mt-2" style={{ color: A.ink }}>{mm.r}</span>
          </button>
        ))}
      </div>

      {/* FORMULÁRIO */}
      {form && (
        <div className="rounded-2xl border p-4 md:p-5 mt-4 bg-white shadow-sm" style={{ borderColor: m.c }}>
          <div className="flex items-center justify-between mb-3">
            <p className="font-display font-extrabold text-base" style={{ color: A.ink }}>{m.emoji} {form.id ? "Editar" : "Novo"}: {m.r}</p>
            <button onClick={() => setForm(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} color={A.muted} /></button>
          </div>
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-5">
            <div>
              <div className="grid sm:grid-cols-2 gap-3">
                {m.campos.map((f) => (
                  <label key={f.k} className={`flex flex-col gap-1 ${f.tipo === "textarea" ? "sm:col-span-2" : ""}`}>
                    <span className="font-body text-xs font-bold" style={{ color: A.ink }}>{f.r}{f.obrig && <span style={{ color: A.danger }}> *</span>}</span>
                    {f.tipo === "textarea" ? (
                      <textarea rows={3} value={form.campos[f.k] || ""} onChange={(e) => setForm({ ...form, textoManual: null, campos: { ...form.campos, [f.k]: e.target.value } })} placeholder={f.ph} className={inputCls} style={inputStyle} />
                    ) : f.tipo === "select" ? (
                      <select value={form.campos[f.k] || ""} onChange={(e) => setForm({ ...form, textoManual: null, campos: { ...form.campos, [f.k]: e.target.value } })} className={inputCls} style={inputStyle}>
                        {f.opcoes.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
                      </select>
                    ) : (
                      <input type={f.tipo || "text"} value={form.campos[f.k] || ""} onChange={(e) => setForm({ ...form, textoManual: null, campos: { ...form.campos, [f.k]: e.target.value } })} placeholder={f.ph} className={inputCls} style={inputStyle} />
                    )}
                  </label>
                ))}
                {m.link && (
                  <label className="flex flex-col gap-1 sm:col-span-2"><span className="font-body text-xs font-bold" style={{ color: A.ink }}>{m.link}</span>
                    <input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://..." className={inputCls} style={inputStyle} /></label>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mt-4 pt-4 border-t" style={{ borderColor: A.line }}>
                <label className="flex flex-col gap-1"><span className="font-body text-xs font-bold" style={{ color: A.ink }}>Aparece no site a partir de</span>
                  <input type="date" value={form.inicio || inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} className={inputCls} style={inputStyle} /></label>
                <label className="flex flex-col gap-1"><span className="font-body text-xs font-bold" style={{ color: A.ink }}>Sai do site depois de (vazio = sem prazo)</span>
                  <input type="date" value={form.fim || fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} className={inputCls} style={inputStyle} /></label>
              </div>
              <div className="flex items-center gap-x-4 gap-y-2 flex-wrap mt-3">
                <label className="font-body text-xs font-bold rounded-lg px-3 py-2 inline-flex items-center gap-1.5 bg-white border cursor-pointer" style={{ borderColor: A.line, color: A.blue }}>
                  <Camera size={14} /> {form.imagem_url ? "Trocar imagem" : "Imagem / arte (opcional)"}
                  <input type="file" accept="image/*" className="hidden" onChange={enviarFoto} />
                </label>
                {form.imagem_url && <button onClick={() => setForm({ ...form, imagem_url: "" })} className="font-body text-[11px] font-bold" style={{ color: A.danger }}>Tirar imagem</button>}
                <label className="font-body text-xs inline-flex items-center gap-1.5" style={{ color: A.ink }}><input type="checkbox" checked={!!form.destaque} onChange={(e) => setForm({ ...form, destaque: e.target.checked })} /> Destaque</label>
                <label className="font-body text-xs inline-flex items-center gap-1.5" style={{ color: A.ink }}><input type="checkbox" checked={!!form.no_conecta} onChange={(e) => setForm({ ...form, no_conecta: e.target.checked })} /> Publicar também no Conecta Comércio</label>
                <label className="font-body text-xs inline-flex items-center gap-1.5" style={{ color: A.ink }}><input type="checkbox" checked={!form.publicar} onChange={(e) => setForm({ ...form, publicar: !e.target.checked })} /> Salvar como rascunho</label>
              </div>
            </div>
            <div>
              <p className="font-body text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: A.muted }}>Como vai aparecer no site</p>
              <CartaoAviso a={{ modelo: form.modelo, titulo: titulo || m.r, texto, link_url: form.link_url, imagem_url: form.imagem_url, destaque: form.destaque }} />
              <div className="flex items-center justify-between mt-4 mb-1.5">
                <p className="font-body text-[11px] font-bold uppercase tracking-wide" style={{ color: A.muted }}>Texto (WhatsApp / redes)</p>
                {form.textoManual !== null && form.textoManual !== textoGerado && <button onClick={() => setForm({ ...form, textoManual: null })} className="font-body text-[11px] font-bold" style={{ color: A.blueHex }}>refazer do modelo</button>}
              </div>
              <textarea rows={9} value={texto} onChange={(e) => setForm({ ...form, textoManual: e.target.value })} className={`${inputCls} font-mono text-xs`} style={inputStyle} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 flex-wrap">
            <button onClick={() => copiar(texto)} className="font-body text-xs font-bold rounded-lg px-3 py-2 border bg-white inline-flex items-center gap-1.5" style={{ borderColor: A.line, color: A.blue }}><Copy size={14} /> Copiar texto</button>
            <button onClick={() => setForm(null)} className="font-body text-xs font-bold rounded-lg px-3 py-2 border bg-white" style={{ borderColor: A.line, color: A.muted }}>Cancelar</button>
            <button onClick={salvar} disabled={salvando} className="font-body text-xs font-bold rounded-lg px-4 py-2 text-white disabled:opacity-50 inline-flex items-center gap-1.5" style={{ background: A.blue }}><Megaphone size={14} /> {salvando ? "Salvando..." : form.publicar ? "Publicar" : "Salvar rascunho"}</button>
          </div>
        </div>
      )}

      {/* LISTA */}
      <div className="flex flex-wrap gap-1.5 mt-6 mb-3">
        {[["ativo", "No ar"], ["programado", "Programados"], ["encerrado", "Encerrados"], ["rascunho", "Rascunhos"], ["", "Todos"]].map(([k, r]) => (
          <button key={k || "todos"} onClick={() => setFiltro(k)} className="font-body text-xs font-bold rounded-full px-3 py-1.5 border"
            style={filtro === k ? { background: A.blue, color: "#fff", borderColor: A.blue } : { background: "#fff", color: "#425A70", borderColor: A.line }}>
            {r} <span className="opacity-70">({k ? contagem[k] : (lista || []).length})</span>
          </button>
        ))}
      </div>
      {lista === null ? (
        <p className="font-body text-sm py-8 text-center" style={{ color: A.muted }}>Carregando...</p>
      ) : !visiveis.length ? (
        <p className="font-body text-sm py-8 text-center rounded-2xl border bg-white" style={{ color: A.muted, borderColor: A.line }}>Nada aqui. Escolha um modelo acima para publicar.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {visiveis.map((a) => {
            const mm = MODELOS_AVISO[a.modelo] || MODELOS_AVISO.aviso;
            const est = estadoDe(a);
            return (
              <div key={a.id} className="rounded-2xl border bg-white p-3.5 flex gap-3 items-start" style={{ borderColor: A.line }}>
                <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: `${mm.c}14` }}>{mm.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${est.c}1A`, color: est.c }}>{est.r}</span>
                    <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${mm.c}1A`, color: mm.c }}>{mm.r}</span>
                    {a.destaque && <Star size={12} color="#C99700" fill="#C99700" />}
                    {a.no_conecta && <span className="font-body text-[10px]" style={{ color: A.soft }}>· também no Conecta</span>}
                  </div>
                  <p className="font-display font-bold text-sm mt-1" style={{ color: A.ink }}>{a.titulo}</p>
                  <p className="font-body text-[11px]" style={{ color: A.soft }}>No site {a.fim ? `de ${dataBR(a.inicio)} até ${dataBR(a.fim)}` : `desde ${dataBR(a.inicio)} (sem prazo)`}{a.criado_por_nome ? ` · por ${a.criado_por_nome}` : ""}</p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0 flex-wrap justify-end">
                  <button onClick={() => copiar(a.texto || "")} title="Copiar texto" className="p-1.5 rounded-lg hover:bg-slate-100"><Copy size={14} color={A.muted} /></button>
                  <button onClick={() => editar(a)} title="Editar" className="p-1.5 rounded-lg hover:bg-slate-100"><Pencil size={14} color={A.muted} /></button>
                  <button onClick={() => novo(a.modelo, a)} title="Duplicar (usar de base)" className="p-1.5 rounded-lg hover:bg-slate-100"><CopyPlus size={14} color={A.muted} /></button>
                  {est.k === "rascunho"
                    ? <button onClick={() => atualizar(a, { publicar: true }, "Publicado!")} title="Publicar" className="p-1.5 rounded-lg hover:bg-slate-100"><Eye size={14} color={A.green} /></button>
                    : est.k !== "encerrado" && <button onClick={() => encerrar(a)} title="Encerrar (tirar do site)" className="p-1.5 rounded-lg hover:bg-slate-100"><Archive size={14} color="#B4802F" /></button>}
                  {est.k !== "rascunho" && <button onClick={() => atualizar(a, { publicar: false }, "Virou rascunho — saiu do site.")} title="Voltar para rascunho" className="p-1.5 rounded-lg hover:bg-slate-100"><EyeOff size={14} color={A.muted} /></button>}
                  <button onClick={() => apagar(a)} title="Apagar" className="p-1.5 rounded-lg hover:bg-slate-100"><Trash2 size={14} color={A.danger} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
