// =============================================================================
// RELATÓRIOS POR TEMA (Projeto Master · seção 18)
// Um cartão por tema, com período e botões PDF e Excel, no mesmo padrão:
// resumo (contagens) + lista. Lê as tabelas que o administrador já vê.
// Dados pessoais ficam de fora (telefone, e-mail, CPF/CNPJ, nomes de quem
// reclamou ou se inscreveu). Sala e Fomento continuam com os relatórios
// próprios nos painéis deles.
// =============================================================================
import React, { useEffect, useState } from "react";
import { FileText, FileSpreadsheet, Store, Wrench, Briefcase, Tag, Star, MessageCircle, GraduationCap, Repeat, PieChart, Loader2 } from "lucide-react";
import { supabase, supabaseConfigurado } from "../supabaseClient";

const AZUL = "var(--cor-principal, #0A5AA8)";
const INK = "#0E2233", MUTED = "#5C7186", LINHA = "#DCE7F2";

const d = (v) => (v ? new Date(String(v).length === 10 ? `${v}T12:00:00` : v).toLocaleDateString("pt-BR") : "");
const sim = (v) => (v ? "Sim" : "Não");
const moeda = (v) => (v == null || v === "" ? "" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const contar = (lista, f) => Object.entries(lista.reduce((m, x) => { const k = f(x) || "(sem informação)"; m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
const hoje = () => new Date().toLocaleDateString("sv-SE");

async function todos(tabela, colunas = "*") {
  const out = [];
  for (let de = 0; de < 20000; de += 1000) {
    const { data, error } = await supabase.from(tabela).select(colunas).range(de, de + 999);
    if (error) throw new Error(`${tabela}: ${error.message}`);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

// Cada tema: busca os dados e devolve { resumo: [[rótulo, valor]], cabecalho, linhas }
const TEMAS = [
  { id: "empresas", titulo: "Empresas", icon: Store, desc: "Comerciantes cadastrados, situação, categoria e bairro.",
    async gerar(desde) {
      const l = (await todos("empresas", "nome,categoria,bairro,status,selo_compre_em_ivatuba,aceita_cartao_servidor,possui_mei,possui_cnpj,criado_em")).filter((x) => !desde || x.criado_em >= desde);
      return {
        resumo: [["Total", l.length], ...contar(l, (x) => ({ aprovada: "Aprovadas", pendente: "Aguardando aprovação", recusada: "Recusadas" }[x.status] || x.status))],
        cabecalho: ["Empresa", "Categoria", "Bairro", "Situação", "Selo Compre em Ivatuba", "Cartão do Servidor", "MEI", "CNPJ", "Cadastro"],
        linhas: l.sort((a, b) => a.nome.localeCompare(b.nome)).map((x) => [x.nome, x.categoria, x.bairro, x.status, sim(x.selo_compre_em_ivatuba), sim(x.aceita_cartao_servidor), sim(x.possui_mei), sim(x.possui_cnpj), d(x.criado_em)]),
      };
    } },
  { id: "segmentos", titulo: "Segmentos", icon: PieChart, desc: "Empresas aprovadas por categoria (segmento).",
    async gerar(desde) {
      const l = (await todos("empresas", "categoria,status,criado_em")).filter((x) => x.status === "aprovada" && (!desde || x.criado_em >= desde));
      const g = contar(l, (x) => x.categoria);
      return { resumo: [["Empresas aprovadas", l.length], ["Segmentos", g.length]], cabecalho: ["Segmento", "Empresas", "% do total"], linhas: g.map(([k, n]) => [k, n, `${((n * 100) / (l.length || 1)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`]) };
    } },
  { id: "prestadores", titulo: "Prestadores de serviço", icon: Wrench, desc: "Prestadores cadastrados, serviço e situação.",
    async gerar(desde) {
      const l = (await todos("prestadores", "nome,servico,status,criado_em")).filter((x) => !desde || x.criado_em >= desde);
      return { resumo: [["Total", l.length], ...contar(l, (x) => x.status)], cabecalho: ["Prestador", "Serviço", "Situação", "Cadastro"], linhas: l.sort((a, b) => a.nome.localeCompare(b.nome)).map((x) => [x.nome, x.servico, x.status, d(x.criado_em)]) };
    } },
  { id: "vagas", titulo: "Vagas de emprego", icon: Briefcase, desc: "Vagas publicadas, empresa, salário e situação.",
    async gerar(desde, cache) {
      const emp = await cache.empresas();
      const l = (await todos("vagas", "cargo,empresa_id,salario,cidade,status,criado_em")).filter((x) => !desde || x.criado_em >= desde);
      return { resumo: [["Total", l.length], ...contar(l, (x) => x.status)], cabecalho: ["Cargo", "Empresa", "Salário", "Cidade", "Situação", "Publicada em"], linhas: l.sort((a, b) => (b.criado_em || "").localeCompare(a.criado_em || "")).map((x) => [x.cargo, emp[x.empresa_id] || "", x.salario || "", x.cidade || "", x.status, d(x.criado_em)]) };
    } },
  { id: "promocoes", titulo: "Promoções", icon: Tag, desc: "Promoções cadastradas, desconto e validade (vigentes e vencidas).",
    async gerar(desde, cache) {
      const emp = await cache.empresas();
      const prod = Object.fromEntries((await todos("produtos", "id,nome,empresa_id")).map((p) => [p.id, p]));
      const l = (await todos("promocoes", "produto_id,desconto_percentual,valida_ate,criado_em")).filter((x) => !desde || x.criado_em >= desde);
      const sit = (x) => (!x.valida_ate ? "Sem validade" : x.valida_ate >= hoje() ? "Vigente" : "Vencida");
      return { resumo: [["Total", l.length], ...contar(l, sit)], cabecalho: ["Produto", "Empresa", "Desconto", "Válida até", "Situação"], linhas: l.map((x) => [prod[x.produto_id]?.nome || "", emp[prod[x.produto_id]?.empresa_id] || "", x.desconto_percentual != null ? `${x.desconto_percentual}%` : "", d(x.valida_ate), sit(x)]) };
    } },
  { id: "avaliacoes", titulo: "Avaliações", icon: Star, desc: "Notas e comentários dos clientes, com média por empresa.",
    async gerar(desde, cache) {
      const emp = await cache.empresas();
      const l = (await todos("avaliacoes", "empresa_id,nota,comentario,resposta_comerciante,status,criado_em")).filter((x) => !desde || x.criado_em >= desde);
      const media = l.length ? l.reduce((s, x) => s + Number(x.nota || 0), 0) / l.length : 0;
      return { resumo: [["Avaliações", l.length], ["Nota média", media.toLocaleString("pt-BR", { maximumFractionDigits: 2 })], ...[5, 4, 3, 2, 1].map((n) => [`${n} estrela${n > 1 ? "s" : ""}`, l.filter((x) => Number(x.nota) === n).length])],
        cabecalho: ["Empresa", "Nota", "Comentário", "Respondida", "Situação", "Data"], linhas: l.sort((a, b) => (b.criado_em || "").localeCompare(a.criado_em || "")).map((x) => [emp[x.empresa_id] || "", x.nota, x.comentario || "", sim(x.resposta_comerciante), x.status, d(x.criado_em)]) };
    } },
  { id: "ouvidoria", titulo: "Ouvidoria", icon: MessageCircle, desc: "Manifestações por categoria e situação (sem nome nem telefone de quem enviou).",
    async gerar(desde) {
      const l = (await todos("ouvidoria_denuncias", "protocolo,categoria,status,resposta_admin,criado_em")).filter((x) => !desde || x.criado_em >= desde);
      return { resumo: [["Manifestações", l.length], ["Respondidas", l.filter((x) => x.resposta_admin).length], ...contar(l, (x) => x.categoria)],
        cabecalho: ["Protocolo", "Categoria", "Situação", "Respondida", "Data"], linhas: l.sort((a, b) => (b.criado_em || "").localeCompare(a.criado_em || "")).map((x) => [x.protocolo || "", x.categoria, x.status, sim(x.resposta_admin), d(x.criado_em)]) };
    } },
  { id: "capacitacoes", titulo: "Capacitações", icon: GraduationCap, desc: "Cursos e palestras com número de inscritos e presenças.",
    async gerar(desde) {
      const cursos = (await todos("cursos", "id,titulo,data_inicio,local,criado_em")).filter((x) => !desde || (x.data_inicio || x.criado_em) >= desde);
      const insc = await todos("curso_inscricoes", "curso_id,presenca_confirmada");
      const linhas = cursos.sort((a, b) => (b.data_inicio || "").localeCompare(a.data_inicio || "")).map((c) => {
        const i = insc.filter((x) => x.curso_id === c.id);
        return [c.titulo, d(c.data_inicio), c.local || "", i.length, i.filter((x) => x.presenca_confirmada).length];
      });
      return { resumo: [["Cursos e palestras", cursos.length], ["Inscrições", linhas.reduce((s, x) => s + x[3], 0)], ["Presenças confirmadas", linhas.reduce((s, x) => s + x[4], 0)]], cabecalho: ["Curso / palestra", "Data", "Local", "Inscritos", "Presenças"], linhas };
    } },
  { id: "classificados", titulo: "Classificados", icon: Repeat, desc: "Anúncios por tipo, categoria e situação.",
    async gerar(desde) {
      const l = (await todos("classificados", "tipo,titulo,categoria,preco,status,criado_em")).filter((x) => !desde || x.criado_em >= desde);
      return { resumo: [["Anúncios", l.length], ...contar(l, (x) => x.status)], cabecalho: ["Título", "Tipo", "Categoria", "Preço", "Situação", "Data"], linhas: l.sort((a, b) => (b.criado_em || "").localeCompare(a.criado_em || "")).map((x) => [x.titulo, x.tipo, x.categoria, moeda(x.preco), x.status, d(x.criado_em)]) };
    } },
];

const PERIODOS = [["30", "Últimos 30 dias"], ["90", "Últimos 90 dias"], ["ano", "Este ano"], ["365", "Últimos 12 meses"], ["tudo", "Todo o período"]];
const desdeDe = (p) => {
  if (p === "tudo") return null;
  if (p === "ano") return `${new Date().getFullYear()}-01-01`;
  const x = new Date(); x.setDate(x.getDate() - Number(p)); return x.toLocaleDateString("sv-SE");
};
// A fonte padrão do PDF não desenha alguns símbolos
const limpar = (t) => String(t ?? "").replace(/[→]/g, "->").replace(/[·•]/g, "-").split("").filter((c) => c.charCodeAt(0) <= 0xff || "“”‘’–—…€".includes(c)).join("");

async function baixar(tema, dados, periodo, formato) {
  const nomePer = PERIODOS.find(([k]) => k === periodo)?.[1] || "";
  const arquivo = `relatorio-${tema.id}-${new Date().toLocaleDateString("sv-SE")}`;
  if (formato === "excel") {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[`Relatório: ${tema.titulo}`], [`Período: ${nomePer}`], [], ["Indicador", "Valor"], ...dados.resumo]), "Resumo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([dados.cabecalho, ...dados.linhas]), "Lista");
    XLSX.writeFile(wb, `${arquivo}.xlsx`);
    return;
  }
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: dados.cabecalho.length > 6 ? "landscape" : "portrait" });
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(10, 90, 168); doc.rect(0, 0, W, 24, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.text(limpar(`Relatório: ${tema.titulo}`), 12, 11);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.text(limpar(`Conecta Comércio | Ivatuba-PR | ${nomePer} | gerado em ${new Date().toLocaleString("pt-BR")}`), 12, 18);
  autoTable(doc, { startY: 30, head: [["Indicador", "Valor"]], body: dados.resumo.map(([a, b]) => [limpar(a), limpar(b)]), styles: { fontSize: 9 }, headStyles: { fillColor: [10, 90, 168] }, margin: { left: 12, right: 12 }, tableWidth: 110 });
  autoTable(doc, { startY: doc.lastAutoTable.finalY + 8, head: [dados.cabecalho.map(limpar)], body: dados.linhas.map((l) => l.map(limpar)), styles: { fontSize: 8 }, headStyles: { fillColor: [10, 90, 168] }, alternateRowStyles: { fillColor: [245, 249, 253] }, margin: { left: 12, right: 12 } });
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) { doc.setPage(p); doc.setFontSize(7.5); doc.setTextColor(130); doc.text("Conecta Comércio | Desenvolvedor: Gabriel Oliveira", 12, doc.internal.pageSize.getHeight() - 6); doc.text(`${p}/${n}`, W - 12, doc.internal.pageSize.getHeight() - 6, { align: "right" }); }
  doc.save(`${arquivo}.pdf`);
}

export default function Relatorios() {
  const [periodo, setPeriodo] = useState("ano");
  const [gerando, setGerando] = useState(null);
  const [erro, setErro] = useState("");
  const [totais, setTotais] = useState({});

  // cache simples de nomes das empresas (vagas, promoções, avaliações usam)
  const [cache] = useState(() => { let p = null; return { empresas: () => (p ||= todos("empresas", "id,nome").then((l) => Object.fromEntries(l.map((e) => [e.id, e.nome])))) }; });

  useEffect(() => { setTotais({}); }, [periodo]);

  const gerar = async (tema, formato) => {
    setErro("");
    if (!supabaseConfigurado) { setErro("Modo demonstração: conecte o Supabase para gerar os relatórios."); return; }
    setGerando(`${tema.id}-${formato}`);
    try {
      const dados = await tema.gerar(desdeDe(periodo), cache);
      setTotais((t) => ({ ...t, [tema.id]: dados.linhas.length }));
      await baixar(tema, dados, periodo, formato);
    } catch (e) { setErro(`Não consegui gerar "${tema.titulo}": ${e.message || e}`); }
    setGerando(null);
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <p className="font-body text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: AZUL }}>Relatórios</p>
          <h2 className="font-display font-extrabold text-2xl mt-0.5" style={{ color: INK }}>Relatórios por tema</h2>
          <p className="font-body text-sm mt-1 max-w-2xl" style={{ color: MUTED }}>
            Cada relatório traz um resumo e a lista completa, em PDF (para imprimir ou enviar) ou Excel (para filtrar). Telefones, e-mails e documentos ficam de fora. Sala e Fomento têm os relatórios próprios nos painéis deles.
          </p>
        </div>
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="font-body text-sm border rounded-xl px-3 py-2.5 bg-white outline-none" style={{ borderColor: LINHA }}>
          {PERIODOS.map(([k, r]) => <option key={k} value={k}>{r}</option>)}
        </select>
      </div>
      {erro && <p className="font-body text-sm rounded-xl px-4 py-3 mb-4" style={{ background: "#FBEAE5", color: "#8A2E1C" }}>{erro}</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TEMAS.map((t) => {
          const I = t.icon;
          return (
            <div key={t.id} className="rounded-2xl border bg-white p-4 flex flex-col" style={{ borderColor: LINHA }}>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#EAF2FB", color: "#0A5AA8" }}><I size={16} /></span>
                <p className="font-display font-bold text-sm flex-1" style={{ color: INK }}>{t.titulo}</p>
                {totais[t.id] != null && <span className="font-body text-[11px] font-bold" style={{ color: MUTED }}>{totais[t.id]} linhas</span>}
              </div>
              <p className="font-body text-xs mt-2 flex-1" style={{ color: MUTED }}>{t.desc}</p>
              <div className="flex gap-2 mt-3">
                {[["pdf", "PDF", FileText], ["excel", "Excel", FileSpreadsheet]].map(([f, r, Ic]) => (
                  <button key={f} disabled={!!gerando} onClick={() => gerar(t, f)} className="flex-1 inline-flex items-center justify-center gap-1.5 font-body text-xs font-bold rounded-lg border px-3 py-2 disabled:opacity-50" style={{ borderColor: LINHA, color: INK }}>
                    {gerando === `${t.id}-${f}` ? <Loader2 size={13} className="animate-spin" /> : <Ic size={13} />} {r}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
