// =============================================================================
// RETROSPECTIVA — tudo o que foi feito no Conecta, na Sala e na Fomento
// Escolhe o período (ano, mês ou datas) e mostra: grandes números, cada
// ambiente separado, mês a mês, a agenda completa (eventos, cursos,
// mutirões, campanhas) e as notícias. Baixa em PDF (para apresentar ou
// imprimir) e Excel. Os dados vêm da função central_retrospectiva.
// =============================================================================
import React, { useEffect, useState } from "react";
import { CalendarDays, FileText, FileSpreadsheet, Loader2, RefreshCw, Store, Landmark, Briefcase, Sparkles, Newspaper } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { supabase, supabaseConfigurado } from "../supabaseClient";

const INK = "#0E2233", MUTED = "#5C7186", LINHA = "#DCE7F2";
const COR = { conecta: "#0A5AA8", sala: "#E07B45", fomento: "#1E8E5A" };
const NOME = { conecta: "Conecta Comércio", sala: "Sala do Empreendedor", fomento: "Fomento Paraná" };
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGO = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const TIPO = { evento: "Evento", curso: "Curso / capacitação", mutirao: "Mutirão", prazo: "Prazo", aviso: "Aviso", campanha: "Campanha", "estratégia": "Ação", feira: "Feira", palestra: "Palestra", festa: "Festa", institucional: "Institucional", outro: "Evento" };
const STATUS_FOMENTO = { novo: "Novos", em_contato: "Em contato", documentacao: "Documentação", em_analise: "Em análise", concedido: "Concedidos", negado: "Negados" };

const n = (v) => Number(v || 0).toLocaleString("pt-BR");
const brl = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const dt = (v) => (v ? new Date(`${String(v).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "");
const hojeISO = () => new Date().toLocaleDateString("sv-SE");
const ANO = new Date().getFullYear();

function periodoDe(modo, ano, mes, ini, fim) {
  if (modo === "mes") {
    const u = new Date(ano, mes + 1, 0).getDate();
    return [`${ano}-${String(mes + 1).padStart(2, "0")}-01`, `${ano}-${String(mes + 1).padStart(2, "0")}-${u}`];
  }
  if (modo === "datas") return [ini, fim];
  return [`${ano}-01-01`, ano === ANO ? hojeISO() : `${ano}-12-31`];
}
const tituloPeriodo = (modo, ano, mes, ini, fim) =>
  modo === "mes" ? `${MESES_LONGO[mes]} de ${ano}` : modo === "datas" ? `${dt(ini)} a ${dt(fim)}` : `${ano}`;

// Linhas de cada ambiente: [rótulo, valor] (mesma lista na tela, no PDF e no Excel)
function linhas(r) {
  const c = r.conecta || {}, s = r.sala || {}, f = r.fomento || {};
  return {
    conecta: [
      ["Visitas ao site", n(c.visitas)],
      ["Novos usuários cadastrados", n(c.novos_usuarios)],
      ["Empresas novas", n(c.empresas_novas)],
      ["Empresas aprovadas (total hoje)", n(c.empresas_aprovadas_total)],
      ["Prestadores de serviço novos", n(c.prestadores_novos)],
      ["Produtos cadastrados", n(c.produtos_novos)],
      ["Promoções", n(c.promocoes)],
      ["Vagas de emprego", n(c.vagas)],
      ["Candidaturas às vagas", n(c.candidaturas)],
      ["Eventos realizados", n(c.eventos)],
      ["Participantes inscritos nos eventos", n(c.participantes_eventos)],
      ["Compareceram aos eventos", n(c.compareceram_eventos)],
      ["Cursos e palestras", n(c.cursos)],
      ["Inscrições nos cursos", n(c.inscricoes_cursos)],
      ["Presenças nos cursos", n(c.presencas_cursos)],
      ["Feirantes cadastrados", n(c.feirantes)],
      ["Notícias publicadas", n(c.noticias)],
      ["Enquetes / votações", n(c.enquetes)],
      ["Votos recebidos", n(c.votos)],
      ["Avaliações de clientes", `${n(c.avaliacoes)}${c.nota_media ? ` (nota média ${Number(c.nota_media).toLocaleString("pt-BR")})` : ""}`],
      ["Manifestações na ouvidoria", `${n(c.ouvidoria)} (${n(c.ouvidoria_respondidas)} respondidas)`],
      ["Classificados", n(c.classificados)],
      ["Recados no mural", n(c.mural)],
      ["Licitações divulgadas", n(c.licitacoes)],
    ],
    sala: [
      ["Atendimentos", n(s.atendimentos)],
      ["Pedidos de atendimento pelo site", `${n(s.pedidos_site)} (${n(s.pedidos_atendidos)} atendidos)`],
      ["Compromissos na agenda (eventos, mutirões, cursos, prazos)", n(s.agenda)],
      ["Ações e estratégias", `${n(s.estrategias)} (${n(s.estrategias_concluidas)} concluídas)`],
      ["Orientações publicadas", n(s.orientacoes)],
      ["Documentos guardados", n(s.documentos)],
      ["Selo Sebrae: critérios concluídos", `${n(s.selo_concluidos)} de ${n(s.selo_total)}`],
      ["Empresas ativas na base da cidade", n(s.empresas_base)],
    ],
    fomento: [
      ["Propostas de crédito", n(f.propostas)],
      ["Propostas concedidas", n(f.concedidas)],
      ["Valor solicitado", brl(f.valor_solicitado)],
      ["Valor concedido / contratado", brl(f.valor_concedido)],
      ["Valor liberado", brl(f.valor_liberado)],
      ["Interessados pelo site", n(f.interesses_site)],
      ["Clientes novos na carteira", n(f.clientes_novos)],
      ["Visitas a empresas realizadas", `${n(f.visitas_realizadas)} de ${n(f.visitas_agendadas)} agendadas`],
      ["Atendimentos registrados", n(f.atendimentos)],
      ["Campanhas", n(f.campanhas)],
      ["Compromissos na agenda", `${n(f.compromissos)} (${n(f.compromissos_feitos)} concluídos)`],
      ["Pontos no período", n(f.pontos)],
      ...(f.ranking ? [["Ranking estadual (última posição)", `${f.ranking.posicao}º de ${n(f.ranking.total)} (${dt(f.ranking.data)})`]] : []),
    ],
  };
}

const limpar = (t) => String(t ?? "").replace(/[→]/g, "->").replace(/[·•]/g, "-").split("").filter((c) => c.charCodeAt(0) <= 0xff || "“”‘’–—…".includes(c)).join("");

async function baixarPDF(r, titulo) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const L = linhas(r);
  doc.setFillColor(14, 34, 51); doc.rect(0, 0, W, 30, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.text(limpar(`Retrospectiva ${titulo}`), 12, 14);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  doc.text(limpar(`Conecta Comércio | Sala do Empreendedor | Fomento Paraná - Ivatuba-PR | ${dt(r.inicio)} a ${dt(r.fim)}`), 12, 22);
  let y = 38;
  const cores = { conecta: [10, 90, 168], sala: [224, 123, 69], fomento: [30, 142, 90] };
  for (const amb of ["conecta", "sala", "fomento"]) {
    autoTable(doc, { startY: y, head: [[limpar(NOME[amb]), ""]], body: L[amb].map(([a, b]) => [limpar(a), limpar(b)]), styles: { fontSize: 9 },
      headStyles: { fillColor: cores[amb] }, columnStyles: { 1: { halign: "right", fontStyle: "bold" } }, margin: { left: 12, right: 12 } });
    y = doc.lastAutoTable.finalY + 6;
  }
  autoTable(doc, { startY: y, head: [["Mês", "Visitas", "Atend. Sala", "Propostas", "Eventos e cursos", "Empresas novas"]],
    body: (r.meses || []).map((m) => [`${MESES[Number(m.mes.slice(5)) - 1]}/${m.mes.slice(0, 4)}`, n(m.visitas), n(m.atendimentos_sala), n(m.propostas), n(m.eventos_cursos), n(m.empresas)]),
    styles: { fontSize: 8.5 }, headStyles: { fillColor: [14, 34, 51] }, margin: { left: 12, right: 12 } });
  y = doc.lastAutoTable.finalY + 6;
  if ((r.agenda || []).length) {
    autoTable(doc, { startY: y, head: [["Data", "Agenda: o que aconteceu", "Onde", "Tipo", "Público"]],
      body: r.agenda.map((a) => [dt(a.data), limpar(a.titulo), limpar(NOME[a.ambiente]), limpar(TIPO[a.tipo] || a.tipo), a.publico ? n(a.publico) : ""]),
      styles: { fontSize: 8 }, headStyles: { fillColor: [14, 34, 51] }, alternateRowStyles: { fillColor: [245, 249, 253] }, margin: { left: 12, right: 12 } });
    y = doc.lastAutoTable.finalY + 6;
  }
  if ((r.noticias || []).length) {
    autoTable(doc, { startY: y, head: [["Data", "Notícias publicadas"]], body: r.noticias.map((x) => [dt(x.data), limpar(x.titulo)]),
      styles: { fontSize: 8 }, headStyles: { fillColor: [14, 34, 51] }, margin: { left: 12, right: 12 } });
  }
  const p = doc.getNumberOfPages();
  for (let i = 1; i <= p; i++) { doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(130); doc.text("Retrospectiva | Desenvolvedor: Gabriel Oliveira", 12, doc.internal.pageSize.getHeight() - 6); doc.text(`${i}/${p}`, W - 12, doc.internal.pageSize.getHeight() - 6, { align: "right" }); }
  doc.save(`retrospectiva-${r.inicio}-a-${r.fim}.pdf`);
}

async function baixarExcel(r, titulo) {
  const XLSX = await import("xlsx");
  const L = linhas(r);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[`Retrospectiva ${titulo}`], [`${dt(r.inicio)} a ${dt(r.fim)}`], [],
    ...["conecta", "sala", "fomento"].flatMap((a) => [[NOME[a]], ...L[a], []])]), "Resumo");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Mês", "Visitas", "Atendimentos Sala", "Propostas Fomento", "Eventos e cursos", "Empresas novas"],
    ...(r.meses || []).map((m) => [m.mes, m.visitas, m.atendimentos_sala, m.propostas, m.eventos_cursos, m.empresas])]), "Mês a mês");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Data", "O que aconteceu", "Onde", "Tipo", "Local", "Público"],
    ...(r.agenda || []).map((a) => [dt(a.data), a.titulo, NOME[a.ambiente], TIPO[a.tipo] || a.tipo, a.local || "", a.publico ?? ""])]), "Agenda");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Data", "Notícia"], ...(r.noticias || []).map((x) => [dt(x.data), x.titulo])]), "Notícias");
  XLSX.writeFile(wb, `retrospectiva-${r.inicio}-a-${r.fim}.xlsx`);
}

const DEMO = {
  inicio: `${ANO}-01-01`, fim: hojeISO(),
  conecta: { visitas: 2004, novos_usuarios: 96, empresas_novas: 38, empresas_aprovadas_total: 38, prestadores_novos: 6, produtos_novos: 54, promocoes: 12, vagas: 18, candidaturas: 41, eventos: 6, participantes_eventos: 210, compareceram_eventos: 168, cursos: 9, inscricoes_cursos: 187, presencas_cursos: 142, feirantes: 24, noticias: 31, enquetes: 3, votos: 640, avaliacoes: 57, nota_media: 4.7, ouvidoria: 8, ouvidoria_respondidas: 7, classificados: 15, mural: 22, licitacoes: 4 },
  sala: { atendimentos: 1240, atendimentos_categoria: [{ nome: "MEI", n: 520 }, { nome: "Alvará", n: 210 }, { nome: "Nota fiscal", n: 180 }], pedidos_site: 64, pedidos_atendidos: 58, agenda: 14, estrategias: 6, estrategias_concluidas: 4, orientacoes: 11, documentos: 19, selo_concluidos: 18, selo_total: 30, empresas_base: 412 },
  fomento: { propostas: 17, concedidas: 4, valor_solicitado: 370000, valor_concedido: 40000, valor_liberado: 30000, interesses_site: 22, clientes_novos: 35, visitas_realizadas: 48, visitas_agendadas: 60, atendimentos: 90, campanhas: 3, compromissos: 40, compromissos_feitos: 33, pontos: 520, por_status: [{ nome: "concedido", n: 4 }, { nome: "em_analise", n: 2 }, { nome: "novo", n: 7 }], ranking: { posicao: 74, total: 399, data: hojeISO() } },
  meses: Array.from({ length: new Date().getMonth() + 1 }, (_, i) => ({ mes: `${ANO}-${String(i + 1).padStart(2, "0")}`, visitas: 80 + i * 25, atendimentos_sala: 90 + (i % 3) * 20, propostas: i % 4, eventos_cursos: i % 3, empresas: 2 + (i % 4) })),
  agenda: [
    { data: `${ANO}-03-12`, titulo: "Semana do MEI", ambiente: "sala", tipo: "mutirao" },
    { data: `${ANO}-05-20`, titulo: "Curso: Vendas pelo WhatsApp", ambiente: "conecta", tipo: "curso", local: "Sala do Empreendedor", publico: 34 },
    { data: `${ANO}-08-15`, titulo: "Feira do Empreendedor", ambiente: "conecta", tipo: "evento", local: "Praça Central", publico: 120 },
    { data: `${ANO}-10-01`, titulo: "Campanha Crédito para o Natal", ambiente: "fomento", tipo: "campanha" },
  ],
  noticias: [{ data: `${ANO}-08-16`, titulo: "Feira do Empreendedor reúne 120 pessoas" }],
};

function Grande({ valor, rotulo, cor }) {
  return (
    <div className="rounded-2xl p-4 bg-white/10 border border-white/15">
      <p className="font-display font-extrabold text-2xl md:text-3xl text-white leading-none">{valor}</p>
      <p className="font-body text-[11px] mt-1.5 font-semibold" style={{ color: cor || "rgba(255,255,255,0.75)" }}>{rotulo}</p>
    </div>
  );
}

function Bloco({ amb, icon: I, itens, extra }) {
  return (
    <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: LINHA }}>
      <div className="px-4 py-3 flex items-center gap-2 text-white" style={{ background: COR[amb] }}>
        <I size={16} /><p className="font-display font-bold text-sm">{NOME[amb]}</p>
      </div>
      <div className="divide-y" style={{ borderColor: LINHA }}>
        {itens.map(([a, b]) => (
          <div key={a} className="flex items-center justify-between gap-3 px-4 py-2" style={{ borderColor: LINHA }}>
            <span className="font-body text-xs" style={{ color: MUTED }}>{a}</span>
            <span className="font-body text-sm font-bold text-right" style={{ color: INK }}>{b}</span>
          </div>
        ))}
      </div>
      {extra}
    </div>
  );
}

function Lista({ titulo, itens, cor }) {
  if (!itens?.length) return null;
  const max = Math.max(...itens.map((x) => Number(x.n)), 1);
  return (
    <div className="px-4 py-3 border-t" style={{ borderColor: LINHA }}>
      <p className="font-body text-[11px] font-extrabold uppercase tracking-wider mb-2" style={{ color: MUTED }}>{titulo}</p>
      {itens.map((x) => (
        <div key={x.nome} className="mb-1.5">
          <div className="flex justify-between font-body text-xs"><span style={{ color: INK }}>{x.nome}</span><b style={{ color: INK }}>{n(x.n)}</b></div>
          <div className="h-1.5 rounded-full mt-0.5" style={{ background: "#EEF3F8" }}><div className="h-1.5 rounded-full" style={{ width: `${(Number(x.n) * 100) / max}%`, background: cor }} /></div>
        </div>
      ))}
    </div>
  );
}

export default function Retrospectiva() {
  const [modo, setModo] = useState("ano");
  const [ano, setAno] = useState(ANO);
  const [mes, setMes] = useState(new Date().getMonth());
  const [ini, setIni] = useState(`${ANO}-01-01`);
  const [fim, setFim] = useState(hojeISO());
  const [r, setR] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [baixando, setBaixando] = useState("");
  const [filtroAgenda, setFiltroAgenda] = useState("todos");

  const titulo = tituloPeriodo(modo, ano, mes, ini, fim);

  const carregar = async () => {
    setErro("");
    if (!supabaseConfigurado) { setR(DEMO); return; }
    const [a, b] = periodoDe(modo, ano, mes, ini, fim);
    if (!a || !b || b < a) { setErro("Escolha um período válido."); return; }
    setCarregando(true);
    const { data, error } = await supabase.rpc("central_retrospectiva", { p_inicio: a, p_fim: b });
    setCarregando(false);
    if (error) {
      setErro(/central_retrospectiva/.test(error.message || "") && /not find|does not exist|schema cache/i.test(error.message || "")
        ? "Falta rodar o arquivo supabase-retrospectiva.sql no Supabase (SQL Editor)."
        : `Não consegui carregar: ${error.message}`);
      return;
    }
    setR(data);
  };
  useEffect(() => { carregar(); }, [modo, ano, mes]); // datas: botão Atualizar

  const baixar = async (tipo) => {
    if (!r) return;
    setBaixando(tipo);
    try { await (tipo === "pdf" ? baixarPDF(r, titulo) : baixarExcel(r, titulo)); } catch (e) { setErro(`Não consegui gerar o arquivo: ${e.message || e}`); }
    setBaixando("");
  };

  const L = r ? linhas(r) : null;
  const agenda = (r?.agenda || []).filter((a) => filtroAgenda === "todos" || a.ambiente === filtroAgenda);
  const porMes = agenda.reduce((m, a) => { const k = String(a.data).slice(0, 7); (m[k] ||= []).push(a); return m; }, {});
  const sel = "font-body text-sm border rounded-xl px-3 py-2 bg-white outline-none";

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <p className="font-body text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: COR.conecta }}>Relatórios</p>
          <h2 className="font-display font-extrabold text-2xl mt-0.5" style={{ color: INK }}>Retrospectiva</h2>
          <p className="font-body text-sm mt-1 max-w-2xl" style={{ color: MUTED }}>Tudo o que foi feito no Conecta, na Sala e na Fomento no período: números, agenda, cursos, eventos e notícias. Baixe em PDF para apresentar ou imprimir.</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <select value={modo} onChange={(e) => setModo(e.target.value)} className={sel} style={{ borderColor: LINHA }}>
            <option value="ano">Ano</option><option value="mes">Mês</option><option value="datas">Escolher datas</option>
          </select>
          {modo !== "datas" && (
            <select value={ano} onChange={(e) => setAno(Number(e.target.value))} className={sel} style={{ borderColor: LINHA }}>
              {Array.from({ length: ANO - 2024 + 1 }, (_, i) => ANO - i).map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
          {modo === "mes" && (
            <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className={sel} style={{ borderColor: LINHA }}>
              {MESES_LONGO.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          )}
          {modo === "datas" && (<>
            <input type="date" value={ini} onChange={(e) => setIni(e.target.value)} className={sel} style={{ borderColor: LINHA }} />
            <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className={sel} style={{ borderColor: LINHA }} />
          </>)}
          <button onClick={carregar} className="inline-flex items-center gap-1.5 font-body text-xs font-bold rounded-xl border px-3 py-2.5" style={{ borderColor: LINHA, color: INK }}>
            {carregando ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Atualizar
          </button>
          {[["pdf", "PDF", FileText], ["excel", "Excel", FileSpreadsheet]].map(([t, rot, Ic]) => (
            <button key={t} disabled={!r || !!baixando} onClick={() => baixar(t)} className="inline-flex items-center gap-1.5 font-body text-xs font-bold rounded-xl px-3 py-2.5 text-white disabled:opacity-50" style={{ background: t === "pdf" ? INK : COR.fomento }}>
              {baixando === t ? <Loader2 size={14} className="animate-spin" /> : <Ic size={14} />} {rot}
            </button>
          ))}
        </div>
      </div>

      {erro && <p className="font-body text-sm rounded-xl px-4 py-3 mb-4" style={{ background: "#FBEAE5", color: "#8A2E1C" }}>{erro}</p>}
      {!supabaseConfigurado && <p className="font-body text-xs rounded-xl px-4 py-2 mb-4" style={{ background: "#FFF6E5", color: "#8A5A0B" }}>Modo demonstração: números de exemplo.</p>}
      {!r && carregando && <p className="font-body text-sm flex items-center gap-2" style={{ color: MUTED }}><Loader2 size={16} className="animate-spin" /> Montando a retrospectiva…</p>}

      {r && L && (<>
        {/* Capa com os grandes números */}
        <div className="rounded-3xl p-5 md:p-7 mb-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg,#0E2233 0%,#0A5AA8 60%,#1E8E5A 130%)" }}>
          <p className="font-body text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/70 flex items-center gap-1.5"><Sparkles size={13} /> Retrospectiva · {dt(r.inicio)} a {dt(r.fim)}</p>
          <h3 className="font-display font-extrabold text-3xl md:text-4xl text-white mt-1">{titulo}</h3>
          <p className="font-body text-sm text-white/75 mt-1">Conecta Comércio · Sala do Empreendedor · Fomento Paraná — Ivatuba-PR</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            <Grande valor={n(r.conecta?.visitas)} rotulo="visitas ao site" cor="#9CC8F2" />
            <Grande valor={n(r.sala?.atendimentos)} rotulo="atendimentos na Sala" cor="#F7C3A4" />
            <Grande valor={n(r.fomento?.propostas)} rotulo="propostas de crédito" cor="#A5DEC1" />
            <Grande valor={brl(r.fomento?.valor_concedido)} rotulo="em crédito concedido" cor="#A5DEC1" />
            <Grande valor={n((r.conecta?.eventos || 0) + (r.conecta?.cursos || 0))} rotulo="eventos e cursos" cor="#9CC8F2" />
            <Grande valor={n((r.conecta?.participantes_eventos || 0) + (r.conecta?.inscricoes_cursos || 0))} rotulo="pessoas inscritas" cor="#9CC8F2" />
            <Grande valor={n(r.conecta?.empresas_novas)} rotulo="empresas novas no Conecta" cor="#9CC8F2" />
            <Grande valor={n(r.fomento?.visitas_realizadas)} rotulo="visitas a empresas (Fomento)" cor="#A5DEC1" />
          </div>
        </div>

        {/* Mês a mês */}
        {(r.meses || []).length > 1 && (
          <div className="rounded-2xl border bg-white p-4 mb-5" style={{ borderColor: LINHA }}>
            <p className="font-display font-bold text-sm mb-3" style={{ color: INK }}>Mês a mês</p>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(r.meses || []).map((m) => ({ ...m, rot: `${MESES[Number(m.mes.slice(5)) - 1]}${(r.meses || []).some((x) => x.mes.slice(0, 4) !== m.mes.slice(0, 4)) ? `/${m.mes.slice(2, 4)}` : ""}` }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF3F8" vertical={false} />
                  <XAxis dataKey="rot" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip formatter={(v) => n(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="visitas" name="Visitas ao site" fill={COR.conecta} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="atendimentos_sala" name="Atendimentos Sala" fill={COR.sala} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto mt-3">
              <table className="w-full font-body text-xs">
                <thead><tr style={{ color: MUTED }}>{["Mês", "Visitas", "Atend. Sala", "Propostas", "Eventos e cursos", "Empresas novas"].map((h) => <th key={h} className="text-left font-bold py-1.5 pr-3">{h}</th>)}</tr></thead>
                <tbody>{(r.meses || []).map((m) => (
                  <tr key={m.mes} className="border-t" style={{ borderColor: LINHA, color: INK }}>
                    <td className="py-1.5 pr-3 font-bold">{MESES_LONGO[Number(m.mes.slice(5)) - 1]} {m.mes.slice(0, 4)}</td>
                    <td className="pr-3">{n(m.visitas)}</td><td className="pr-3">{n(m.atendimentos_sala)}</td><td className="pr-3">{n(m.propostas)}</td><td className="pr-3">{n(m.eventos_cursos)}</td><td>{n(m.empresas)}</td>
                  </tr>))}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cada ambiente separado */}
        <div className="grid lg:grid-cols-3 gap-4 mb-5 items-start">
          <Bloco amb="conecta" icon={Briefcase} itens={L.conecta} extra={<>
            <Lista titulo="Agenda por tipo" itens={Object.entries((r.agenda || []).filter((a) => a.ambiente === "conecta").reduce((m, a) => { const k = TIPO[a.tipo] || a.tipo; m[k] = (m[k] || 0) + 1; return m; }, {})).map(([nome, q]) => ({ nome, n: q })).sort((x, y) => y.n - x.n)} cor={COR.conecta} />
            <Lista titulo="Páginas mais vistas" itens={r.conecta?.paginas_top} cor={COR.conecta} />
            <Lista titulo="Empresas mais vistas" itens={r.conecta?.empresas_mais_vistas} cor={COR.conecta} />
            <Lista titulo="Novas empresas por segmento" itens={r.conecta?.categorias_top} cor={COR.conecta} />
          </>} />
          <Bloco amb="sala" icon={Store} itens={L.sala} extra={<Lista titulo="Atendimentos por assunto" itens={r.sala?.atendimentos_categoria} cor={COR.sala} />} />
          <Bloco amb="fomento" icon={Landmark} itens={L.fomento} extra={<>
            <Lista titulo="Propostas por situação" itens={(r.fomento?.por_status || []).map((x) => ({ ...x, nome: STATUS_FOMENTO[x.nome] || x.nome }))} cor={COR.fomento} />
            <Lista titulo="Propostas por linha de crédito" itens={r.fomento?.por_linha} cor={COR.fomento} />
          </>} />
        </div>

        {/* Agenda / linha do tempo */}
        <div className="rounded-2xl border bg-white p-4 mb-5" style={{ borderColor: LINHA }}>
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <p className="font-display font-bold text-sm flex items-center gap-2" style={{ color: INK }}><CalendarDays size={16} /> Agenda do período: eventos, cursos, mutirões e campanhas ({n(agenda.length)})</p>
            <div className="flex gap-1 flex-wrap">
              {[["todos", "Todos"], ["conecta", "Conecta"], ["sala", "Sala"], ["fomento", "Fomento"]].map(([k, rot]) => (
                <button key={k} onClick={() => setFiltroAgenda(k)} className="font-body text-[11px] font-bold rounded-full px-3 py-1 border"
                  style={{ borderColor: filtroAgenda === k ? (COR[k] || INK) : LINHA, background: filtroAgenda === k ? (COR[k] || INK) : "#fff", color: filtroAgenda === k ? "#fff" : MUTED }}>{rot}</button>
              ))}
            </div>
          </div>
          {!agenda.length && <p className="font-body text-sm" style={{ color: MUTED }}>Nada na agenda neste período.</p>}
          {Object.entries(porMes).map(([k, itens]) => (
            <div key={k} className="mb-3">
              <p className="font-body text-[11px] font-extrabold uppercase tracking-wider mb-1.5" style={{ color: MUTED }}>{MESES_LONGO[Number(k.slice(5)) - 1]} {k.slice(0, 4)}</p>
              <div className="space-y-1.5 border-l-2 pl-3" style={{ borderColor: LINHA }}>
                {itens.map((a, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="font-body text-[11px] font-bold w-12 shrink-0 pt-0.5" style={{ color: MUTED }}>{String(a.data).slice(8, 10)}/{String(a.data).slice(5, 7)}</span>
                    <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: COR[a.ambiente] }} />
                    <div className="min-w-0">
                      <p className="font-body text-sm font-semibold" style={{ color: INK }}>{a.titulo}</p>
                      <p className="font-body text-[11px]" style={{ color: MUTED }}>
                        {NOME[a.ambiente]} · {TIPO[a.tipo] || a.tipo}{a.local ? ` · ${a.local}` : ""}{a.publico ? ` · ${n(a.publico)} inscritos` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {(r.noticias || []).length > 0 && (
          <div className="rounded-2xl border bg-white p-4" style={{ borderColor: LINHA }}>
            <p className="font-display font-bold text-sm flex items-center gap-2 mb-2" style={{ color: INK }}><Newspaper size={16} /> Notícias publicadas</p>
            {r.noticias.map((x, i) => (
              <div key={i} className="flex gap-3 py-1.5 border-t font-body text-sm" style={{ borderColor: LINHA }}>
                <span className="text-[11px] font-bold w-20 shrink-0 pt-0.5" style={{ color: MUTED }}>{dt(x.data)}</span>
                <span style={{ color: INK }}>{x.titulo}</span>
              </div>
            ))}
          </div>
        )}
      </>)}
    </div>
  );
}
