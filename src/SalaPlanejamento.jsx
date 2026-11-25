// =============================================================================
// SALA DO EMPREENDEDOR — PLANEJAMENTO
// Estratégias para ajudar o comerciante + calendário (prazos do MEI, datas do
// comércio, mutirões e cursos), com PDF e "copiar texto" para colar no site,
// no WhatsApp ou em outro sistema. Tabelas: sala_estrategias, sala_calendario
// (ver supabase-sala-planejamento.sql).
// =============================================================================
import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Copy, Download, Eye, EyeOff, Pencil, PlusCircle, Trash2, CheckCircle2, Target, Sparkles, MessageSquare, ChevronDown } from "lucide-react";
import { ESTRATEGIAS_SEGMENTO, ROTEIRO_GERAL, ORIENTACAO_SEGMENTO } from "./SalaSegmentos.js";
import { supabase, supabaseConfigurado } from "./supabaseClient";
import { exportarPDF } from "./central/motor.js";

const P = {
  blue: "var(--cor-principal, #0A5AA8)", blueHex: "#0A5AA8", blueTint: "#EAF2FB", blueTint2: "#F5F9FD",
  ink: "#0E2233", muted: "#5C7186", soft: "#8896A6", line: "#DCE7F2", danger: "#B4462F", green: "#1E8E5A", amber: "#E8A23D",
};
const MES_NOME = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const TIPOS_EVENTO = {
  prazo: { r: "Prazo", c: "#B4462F" },
  comercio: { r: "Data do comércio", c: "#E8A23D" },
  mutirao: { r: "Mutirão", c: "#7E5BEF" },
  curso: { r: "Curso", c: "#0EA5A5" },
  evento: { r: "Evento", c: "#0A5AA8" },
  aviso: { r: "Aviso", c: "#5C7186" },
  estrategia: { r: "Estratégia", c: "#1E8E5A" },
};
const STATUS_EST = { planejada: { r: "Planejada", c: "#0A5AA8" }, em_andamento: { r: "Em andamento", c: "#E8A23D" }, concluida: { r: "Concluída", c: "#1E8E5A" } };

const pad = (n) => String(n).padStart(2, "0");
const isoDe = (a, m, d) => `${a}-${pad(m)}-${pad(d)}`;
const hojeISO = () => new Date().toLocaleDateString("sv-SE");
const dataBR = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR") : "—");
function copiarTexto(t) { try { navigator.clipboard?.writeText(t); return true; } catch { return false; } }

// ---------------------------------------------------------------------------
// Estratégias prontas — foco em ajudar o comerciante/MEI de Ivatuba
// ---------------------------------------------------------------------------
export const MODELOS_ESTRATEGIA = [
  {
    k: "dasn", emoji: "🧾", titulo: "Mutirão da Declaração Anual do MEI (DASN-SIMEI)", meses: [2, 3, 4, 5], quando: "Fevereiro a maio (prazo: 31 de maio)",
    objetivo: "Fazer todos os MEIs da cidade entregarem a declaração anual no prazo e evitar multa.",
    publico: "MEIs de Ivatuba, principalmente quem nunca declarou ou atrasou no ano passado.",
    passos: ["Separar a lista de MEIs atendidos no ano anterior e os cadastrados no Conecta Comércio", "Divulgar o mutirão nos grupos de WhatsApp, rádio e Instagram com 2 semanas de antecedência", "Abrir horários extras na agenda da Sala (manhã e fim de tarde)", "No atendimento: conferir faturamento do ano, entregar a DASN e já emitir o DAS do mês", "Registrar cada atendimento na categoria Declaração Anual - DASN-SIMEI", "Na última semana de maio, chamar no WhatsApp quem ainda não declarou"],
    mensagem: "📢 MEI, atenção! A Declaração Anual (DASN-SIMEI) vence em 31 de maio. A Sala do Empreendedor de Ivatuba faz com você, de graça. Agende pelo site do Conecta Comércio ou chame no WhatsApp.",
  },
  {
    k: "das", emoji: "💳", titulo: "MEI em dia: regularização do DAS atrasado", meses: [1, 6, 9], quando: "O ano todo (reforço em janeiro, junho e setembro)",
    objetivo: "Tirar o MEI da inadimplência antes que a dívida vá para a Dívida Ativa e ele perca benefícios do INSS.",
    publico: "MEIs com DAS em atraso ou que receberam aviso da Receita.",
    passos: ["Divulgar que a Sala consulta débitos e simula parcelamento", "No atendimento: consultar o PGMEI, mostrar o valor e as opções de parcelamento", "Explicar o que o MEI perde ficando em atraso (aposentadoria, auxílio-doença, salário-maternidade)", "Fazer o pedido de parcelamento quando for o caso e combinar a data de pagamento", "Registrar como Parcelamento - Microempreendedor Individual ou Boleto DAS", "Retornar em 30 dias para conferir se a primeira parcela foi paga"],
    mensagem: "Seu DAS do MEI está atrasado? Dá para parcelar e voltar a ficar em dia — e não perder seus direitos no INSS. A Sala do Empreendedor de Ivatuba consulta e resolve com você, sem custo.",
  },
  {
    k: "formalizar", emoji: "🚀", titulo: "De informal a MEI: formalização de quem já vende", meses: [1, 2, 8], quando: "Começo do ano e antes das feiras",
    objetivo: "Formalizar autônomos, feirantes e quem vende pela internet, abrindo acesso a nota fiscal, crédito e INSS.",
    publico: "Feirantes, ambulantes, quem vende por Instagram/WhatsApp, prestadores de serviço sem CNPJ.",
    passos: ["Mapear informais pela Feira do Empreendedor, Classificados e indicações dos comerciantes", "Preparar uma lista curta do que levar (documento com foto, CPF, título ou recibo do IR, endereço)", "Fazer a abertura do MEI no atendimento e já explicar o DAS mensal", "Cadastrar o novo MEI no Conecta Comércio para ganhar vitrine", "Registrar como Formalização - Abertura de Empresa"],
    mensagem: "Você vende, faz serviço ou trabalha na feira e ainda não tem CNPJ? Virar MEI é rápido e gratuito na Sala do Empreendedor de Ivatuba. Agende seu atendimento!",
  },
  {
    k: "natal", emoji: "🎄", titulo: "Natal forte no comércio local", meses: [10, 11, 12], quando: "Outubro a dezembro",
    objetivo: "Preparar o comércio para a maior data do ano: estoque, vitrine, divulgação e formas de pagamento.",
    publico: "Lojas, mercados, salões, confecções e prestadores de serviço.",
    passos: ["Em outubro: orientar sobre capital de giro para estoque (encaminhar à Fomento Paraná quando precisar)", "Ajudar a cadastrar ou atualizar promoções no Conecta Comércio", "Incentivar a participação no concurso Meu Comércio Iluminado", "Orientar sobre Pix, maquininha e emissão de nota fiscal", "Divulgar a campanha 'Compre em Ivatuba' nas redes e grupos", "Em janeiro: conversar com os comerciantes sobre o resultado e planejar o ano"],
    mensagem: "🎁 Este Natal, compre em Ivatuba! Valorize quem gera emprego na nossa cidade. Veja as promoções dos comerciantes locais no Conecta Comércio.",
  },
  {
    k: "datas", emoji: "📅", titulo: "Plano de datas comemorativas (45 dias antes)", meses: [3, 4, 6, 7, 8, 9], quando: "45 dias antes de Dia das Mães, Namorados, Pais e Crianças",
    objetivo: "Fazer o comerciante se preparar com antecedência para as datas que mais vendem.",
    publico: "Lojas de presentes, roupas, calçados, salões, restaurantes e variedades.",
    passos: ["Enviar aos comerciantes o calendário de datas do ano (PDF deste painel)", "45 dias antes: lembrar de estoque, vitrine e divulgação", "Oferecer ajuda para criar a promoção no Conecta Comércio", "Sugerir combos, brindes e sorteios simples", "Depois da data: perguntar como foram as vendas e registrar as dificuldades"],
    mensagem: "Faltam 45 dias para a próxima data forte do comércio! Já pensou no estoque, na vitrine e na divulgação? A Sala do Empreendedor ajuda a planejar.",
  },
  {
    k: "digital", emoji: "📱", titulo: "Comércio no digital", meses: [3, 7], quando: "Qualquer época (bom antes das datas fortes)",
    objetivo: "Colocar o comerciante no celular do cliente: vitrine online, WhatsApp Business e Google.",
    publico: "Comerciantes sem presença online ou com perfil desatualizado.",
    passos: ["Cadastrar ou atualizar a empresa no Conecta Comércio (fotos, horários, produtos, WhatsApp)", "Ajudar a criar o catálogo no WhatsApp Business", "Ajudar a criar ou corrigir o perfil no Google (endereço e horário certos)", "Ensinar a postar promoções com foto boa e preço", "Indicar cursos do Sebrae sobre redes sociais"],
    mensagem: "Seu cliente procura no celular antes de sair de casa. Coloque sua loja no Conecta Comércio e no WhatsApp Business — a Sala do Empreendedor ajuda você, de graça.",
  },
  {
    k: "nota", emoji: "🧮", titulo: "Nota fiscal de serviço (NFS-e) sem medo", meses: [1, 4], quando: "Começo do ano e sempre que houver dúvida",
    objetivo: "Ensinar o MEI prestador de serviço a emitir nota fiscal pelo Emissor Nacional.",
    publico: "MEIs prestadores de serviço, principalmente quem atende empresas ou a prefeitura.",
    passos: ["Fazer o primeiro acesso ao Emissor Nacional junto com o MEI", "Emitir uma nota de teste explicando cada campo", "Entregar um passo a passo impresso (PDF)", "Registrar como Nota Fiscal MEI - SERVIÇO (ISS)"],
    mensagem: "MEI prestador de serviço: precisa emitir nota fiscal e não sabe como? Na Sala do Empreendedor a gente faz a primeira com você.",
  },
  {
    k: "compras", emoji: "🏛️", titulo: "Vender para a prefeitura (compras públicas)", meses: [2, 8], quando: "Quando houver editais abertos",
    objetivo: "Preparar pequenos negócios locais para participar de compras públicas.",
    publico: "MEIs e microempresas com produtos ou serviços que a prefeitura compra.",
    passos: ["Divulgar os editais abertos (aba Editais e Licitações do Conecta Comércio)", "Explicar as certidões e documentos exigidos", "Ajudar a organizar a documentação", "Orientar sobre a nota fiscal e o prazo de pagamento", "Registrar como Compras Públicas"],
    mensagem: "Sua empresa pode vender para a prefeitura! A Sala do Empreendedor orienta sobre documentos, certidões e editais abertos.",
  },
  {
    k: "credito", emoji: "💰", titulo: "Crédito orientado para crescer", meses: [2, 9, 10], quando: "Antes da compra de estoque e de investimentos",
    objetivo: "Encaminhar o comerciante para o crédito certo, com orientação, evitando dívidas caras.",
    publico: "Comerciantes que precisam de capital de giro, estoque, máquinas ou reforma.",
    passos: ["Entender a necessidade (para quê, quanto, em quanto tempo paga)", "Mostrar as linhas da Fomento Paraná na página do Fomento do Conecta Comércio", "Encaminhar ao Agente de Crédito com os documentos já separados", "Registrar como Crédito e acompanhar o retorno"],
    mensagem: "Precisa de crédito para estoque, máquinas ou reforma? Antes de pegar empréstimo caro, passe na Sala do Empreendedor: orientamos e encaminhamos para a Fomento Paraná.",
  },
  {
    k: "limite", emoji: "📈", titulo: "MEI que cresceu: limite de faturamento", meses: [6, 11], quando: "Meio e fim do ano",
    objetivo: "Avisar quem está perto do limite anual do MEI para planejar a mudança de enquadramento sem susto.",
    publico: "MEIs com faturamento alto ou que querem contratar mais de um funcionário.",
    passos: ["Pedir que o MEI some o faturamento do ano até agora", "Explicar o que acontece se passar do limite", "Indicar a conversa com um contador para a mudança de porte", "Registrar como Orientações sobre o MEI"],
    mensagem: "Seu MEI está faturando bem? Fique de olho no limite anual. A Sala do Empreendedor explica o que fazer antes de passar do teto.",
  },
];

// Datas que se repetem todo ano (prazos do MEI e datas do comércio)
export function datasFixas(ano) {
  const nDom = (mes, n) => { const d = new Date(ano, mes - 1, 1); const off = (7 - d.getDay()) % 7; return new Date(ano, mes - 1, 1 + off + 7 * (n - 1)); };
  const iso = (d) => d.toLocaleDateString("sv-SE");
  const lista = [];
  for (let m = 1; m <= 12; m++) lista.push({ data: isoDe(ano, m, 20), titulo: "Vencimento do DAS do MEI", descricao: "Lembrar os MEIs de pagar o DAS do mês.", tipo: "prazo", fixo: true });
  lista.push({ data: isoDe(ano, 5, 31), titulo: "Prazo final da Declaração Anual do MEI (DASN-SIMEI)", descricao: "Último dia para entregar a declaração sem multa.", tipo: "prazo", fixo: true });
  const com = [
    [isoDe(ano, 3, 8), "Dia Internacional da Mulher", "Valorizar as empreendedoras da cidade."],
    [isoDe(ano, 3, 15), "Dia do Consumidor", "Promoções no comércio local."],
    [iso(nDom(5, 2)), "Dia das Mães", "Segunda maior data do comércio: preparar com 45 dias."],
    [isoDe(ano, 6, 12), "Dia dos Namorados", "Presentes, restaurantes e serviços."],
    [isoDe(ano, 7, 16), "Dia do Comerciante", "Homenagear os comerciantes locais."],
    [iso(nDom(8, 2)), "Dia dos Pais", "Estoque e promoções da data."],
    [isoDe(ano, 9, 15), "Dia do Cliente", "Ações de fidelização."],
    [isoDe(ano, 10, 5), "Dia da Micro e Pequena Empresa", "Bom dia para um mutirão na Sala."],
    [isoDe(ano, 10, 12), "Dia das Crianças", "Brinquedos, roupas e variedades."],
    [iso(new Date(nDom(11, 4).getTime() + 5 * 864e5)), "Black Friday", "Promoções e capital de giro para estoque."],
    [isoDe(ano, 12, 25), "Natal", "Maior data do comércio."],
  ];
  com.forEach(([data, titulo, descricao]) => lista.push({ data, titulo, descricao, tipo: "comercio", fixo: true }));
  return lista;
}

// ---------------------------------------------------------------------------
// Textos e PDFs
// ---------------------------------------------------------------------------
function passosDe(e) { return Array.isArray(e.passos) ? e.passos : String(e.passos || "").split("\n").map((s) => s.trim()).filter(Boolean); }
function periodoDe(e) {
  if (e.data_inicio || e.data_fim) return `${dataBR(e.data_inicio)} a ${dataBR(e.data_fim)}`;
  return e.quando || "";
}
export function textoEstrategia(e) {
  const passos = passosDe(e);
  return [
    `${e.emoji ? e.emoji + " " : ""}${e.titulo}`,
    periodoDe(e) && `Quando: ${periodoDe(e)}`,
    e.objetivo && `Objetivo: ${e.objetivo}`,
    e.publico && `Para quem: ${e.publico}`,
    passos.length && `Como fazer:\n${passos.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
    e.mensagem && `Mensagem para divulgar:\n${e.mensagem}`,
    "— Sala do Empreendedor · Ivatuba",
  ].filter(Boolean).join("\n\n");
}
function textoItens(titulo, itens) {
  return [`📅 ${titulo} — Sala do Empreendedor · Ivatuba`, "", ...itens.map((i) => `${dataBR(i.data)} — ${i.titulo}${i.descricao ? `: ${i.descricao}` : ""}`)].join("\n");
}

// Roteiro de orientação (para o atendente usar no atendimento)
function textoRoteiro(m) {
  const o = ORIENTACAO_SEGMENTO[m.k] || {};
  return [
    `🗣️ Como orientar — ${m.segmento}`,
    `Perguntas para entender o negócio:\n${(o.perguntas || []).map((t) => `• ${t}`).join("\n")}`,
    `Como explicar:\n${(o.explicar || []).map((t) => `• ${t}`).join("\n")}`,
    o.exemplo && `Exemplo com números:\n${o.exemplo}`,
    `Tarefa para casa:\n${(o.tarefa || []).map((t, i) => `${i + 1}. ${t}`).join("\n")}`,
    o.retorno && `Retorno: ${o.retorno}`,
    `Roteiro do atendimento:\n${ROTEIRO_GERAL.map((r) => `${r.etapa} — ${r.texto}`).join("\n")}`,
    "— Sala do Empreendedor · Ivatuba",
  ].filter(Boolean).join("\n\n");
}
async function pdfRoteiro(m) {
  const o = ORIENTACAO_SEGMENTO[m.k] || {};
  await exportarPDF(`roteiro-orientacao-${m.k.replace("seg-", "")}`, `Como orientar — ${m.segmento}`, [
    { titulo: "1. Perguntas para entender o negócio", cabecalho: ["Pergunte"], linhas: (o.perguntas || []).map((t) => [t]) },
    { titulo: "2. Como explicar (em palavras simples)", cabecalho: ["Diga assim"], linhas: (o.explicar || []).map((t) => [t.replace(/^Diga assim:\s*/, "")]) },
    { titulo: "3. Exemplo com números", cabecalho: ["Troque pelos números do empreendedor"], linhas: [[o.exemplo || ""]] },
    { titulo: "4. O que a Sala recomenda", cabecalho: ["Área", "Orientação"], linhas: m.passos.map((p) => { const i = p.indexOf(":"); return [p.slice(0, i), p.slice(i + 1).trim()]; }) },
    { titulo: "5. Tarefa para casa e retorno", cabecalho: ["Combinado"], linhas: [...(o.tarefa || []).map((t) => [t]), [`Retorno: ${o.retorno || ""}`]] },
    { titulo: "Roteiro do atendimento (vale para todos)", cabecalho: ["Etapa", "Como fazer"], linhas: ROTEIRO_GERAL.map((r) => [r.etapa, r.texto]) },
  ], "Registre o atendimento na ficha com a data de retorno.", "Sala do Empreendedor · Ivatuba");
}

async function pdfEstrategia(e) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const L = 15, W = 180;
  doc.setFillColor(10, 90, 168); doc.rect(0, 0, 210, 26, "F");
  doc.setTextColor(255); doc.setFontSize(9); doc.text("SALA DO EMPREENDEDOR · IVATUBA — ESTRATÉGIA", L, 10);
  doc.setFontSize(14); doc.text(doc.splitTextToSize(e.titulo, W), L, 18);
  let y = 36;
  const bloco = (rot, txt) => {
    if (!txt) return;
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setTextColor(10, 90, 168); doc.setFontSize(9); doc.text(rot.toUpperCase(), L, y); y += 5;
    doc.setTextColor(14, 34, 51); doc.setFontSize(11);
    const linhas = doc.splitTextToSize(txt, W);
    linhas.forEach((l) => { if (y > 280) { doc.addPage(); y = 20; } doc.text(l, L, y); y += 5.5; });
    y += 4;
  };
  bloco("Quando", periodoDe(e));
  bloco("Objetivo", e.objetivo);
  bloco("Para quem", e.publico);
  bloco("Como fazer", passosDe(e).map((p, i) => `${i + 1}. ${p}`).join("\n"));
  bloco("Mensagem para divulgar", e.mensagem);
  doc.setFontSize(8); doc.setTextColor(136, 150, 166); doc.text(`Conecta Comércio · gerado em ${new Date().toLocaleString("pt-BR")}`, L, 290);
  doc.save(`estrategia-${String(e.titulo).normalize("NFD").replace(/[^\w]+/g, "-").toLowerCase().slice(0, 40)}.pdf`);
}

async function pdfPlano(titulo, itens, estrategias, nomeArq) {
  const secoes = [];
  if (itens.length) secoes.push({ titulo: "Calendário", cabecalho: ["Data", "Dia", "Tipo", "O quê", "Detalhes"], linhas: itens.map((i) => [dataBR(i.data), SEMANA[new Date(`${i.data}T12:00:00`).getDay()], TIPOS_EVENTO[i.tipo]?.r || i.tipo, i.titulo, i.descricao || ""]) });
  if (estrategias.length) secoes.push({ titulo: "Estratégias", cabecalho: ["Estratégia", "Quando", "Objetivo", "Como fazer"], linhas: estrategias.map((e) => [e.titulo, periodoDe(e), e.objetivo || "", passosDe(e).map((p, i) => `${i + 1}. ${p}`).join("\n")]) });
  await exportarPDF(nomeArq, titulo, secoes, "Conecta Comércio · Sala do Empreendedor de Ivatuba", "Sala do Empreendedor · Ivatuba");
}

// ---------------------------------------------------------------------------
// Dados (com modo demonstração que sobrevive à troca de aba)
// ---------------------------------------------------------------------------
const demo = { estrategias: [], eventos: [{ id: "demo-ev1", data: isoDe(new Date().getFullYear(), 12, 10), titulo: "Mutirão de regularização do MEI", descricao: "Atendimento sem agendamento, das 8h às 17h.", tipo: "mutirao", publicar: true }] };

export function usePlanejamento() {
  const [estrategias, setEstrategias] = useState(null);
  const [eventos, setEventos] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) { setEstrategias(demo.estrategias); setEventos(demo.eventos); return; }
    supabase.from("sala_estrategias").select("*").order("data_inicio", { ascending: true, nullsFirst: false }).then(({ data, error }) => setEstrategias(error ? [] : data || []));
    supabase.from("sala_calendario").select("*").order("data").then(({ data, error }) => setEventos(error ? [] : data || []));
  }, []);
  const salvar = async (tabela, registro, id) => {
    if (!supabaseConfigurado) {
      const lista = tabela === "sala_estrategias" ? "estrategias" : "eventos";
      const novo = { ...registro, id: id || `demo-${Date.now()}` };
      demo[lista] = id ? demo[lista].map((x) => (x.id === id ? { ...x, ...novo } : x)) : [...demo[lista], novo];
      (lista === "estrategias" ? setEstrategias : setEventos)([...demo[lista]]);
      return { data: novo };
    }
    const q = id ? supabase.from(tabela).update(registro).eq("id", id) : supabase.from(tabela).insert(registro);
    const { data, error } = await q.select().single();
    if (error) return { error };
    const set = tabela === "sala_estrategias" ? setEstrategias : setEventos;
    set((l) => (id ? (l || []).map((x) => (x.id === id ? data : x)) : [...(l || []), data]));
    return { data };
  };
  const apagar = async (tabela, id) => {
    const lista = tabela === "sala_estrategias" ? "estrategias" : "eventos";
    if (!supabaseConfigurado) { demo[lista] = demo[lista].filter((x) => x.id !== id); (lista === "estrategias" ? setEstrategias : setEventos)([...demo[lista]]); return {}; }
    const { error } = await supabase.from(tabela).delete().eq("id", id);
    if (!error) (lista === "estrategias" ? setEstrategias : setEventos)((l) => (l || []).filter((x) => x.id !== id));
    return { error };
  };
  return { estrategias, eventos, salvar, apagar };
}

// ---------------------------------------------------------------------------
// UI básica
// ---------------------------------------------------------------------------
const inputCls = "font-body text-sm border rounded-lg px-3 py-2.5 outline-none bg-white w-full";
const inputStyle = { borderColor: P.line };
function Bt({ children, onClick, cor = P.blue, contorno = false, type = "button", disabled, title }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title}
      className="font-body text-xs font-bold rounded-lg px-3 py-2 inline-flex items-center gap-1.5 disabled:opacity-50"
      style={contorno ? { border: `1px solid ${P.line}`, color: cor, background: "#fff" } : { background: cor, color: "#fff" }}>{children}</button>
  );
}
function Selo({ texto, cor }) { return <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: `${cor}1A`, color: cor }}>{texto}</span>; }
function Cab({ eyebrow, title, sub, direita }) {
  return (
    <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
      <div>
        <p className="font-body text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: P.blue }}>{eyebrow}</p>
        <h2 className="font-display font-extrabold text-xl md:text-2xl mt-1" style={{ color: P.ink }}>{title}</h2>
        {sub && <p className="font-body text-sm mt-1" style={{ color: P.muted }}>{sub}</p>}
      </div>
      {direita}
    </div>
  );
}

// =============================================================================
// ABA: ESTRATÉGIAS
// =============================================================================
const EST_VAZIA = { titulo: "", objetivo: "", publico: "", passos: "", mensagem: "", data_inicio: "", data_fim: "", status: "planejada", publicar: false, modelo: null };

function proximoPeriodo(meses) {
  const hoje = new Date();
  const ano = hoje.getFullYear(), mesAtual = hoje.getMonth() + 1;
  const ordenados = [...meses].sort((a, b) => a - b);
  const prox = ordenados.find((m) => m >= mesAtual);
  const anoIni = prox ? ano : ano + 1;
  const mIni = prox || ordenados[0];
  // período contínuo a partir do mês escolhido
  let mFim = mIni;
  while (ordenados.includes(mFim + 1)) mFim += 1;
  const ultimo = new Date(anoIni, mFim, 0).getDate();
  return { data_inicio: isoDe(anoIni, mIni, 1), data_fim: isoDe(anoIni, mFim, ultimo) };
}

export function AbaEstrategias({ ctx }) {
  const pl = usePlanejamento();
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [apagando, setApagando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [segmento, setSegmento] = useState(ESTRATEGIAS_SEGMENTO[0].k);
  const [verRoteiro, setVerRoteiro] = useState(false);

  const abrirModelo = (m) => {
    setEditId(null);
    setForm({ ...EST_VAZIA, titulo: m.titulo, objetivo: m.objetivo, publico: m.publico, passos: m.passos.join("\n"), mensagem: m.mensagem, modelo: m.k, ...proximoPeriodo(m.meses) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const salvar = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim()) { ctx.avisar("Dê um nome para a estratégia.", "erro"); return; }
    if (form.data_inicio && form.data_fim && form.data_fim < form.data_inicio) { ctx.avisar("A data final está antes da inicial.", "erro"); return; }
    setSalvando(true);
    const registro = { ...form, titulo: form.titulo.trim(), data_inicio: form.data_inicio || null, data_fim: form.data_fim || null };
    delete registro.id; delete registro.criado_em;
    const { error } = await pl.salvar("sala_estrategias", registro, editId);
    setSalvando(false);
    if (error) { ctx.avisar(/relation|schema cache/i.test(error.message) ? "Falta rodar o arquivo supabase-sala-planejamento.sql no Supabase." : "Não consegui salvar: " + error.message, "erro"); return; }
    ctx.avisar(editId ? "Estratégia atualizada." : "Estratégia criada. Ela já aparece no calendário.");
    setForm(null); setEditId(null);
  };
  const alternar = async (e, campos) => {
    const { error } = await pl.salvar("sala_estrategias", campos, e.id);
    if (error) ctx.avisar("Não consegui alterar: " + error.message, "erro");
  };
  const copiar = (e) => { copiarTexto(textoEstrategia(e)); ctx.avisar("Texto copiado. É só colar no site, no WhatsApp ou onde quiser."); };
  const minhas = pl.estrategias || [];

  return (
    <div>
      <Cab eyebrow="Planejamento" title="Estratégias para ajudar o comerciante" sub="Use uma estratégia pronta ou crie a sua. Cada uma vira um PDF e um texto pronto para copiar."
        direita={
          <div className="flex flex-wrap gap-2">
            {!form && <Bt onClick={() => { setForm({ ...EST_VAZIA }); setEditId(null); }}><PlusCircle size={14} /> Nova estratégia</Bt>}
            {minhas.length > 0 && <Bt contorno onClick={() => pdfPlano(`Estratégias da Sala do Empreendedor`, [], minhas, "estrategias-sala-do-empreendedor")}><Download size={14} /> PDF de todas</Bt>}
          </div>
        } />

      {form && (
        <form onSubmit={salvar} className="rounded-2xl border p-4 md:p-5 bg-white grid md:grid-cols-2 gap-3 mb-6" style={{ borderColor: P.blueHex }}>
          <p className="md:col-span-2 font-display font-bold text-sm" style={{ color: P.ink }}>{editId ? "Editar estratégia" : form.modelo ? "Usar estratégia pronta (ajuste o que quiser)" : "Nova estratégia"}</p>
          <label className="md:col-span-2 flex flex-col gap-1"><span className="font-body text-xs font-bold">Nome *</span><input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className={inputCls} style={inputStyle} /></label>
          <label className="flex flex-col gap-1"><span className="font-body text-xs font-bold">Começa em</span><input type="date" value={form.data_inicio || ""} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} className={inputCls} style={inputStyle} /></label>
          <label className="flex flex-col gap-1"><span className="font-body text-xs font-bold">Termina em</span><input type="date" value={form.data_fim || ""} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} className={inputCls} style={inputStyle} /></label>
          <label className="flex flex-col gap-1"><span className="font-body text-xs font-bold">Objetivo</span><textarea rows={2} value={form.objetivo || ""} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} className={inputCls} style={inputStyle} /></label>
          <label className="flex flex-col gap-1"><span className="font-body text-xs font-bold">Para quem</span><textarea rows={2} value={form.publico || ""} onChange={(e) => setForm({ ...form, publico: e.target.value })} className={inputCls} style={inputStyle} /></label>
          <label className="md:col-span-2 flex flex-col gap-1"><span className="font-body text-xs font-bold">Como fazer (um passo por linha)</span><textarea rows={6} value={form.passos || ""} onChange={(e) => setForm({ ...form, passos: e.target.value })} className={inputCls} style={inputStyle} /></label>
          <label className="md:col-span-2 flex flex-col gap-1"><span className="font-body text-xs font-bold">Mensagem para divulgar (WhatsApp, redes, site)</span><textarea rows={3} value={form.mensagem || ""} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} className={inputCls} style={inputStyle} /></label>
          <label className="flex flex-col gap-1"><span className="font-body text-xs font-bold">Situação</span>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls} style={inputStyle}>
              {Object.entries(STATUS_EST).map(([k, v]) => <option key={k} value={k}>{v.r}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 font-body text-sm self-end pb-2"><input type="checkbox" checked={!!form.publicar} onChange={(e) => setForm({ ...form, publicar: e.target.checked })} /> Mostrar na página pública da Sala</label>
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Bt type="submit" disabled={salvando}><CheckCircle2 size={14} /> {salvando ? "Salvando..." : "Salvar estratégia"}</Bt>
            <Bt contorno onClick={() => pdfEstrategia(form)}><Download size={14} /> Baixar PDF</Bt>
            <Bt contorno onClick={() => copiar(form)}><Copy size={14} /> Copiar texto</Bt>
            <Bt contorno onClick={() => { setForm(null); setEditId(null); }}>Cancelar</Bt>
          </div>
        </form>
      )}

      <p className="font-display font-bold text-sm mb-2" style={{ color: P.ink }}>Minhas estratégias ({minhas.length})</p>
      {pl.estrategias === null ? <p className="font-body text-sm" style={{ color: P.muted }}>Carregando...</p> : minhas.length === 0 ? (
        <p className="font-body text-sm mb-6" style={{ color: P.muted }}>Nenhuma ainda. Escolha uma pronta abaixo e clique em "Usar esta".</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3 mb-8">
          {minhas.map((e) => {
            const st = STATUS_EST[e.status] || STATUS_EST.planejada;
            return (
              <div key={e.id} className="rounded-2xl border p-4 bg-white flex flex-col" style={{ borderColor: P.line }}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display font-bold text-sm" style={{ color: P.ink }}>{e.titulo}</p>
                  <Selo texto={st.r} cor={st.c} />
                </div>
                <p className="font-body text-[11px] mt-0.5" style={{ color: P.soft }}>{periodoDe(e) || "Sem data"}{e.publicar ? " · aparece no site" : ""}</p>
                {e.objetivo && <p className="font-body text-xs mt-2" style={{ color: "#425A70" }}>{e.objetivo}</p>}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Bt contorno onClick={() => { setForm({ ...EST_VAZIA, ...e, data_inicio: e.data_inicio || "", data_fim: e.data_fim || "" }); setEditId(e.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Pencil size={13} /> Editar</Bt>
                  <Bt contorno onClick={() => pdfEstrategia(e)}><Download size={13} /> PDF</Bt>
                  <Bt contorno onClick={() => copiar(e)}><Copy size={13} /> Copiar</Bt>
                  {e.status !== "concluida" && <Bt contorno cor={P.green} onClick={() => alternar(e, { status: e.status === "planejada" ? "em_andamento" : "concluida" })}><CheckCircle2 size={13} /> {e.status === "planejada" ? "Iniciar" : "Concluir"}</Bt>}
                  <Bt contorno onClick={() => alternar(e, { publicar: !e.publicar })} title="Mostrar ou esconder na página pública">{e.publicar ? <><EyeOff size={13} /> Tirar do site</> : <><Eye size={13} /> Mostrar no site</>}</Bt>
                  {apagando === e.id ? (
                    <><Bt cor={P.danger} onClick={async () => { setApagando(null); const { error } = await pl.apagar("sala_estrategias", e.id); ctx.avisar(error ? "Não consegui excluir." : "Estratégia excluída.", error ? "erro" : "ok"); }}>Excluir</Bt><Bt contorno onClick={() => setApagando(null)}>Não</Bt></>
                  ) : <button onClick={() => setApagando(e.id)} className="p-2" style={{ color: P.danger }} title="Excluir"><Trash2 size={14} /></button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="font-display font-bold text-sm mb-1 flex items-center gap-1.5" style={{ color: P.ink }}><Target size={15} color={P.blueHex} /> Estratégias por segmento</p>
      <p className="font-body text-xs mb-3" style={{ color: P.muted }}>Orientação de gestão, dicas, marketing e mensagem pronta para cada tipo de negócio. Use no atendimento, mande o PDF ao comerciante ou publique no site.</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {ESTRATEGIAS_SEGMENTO.map((m) => (
          <button key={m.k} onClick={() => setSegmento(m.k)} className="font-body text-xs font-bold rounded-xl px-3 py-1.5 border whitespace-nowrap"
            style={segmento === m.k ? { background: P.blueHex, color: "#fff", borderColor: P.blueHex } : { background: "#fff", color: "#425A70", borderColor: P.line }}>
            {m.emoji} {m.segmento}
          </button>
        ))}
      </div>
      {(() => {
        const m = ESTRATEGIAS_SEGMENTO.find((x) => x.k === segmento) || ESTRATEGIAS_SEGMENTO[0];
        const grupos = [["Gestão", "📋 Gestão e organização"], ["Dica", "💡 Dicas práticas"], ["Marketing", "📣 Marketing e divulgação"], ["Sala ajuda", "🤝 Como a Sala ajuda"]];
        const usada = minhas.some((e) => e.modelo === m.k && e.status !== "concluida");
        return (
          <div className="rounded-2xl border p-4 md:p-5 bg-white mb-8" style={{ borderColor: P.line }}>
            <p className="font-body text-[11px] font-bold uppercase tracking-wider" style={{ color: P.soft }}>{m.emoji} {m.segmento} · {m.quando}</p>
            <p className="font-display font-bold text-base mt-1" style={{ color: P.ink }}>{m.titulo}</p>
            <p className="font-body text-xs mt-1" style={{ color: "#425A70" }}><b>Objetivo:</b> {m.objetivo}</p>
            <p className="font-body text-xs mt-0.5" style={{ color: "#425A70" }}><b>Para quem:</b> {m.publico}</p>
            <div className="grid md:grid-cols-2 gap-3 mt-3">
              {grupos.map(([pre, rotulo]) => {
                const itens = m.passos.filter((p) => p.startsWith(pre + ":")).map((p) => p.slice(pre.length + 1).trim());
                if (!itens.length) return null;
                return (
                  <div key={pre} className="rounded-xl p-3" style={{ background: P.blueTint2 }}>
                    <p className="font-display font-bold text-xs mb-1.5" style={{ color: P.ink }}>{rotulo}</p>
                    <ul className="font-body text-xs space-y-1 list-disc pl-4" style={{ color: "#425A70" }}>{itens.map((t) => <li key={t}>{t}</li>)}</ul>
                  </div>
                );
              })}
            </div>
            {(() => {
              const o = ORIENTACAO_SEGMENTO[m.k];
              if (!o) return null;
              return (
                <div className="rounded-xl border-2 p-3 md:p-4 mt-3" style={{ borderColor: P.amber, background: "#FFFBF2" }}>
                  <p className="font-display font-bold text-sm flex items-center gap-1.5" style={{ color: P.ink }}><MessageSquare size={15} color={P.amber} /> Como orientar o empreendedor</p>
                  <p className="font-body text-[11px] mb-3" style={{ color: P.muted }}>Para o atendente: o que perguntar, como explicar em palavras simples, um exemplo com números e o que combinar.</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <p className="font-display font-bold text-xs mb-1" style={{ color: P.ink }}>1. Pergunte para entender o negócio</p>
                      <ul className="font-body text-xs space-y-1 list-disc pl-4" style={{ color: "#425A70" }}>{o.perguntas.map((t) => <li key={t}>{t}</li>)}</ul>
                    </div>
                    <div>
                      <p className="font-display font-bold text-xs mb-1" style={{ color: P.ink }}>2. Explique assim</p>
                      <ul className="font-body text-xs space-y-1.5 pl-0" style={{ color: "#425A70" }}>{o.explicar.map((t) => <li key={t} className="rounded-lg bg-white border px-2 py-1.5" style={{ borderColor: P.line }}>💬 {t.replace(/^Diga assim:\s*/, "")}</li>)}</ul>
                    </div>
                    <div>
                      <p className="font-display font-bold text-xs mb-1" style={{ color: P.ink }}>3. Mostre com números</p>
                      <p className="font-body text-xs rounded-lg bg-white border px-2 py-1.5" style={{ color: "#425A70", borderColor: P.line }}>🧮 {o.exemplo}</p>
                      <p className="font-body text-[10px] mt-1" style={{ color: P.soft }}>Troque pelos números do próprio empreendedor.</p>
                    </div>
                    <div>
                      <p className="font-display font-bold text-xs mb-1" style={{ color: P.ink }}>4. Combine a tarefa e o retorno</p>
                      <ol className="font-body text-xs space-y-1 list-decimal pl-4" style={{ color: "#425A70" }}>{o.tarefa.map((t) => <li key={t}>{t}</li>)}</ol>
                      <p className="font-body text-xs mt-1.5" style={{ color: P.ink }}>📅 <b>Retorno:</b> {o.retorno}</p>
                    </div>
                  </div>
                  <button onClick={() => setVerRoteiro((v) => !v)} className="font-body text-xs font-bold mt-3 inline-flex items-center gap-1" style={{ color: P.blueHex }}>
                    <ChevronDown size={14} style={{ transform: verRoteiro ? "rotate(180deg)" : "none" }} /> Roteiro do atendimento passo a passo (vale para todos)
                  </button>
                  {verRoteiro && (
                    <div className="mt-2 space-y-1.5">
                      {ROTEIRO_GERAL.map((r) => (
                        <div key={r.etapa} className="rounded-lg bg-white border px-3 py-2" style={{ borderColor: P.line }}>
                          <p className="font-display font-bold text-xs" style={{ color: P.ink }}>{r.etapa}</p>
                          <p className="font-body text-xs" style={{ color: "#425A70" }}>{r.texto}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <Bt contorno onClick={() => pdfRoteiro(m)}><Download size={13} /> PDF do roteiro (atendente)</Bt>
                    <Bt contorno onClick={() => { copiarTexto(textoRoteiro(m)); ctx.avisar("Roteiro copiado."); }}><Copy size={13} /> Copiar roteiro</Bt>
                  </div>
                </div>
              );
            })()}
            <div className="rounded-xl border p-3 mt-3" style={{ borderColor: P.line }}>
              <p className="font-display font-bold text-xs mb-1" style={{ color: P.ink }}>💬 Mensagem pronta para divulgar</p>
              <p className="font-body text-xs" style={{ color: "#425A70" }}>{m.mensagem}</p>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <Bt onClick={() => abrirModelo(m)}><Target size={13} /> {usada ? "Usar de novo" : "Usar esta"}</Bt>
              <Bt contorno onClick={() => pdfEstrategia(m)}><Download size={13} /> PDF para o comerciante</Bt>
              <Bt contorno onClick={() => copiar(m)}><Copy size={13} /> Copiar texto</Bt>
              <Bt contorno onClick={() => pdfPlano("Estratégias por segmento — Sala do Empreendedor", [], ESTRATEGIAS_SEGMENTO, "estrategias-por-segmento")}><Download size={13} /> PDF de todos os segmentos</Bt>
            </div>
          </div>
        );
      })()}

      <p className="font-display font-bold text-sm mb-2 flex items-center gap-1.5" style={{ color: P.ink }}><Sparkles size={15} color={P.amber} /> Estratégias prontas</p>
      <div className="grid md:grid-cols-2 gap-3">
        {MODELOS_ESTRATEGIA.map((m) => {
          const usada = minhas.some((e) => e.modelo === m.k && e.status !== "concluida");
          return (
            <div key={m.k} className="rounded-2xl border p-4 bg-white flex flex-col" style={{ borderColor: P.line }}>
              <p className="font-display font-bold text-sm" style={{ color: P.ink }}>{m.emoji} {m.titulo}</p>
              <p className="font-body text-[11px] mt-0.5" style={{ color: P.soft }}>{m.quando}</p>
              <p className="font-body text-xs mt-2 flex-1" style={{ color: "#425A70" }}>{m.objetivo}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <Bt onClick={() => abrirModelo(m)}><Target size={13} /> {usada ? "Usar de novo" : "Usar esta"}</Bt>
                <Bt contorno onClick={() => pdfEstrategia(m)}><Download size={13} /> PDF</Bt>
                <Bt contorno onClick={() => copiar(m)}><Copy size={13} /> Copiar</Bt>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// ABA: CALENDÁRIO
// =============================================================================
const EV_VAZIO = { data: "", titulo: "", descricao: "", tipo: "mutirao", publicar: true };

function itensDoPeriodo({ eventos, estrategias, ano, mes }) {
  // mes = 1..12 ou null (ano todo)
  const noPeriodo = (iso) => iso && iso.startsWith(mes ? `${ano}-${pad(mes)}` : `${ano}-`);
  const fixos = datasFixas(ano).filter((d) => noPeriodo(d.data));
  const evs = (eventos || []).filter((e) => noPeriodo(e.data)).map((e) => ({ ...e, editavel: true }));
  const ests = [];
  (estrategias || []).forEach((e) => {
    if (!e.data_inicio) return;
    if (noPeriodo(e.data_inicio)) ests.push({ data: e.data_inicio, titulo: `Início: ${e.titulo}`, descricao: e.objetivo || "", tipo: "estrategia" });
    if (e.data_fim && e.data_fim !== e.data_inicio && noPeriodo(e.data_fim)) ests.push({ data: e.data_fim, titulo: `Fim: ${e.titulo}`, descricao: "", tipo: "estrategia" });
  });
  return [...fixos, ...evs, ...ests].sort((a, b) => a.data.localeCompare(b.data));
}

export function AbaCalendario({ ctx }) {
  const pl = usePlanejamento();
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [diaSel, setDiaSel] = useState(null);
  const [apagando, setApagando] = useState(null);

  const itens = useMemo(() => itensDoPeriodo({ eventos: pl.eventos, estrategias: pl.estrategias, ano, mes }), [pl.eventos, pl.estrategias, ano, mes]);
  const ativasNoMes = (pl.estrategias || []).filter((e) => e.data_inicio && e.data_inicio <= isoDe(ano, mes, 31) && (e.data_fim || e.data_inicio) >= isoDe(ano, mes, 1));
  const primeiro = new Date(ano, mes - 1, 1).getDay();
  const diasMes = new Date(ano, mes, 0).getDate();
  const celulas = [...Array(primeiro).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)];
  const mudarMes = (n) => { let m = mes + n, a = ano; if (m < 1) { m = 12; a -= 1; } if (m > 12) { m = 1; a += 1; } setMes(m); setAno(a); setDiaSel(null); };
  const listaVisivel = diaSel ? itens.filter((i) => i.data === diaSel) : itens;

  const salvar = async (e) => {
    e.preventDefault();
    if (!form.data || !form.titulo.trim()) { ctx.avisar("Informe a data e o título.", "erro"); return; }
    const registro = { data: form.data, titulo: form.titulo.trim(), descricao: form.descricao?.trim() || null, tipo: form.tipo, publicar: !!form.publicar };
    const { error } = await pl.salvar("sala_calendario", registro, editId);
    if (error) { ctx.avisar(/relation|schema cache/i.test(error.message) ? "Falta rodar o arquivo supabase-sala-planejamento.sql no Supabase." : "Não consegui salvar: " + error.message, "erro"); return; }
    ctx.avisar(editId ? "Evento atualizado." : "Evento adicionado ao calendário.");
    setForm(null); setEditId(null);
  };
  const copiarMes = () => { copiarTexto(textoItens(`${MES_NOME[mes - 1]} de ${ano}`, itens)); ctx.avisar("Calendário do mês copiado. É só colar no site ou no WhatsApp."); };
  const pdfMes = () => pdfPlano(`Calendário — ${MES_NOME[mes - 1]} de ${ano}`, itens, ativasNoMes, `calendario-sala-${ano}-${pad(mes)}`);
  const pdfAno = () => pdfPlano(`Calendário ${ano}`, itensDoPeriodo({ eventos: pl.eventos, estrategias: pl.estrategias, ano, mes: null }), (pl.estrategias || []).filter((e) => (e.data_inicio || "").startsWith(String(ano))), `calendario-sala-${ano}`);

  return (
    <div>
      <Cab eyebrow="Planejamento" title="Calendário" sub="Prazos do MEI e datas do comércio já vêm prontos. Acrescente mutirões, cursos e avisos da Sala."
        direita={
          <div className="flex flex-wrap gap-2">
            <Bt onClick={() => { setForm({ ...EV_VAZIO, data: diaSel || isoDe(ano, mes, 1) }); setEditId(null); }}><PlusCircle size={14} /> Novo evento</Bt>
            <Bt contorno onClick={pdfMes}><Download size={14} /> PDF do mês</Bt>
            <Bt contorno onClick={pdfAno}><Download size={14} /> PDF do ano</Bt>
            <Bt contorno onClick={copiarMes}><Copy size={14} /> Copiar texto do mês</Bt>
          </div>
        } />

      {form && (
        <form onSubmit={salvar} className="rounded-2xl border p-4 bg-white grid md:grid-cols-4 gap-3 mb-5" style={{ borderColor: P.blueHex }}>
          <label className="flex flex-col gap-1"><span className="font-body text-xs font-bold">Data *</span><input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className={inputCls} style={inputStyle} /></label>
          <label className="md:col-span-2 flex flex-col gap-1"><span className="font-body text-xs font-bold">Título *</span><input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex.: Mutirão da DASN-SIMEI" className={inputCls} style={inputStyle} /></label>
          <label className="flex flex-col gap-1"><span className="font-body text-xs font-bold">Tipo</span>
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={inputCls} style={inputStyle}>
              {["mutirao", "curso", "evento", "prazo", "aviso"].map((k) => <option key={k} value={k}>{TIPOS_EVENTO[k].r}</option>)}
            </select>
          </label>
          <label className="md:col-span-3 flex flex-col gap-1"><span className="font-body text-xs font-bold">Detalhes</span><input value={form.descricao || ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Horário, local, o que levar..." className={inputCls} style={inputStyle} /></label>
          <label className="flex items-center gap-2 font-body text-sm self-end pb-2"><input type="checkbox" checked={!!form.publicar} onChange={(e) => setForm({ ...form, publicar: e.target.checked })} /> Mostrar no site</label>
          <div className="md:col-span-4 flex gap-2"><Bt type="submit"><CheckCircle2 size={14} /> Salvar</Bt><Bt contorno onClick={() => { setForm(null); setEditId(null); }}>Cancelar</Bt></div>
        </form>
      )}

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-5">
        <div className="rounded-2xl border bg-white p-4" style={{ borderColor: P.line }}>
          <div className="flex items-center justify-between mb-3">
            <Bt contorno onClick={() => mudarMes(-1)} title="Mês anterior"><ChevronLeft size={14} /></Bt>
            <p className="font-display font-extrabold text-base" style={{ color: P.ink }}>{MES_NOME[mes - 1]} {ano}</p>
            <Bt contorno onClick={() => mudarMes(1)} title="Próximo mês"><ChevronRight size={14} /></Bt>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {SEMANA.map((s) => <p key={s} className="font-body text-[10px] font-bold text-center py-1" style={{ color: P.soft }}>{s}</p>)}
            {celulas.map((d, i) => {
              if (!d) return <div key={`v${i}`} />;
              const iso = isoDe(ano, mes, d);
              const doDia = itens.filter((x) => x.data === iso);
              const sel = diaSel === iso;
              const ehHoje = iso === hojeISO();
              return (
                <button key={iso} onClick={() => setDiaSel(sel ? null : iso)} className="rounded-lg min-h-[54px] p-1 text-left border flex flex-col"
                  style={{ borderColor: sel ? P.blueHex : ehHoje ? "#F5B700" : P.line, background: sel ? P.blueTint : "#fff" }}>
                  <span className="font-body text-[11px] font-bold" style={{ color: P.ink }}>{d}</span>
                  <span className="flex flex-wrap gap-0.5 mt-auto">
                    {doDia.slice(0, 4).map((x, j) => <span key={j} className="w-2 h-2 rounded-full" style={{ background: TIPOS_EVENTO[x.tipo]?.c || P.blueHex }} title={x.titulo} />)}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {Object.entries(TIPOS_EVENTO).map(([k, v]) => <span key={k} className="font-body text-[10px] inline-flex items-center gap-1" style={{ color: P.muted }}><span className="w-2 h-2 rounded-full" style={{ background: v.c }} />{v.r}</span>)}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-display font-bold text-sm" style={{ color: P.ink }}>{diaSel ? dataBR(diaSel) : `Tudo em ${MES_NOME[mes - 1]}`} ({listaVisivel.length})</p>
            {diaSel && <button onClick={() => setDiaSel(null)} className="font-body text-xs font-bold" style={{ color: P.blue }}>ver o mês todo</button>}
          </div>
          {listaVisivel.length === 0 ? <p className="font-body text-sm" style={{ color: P.muted }}>Nada marcado.</p> : (
            <div className="flex flex-col gap-2">
              {listaVisivel.map((x, i) => {
                const t = TIPOS_EVENTO[x.tipo] || TIPOS_EVENTO.evento;
                return (
                  <div key={x.id || `${x.data}-${i}`} className="rounded-xl border p-3 bg-white flex gap-3" style={{ borderColor: P.line }}>
                    <div className="text-center shrink-0 w-10">
                      <p className="font-display font-extrabold text-lg leading-none" style={{ color: t.c }}>{x.data.slice(8)}</p>
                      <p className="font-body text-[9px] font-bold uppercase" style={{ color: P.soft }}>{SEMANA[new Date(`${x.data}T12:00:00`).getDay()]}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-body text-sm font-bold" style={{ color: P.ink }}>{x.titulo}</p>
                        <Selo texto={t.r} cor={t.c} />
                      </div>
                      {x.descricao && <p className="font-body text-xs mt-0.5" style={{ color: P.muted }}>{x.descricao}</p>}
                      {x.editavel && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="font-body text-[10px]" style={{ color: P.soft }}>{x.publicar ? "Aparece no site" : "Só para a equipe"}</span>
                          <button onClick={() => { setForm({ ...EV_VAZIO, ...x, descricao: x.descricao || "" }); setEditId(x.id); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="font-body text-[11px] font-bold" style={{ color: P.blue }}>editar</button>
                          {apagando === x.id ? (
                            <><button onClick={async () => { setApagando(null); const { error } = await pl.apagar("sala_calendario", x.id); ctx.avisar(error ? "Não consegui excluir." : "Evento excluído.", error ? "erro" : "ok"); }} className="font-body text-[11px] font-bold" style={{ color: P.danger }}>confirmar exclusão</button><button onClick={() => setApagando(null)} className="font-body text-[11px]" style={{ color: P.muted }}>não</button></>
                          ) : <button onClick={() => setApagando(x.id)} className="font-body text-[11px]" style={{ color: P.danger }}>excluir</button>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {ativasNoMes.length > 0 && (
            <div className="mt-4 rounded-xl p-3" style={{ background: "#E7F6EE" }}>
              <p className="font-body text-xs font-bold mb-1" style={{ color: P.green }}>Estratégias rodando neste mês</p>
              {ativasNoMes.map((e) => <p key={e.id} className="font-body text-xs" style={{ color: "#2F6B4E" }}>• {e.titulo} ({periodoDe(e)})</p>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PÚBLICO: agenda da Sala (próximos 60 dias) + estratégias publicadas
// =============================================================================
export function AgendaPublicaSala() {
  const [eventos, setEventos] = useState(null);
  const [estrategias, setEstrategias] = useState([]);
  useEffect(() => {
    if (!supabaseConfigurado) { setEventos(demo.eventos.filter((e) => e.publicar)); setEstrategias(demo.estrategias.filter((e) => e.publicar)); return; }
    supabase.from("sala_calendario").select("*").eq("publicar", true).gte("data", hojeISO()).order("data").limit(30).then(({ data, error }) => setEventos(error ? [] : data || []));
    supabase.from("sala_estrategias").select("*").eq("publicar", true).neq("status", "concluida").then(({ data, error }) => setEstrategias(error ? [] : data || []));
  }, []);
  const hoje = hojeISO();
  const limite = new Date(); limite.setDate(limite.getDate() + 60);
  const lim = limite.toLocaleDateString("sv-SE");
  const ano = new Date().getFullYear();
  const prazos = [...datasFixas(ano), ...datasFixas(ano + 1)].filter((d) => d.tipo === "prazo" && d.data >= hoje && d.data <= lim);
  const itens = [...(eventos || []).filter((e) => e.data <= lim), ...prazos].sort((a, b) => a.data.localeCompare(b.data)).slice(0, 8);
  if (eventos === null || (itens.length === 0 && estrategias.length === 0)) return null;
  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 mt-10">
      <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
        <div>
          <p className="font-body text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: P.blue }}>Fique de olho</p>
          <h2 className="font-display font-extrabold text-xl md:text-2xl mt-1" style={{ color: P.ink }}>Agenda da Sala</h2>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          {itens.map((x, i) => {
            const t = TIPOS_EVENTO[x.tipo] || TIPOS_EVENTO.evento;
            return (
              <div key={x.id || `${x.data}-${i}`} className="rounded-xl border p-3 bg-white flex gap-3" style={{ borderColor: P.line }}>
                <div className="text-center shrink-0 w-12 rounded-lg py-1" style={{ background: `${t.c}14` }}>
                  <p className="font-display font-extrabold text-lg leading-none" style={{ color: t.c }}>{x.data.slice(8)}</p>
                  <p className="font-body text-[9px] font-bold uppercase" style={{ color: t.c }}>{MES_NOME[Number(x.data.slice(5, 7)) - 1].slice(0, 3)}</p>
                </div>
                <div className="min-w-0">
                  <p className="font-body text-sm font-bold" style={{ color: P.ink }}>{x.titulo}</p>
                  {x.descricao && <p className="font-body text-xs" style={{ color: P.muted }}>{x.descricao}</p>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col gap-2">
          {estrategias.map((e) => (
            <div key={e.id} className="rounded-xl border p-4 bg-white" style={{ borderColor: P.line }}>
              <p className="font-body text-[10px] font-bold uppercase tracking-wide" style={{ color: P.green }}>Ação da Sala {periodoDe(e) ? `· ${periodoDe(e)}` : ""}</p>
              <p className="font-display font-bold text-sm mt-0.5" style={{ color: P.ink }}>{e.titulo}</p>
              {(e.mensagem || e.objetivo) && <p className="font-body text-xs mt-1" style={{ color: "#425A70" }}>{e.mensagem || e.objetivo}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
