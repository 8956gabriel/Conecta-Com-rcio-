// =============================================================================
// SALA DO EMPREENDEDOR — IMPORTAR RELATÓRIO DO GISE (Excel, CSV ou PDF)
//
// O atendente tira o relatório no GISE (Relatórios → Atendimentos...) e anexa
// aqui. Dois jeitos de entrar na plataforma:
//   • Lista de atendimentos (data, nome, CPF/CNPJ, demanda...) → vira ficha em
//     sala_atendimentos (sem duplicar o que já existe).
//   • Totais por tipo (relatório "Por Tipo"/"Total") → vira total do mês em
//     sala_atendimentos_totais (nunca diminui o que já foi lançado).
// O arquivo é lido no próprio navegador: não é enviado nem guardado em lugar
// nenhum (LGPD).
// =============================================================================
import React, { useMemo, useState } from "react";
import { Upload, CheckCircle2, X, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { supabase, supabaseConfigurado } from "./supabaseClient";

const C = { blue: "#0A5AA8", ink: "#0E2233", muted: "#5C7186", soft: "#8DA0B3", line: "#E3EAF2", tint: "#F3F8FD", green: "#1E8E5A", amber: "#E8A23D", danger: "#C2410C" };
const sel = "font-body text-xs border rounded-lg px-2 py-1.5 outline-none bg-white w-full";

const semAcento = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const soDigitos = (s) => String(s ?? "").replace(/\D/g, "");

// Nomes de coluna que o GISE (e planilhas parecidas) costumam usar
const CAMPOS = {
  data: { r: "Data", nomes: ["data do atendimento", "data atendimento", "data", "dt", "dia"] },
  nome: { r: "Nome do empreendedor", nomes: ["empreendedor", "nome do cliente", "cliente", "nome", "solicitante", "pessoa"] },
  documento: { r: "CPF / CNPJ", nomes: ["cpf/cnpj", "cpf / cnpj", "cnpj/cpf", "cpf", "cnpj", "documento"] },
  empresa: { r: "Empresa", nomes: ["razao social", "nome fantasia", "empresa", "nome empresarial"] },
  categoria: { r: "Demanda / tipo", nomes: ["demanda", "tipo de atendimento", "tipo", "assunto", "servico", "categoria", "motivo"] },
  canal: { r: "Canal", nomes: ["canal", "forma de atendimento", "forma", "meio", "modalidade"] },
  atendente: { r: "Atendente", nomes: ["atendente", "agente", "usuario", "responsavel", "atendido por"] },
  whatsapp: { r: "Telefone", nomes: ["whatsapp", "celular", "telefone", "fone", "contato"] },
  observacoes: { r: "Descrição / solução", nomes: ["descricao", "observacao", "observacoes", "solucao", "detalhe", "historico"] },
  total: { r: "Quantidade (relatório de totais)", nomes: ["quantidade", "total", "qtd", "qtde", "atendimentos"] },
};

// Liga a demanda do GISE ao tipo da plataforma (mesmas categorias do Sebrae)
const PISTAS = [
  ["Parcelamento Especial - Microempreendedor Individual", ["parcelamento especial"]],
  ["Parcelamento - Regularize (Dívida Ativa)", ["regularize", "divida ativa"]],
  ["Parcelamento - Microempreendedor Individual", ["parcelamento"]],
  ["Declaração Anual - DASN-SIMEI", ["dasn", "declaracao anual"]],
  ["Boleto DAS - (INSS/ICMS/ISS)", ["boleto", "das ", "das-", "das(", "guia das", "pgmei"]],
  ["Baixa da Inscrição do MEI (CNPJ)", ["baixa", "encerramento", "fechar"]],
  ["Formalização - Abertura de Empresa", ["formalizacao", "abertura", "abrir empresa"]],
  ["CNPJ MEI", ["cnpj mei", "inscricao mei", "ccmei", "certificado"]],
  ["Nota Fiscal MEI - SERVIÇO (ISS)", ["nota fiscal", "nfs", "nfse", "nf-e"]],
  ["Alteração de Dados", ["alteracao", "atualizacao cadastral", "alterar"]],
  ["Alvará", ["alvara", "licenca", "vigilancia"]],
  ["Compras Públicas", ["compras publicas", "licitacao", "compras governamentais"]],
  ["Crédito", ["credito", "emprestimo", "fomento", "financiamento", "microcredito"]],
  ["Orientações sobre o MEI", ["orientac", "mei", "informac", "duvida"]],
];
export function mapearCategoria(texto, categorias) {
  const t = semAcento(texto);
  if (!t) return "Outros";
  const exata = categorias.find((c) => semAcento(c) === t);
  if (exata) return exata;
  for (const [cat, pistas] of PISTAS) if (categorias.includes(cat) && pistas.some((p) => (` ${t} `).includes(p))) return cat;
  return "Outros";
}
function mapearCanal(texto) {
  const t = semAcento(texto);
  if (t.includes("whats")) return "whatsapp";
  if (t.includes("telef")) return "telefone";
  if (t.includes("online") || t.includes("internet") || t.includes("remot") || t.includes("e-mail") || t.includes("email")) return "online";
  return "presencial";
}
// Data do Excel (número de série), dd/mm/aaaa, aaaa-mm-dd ou Date
function lerData(v) {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && v > 20000 && v < 80000) return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
  const s = String(v).trim();
  let m = s.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) { const a = m[3].length === 2 ? `20${m[3]}` : m[3]; return `${a}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; }
  m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}
const acharDoc = (s) => { const m = String(s ?? "").match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}|\d{3}\.?\d{3}\.?\d{3}-?\d{2}/); return m ? soDigitos(m[0]) : ""; };

// ---------------------------------------------------------------------------
// Leitura dos arquivos → { linhas: [[...]], iCab }
// ---------------------------------------------------------------------------
async function lerTabela(arquivo) {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await arquivo.arrayBuffer(), { type: "array", cellDates: true });
  let melhor = null;
  for (const nome of wb.SheetNames) {
    const linhas = XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, raw: true, defval: null }).filter((l) => (l || []).some((c) => c != null && String(c).trim() !== ""));
    if (!melhor || linhas.length > melhor.length) melhor = linhas;
  }
  return melhor || [];
}
// PDF: junta os pedaços de texto pela altura da linha e separa colunas pelo espaço entre eles
async function lerPDF(arquivo) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) }).promise;
  const linhas = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const pag = await doc.getPage(p);
    const { items } = await pag.getTextContent();
    const porY = new Map();
    items.forEach((it) => {
      if (!String(it.str).trim()) return;
      const y = Math.round(it.transform[5] / 3) * 3;
      if (!porY.has(y)) porY.set(y, []);
      porY.get(y).push({ x: it.transform[4], w: it.width || 0, s: String(it.str).trim() });
    });
    [...porY.entries()].sort((a, b) => b[0] - a[0]).forEach(([, pedacos]) => {
      pedacos.sort((a, b) => a.x - b.x);
      const cel = [];
      let fim = -999;
      pedacos.forEach((pc) => {
        if (cel.length && pc.x - fim < 6) cel[cel.length - 1] += ` ${pc.s}`;
        else cel.push(pc.s);
        fim = pc.x + pc.w;
      });
      linhas.push(cel);
    });
  }
  return linhas;
}
function acharCabecalho(linhas) {
  let melhor = { i: -1, pontos: 0 };
  linhas.slice(0, 40).forEach((l, i) => {
    const cab = (l || []).map(semAcento);
    const pontos = Object.values(CAMPOS).filter((c) => cab.some((x) => c.nomes.some((n) => x === n || x.startsWith(n)))).length;
    if (pontos > melhor.pontos) melhor = { i, pontos };
  });
  return melhor.pontos >= 2 ? melhor.i : -1;
}
function mapaInicial(cab) {
  const usados = new Set();
  const idx = {};
  // procura do nome mais específico para o mais genérico
  for (const [campo, def] of Object.entries(CAMPOS)) {
    let achou = -1;
    for (const n of def.nomes) {
      achou = cab.findIndex((c, i) => !usados.has(i) && (c === n || c.startsWith(n)));
      if (achou >= 0) break;
    }
    idx[campo] = achou;
    if (achou >= 0) usados.add(achou);
  }
  return idx;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
export function ImportarGise({ ctx, categorias, onFechar }) {
  const [arquivo, setArquivo] = useState(null);
  const [linhas, setLinhas] = useState(null);
  const [iCab, setICab] = useState(-1);
  const [idx, setIdx] = useState({});
  const [modo, setModo] = useState("lista"); // lista | totais
  const [mesTotais, setMesTotais] = useState(new Date().toISOString().slice(0, 7));
  const [lendo, setLendo] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState("");

  const abrir = async (f) => {
    if (!f) return;
    setErro(""); setLendo(true); setArquivo(f); setLinhas(null);
    try {
      const ehPDF = /\.pdf$/i.test(f.name) || f.type === "application/pdf";
      const l = ehPDF ? await lerPDF(f) : await lerTabela(f);
      const i = acharCabecalho(l);
      const cab = i >= 0 ? l[i].map(semAcento) : [];
      const m = i >= 0 ? mapaInicial(cab) : {};
      setLinhas(l); setICab(i); setIdx(m);
      setModo(i >= 0 && m.categoria >= 0 && m.total >= 0 && m.nome < 0 ? "totais" : "lista");
      if (i < 0) setErro("Não achei a linha de títulos das colunas. Escolha abaixo qual linha é o cabeçalho.");
    } catch (e) {
      setErro("Não consegui ler o arquivo: " + (e?.message || e));
    }
    setLendo(false);
  };

  const cabecalho = iCab >= 0 && linhas ? linhas[iCab].map((c, i) => String(c ?? `Coluna ${i + 1}`)) : [];
  const corpo = iCab >= 0 && linhas ? linhas.slice(iCab + 1) : [];
  const v = (l, campo) => (idx[campo] >= 0 ? l[idx[campo]] : null);

  // Lista de atendimentos pronta para gravar
  const fichas = useMemo(() => {
    if (modo !== "lista") return [];
    return corpo.map((l) => {
      const data = lerData(v(l, "data"));
      const nome = String(v(l, "nome") ?? "").trim();
      if (!data || !nome || /^total/i.test(nome)) return null;
      const docTxt = v(l, "documento");
      const documento = soDigitos(docTxt).length >= 11 ? soDigitos(docTxt) : acharDoc(nome) || acharDoc(v(l, "empresa"));
      const tipoOriginal = String(v(l, "categoria") ?? "").trim();
      const fone = soDigitos(v(l, "whatsapp"));
      const obs = [String(v(l, "observacoes") ?? "").trim(), tipoOriginal ? `GISE: ${tipoOriginal}` : ""].filter(Boolean).join(" · ");
      return {
        data, nome: nome.slice(0, 200), documento: documento || null, whatsapp: fone.length >= 10 ? fone : null,
        empresa: String(v(l, "empresa") ?? "").trim() || null,
        categoria: mapearCategoria(tipoOriginal, categorias), canal: mapearCanal(v(l, "canal")), situacao: "concluido",
        atendente_nome: String(v(l, "atendente") ?? "").trim() || null,
        observacoes: `Importado do GISE${obs ? ` · ${obs}` : ""}`.slice(0, 1000),
      };
    }).filter(Boolean);
  }, [corpo, idx, modo]);

  // Totais por tipo (relatório "Por Tipo" / "Total")
  const totais = useMemo(() => {
    if (modo !== "totais") return {};
    const t = {};
    corpo.forEach((l) => {
      const nomeTipo = String(v(l, "categoria") ?? "").trim();
      const n = Number(String(v(l, "total") ?? "").replace(/\./g, "").replace(",", "."));
      if (!nomeTipo || /^total/i.test(nomeTipo) || !Number.isFinite(n) || n <= 0) return;
      const c = mapearCategoria(nomeTipo, categorias);
      t[c] = (t[c] || 0) + Math.round(n);
    });
    return t;
  }, [corpo, idx, modo]);

  const resumoTipos = useMemo(() => {
    const r = {};
    fichas.forEach((f) => { r[f.categoria] = (r[f.categoria] || 0) + 1; });
    return Object.entries(r).sort((a, b) => b[1] - a[1]);
  }, [fichas]);

  const gravarFichas = async () => {
    if (!fichas.length) return;
    setGravando(true);
    try {
      if (!supabaseConfigurado) {
        ctx.setAtendimentos((l) => [...fichas.map((f, i) => ({ id: `demo-imp-${Date.now()}-${i}`, ...f })), ...(l || [])]);
        ctx.avisar(`${fichas.length} atendimento(s) importado(s) (demonstração).`); onFechar(); return;
      }
      // não duplica: mesma data + mesmo CPF/CNPJ (ou nome) + mesmo tipo
      const datas = fichas.map((f) => f.data).sort();
      let existentes = [], de = 0;
      for (;;) {
        const { data, error } = await supabase.from("sala_atendimentos").select("data,nome,documento,categoria").gte("data", datas[0]).lte("data", datas[datas.length - 1]).range(de, de + 999);
        if (error) throw error;
        existentes = existentes.concat(data || []);
        if (!data || data.length < 1000) break;
        de += 1000;
      }
      const chave = (f) => `${f.data}|${f.documento || semAcento(f.nome)}|${f.categoria}`;
      const ja = new Set(existentes.map(chave));
      const novos = [];
      fichas.forEach((f) => { const k = chave(f); if (!ja.has(k)) { ja.add(k); novos.push(f); } });
      for (let i = 0; i < novos.length; i += 500) {
        const { error } = await supabase.from("sala_atendimentos").insert(novos.slice(i, i + 500));
        if (error) throw error;
      }
      ctx.avisar(`${novos.length} atendimento(s) importado(s)${fichas.length - novos.length ? ` · ${fichas.length - novos.length} já existiam` : ""}.`);
      ctx.recarregar?.();
      onFechar();
    } catch (e) {
      ctx.avisar("Não consegui importar: " + (e?.message || e), "erro");
    }
    setGravando(false);
  };

  const gravarTotais = async () => {
    const [ano, mes] = mesTotais.split("-").map(Number);
    const entradas = Object.entries(totais);
    if (!entradas.length || !ano || !mes) return;
    setGravando(true);
    try {
      if (supabaseConfigurado) {
        const { data: atuais, error: e1 } = await supabase.from("sala_atendimentos_totais").select("categoria,total").eq("ano", ano).eq("mes", mes);
        if (e1) throw e1;
        const atual = Object.fromEntries((atuais || []).map((t) => [t.categoria, Number(t.total) || 0]));
        const linhasT = entradas.map(([categoria, total]) => ({ ano, mes, categoria, total: Math.max(total, atual[categoria] || 0) }));
        const { error } = await supabase.from("sala_atendimentos_totais").upsert(linhasT, { onConflict: "ano,mes,categoria" });
        if (error) throw error;
      }
      ctx.avisar(`Totais de ${String(mes).padStart(2, "0")}/${ano} lançados.`);
      ctx.recarregar?.();
      onFechar();
    } catch (e) {
      ctx.avisar("Não consegui lançar os totais: " + (e?.message || e), "erro");
    }
    setGravando(false);
  };

  return (
    <div className="rounded-2xl border p-4 md:p-5 bg-white mb-6" style={{ borderColor: C.blue }}>
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: C.tint }}><FileSpreadsheet size={18} color={C.blue} /></span>
        <div className="flex-1">
          <p className="font-display font-bold text-sm" style={{ color: C.ink }}>Importar relatório do GISE</p>
          <p className="font-body text-xs mt-0.5" style={{ color: C.muted }}>No GISE, vá em <b>Relatórios → Atendimentos - Demandas</b> (lista com data, nome e demanda) ou <b>Atendimentos - Por Tipo</b> (totais), exporte em <b>Excel</b> ou <b>PDF</b> e anexe aqui. O arquivo é lido só no seu navegador e não fica guardado.</p>
        </div>
        <button onClick={onFechar} className="p-1.5 rounded-lg" style={{ color: C.muted }} title="Fechar"><X size={16} /></button>
      </div>

      <label className="mt-4 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 cursor-pointer font-body text-sm font-semibold" style={{ borderColor: C.line, color: C.blue }}>
        <Upload size={16} /> {lendo ? "Lendo arquivo..." : arquivo ? `${arquivo.name} — trocar arquivo` : "Escolher arquivo (.xlsx, .xls, .csv ou .pdf)"}
        <input type="file" accept=".xlsx,.xls,.csv,.pdf,application/pdf" className="hidden" onChange={(e) => abrir(e.target.files?.[0])} />
      </label>

      {erro && <p className="font-body text-xs mt-3 flex items-center gap-1.5" style={{ color: C.danger }}><AlertTriangle size={14} /> {erro}</p>}

      {linhas && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <label className="font-body text-xs" style={{ color: C.muted }}>Linha do cabeçalho
              <select value={iCab} onChange={(e) => { const i = Number(e.target.value); setICab(i); setIdx(i >= 0 ? mapaInicial(linhas[i].map(semAcento)) : {}); setErro(""); }} className={sel + " mt-1 max-w-[320px]"}>
                <option value={-1}>Escolha...</option>
                {linhas.slice(0, 40).map((l, i) => <option key={i} value={i}>{i + 1}: {l.filter(Boolean).join(" | ").slice(0, 70)}</option>)}
              </select>
            </label>
            <div className="flex gap-1.5">
              {[["lista", "Lista de atendimentos"], ["totais", "Totais por tipo"]].map(([k, r]) => (
                <button key={k} onClick={() => setModo(k)} className="font-body text-xs font-bold rounded-lg px-3 py-2 border" style={modo === k ? { background: C.blue, color: "#fff", borderColor: C.blue } : { background: "#fff", color: C.muted, borderColor: C.line }}>{r}</button>
              ))}
            </div>
            {modo === "totais" && (
              <label className="font-body text-xs" style={{ color: C.muted }}>Mês do relatório
                <input type="month" value={mesTotais} onChange={(e) => setMesTotais(e.target.value)} className={sel + " mt-1"} />
              </label>
            )}
          </div>

          {iCab >= 0 && (
            <>
              <p className="font-body text-[11px] font-bold uppercase tracking-wider mt-4 mb-2" style={{ color: C.soft }}>Confira as colunas</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {Object.entries(CAMPOS).filter(([k]) => (modo === "totais" ? ["categoria", "total"].includes(k) : k !== "total")).map(([k, def]) => (
                  <label key={k} className="font-body text-[11px]" style={{ color: C.muted }}>{def.r}{["data", "nome", "categoria", "total"].includes(k) && (modo === "totais" ? k !== "data" && k !== "nome" : k !== "total") ? " *" : ""}
                    <select value={idx[k] ?? -1} onChange={(e) => setIdx({ ...idx, [k]: Number(e.target.value) })} className={sel + " mt-0.5"}>
                      <option value={-1}>— não tem —</option>
                      {cabecalho.map((c, i) => <option key={i} value={i}>{c}</option>)}
                    </select>
                  </label>
                ))}
              </div>

              {modo === "lista" ? (
                <div className="mt-4">
                  <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{fichas.length} atendimento(s) encontrado(s)</p>
                  {resumoTipos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {resumoTipos.map(([c, n]) => <span key={c} className="font-body text-xs rounded-lg px-2.5 py-1 border" style={{ borderColor: C.line, color: "#425A70", background: c === "Outros" ? "#FFF7E8" : C.tint }}>{c}: <b style={{ color: C.ink }}>{n}</b></span>)}
                    </div>
                  )}
                  {fichas.length > 0 && (
                    <div className="mt-3 rounded-xl border overflow-x-auto" style={{ borderColor: C.line }}>
                      <table className="w-full font-body text-xs">
                        <thead><tr style={{ background: C.tint }}>{["Data", "Nome", "CPF/CNPJ", "Tipo na plataforma", "Canal"].map((h) => <th key={h} className="text-left px-2 py-1.5" style={{ color: C.ink }}>{h}</th>)}</tr></thead>
                        <tbody>{fichas.slice(0, 8).map((f, i) => (
                          <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
                            <td className="px-2 py-1.5">{f.data.split("-").reverse().join("/")}</td><td className="px-2 py-1.5">{f.nome}</td>
                            <td className="px-2 py-1.5">{f.documento ? `${f.documento.slice(0, 3)}•••` : "—"}</td><td className="px-2 py-1.5">{f.categoria}</td><td className="px-2 py-1.5">{f.canal}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                      {fichas.length > 8 && <p className="font-body text-[11px] px-2 py-1.5" style={{ color: C.soft }}>… e mais {fichas.length - 8}.</p>}
                    </div>
                  )}
                  {fichas.length === 0 && <p className="font-body text-xs mt-1" style={{ color: C.muted }}>Escolha as colunas de <b>Data</b> e <b>Nome</b>. Se o relatório só tem totais por tipo, use "Totais por tipo".</p>}
                  <p className="font-body text-[11px] mt-2" style={{ color: C.soft }}>Atendimentos com a mesma data, CPF/CNPJ (ou nome) e tipo que já estão na plataforma não são repetidos. Tipos que não reconheci entram como "Outros" (o nome original do GISE fica nas observações).</p>
                  <button disabled={!fichas.length || gravando} onClick={gravarFichas} className="mt-3 font-body text-sm font-bold rounded-xl px-4 py-2.5 text-white inline-flex items-center gap-1.5 disabled:opacity-50" style={{ background: C.green }}>
                    <CheckCircle2 size={15} /> {gravando ? "Importando..." : `Importar ${fichas.length} atendimento(s)`}
                  </button>
                </div>
              ) : (
                <div className="mt-4">
                  <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{Object.values(totais).reduce((s, n) => s + n, 0)} atendimento(s) no total</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {Object.entries(totais).sort((a, b) => b[1] - a[1]).map(([c, n]) => <span key={c} className="font-body text-xs rounded-lg px-2.5 py-1 border" style={{ borderColor: C.line, color: "#425A70", background: C.tint }}>{c}: <b style={{ color: C.ink }}>{n}</b></span>)}
                  </div>
                  <p className="font-body text-[11px] mt-2" style={{ color: C.soft }}>Lança os totais do mês escolhido. Se já houver um número maior lançado para o mesmo tipo, ele é mantido.</p>
                  <button disabled={!Object.keys(totais).length || gravando} onClick={gravarTotais} className="mt-3 font-body text-sm font-bold rounded-xl px-4 py-2.5 text-white inline-flex items-center gap-1.5 disabled:opacity-50" style={{ background: C.green }}>
                    <CheckCircle2 size={15} /> {gravando ? "Lançando..." : "Lançar totais do mês"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
