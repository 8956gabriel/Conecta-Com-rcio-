// =============================================================================
// DASHBOARD DE DESENVOLVIMENTO ECONÔMICO (Projeto Master · seção 17 / Fase 12)
// Visão consolidada para o administrador geral: Comércio, Sala e Fomento.
// Só contagens e somas — nenhum dado pessoal aparece aqui (nomes, CPF/CNPJ,
// WhatsApp e históricos continuam só nos ambientes de cada setor).
// Lê as tabelas que já existem; quem não for admin não recebe os dados da
// Sala e da Fomento (as regras de segurança do banco bloqueiam).
// =============================================================================
import React, { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Store, Briefcase, Tag, ClipboardList, Users, HandCoins, Inbox, ArrowLeftRight, ExternalLink, FileText, FileSpreadsheet } from "lucide-react";
import { supabase, supabaseConfigurado } from "../supabaseClient";

const AZUL = "var(--cor-principal, #0A5AA8)";
const INK = "#0E2233", MUTED = "#5C7186", LINHA = "#DCE7F2";
const COR_SALA = "#F19F74", COR_FOMENTO = "#1E8E5A";
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const STATUS_FOMENTO = { novo: "Novas", em_contato: "Em contato", documentacao: "Documentação", em_analise: "Em análise", concedido: "Concedidas", negado: "Negadas" };
const moeda = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

async function buscar(tabela, colunas, filtro) {
  if (!supabaseConfigurado) return [];
  let q = supabase.from(tabela).select(colunas).limit(20000);
  if (filtro) q = filtro(q);
  const { data, error } = await q;
  return error ? null : data || []; // null = sem permissão ou tabela indisponível
}

// ---------------------------------------------------------------------------
// Relatório consolidado (Projeto Master · seção 18): o mesmo conteúdo da tela,
// em PDF e Excel. Só números — nenhum dado pessoal sai daqui.
// ---------------------------------------------------------------------------
function secoesRelatorio(r, ano) {
  const n = (v) => (v == null ? "—" : v);
  const secoes = [{
    titulo: "Resumo", aba: "Resumo", cor: [10, 90, 168], cabecalho: ["Setor", "Indicador", "Valor"],
    linhas: [
      ["Comércio", "Empresas ativas", n(r.empresas)],
      ["Comércio", `Novas empresas em ${ano}`, n(r.empresas != null ? r.novasAno : null)],
      ["Comércio", "Vagas abertas", n(r.vagas)],
      ["Comércio", "Promoções válidas", n(r.promocoes)],
      ...(r.salaOk ? [
        ["Sala do Empreendedor", `Atendimentos em ${ano}`, r.salaTotal],
        ["Sala do Empreendedor", "Atendimentos de MEI (fichas)", r.meis],
        ["Sala do Empreendedor", "Pedidos pelo site", r.pedidos],
      ] : [["Sala do Empreendedor", "Sem permissão para ver", "—"]]),
      ...(r.fomentoOk ? [
        ["Fomento Paraná", `Propostas em ${ano}`, r.propostas],
        ["Fomento Paraná", "Créditos concedidos", r.concedidas],
        ["Fomento Paraná", "Valor concedido", moeda(r.valorConcedido)],
        ["Fomento Paraná", "Interessados pelo site", r.interesses],
      ] : [["Fomento Paraná", "Sem permissão para ver", "—"]]),
      ...(r.salaOk && r.fomentoOk ? [
        ["Integração", "Sala para Fomento (atendimentos encaminhados)", r.salaParaFomento],
        ["Integração", "Fomento para Sala (pedidos encaminhados)", r.fomentoParaSala],
        ["Integração", "Pré-cadastros vindos da Sala", r.vindosDaSala],
      ] : []),
    ],
  }];
  if (r.segmentos.length) secoes.push({ titulo: "Empresas por segmento", aba: "Segmentos", cor: [10, 90, 168], cabecalho: ["Segmento", "Empresas"], linhas: r.segmentos.map((x) => [x.nome, x.valor]) });
  if (r.salaOk) secoes.push({ titulo: `Sala — atendimentos por mês (${ano})`, aba: "Sala por mês", cor: [241, 159, 116], cabecalho: ["Mês", "Atendimentos"], linhas: [...r.salaMes.map((x) => [x.mes, x.valor]), ["Total", r.salaTotal]] });
  if (r.fomentoOk) secoes.push({ titulo: `Fomento — propostas por situação (${ano})`, aba: "Fomento por situação", cor: [30, 142, 90], cabecalho: ["Situação", "Propostas"], linhas: r.porStatus.map((x) => [x.nome, x.valor]) });
  return secoes;
}

async function baixarExcel(r, ano) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  secoesRelatorio(r, ano).forEach((s) => {
    const nome = (s.aba || s.titulo).replace(/[\\/?*[\]:]/g, "-").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([s.cabecalho, ...s.linhas]), nome);
  });
  XLSX.writeFile(wb, `desenvolvimento-economico-ivatuba-${ano}.xlsx`);
}

async function baixarPDF(r, ano) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFillColor(10, 90, 168); doc.rect(0, 0, 210, 26, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  doc.text("Desenvolvimento Econômico — Ivatuba-PR", 12, 12);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  doc.text(`Conecta Comércio | Sala do Empreendedor | Fomento Paraná — ano ${ano} | gerado em ${new Date().toLocaleString("pt-BR")}`, 12, 19.5);
  let y = 34;
  secoesRelatorio(r, ano).forEach((s) => {
    if (y > 260) { doc.addPage(); y = 16; }
    doc.setTextColor(14, 34, 51); doc.setFont("helvetica", "bold"); doc.setFontSize(11.5);
    doc.text(s.titulo, 12, y);
    autoTable(doc, { startY: y + 2.5, head: [s.cabecalho], body: s.linhas.map((l) => l.map(String)), styles: { fontSize: 9 }, headStyles: { fillColor: s.cor }, alternateRowStyles: { fillColor: [245, 249, 253] }, margin: { left: 12, right: 12 } });
    y = doc.lastAutoTable.finalY + 9;
  });
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(110);
    doc.text("Só números consolidados — dados pessoais ficam reservados em cada setor.  |  Desenvolvedor: Gabriel Oliveira", 12, 290);
    doc.text(`${i}/${paginas}`, 198, 290, { align: "right" });
  }
  doc.save(`desenvolvimento-economico-ivatuba-${ano}.pdf`);
}

export default function DesenvolvimentoEconomico() {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [d, setD] = useState(null);

  useEffect(() => {
    let vivo = true;
    setD(null);
    const ini = `${ano}-01-01`, fim = `${ano}-12-31`;
    Promise.all([
      buscar("empresas", "status, categoria, criado_em"),
      buscar("vagas", "status, criado_em"),
      buscar("promocoes", "valida_ate, criado_em"),
      buscar("sala_atendimentos", "data, categoria, situacao, encaminhado_para", (q) => q.gte("data", ini).lte("data", fim)),
      buscar("sala_atendimentos_totais", "ano, mes, total", (q) => q.eq("ano", ano)),
      buscar("sala_pedidos", "criado_em, servico", (q) => q.gte("criado_em", ini).lte("criado_em", `${fim}T23:59:59`)),
      buscar("fomento_propostas", "status, data_proposta, valor_solicitado, valor_concedido", (q) => q.gte("data_proposta", ini).lte("data_proposta", fim)),
      buscar("fomento_interesses", "status, criado_em, mensagem", (q) => q.gte("criado_em", ini).lte("criado_em", `${fim}T23:59:59`)),
    ]).then(([empresas, vagas, promocoes, salaAt, salaTot, salaPed, fomProp, fomInt]) => {
      if (vivo) setD({ empresas, vagas, promocoes, salaAt, salaTot, salaPed, fomProp, fomInt });
    });
    return () => { vivo = false; };
  }, [ano]);

  const r = useMemo(() => {
    if (!d) return null;
    const hoje = new Date().toLocaleDateString("sv-SE");
    const aprovadas = (d.empresas || []).filter((e) => e.status === "aprovada");
    const novasAno = aprovadas.filter((e) => String(e.criado_em || "").startsWith(String(ano))).length;
    const segMap = {};
    aprovadas.forEach((e) => { const c = e.categoria || "Sem categoria"; segMap[c] = (segMap[c] || 0) + 1; });
    const segmentos = Object.entries(segMap).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor).slice(0, 8);

    // Sala: por mês usa as fichas registradas; se o mês não tem ficha, usa o total lançado (histórico/GISE).
    const fichasMes = Array(12).fill(0);
    (d.salaAt || []).forEach((a) => { const m = Number(String(a.data).slice(5, 7)) - 1; if (m >= 0) fichasMes[m]++; });
    const totMes = Array(12).fill(0);
    (d.salaTot || []).forEach((t) => { if (t.mes >= 1 && t.mes <= 12) totMes[t.mes - 1] += Number(t.total) || 0; });
    const salaMes = MESES.map((m, i) => ({ mes: m, valor: fichasMes[i] || totMes[i] }));
    const salaTotal = salaMes.reduce((s, x) => s + x.valor, 0);
    const meis = (d.salaAt || []).filter((a) => /mei/i.test(a.categoria || "")).length;
    const salaParaFomento = (d.salaAt || []).filter((a) => /fomento/i.test(a.encaminhado_para || "")).length;

    const props = (d.fomProp || []).filter((p) => p.status !== "excluido");
    const porStatus = Object.entries(STATUS_FOMENTO).map(([k, nome]) => ({ nome, valor: props.filter((p) => p.status === k).length }));
    const concedidas = props.filter((p) => p.status === "concedido");
    const fomentoParaSala = (d.salaPed || []).filter((p) => /fomento/i.test(p.servico || "")).length;
    const vindosDaSala = (d.fomInt || []).filter((i) => String(i.mensagem || "").startsWith("Encaminhado pela Sala")).length;

    return {
      empresas: d.empresas ? aprovadas.length : null, novasAno, segmentos,
      vagas: d.vagas ? d.vagas.filter((v) => v.status === "aberta").length : null,
      promocoes: d.promocoes ? d.promocoes.filter((p) => !p.valida_ate || p.valida_ate >= hoje).length : null,
      salaOk: d.salaAt !== null, salaMes, salaTotal, meis, pedidos: (d.salaPed || []).length, salaParaFomento, fomentoParaSala,
      fomentoOk: d.fomProp !== null, propostas: props.length, porStatus, concedidas: concedidas.length,
      valorConcedido: concedidas.reduce((s, p) => s + (Number(p.valor_concedido) || 0), 0),
      interesses: (d.fomInt || []).length, vindosDaSala,
    };
  }, [d, ano]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <p className="font-body text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Visão integrada · Ivatuba-PR</p>
          <h2 className="font-display font-extrabold text-xl" style={{ color: INK }}>Desenvolvimento econômico</h2>
          <p className="font-body text-xs mt-1" style={{ color: MUTED }}>Só números consolidados. Dados pessoais e históricos ficam reservados em cada setor.</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button disabled={!r} onClick={() => baixarPDF(r, ano)} className="font-body text-xs font-bold px-3 py-1.5 rounded-full border inline-flex items-center gap-1 disabled:opacity-50" style={{ borderColor: LINHA, color: INK, background: "#fff" }}><FileText size={13} /> PDF</button>
          <button disabled={!r} onClick={() => baixarExcel(r, ano)} className="font-body text-xs font-bold px-3 py-1.5 rounded-full border inline-flex items-center gap-1 disabled:opacity-50" style={{ borderColor: LINHA, color: INK, background: "#fff" }}><FileSpreadsheet size={13} /> Excel</button>
          <span className="w-px h-5 mx-1" style={{ background: LINHA }} />
          {[anoAtual - 1, anoAtual].map((a) => (
            <button key={a} onClick={() => setAno(a)} className="font-body text-xs font-bold px-3 py-1.5 rounded-full border"
              style={ano === a ? { background: AZUL, color: "#fff", borderColor: "transparent" } : { borderColor: LINHA, color: "#425A70", background: "#fff" }}>{a}</button>
          ))}
        </div>
      </div>

      {!r ? <p className="font-body text-sm py-10 text-center" style={{ color: MUTED }}>Carregando indicadores...</p> : (
        <div className="flex flex-col gap-6">
          <Bloco titulo="Comércio" cor={AZUL} link="#/" rotuloLink="Abrir portal">
            <Cartao icon={Store} cor={AZUL} n={r.empresas} l="Empresas ativas" s={r.empresas != null ? `${r.novasAno} novas em ${ano}` : ""} />
            <Cartao icon={Briefcase} cor={AZUL} n={r.vagas} l="Vagas abertas" />
            <Cartao icon={Tag} cor={AZUL} n={r.promocoes} l="Promoções válidas" />
            {r.segmentos.length > 0 && (
              <Grafico titulo="Empresas por segmento" dados={r.segmentos} chave="nome" cor={AZUL} horizontal />
            )}
          </Bloco>

          <Bloco titulo="Sala do Empreendedor" cor={COR_SALA} link="/sala/admin" rotuloLink="Abrir Sala">
            {!r.salaOk ? <SemAcesso /> : <>
              <Cartao icon={ClipboardList} cor={COR_SALA} n={r.salaTotal} l={`Atendimentos em ${ano}`} />
              <Cartao icon={Users} cor={COR_SALA} n={r.meis} l="Atendimentos de MEI" s="fichas registradas" />
              <Cartao icon={Inbox} cor={COR_SALA} n={r.pedidos} l="Pedidos pelo site" />
              <Grafico titulo="Atendimentos por mês" dados={r.salaMes} chave="mes" cor={COR_SALA} />
            </>}
          </Bloco>

          <Bloco titulo="Fomento Paraná" cor={COR_FOMENTO} link="#/fomento-admin" rotuloLink="Abrir Fomento">
            {!r.fomentoOk ? <SemAcesso /> : <>
              <Cartao icon={HandCoins} cor={COR_FOMENTO} n={r.propostas} l={`Propostas em ${ano}`} />
              <Cartao icon={HandCoins} cor={COR_FOMENTO} n={r.concedidas} l="Créditos concedidos" s={moeda(r.valorConcedido)} />
              <Cartao icon={Inbox} cor={COR_FOMENTO} n={r.interesses} l="Interessados pelo site" />
              <Grafico titulo="Propostas por situação" dados={r.porStatus} chave="nome" cor={COR_FOMENTO} />
            </>}
          </Bloco>

          {r.salaOk && r.fomentoOk && (
            <Bloco titulo="Integração Sala ↔ Fomento" cor="#7E5BEF">
              <Cartao icon={ArrowLeftRight} cor="#7E5BEF" n={r.salaParaFomento} l="Sala → Fomento" s="atendimentos encaminhados" />
              <Cartao icon={ArrowLeftRight} cor="#7E5BEF" n={r.fomentoParaSala} l="Fomento → Sala" s="pedidos encaminhados" />
              <Cartao icon={Inbox} cor="#7E5BEF" n={r.vindosDaSala} l="Pré-cadastros vindos da Sala" />
            </Bloco>
          )}
        </div>
      )}
    </div>
  );
}

function Bloco({ titulo, cor, link, rotuloLink, children }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="w-1.5 h-5 rounded-full" style={{ background: cor }} />
        <h3 className="font-display font-bold text-base flex-1" style={{ color: INK }}>{titulo}</h3>
        {link && <a href={link} target={link.startsWith("http") ? "_blank" : undefined} rel="noopener" className="font-body text-xs font-bold inline-flex items-center gap-1" style={{ color: MUTED }}>{rotuloLink} <ExternalLink size={12} /></a>}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
    </section>
  );
}

function Cartao({ icon: I, cor, n, l, s }) {
  return (
    <div className="rounded-2xl border bg-white p-4" style={{ borderColor: LINHA }}>
      <span className="w-8 h-8 rounded-lg inline-flex items-center justify-center mb-2" style={{ background: "#F3F6FA", color: cor }}><I size={16} /></span>
      <p className="font-display font-extrabold text-2xl leading-none" style={{ color: INK }}>{n == null ? "—" : n.toLocaleString("pt-BR")}</p>
      <p className="font-body text-xs font-semibold mt-1" style={{ color: "#425A70" }}>{l}</p>
      {s && <p className="font-body text-[11px] mt-0.5" style={{ color: MUTED }}>{s}</p>}
    </div>
  );
}

function Grafico({ titulo, dados, chave, cor, horizontal }) {
  return (
    <div className="col-span-2 lg:col-span-3 rounded-2xl border bg-white p-4" style={{ borderColor: LINHA }}>
      <p className="font-body text-xs font-bold mb-2" style={{ color: "#425A70" }}>{titulo}</p>
      <div style={{ height: horizontal ? Math.max(160, dados.length * 30) : 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          {horizontal ? (
            <BarChart data={dados} layout="vertical" margin={{ left: 10, right: 16 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey={chave} width={130} tick={{ fontSize: 11 }} />
              <Tooltip /><Bar dataKey="valor" name="Quantidade" radius={[0, 6, 6, 0]}>{dados.map((_, i) => <Cell key={i} fill={cor} />)}</Bar>
            </BarChart>
          ) : (
            <BarChart data={dados} margin={{ left: -16, right: 8 }}>
              <XAxis dataKey={chave} tick={{ fontSize: 11 }} interval={0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip /><Bar dataKey="valor" name="Quantidade" radius={[6, 6, 0, 0]}>{dados.map((_, i) => <Cell key={i} fill={cor} />)}</Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SemAcesso() {
  return <p className="col-span-2 lg:col-span-3 font-body text-sm rounded-2xl border bg-white p-4" style={{ borderColor: LINHA, color: MUTED }}>Sem permissão para ver os números deste setor.</p>;
}
