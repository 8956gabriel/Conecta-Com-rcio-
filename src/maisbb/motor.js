// MAIS BB DIGITAL — regras: estratégia do dia, plano de 30 dias, indicadores,
// ranking, metas, análise inteligente e exportação. Tudo a partir de dados reais.
import { MESES, SEMANA_PADRAO, DICAS, GRUPOS, gerarMensagem, INDICADORES } from "./dados.js";

export const iso = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
export const hoje = () => iso(new Date());
export const local = (s) => new Date(`${String(s).slice(0, 10)}T12:00:00`);
export const br = (s) => (s ? String(s).slice(0, 10).split("-").reverse().join("/") : "—");
export const dias = (a, b = new Date()) => Math.round((local(iso(b)) - local(iso(a))) / 864e5);
export const SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const MES_NOME = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const soDig = (s) => String(s || "").replace(/\D/g, "");
const diaAno = (d) => Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);

export function datasDoAno(ano, cal = {}) {
  const nDom = (mes, n) => { const d = new Date(ano, mes - 1, 1); return iso(new Date(ano, mes - 1, 1 + ((7 - d.getDay()) % 7) + 7 * (n - 1))); };
  const out = [];
  MESES.forEach((m, i) => (cal.meses?.[i]?.datas || m.datas).forEach(([d, t]) => out.push({ data: d === "maes" ? nDom(5, 2) : d === "pais" ? nDom(8, 2) : `${ano}-${d}`, titulo: t })));
  for (const x of cal.extras || []) out.push({ data: `${ano}-${x.data.slice(5)}`, titulo: x.titulo, local: true });
  return out.sort((a, b) => a.data.localeCompare(b.data));
}
export const mesInfo = (i, cal = {}) => ({ ...MESES[i], ...(cal.meses?.[i] || {}) });

// ----------------------------------------------------------------- ESTRATÉGIA DO DIA
export function estrategiaDoDia(dataIso, { publicos, servicos = [], config = {}, atendente, ajustes = {} }) {
  const d = local(dataIso);
  const mi = mesInfo(d.getMonth(), config.calendario || {});
  const rot = (config.rotina || SEMANA_PADRAO)[d.getDay()] || SEMANA_PADRAO[d.getDay()];
  const ativos = publicos.filter((p) => p.ativo !== false);
  const doMes = ativos.filter((p) => p.grupo === mi.publico);
  const pool = d.getDay() === 3 ? ativos : doMes.length ? [...doMes, ...ativos.filter((p) => p.grupo !== mi.publico)] : ativos;
  const n = diaAno(d);
  const pub = pool[(d.getDay() === 3 ? n : n % Math.max(1, doMes.length || pool.length)) % pool.length];
  const servAtivos = servicos.filter((s) => s.ativo && s.confirmado);
  const serv = servAtivos.length ? servAtivos[n % servAtivos.length] : null;
  const data = datasDoAno(d.getFullYear(), config.calendario).find((x) => x.data === dataIso);
  const dica = DICAS[n % DICAS.length];
  const acoes = (rot.acoes || []).length ? [...rot.acoes].slice(0, 2) : [];
  acoes.push(`Fazer contato com ${pub?.nome.toLowerCase() || "clientes"}: ${(pub?.onde || [])[n % Math.max(1, (pub?.onde || []).length)] || "na carteira de clientes"}`);
  const base = {
    data: dataIso, descanso: d.getDay() === 0 && !data, foco: rot.foco, mesTema: mi.tema, campanha: mi.principal, comemorativa: data?.titulo || null,
    publico: pub, objetivo: `${mi.objetivo}${data ? ` · ${data.titulo}` : ""}`,
    servico: serv ? serv.nome : null,
    acoes: acoes.slice(0, 3),
    mensagem: gerarMensagem({ tipo: data ? "convite" : "primeira", estilo: "amigavel", publico: pub?.nome, servico: serv?.nome, atendente, horario: config.horario }),
    meta: `${pub?.meta ? Math.max(3, Math.round(pub.meta / 3)) : 3} contatos com ${pub?.nome.toLowerCase() || "clientes"}`,
    dica: dica[1], dicaCat: dica[0],
    proximo: { 1: "Organizar os retornos da semana na agenda", 2: "Registrar todas as visitas e agendar retornos", 3: "Enviar mensagem de acompanhamento aos contatos de hoje", 4: "Confirmar retornos de amanhã", 5: "Planejar a próxima semana", 6: "Revisar metas e o ranking", 0: "Descansar e planejar a semana" }[d.getDay()],
  };
  return { ...base, ...ajustes };
}

// ----------------------------------------------------------------- PLANO DE 30 DIAS
export function plano30(ano, mes, ctx, variacao = 0) {
  const n = new Date(ano, mes, 0).getDate();
  const out = [];
  for (let i = 1; i <= n; i++) {
    const di = `${ano}-${String(mes).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    const dw = local(di).getDay();
    if (dw === 0) continue;
    const pubs = ctx.publicos.filter((p) => p.ativo !== false);
    const pub = pubs[(i * 7 + variacao * 5 + mes) % pubs.length];
    const e = estrategiaDoDia(di, { ...ctx, ajustes: {} });
    out.push({ data: di, dia: SEMANA[dw], publico: pub, objetivo: e.foco, estrategia: (pub.onde || [])[(i + variacao) % Math.max(1, pub.onde.length)] || "Contato com a carteira",
      acao: e.acoes[(i + variacao) % e.acoes.length], mensagem: gerarMensagem({ tipo: ["primeira", "apresentacao", "divulgacao", "convite"][(i + variacao) % 4], estilo: "amigavel", publico: pub.nome, servico: e.servico, atendente: ctx.atendente, horario: ctx.config?.horario }), meta: `${2 + ((i + variacao) % 3)} contatos` });
  }
  return out;
}

// ----------------------------------------------------------------- INDICADORES
export function periodo(tipo, ref = new Date()) {
  const d = new Date(ref);
  if (tipo === "dia") return { de: iso(d), ate: iso(d) };
  if (tipo === "semana") { const i = new Date(d); i.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return { de: iso(i), ate: iso(new Date(i.getTime() + 6 * 864e5)) }; }
  if (tipo === "mes") return { de: iso(new Date(d.getFullYear(), d.getMonth(), 1)), ate: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
  return { de: `${d.getFullYear()}-01-01`, ate: `${d.getFullYear()}-12-31` };
}
export function indicadores(D, { de, ate }, user = null) {
  const em = (x) => x && String(x).slice(0, 10) >= de && String(x).slice(0, 10) <= ate;
  const meu = (x, k) => !user || x[k] === user;
  const at = D.atendimentos.filter((a) => em(a.data) && meu(a, "atendente"));
  const cli = D.clientes.filter((c) => em(c.criado_em) && meu(c, "responsavel"));
  const pr = D.prospeccoes.filter((p) => em(p.data) && meu(p, "responsavel") && p.status !== "planejada");
  const vis = D.locais.filter((l) => em(l.data_visita) && meu(l, "responsavel"));
  const ret = D.tarefas.filter((t) => t.tipo === "retorno" && t.concluida && em(t.concluida_em) && meu(t, "responsavel"));
  return {
    atendimentos: at.length, concluidos: at.filter((a) => a.resultado === "concluido").length,
    resolvidos: at.filter((a) => ["concluido", "orientado"].includes(a.resultado)).length,
    satisfacao: at.filter((a) => a.satisfacao).length ? at.reduce((s, a) => s + (a.satisfacao || 0), 0) / at.filter((a) => a.satisfacao).length : null,
    novos_clientes: cli.length, prospeccoes: pr.length, visitas: vis.length, retornos: ret.length,
    interessados: D.clientes.filter((c) => c.oportunidade === "interessado" && meu(c, "responsavel")).length,
    campanhas: D.campanhas.filter((c) => c.status === "ativa").length,
    retornosPendentes: D.tarefas.filter((t) => !t.concluida && t.tipo === "retorno" && t.data <= hoje() && meu(t, "responsavel")).length,
  };
}
export function progressoMeta(m, D, user) {
  const p = periodo(m.periodo);
  const k = indicadores(D, p, m.atendente || user);
  const val = k[m.indicador] ?? 0;
  return { valor: val, pct: Math.min(100, Math.round((100 * val) / m.alvo)), ...p };
}
export function ranking(D, membros, tipo, metas = []) {
  const p = periodo(tipo);
  const linhas = membros.filter((m) => m.ativo).map((m) => {
    const k = indicadores(D, p, m.user_id);
    const ms = metas.filter((x) => x.ativo && (!x.atendente || x.atendente === m.user_id) && (tipo === "ano" || x.periodo === (tipo === "dia" ? "dia" : tipo === "semana" ? "semana" : "mes")));
    const pct = ms.length ? Math.round(ms.reduce((s, x) => s + Math.min(100, (100 * (k[x.indicador] || 0)) / x.alvo), 0) / ms.length) : null;
    const qualidade = k.atendimentos ? Math.round((100 * k.resolvidos) / k.atendimentos) : null;
    return { ...m, ...k, pctMeta: pct, qualidade, produtividade: k.atendimentos + k.novos_clientes + k.prospeccoes + k.visitas + k.retornos };
  });
  return linhas.sort((a, b) => (b.pctMeta ?? -1) - (a.pctMeta ?? -1) || b.produtividade - a.produtividade);
}
export function pontosDe(k, pesos = {}) {
  return k.atendimentos * (pesos.atendimento || 0) + k.concluidos * (pesos.atendimento_concluido || 0) + k.novos_clientes * (pesos.novo_cliente || 0) + k.prospeccoes * (pesos.prospeccao || 0) + k.visitas * (pesos.visita || 0) + k.retornos * (pesos.retorno || 0);
}

// ----------------------------------------------------------------- ANÁLISE INTELIGENTE (regras sobre dados reais)
export function analise(D, publicos, user) {
  const out = [];
  const n = (x) => x.length;
  const p30 = { de: iso(new Date(Date.now() - 30 * 864e5)), ate: hoje() };
  const p60 = { de: iso(new Date(Date.now() - 60 * 864e5)), ate: iso(new Date(Date.now() - 31 * 864e5)) };
  const k30 = indicadores(D, p30, user), k60 = indicadores(D, p60, user);
  if (n(D.atendimentos) + n(D.clientes) + n(D.prospeccoes) < 5) out.push({ tipo: "info", t: "Ainda há poucos dados registrados", d: "Registre atendimentos, clientes e prospecções por alguns dias para as análises ficarem mais precisas." });
  const usados = new Set([...D.clientes.map((c) => c.publico), ...D.prospeccoes.map((p) => p.publico)].filter(Boolean));
  const pouco = publicos.filter((p) => !usados.has(p.chave));
  if (pouco.length && n(D.clientes) + n(D.prospeccoes) >= 5) out.push({ tipo: "oportunidade", t: `${pouco.length} públicos ainda não trabalhados`, d: pouco.slice(0, 6).map((p) => p.nome).join(", ") + (pouco.length > 6 ? "…" : ""), ir: "radar" });
  const atras = D.tarefas.filter((t) => !t.concluida && t.data < hoje());
  if (atras.length) out.push({ tipo: "alerta", t: `${atras.length} tarefa(s)/retorno(s) atrasado(s)`, d: atras.slice(0, 4).map((t) => t.titulo).join(" · "), ir: "agenda" });
  const semRet = D.clientes.filter((c) => c.proximo_contato && c.proximo_contato < hoje() && !c.nao_contatar && c.oportunidade !== "sem_interesse");
  if (semRet.length) out.push({ tipo: "alerta", t: `${semRet.length} cliente(s) aguardando retorno`, d: semRet.slice(0, 5).map((c) => c.nome.split(" ")[0]).join(", "), ir: "clientes" });
  const interess = D.clientes.filter((c) => c.oportunidade === "interessado" && !c.nao_contatar);
  if (interess.length) out.push({ tipo: "oportunidade", t: `${interess.length} cliente(s) interessado(s) para acompanhar`, d: "Faça o retorno e registre o atendimento.", ir: "clientes" });
  const aguard = D.atendimentos.filter((a) => a.resultado === "aguardando" && dias(a.data) >= 3);
  if (aguard.length) out.push({ tipo: "alerta", t: `${aguard.length} atendimento(s) aguardando retorno há 3+ dias`, d: aguard.slice(0, 4).map((a) => `#${a.numero} ${a.cliente_nome || ""}`).join(" · "), ir: "atendimentos" });
  if (!D.campanhas.some((c) => c.status === "ativa")) out.push({ tipo: "sugestao", t: "Nenhuma campanha ativa", d: "Use o calendário comercial para criar a campanha do mês.", ir: "calendario" });
  const pl = D.prospeccoes.filter((p) => p.status === "planejada" && p.data < hoje());
  if (pl.length) out.push({ tipo: "alerta", t: `${pl.length} prospecção(ões) planejada(s) sem resultado`, d: "Atualize o resultado ou reagende.", ir: "prospeccao" });
  if (k60.atendimentos >= 5) {
    const v = Math.round((100 * (k30.atendimentos - k60.atendimentos)) / k60.atendimentos);
    out.push({ tipo: v >= 0 ? "ok" : "alerta", t: `Atendimentos ${v >= 0 ? "subiram" : "caíram"} ${Math.abs(v)}% nos últimos 30 dias`, d: `${k30.atendimentos} contra ${k60.atendimentos} nos 30 dias anteriores.` });
  } else out.push({ tipo: "info", t: "Evolução da produtividade", d: "Ainda não há 60 dias de registros para comparar períodos." });
  const servs = {}; for (const a of D.atendimentos.filter((a) => a.data >= p30.de)) { const k = a.servico_texto || "Não informado"; servs[k] = (servs[k] || 0) + 1; }
  const top = Object.entries(servs).sort((a, b) => b[1] - a[1])[0];
  if (top && top[0] !== "Não informado") out.push({ tipo: "info", t: `Serviço mais procurado: ${top[0]}`, d: `${top[1]} atendimento(s) nos últimos 30 dias. Use isso nas campanhas.` });
  const loc = D.locais.filter((l) => l.status === "a_visitar");
  if (loc.length) out.push({ tipo: "sugestao", t: `${loc.length} local(is) do radar ainda não visitado(s)`, d: loc.slice(0, 4).map((l) => l.nome).join(", "), ir: "ivatuba" });
  return out;
}

// ----------------------------------------------------------------- EXPORTAÇÃO
export async function exportarExcel(arquivo, abas) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const { nome, cab, linhas } of abas) {
    const ws = XLSX.utils.aoa_to_sheet([cab, ...linhas]);
    ws["!cols"] = cab.map((h, i) => ({ wch: Math.min(45, Math.max(String(h).length, ...linhas.map((l) => String(l[i] ?? "").length)) + 2) }));
    XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 31));
  }
  XLSX.writeFile(wb, `${arquivo}.xlsx`);
}
export async function exportarPDF(arquivo, titulo, secoes, rodape = "", orientacao = "landscape") {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: orientacao });
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(11, 31, 68); doc.rect(0, 0, W, 22, "F");
  doc.setFillColor(249, 209, 11); doc.rect(0, 22, W, 1.5, "F");
  doc.setTextColor(255); doc.setFontSize(14); doc.text(titulo, 12, 13);
  doc.setFontSize(8.5); doc.text(`Mais BB Digital · Ivatuba-PR · gerado em ${new Date().toLocaleString("pt-BR")}`, 12, 19);
  let y = 32; doc.setTextColor(14, 34, 51);
  for (const s of secoes) {
    if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 16; }
    if (s.texto) { doc.setFontSize(10); const l = doc.splitTextToSize(s.texto, W - 24); doc.text(l, 12, y); y += l.length * 5 + 4; continue; }
    doc.setFontSize(12); doc.text(s.titulo, 12, y); y += 3;
    autoTable(doc, { startY: y, head: [s.cab], body: s.linhas.length ? s.linhas : [["Sem dados no período"]], styles: { fontSize: 8.5 }, headStyles: { fillColor: [11, 31, 68] }, alternateRowStyles: { fillColor: [245, 247, 250] }, margin: { left: 12, right: 12 } });
    y = doc.lastAutoTable.finalY + 10;
  }
  if (rodape) { doc.setFontSize(7.5); doc.setTextColor(92, 113, 134); doc.text(doc.splitTextToSize(rodape, W - 24), 12, doc.internal.pageSize.getHeight() - 10); }
  doc.save(`${arquivo}.pdf`);
}
export { INDICADORES, GRUPOS };
