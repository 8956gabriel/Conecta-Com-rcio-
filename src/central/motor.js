// =============================================================================
// CENTRAL DE PROSPECÇÃO — regras: calendário, radar, simulador, campanhas,
// indicadores e exportação. Tudo calculado a partir dos dados reais do banco.
// =============================================================================
import { MESES, ROTINA_PADRAO, atividadePorChave, datasComemorativas, montarMensagem, ESTRATEGIA_LINHAS, CATEGORIAS, FUNIL } from "./dados.js";

export const hojeISO = () => isoData(new Date());
export function isoData(d) { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; }
export const dataLocal = (iso) => new Date(`${String(iso).slice(0, 10)}T12:00:00`);
export const dataBR = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "—");
export const diasEntre = (a, b = new Date()) => Math.floor((dataLocal(isoData(b)) - dataLocal(isoData(a))) / 864e5);
export const SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const MES_NOME = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const moeda = (v) => (v == null || v === "" || isNaN(Number(v)) ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
export const soDigitos = (s) => String(s || "").replace(/\D/g, "");
export const zap = (s) => soDigitos(s).slice(-11);

export function linhaPorSlug(linhas, slug) { return (linhas || []).find((l) => l.slug === slug); }
export function linhasSugeridas(linhas, slugs = []) {
  return slugs.map((s) => linhaPorSlug(linhas, s)).filter((l) => l && l.ativo !== false);
}

// ----------------------------------------------------------------------------- CALENDÁRIO
function diaDoAno(d) { return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5); }

export function gerarDia(iso, { linhas = [], agente = "", rotina = ROTINA_PADRAO, datasLocais = [], ajustes = {} } = {}) {
  const d = dataLocal(iso);
  const mes = MESES[d.getMonth()];
  const semIdx = Math.min(3, Math.floor((d.getDate() - 1) / 7));
  const [campanha, ativs] = mes.semanas[semIdx];
  const dy = diaDoAno(d);
  const comemorativas = datasComemorativas(d.getFullYear());
  const hojeCom = comemorativas.find((c) => c.data === iso);
  const locais = datasLocais.filter((x) => (x.repete_todo_ano ? x.data.slice(5) === iso.slice(5) : x.data === iso));
  const proxima = comemorativas.find((c) => { const n = diasEntre(iso, c.data); return n >= 30 && n <= 60; });
  const chaveAtiv = (hojeCom?.seg || ativs)[dy % 3];
  const at = atividadePorChave[chaveAtiv];
  const nInv = Math.floor(dy / 3) % at.i.length;
  const inv = at.i[nInv];
  const r = rotina[d.getDay()] || ROTINA_PADRAO[d.getDay()];
  const linhasAt = linhasSugeridas(linhas, at.l);
  const linhaNome = linhasAt[0]?.nome || "Linha a definir (confira as linhas cadastradas)";
  const fimDeSemana = d.getDay() === 0 || d.getDay() === 6;
  const descanso = d.getDay() === 0 && !hojeCom && !locais.length;

  let tema = `${campanha}: ${inv} para ${at.a.toLowerCase()}`;
  if (hojeCom) tema = `${hojeCom.titulo}: ${hojeCom.ideia}`;
  if (locais.length) tema = `${locais.map((l) => l.titulo).join(" · ")}: ação comercial no evento local`;

  const base = {
    data: iso, mesTema: mes.tema, campanha, comemorativa: hojeCom?.titulo || null, locais: locais.map((l) => l.titulo),
    preparacao: proxima ? `Faltam ${diasEntre(iso, proxima.data)} dias para ${proxima.titulo}: ${proxima.ideia}` : null,
    descanso, fimDeSemana, foco: r.foco, ideiaChave: `${at.k}-${nInv}`, ativ: at.k, categoria: at.c,
    tema,
    segmento: at.a,
    perfil: at.p,
    onde: at.o,
    necessidades: at.n,
    investimentos: [inv, ...at.i.filter((x) => x !== inv).slice((dy % 4), (dy % 4) + 3)],
    linha: linhaNome,
    linhaIds: linhasAt.map((l) => l.id),
    estrategia: `${r.foco}. ${at.e}`,
    roteiro: [
      `Abertura: apresente-se como Agente de Crédito da Fomento Paraná em Ivatuba e diga que está conversando com ${at.a.toLowerCase()} da cidade.`,
      `Escuta: pergunte como está o negócio e qual investimento está sendo adiado (ex.: ${inv.toLowerCase()}).`,
      `Diagnóstico: use as perguntas abaixo; anote valor pretendido, tempo de atividade e faturamento informado.`,
      `Apresentação: mostre a(s) linha(s) potencialmente adequada(s) (${linhaNome}) com as condições oficiais cadastradas — sem prometer aprovação.`,
      `Fechamento: combine o próximo passo (orçamento, documentos ou visita) e registre na carteira.`,
    ],
    mensagem: montarMensagem("whatsapp", { categoria: at.c, atividade: at.a, investimento: inv, agente }),
    perguntas: at.q,
    meta: descanso ? "Dia de descanso" : r.meta,
    proximaAcao: descanso ? "Planejar a semana" : ({
      1: "Agendar visitas de terça com os novos contatos",
      2: "Registrar resultados das visitas e marcar diagnósticos",
      3: "Pedir orçamentos e lista de documentos aos qualificados",
      4: "Encaminhar propostas completas e cobrar pendências",
      5: "Retornar interessados e revisar metas da semana",
      6: "Cadastrar contatos captados no evento/feira",
      0: "Planejar a semana",
    })[d.getDay()],
  };
  return { ...base, ...(ajustes || {}), editado: Object.keys(ajustes || {}).length > 0 };
}

export function diasDoMes(ano, mes) { // mes 1..12
  const n = new Date(ano, mes, 0).getDate();
  return Array.from({ length: n }, (_, i) => `${ano}-${String(mes).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`);
}

// ----------------------------------------------------------------------------- RADAR
const PRIOR = { alta: 3, media: 2, baixa: 1 };
export function radar({ clientes = [], propostas = [], interesses = [], visitas = [] }) {
  const hoje = new Date();
  const itens = [];
  const add = (grupo, prioridade, ref, motivo, acao) => itens.push({ grupo, prioridade, ...ref, motivo, acao });
  const ativos = clientes.filter((c) => c.status !== "perdido");
  const temVisitaFutura = new Set(visitas.filter((v) => v.status === "agendada" && new Date(v.data_hora) >= hoje).map((v) => v.cliente_id));

  for (const c of ativos) {
    const ref = { tipo: "cliente", id: c.id, nome: c.nome, sub: c.atividade || c.empresa || "" };
    const semContato = c.ultimo_contato ? diasEntre(c.ultimo_contato) : null;
    if (!c.ultimo_contato && !["aprovado", "contratado", "liberado"].includes(c.status)) {
      add("nunca", diasEntre(c.criado_em) > 3 ? "alta" : "media", ref, `Cadastrado há ${diasEntre(c.criado_em)} dia(s) e nunca recebeu contato.`, "Fazer o primeiro contato (WhatsApp ou visita).");
    }
    if (c.proximo_contato && c.proximo_contato < isoData(hoje) && !temVisitaFutura.has(c.id) && !["liberado"].includes(c.status)) {
      add("sem_retorno", "alta", ref, `Retorno combinado para ${dataBR(c.proximo_contato)} (atrasado ${diasEntre(c.proximo_contato)} dia(s)).`, "Retomar o contato hoje e registrar o atendimento.");
    }
    if (["interessado", "qualificado"].includes(c.status) && (semContato == null || semContato >= 7)) {
      add("interessados", c.status === "qualificado" ? "alta" : "media", ref, `${c.status === "qualificado" ? "Qualificado" : "Interessado"} sem contato ${semContato == null ? "registrado" : `há ${semContato} dias`}.`, c.status === "qualificado" ? "Pedir orçamento e documentos para montar a proposta." : "Fazer o diagnóstico e qualificar.");
    }
    if (c.status === "documentacao") add("documentacao", "alta", ref, "Documentação pendente.", "Enviar lista do que falta e oferecer ajuda.");
    if (c.status === "liberado" && c.atualizado_em && diasEntre(c.atualizado_em) >= 180) add("novos", "baixa", ref, `Crédito liberado há ${Math.round(diasEntre(c.atualizado_em) / 30)} meses.`, "Pós-atendimento: ver resultado e nova necessidade; pedir indicações.");
  }
  for (const c of clientes.filter((x) => x.status === "perdido" && x.atualizado_em && diasEntre(x.atualizado_em) >= 60 && diasEntre(x.atualizado_em) <= 365)) {
    add("desistentes", "baixa", { tipo: "cliente", id: c.id, nome: c.nome, sub: c.motivo_perda || "" }, `Desistiu há ${Math.round(diasEntre(c.atualizado_em) / 30)} meses${c.motivo_perda ? ` (${c.motivo_perda})` : ""}.`, "Mensagem de recuperação: o momento pode ter mudado.");
  }
  for (const p of propostas.filter((x) => !["concedido", "negado", "excluido"].includes(x.status))) {
    const ref = { tipo: "proposta", id: p.id, nome: p.nome, sub: p.numero || "" };
    const parado = diasEntre(p.atualizado_em || p.criado_em);
    if (parado >= 15) add("paradas", parado >= 30 ? "alta" : "media", ref, `Proposta sem atualização há ${parado} dias.`, "Verificar a situação e cobrar o próximo passo.");
    if (["novo", "em_contato", "documentacao"].includes(p.status) && !p.orcamentos) add("orcamentos", "media", ref, "Proposta ainda sem orçamento registrado.", "Pedir orçamento do fornecedor ao cliente.");
    if (p.pendencias) add("documentacao", "alta", ref, `Pendências: ${p.pendencias}`, "Resolver as pendências com o cliente.");
  }
  for (const p of propostas.filter((x) => x.status === "concedido" && !x.data_liberacao && diasEntre(x.data_decisao || x.atualizado_em) >= 7)) {
    add("paradas", "alta", { tipo: "proposta", id: p.id, nome: p.nome, sub: p.numero || "" }, `Aprovada há ${diasEntre(p.data_decisao || p.atualizado_em)} dias e ainda sem liberação registrada.`, "Confirmar contratação e liberação do crédito.");
  }
  for (const i of interesses.filter((x) => x.status === "novo")) {
    add("nunca", diasEntre(i.criado_em) >= 1 ? "alta" : "media", { tipo: "interesse", id: i.id, nome: i.nome, sub: "Pré-cadastro do site" }, `Pediu contato pelo site há ${diasEntre(i.criado_em)} dia(s).`, "Responder no WhatsApp e trazer para a carteira.");
  }
  return itens.sort((a, b) => PRIOR[b.prioridade] - PRIOR[a.prioridade]);
}
export const GRUPOS_RADAR = {
  nunca: "Nunca receberam contato", sem_retorno: "Sem retorno (contato atrasado)", interessados: "Interessados esfriando",
  documentacao: "Documentação incompleta", orcamentos: "Orçamentos pendentes", paradas: "Propostas paradas",
  desistentes: "Desistentes para recuperar", novos: "Oportunidades de novo investimento",
};

// ----------------------------------------------------------------------------- SIMULADOR DE OPORTUNIDADES
export function analisarOportunidade(f, linhas) {
  const valor = Number(f.valor) || 0;
  const cands = new Map();
  const add = (slug, motivo) => { const l = linhaPorSlug(linhas, slug); if (!l || l.ativo === false) return; const c = cands.get(l.id) || { linha: l, motivos: [] }; c.motivos.push(motivo); cands.set(l.id, c); };
  const rural = ["agro"].includes(f.categoria) || /rural|agri|produtor|leite|gado|horta/i.test(f.negocio || "");
  if (f.mulher && rural) add("micro-mulher-rural", "Mulher empreendedora em atividade rural");
  if (rural) add("micro-rural", "Atividade do meio rural");
  if (f.mulher && !rural) add("micro-mulher", "Mulher empreendedora");
  if (!rural && ["informal", "mei", "me"].includes(f.porte)) add("micro-facil", "Pequeno negócio (MEI/micro/informal)");
  if (f.cnpj && /giro|estoque|capital/i.test(`${f.objetivo} ${f.investimento}`)) add("giro-facil", "Empresa com CNPJ buscando capital de giro");
  if (f.cnpj && !cands.size) add("giro-facil", "Empresa com CNPJ");
  if (/turis|pousada|hotel|passeio/i.test(f.negocio || "")) add("fungetur", "Atividade de turismo (confirmar Cadastur)");
  if (/t[aá]xi/i.test(f.negocio || "")) add(f.mulher ? "taxista-mulher" : "taxista", "Taxista (confirmar permissão)");
  if (/emerg|calamidade|enchente|vendaval|granizo/i.test(`${f.objetivo} ${f.observacao}`)) add("micro-emergencial", "Evento adverso (confirmar decreto de emergência)");
  if (/d[ií]vida|recuper|reorganiz/i.test(`${f.objetivo} ${f.observacao}`)) add("recupera-micro", "Reorganização do negócio");
  if (f.linhaId) { const l = linhas.find((x) => x.id === f.linhaId); if (l) { const c = cands.get(l.id) || { linha: l, motivos: [] }; c.motivos.unshift("Linha considerada pelo agente"); cands.set(l.id, c); } }
  if (!cands.size) add("micro-facil", "Linha de microcrédito mais ampla (confirmar perfil)");

  const resultado = [...cands.values()].map(({ linha, motivos }) => {
    const alertas = [];
    if (linha.valor_min && valor && valor < Number(linha.valor_min)) alertas.push(`Valor abaixo do mínimo cadastrado (${moeda(linha.valor_min)}).`);
    if (linha.valor_max && valor > Number(linha.valor_max)) alertas.push(`Valor acima do máximo cadastrado (${moeda(linha.valor_max)}).`);
    if (!linha.valores && !linha.valor_max) alertas.push("Condições oficiais desta linha ainda não cadastradas no sistema.");
    return { linha, motivos, alertas };
  });

  const confirmar = [
    "Elegibilidade conforme regras oficiais vigentes da linha",
    "Situação cadastral do empreendedor (CPF/CNPJ)",
    f.tempo ? `Tempo de atividade informado: ${f.tempo} meses — confirmar comprovação` : "Tempo de atividade e como comprovar",
    f.faturamento ? `Faturamento informado: ${moeda(f.faturamento)}/mês — confirmar comprovação` : "Faturamento mensal e como comprovar",
    "Orçamento(s) do investimento pretendido",
  ];
  const capacidade = Number(f.capacidade) || 0;
  if (capacidade && valor) confirmar.push(`Capacidade de pagamento informada: ${moeda(capacidade)}/mês — a parcela real depende da análise e das condições oficiais`);
  const perguntas = [
    "O investimento vai aumentar vendas, reduzir custos ou as duas coisas? Quanto?",
    "Já tem orçamento do fornecedor? Quantos?",
    "Tem outras dívidas ou parcelas hoje?",
    "Quem decide junto com você sobre o investimento?",
    "Em quanto tempo o investimento começa a dar retorno?",
  ];
  const docs = [...new Set(resultado.flatMap((r) => r.linha.documentos || []))];
  return { resultado, confirmar, perguntas, docs };
}

// ----------------------------------------------------------------------------- CAMPANHA (modelo automático)
export function campanhaModelo({ tema, ativ, linha, inicio, agente }) {
  const at = atividadePorChave[ativ] || atividadePorChave.autonomos;
  const nomeLinha = linha?.nome || "linhas da Fomento Paraná";
  const ini = inicio || hojeISO();
  const fim = isoData(new Date(dataLocal(ini).getTime() + 27 * 864e5));
  return {
    nome: tema || `${at.a}: crédito para crescer`,
    objetivo: `Encontrar e qualificar ${at.a.toLowerCase()} de Ivatuba e região com necessidade de investimento, gerando propostas para ${nomeLinha}.`,
    publico: at.p,
    segmento: at.a,
    linha_id: linha?.id || null,
    inicio: ini, fim,
    estrategia: `${at.e}\nOnde encontrar: ${at.o}`,
    plano_visitas: `Semana 1: levantar e cadastrar pelo menos 15 ${at.a.toLowerCase()} na carteira.\nSemana 2: visitar 10 deles com diagnóstico.\nSemana 3: pedir orçamentos/documentos dos qualificados.\nSemana 4: encaminhar propostas e retornar os interessados.`,
    roteiro: `1) Apresentação como Agente de Crédito da Fomento Paraná.\n2) Perguntas: ${at.q.join(" / ")}\n3) Oportunidades: ${at.i.slice(0, 5).join(", ")}.\n4) Apresentar ${nomeLinha} com as condições oficiais cadastradas, sem prometer aprovação.\n5) Combinar próximo passo.`,
    mensagens_whatsapp: [montarMensagem("primeiro", { categoria: at.c, atividade: at.a, investimento: at.i[0], agente }), montarMensagem("recuperar", { categoria: at.c, investimento: at.i[1] })].join("\n\n---\n\n"),
    textos_redes: `📣 ${at.a} de Ivatuba: quer investir em ${at.i[0].toLowerCase()} ou ${at.i[1].toLowerCase()}?\nA Fomento Paraná, agência de crédito do Governo do Paraná, tem linhas para pequenos negócios. Fale com o Agente de Crédito na Sala do Empreendedor de Ivatuba. 💙\n*Sujeito à análise de crédito.*`,
    ideias_artes: `• Foto real de um(a) ${at.a.toLowerCase().replace(/s$/, "")} da cidade (com autorização) + frase "Seu negócio pode crescer"\n• Card com 3 exemplos: ${at.i.slice(0, 3).join(", ")}\n• Story com enquete: "Qual investimento seu negócio precisa?"`,
    calendario: `Seg: post no feed · Ter: story com enquete · Qua: mensagem nos grupos · Qui: vídeo curto do agente · Sex: depoimento (se autorizado)`,
    metas: "Cadastrar 15 empreendedores · 10 visitas · 5 diagnósticos · 3 propostas encaminhadas",
    meta_clientes: 15, meta_propostas: 3,
  };
}

// ----------------------------------------------------------------------------- INDICADORES
export function indicadores({ clientes = [], atendimentos = [], visitas = [], propostas = [], interesses = [] }, { de, ate } = {}) {
  const dentro = (d) => d && (!de || String(d).slice(0, 10) >= de) && (!ate || String(d).slice(0, 10) <= ate);
  const pv = propostas.filter((p) => p.status !== "excluido");
  const mesAtual = hojeISO().slice(0, 7);
  const idx = (s) => FUNIL.indexOf(s);
  return {
    totalClientes: clientes.length,
    novosMes: clientes.filter((c) => String(c.criado_em).slice(0, 7) === mesAtual).length,
    novosPeriodo: clientes.filter((c) => dentro(c.criado_em)).length,
    prospectados: clientes.filter((c) => c.ultimo_contato || idx(c.status) >= 1).length,
    visitas: atendimentos.filter((a) => ["visita", "presencial", "diagnostico"].includes(a.tipo) && dentro(a.data)).length,
    atendimentos: atendimentos.filter((a) => dentro(a.data)).length,
    interessados: clientes.filter((c) => idx(c.status) >= idx("interessado")).length,
    qualificados: clientes.filter((c) => idx(c.status) >= idx("qualificado")).length,
    propostasIniciadas: pv.filter((p) => dentro(p.data_proposta || p.criado_em)).length,
    propostasEncaminhadas: pv.filter((p) => (p.data_encaminhamento && dentro(p.data_encaminhamento)) || (!p.data_encaminhamento && ["em_analise", "concedido", "negado"].includes(p.status) && dentro(p.data_proposta))).length,
    aprovadas: pv.filter((p) => p.status === "concedido" && dentro(p.data_decisao || p.atualizado_em)).length,
    negadas: pv.filter((p) => p.status === "negado" && dentro(p.data_decisao || p.atualizado_em)).length,
    contratos: pv.filter((p) => p.data_contratacao && dentro(p.data_contratacao)).length,
    liberados: pv.filter((p) => p.data_liberacao && dentro(p.data_liberacao)).length,
    valorSolicitado: soma(pv.filter((p) => dentro(p.data_proposta || p.criado_em)), "valor_solicitado"),
    valorAprovado: pv.filter((p) => p.status === "concedido" && dentro(p.data_decisao || p.atualizado_em)).reduce((s, p) => s + Number(p.valor_aprovado ?? p.valor_concedido ?? p.valor_solicitado ?? 0), 0),
    valorContratado: soma(pv.filter((p) => p.data_contratacao && dentro(p.data_contratacao)), "valor_contratado"),
    valorLiberado: soma(pv.filter((p) => p.data_liberacao && dentro(p.data_liberacao)), "valor_liberado"),
    interessesSite: interesses.filter((i) => dentro(i.criado_em)).length,
  };
}
const soma = (arr, k) => arr.reduce((s, x) => s + Number(x[k] || 0), 0);

export function serieMensal(dados, ano) {
  return MES_NOME.map((nome, i) => {
    const m = `${ano}-${String(i + 1).padStart(2, "0")}`;
    const de = `${m}-01`, ate = `${m}-31`;
    const k = indicadores(dados, { de, ate });
    return { mes: nome.slice(0, 3), novos: k.novosPeriodo, atendimentos: k.atendimentos, propostas: k.propostasIniciadas, aprovadas: k.aprovadas, liberados: k.liberados, valorLiberado: k.valorLiberado, valorSolicitado: k.valorSolicitado };
  });
}

export function metaRealizado(meta, dados, hoje = new Date()) {
  const ini = new Date(hoje);
  if (meta.periodo === "semana") ini.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
  if (meta.periodo === "mes") ini.setDate(1);
  const de = isoData(ini), ate = isoData(hoje);
  const k = indicadores(dados, { de, ate });
  const val = {
    novos_clientes: k.novosPeriodo, contatos: k.atendimentos, visitas: k.visitas,
    diagnosticos: (dados.atendimentos || []).filter((a) => a.tipo === "diagnostico" && String(a.data).slice(0, 10) >= de && String(a.data).slice(0, 10) <= ate).length,
    propostas: k.propostasIniciadas, aprovacoes: k.aprovadas, contratos: k.contratos, valor_liberado: k.valorLiberado,
  }[meta.indicador] || 0;
  return { realizado: val, pct: meta.alvo ? Math.min(100, Math.round((100 * val) / Number(meta.alvo))) : 0, de, ate };
}
export const INDICADORES_META = { novos_clientes: "Novos clientes", contatos: "Contatos/atendimentos", visitas: "Visitas", diagnosticos: "Diagnósticos", propostas: "Propostas", aprovacoes: "Aprovações", contratos: "Contratos", valor_liberado: "Valor liberado (R$)" };

export function agrupar(lista, chave) {
  const m = new Map();
  for (const x of lista) { const k = typeof chave === "function" ? chave(x) : x[chave]; const key = k || "Não informado"; m.set(key, (m.get(key) || 0) + 1); }
  return [...m.entries()].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total);
}
export const nomeCategoria = (c) => CATEGORIAS[c]?.nome || "Não informado";
export { ESTRATEGIA_LINHAS };

// ----------------------------------------------------------------------------- EXPORTAÇÃO
export async function exportarExcel(nomeArquivo, abas) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const { nome, cabecalho, linhas } of abas) {
    const ws = XLSX.utils.aoa_to_sheet([cabecalho, ...linhas]);
    ws["!cols"] = cabecalho.map((h, i) => ({ wch: Math.min(45, Math.max(String(h).length, ...linhas.map((l) => String(l[i] ?? "").length)) + 2) }));
    XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 31));
  }
  XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
}
export async function exportarPDF(nomeArquivo, titulo, secoes, rodape = "", subtitulo = "Fomento Paraná · Agente de Crédito Ivatuba", corRGB = [10, 90, 168]) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFillColor(...corRGB); doc.rect(0, 0, 297, 22, "F");
  doc.setTextColor(255); doc.setFontSize(15); doc.text(titulo, 12, 14);
  doc.setFontSize(9); doc.text(`${subtitulo} · gerado em ${new Date().toLocaleString("pt-BR")}`, 12, 19.5);
  let y = 30;
  doc.setTextColor(14, 34, 51);
  for (const s of secoes) {
    if (y > 180) { doc.addPage(); y = 16; }
    doc.setFontSize(12); doc.text(s.titulo, 12, y); y += 3;
    autoTable(doc, { startY: y, head: [s.cabecalho], body: s.linhas, styles: { fontSize: 8.5 }, headStyles: { fillColor: corRGB }, alternateRowStyles: { fillColor: [245, 249, 253] }, margin: { left: 12, right: 12 } });
    y = doc.lastAutoTable.finalY + 10;
  }
  if (rodape) { doc.setFontSize(8); doc.setTextColor(92, 113, 134); doc.text(rodape, 12, 203); }
  doc.save(`${nomeArquivo}.pdf`);
}
