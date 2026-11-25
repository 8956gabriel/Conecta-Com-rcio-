// =============================================================================
// SALA DO EMPREENDEDOR — BASE DE EMPRESAS DO MUNICÍPIO
// Importa a planilha de CNPJs (Excel ou CSV), atualiza a base sempre que uma
// planilha nova for enviada e cruza com os atendimentos da Sala (cobertura).
// Tabela: sala_empresas_base (ver supabase-sala-empresas.sql).
// =============================================================================
import React, { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Download, MessageCircle, PlusCircle, Search, Upload, AlertTriangle, Sparkles, Percent } from "lucide-react";
import { supabase, supabaseConfigurado } from "./supabaseClient";
import { registrarAcessoSala } from "./SalaGestao.jsx";

const E = { blue: "#0A5AA8", tint: "#EAF2FB", tint2: "#F5F9FD", ink: "#0E2233", muted: "#5C7186", soft: "#8896A6", line: "#DCE7F2", danger: "#B4462F", green: "#1E8E5A", amber: "#E8A23D" };
const soDigitos = (v) => String(v ?? "").replace(/\D/g, "");
const hojeISO = () => new Date().toLocaleDateString("sv-SE");
const dataBR = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—");
const PORTES = { MEI: "#1E8E5A", ME: "#0A5AA8", EPP: "#7E5BEF", DEMAIS: "#5C7186" };

// Número que veio do Excel como 209880000100.0 → "00209880000100"
function normalizarCNPJ(v) {
  let d = typeof v === "number" ? String(Math.round(v)) : soDigitos(v);
  if (!d) return "";
  if (d.length < 14) d = d.padStart(14, "0");
  return d.length === 14 ? d : "";
}
function normalizarFone(v) {
  if (v === null || v === undefined) return null;
  const d = typeof v === "number" ? String(Math.round(v)) : soDigitos(v);
  return d.length >= 8 ? d : null;
}
function formatarCNPJ(d) { return d?.length === 14 ? d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5") : d || ""; }
function formatarFone(d) {
  if (!d) return "";
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}
function linkWhats(fone) {
  const d = soDigitos(fone);
  if (d.length < 10) return null;
  // celular antigo sem o 9 (ex.: 44 9883-4374) → acrescenta o 9
  const n = d.length === 10 && /^[6-9]/.test(d[2]) ? `${d.slice(0, 2)}9${d.slice(2)}` : d;
  return `https://wa.me/55${n}`;
}
// O nome do MEI costuma terminar com o CPF do dono → esconde (LGPD)
const esconderCPF = (nome) => String(nome || "").replace(/(\D|^)(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})\s*$/, (m, a) => `${a}***.***.***-**`).trim();

// ----------------------------------------------------------------------------
// Leitura da planilha: acha a linha de cabeçalho e as colunas pelo nome
// ----------------------------------------------------------------------------
const COLUNAS = {
  cnpj: ["cnpj"],
  razao_social: ["razão social", "razao social", "nome empresarial", "razão", "nome"],
  porte: ["porte"],
  cnae: ["cnae", "atividade"],
  municipio: ["município", "municipio", "cidade"],
  telefone1: ["telefone 1", "telefone1", "telefone", "fone 1", "celular"],
  telefone2: ["telefone 2", "telefone2", "fone 2"],
};
async function lerPlanilha(arquivo) {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await arquivo.arrayBuffer(), { type: "array" });
  const mapa = {};
  for (const nome of wb.SheetNames) {
    const linhas = XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, raw: true, defval: null });
    const iCab = linhas.findIndex((l) => (l || []).some((c) => String(c ?? "").trim().toLowerCase() === "cnpj"));
    if (iCab < 0) continue;
    const cab = linhas[iCab].map((c) => String(c ?? "").trim().toLowerCase());
    const idx = {};
    for (const [campo, nomes] of Object.entries(COLUNAS)) idx[campo] = cab.findIndex((c) => nomes.some((n) => c === n || c.startsWith(n)));
    for (const l of linhas.slice(iCab + 1)) {
      const cnpj = normalizarCNPJ(l?.[idx.cnpj]);
      if (!cnpj) continue;
      const v = (campo) => (idx[campo] >= 0 ? l[idx[campo]] : null);
      const txt = (x) => { const s = String(x ?? "").trim(); return s && s !== "-" ? s : null; };
      mapa[cnpj] = {
        cnpj,
        razao_social: txt(v("razao_social")) || "(sem nome)",
        porte: (txt(v("porte")) || "").toUpperCase() || null,
        cnae: txt(v("cnae")),
        municipio: txt(v("municipio")),
        telefone1: normalizarFone(v("telefone1")),
        telefone2: normalizarFone(v("telefone2")),
      };
    }
  }
  return Object.values(mapa);
}

// Faixas de cobertura do critério 17 do Selo (regulamento 2026) — referência interna
function faixaCobertura(pct) {
  if (pct >= 25) return "25% ou mais (faixa máxima do critério 17)";
  if (pct >= 20) return "20% a 24,99%";
  if (pct >= 15) return "15% a 19,99%";
  if (pct >= 10) return "10% a 14,99%";
  if (pct >= 5) return "5% a 9,99%";
  return "abaixo de 5%";
}

let demoBase = [];

export function AbaBaseEmpresas({ ctx }) {
  const [base, setBase] = useState(null);
  const [importacoes, setImportacoes] = useState([]);
  const [previa, setPrevia] = useState(null); // { arquivo, linhas, novas, atualizadas, sairam }
  const [completa, setCompleta] = useState(true);
  const [importando, setImportando] = useState(false);
  const [busca, setBusca] = useState("");
  const [porte, setPorte] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [pagina, setPagina] = useState(1);

  const carregar = async () => {
    if (!supabaseConfigurado) { setBase(demoBase); return; }
    // busca em páginas de 1000 (limite do Supabase)
    let todas = [], de = 0;
    for (;;) {
      const { data, error } = await supabase.from("sala_empresas_base").select("*").order("razao_social").range(de, de + 999);
      if (error) { ctx.avisar(/relation|schema cache/i.test(error.message) ? "Falta rodar o arquivo supabase-sala-empresas.sql no Supabase." : error.message, "erro"); setBase([]); return; }
      todas = todas.concat(data || []);
      if (!data || data.length < 1000) break;
      de += 1000;
    }
    setBase(todas);
    supabase.from("sala_empresas_importacoes").select("*").order("criado_em", { ascending: false }).limit(5).then(({ data }) => setImportacoes(data || []));
  };
  useEffect(() => { carregar(); }, []);

  // CNPJs já atendidos pela Sala (pelos atendimentos carregados)
  const atendidos = useMemo(() => {
    const m = {};
    (ctx.atendimentos || []).forEach((a) => { const d = soDigitos(a.documento); if (d.length === 14) { m[d] = m[d] || { n: 0, ultimo: a.data }; m[d].n += 1; if (a.data > m[d].ultimo) m[d].ultimo = a.data; } });
    return m;
  }, [ctx.atendimentos]);

  const escolherArquivo = async (e) => {
    const arq = e.target.files?.[0]; e.target.value = "";
    if (!arq) return;
    try {
      const linhas = await lerPlanilha(arq);
      if (!linhas.length) { ctx.avisar("Não achei a coluna CNPJ nessa planilha.", "erro"); return; }
      const atuais = Object.fromEntries((base || []).map((b) => [b.cnpj, b]));
      const novas = linhas.filter((l) => !atuais[l.cnpj]);
      const atualizadas = linhas.filter((l) => atuais[l.cnpj] && ["razao_social", "porte", "cnae", "telefone1", "telefone2"].some((k) => (atuais[l.cnpj][k] || null) !== (l[k] || null)));
      const presentes = new Set(linhas.map((l) => l.cnpj));
      const sairam = (base || []).filter((b) => b.ativo_na_base !== false && !presentes.has(b.cnpj));
      setPrevia({ arquivo: arq.name, linhas, novas, atualizadas, sairam });
    } catch (err) {
      ctx.avisar("Não consegui ler a planilha: " + err.message, "erro");
    }
  };

  const confirmarImportacao = async () => {
    const { linhas, novas, atualizadas, sairam, arquivo } = previa;
    setImportando(true);
    const agora = new Date().toISOString();
    const registros = linhas.map((l) => ({ ...l, atualizado_em: agora, ativo_na_base: true }));
    if (!supabaseConfigurado) {
      const atuais = Object.fromEntries(demoBase.map((b) => [b.cnpj, b]));
      registros.forEach((r) => { atuais[r.cnpj] = { primeira_vez: atuais[r.cnpj]?.primeira_vez || hojeISO(), ...r }; });
      if (completa) sairam.forEach((s) => { atuais[s.cnpj] = { ...atuais[s.cnpj], ativo_na_base: false }; });
      demoBase = Object.values(atuais).sort((a, b) => a.razao_social.localeCompare(b.razao_social));
      setBase(demoBase);
    } else {
      for (let i = 0; i < registros.length; i += 500) {
        const { error } = await supabase.from("sala_empresas_base").upsert(registros.slice(i, i + 500), { onConflict: "cnpj" });
        if (error) { setImportando(false); ctx.avisar(/row-level|permission/i.test(error.message) ? "Só o gestor ou o administrador pode importar a base." : "Erro ao importar: " + error.message, "erro"); return; }
      }
      if (completa && sairam.length) {
        const cnpjs = sairam.map((s) => s.cnpj);
        for (let i = 0; i < cnpjs.length; i += 300) await supabase.from("sala_empresas_base").update({ ativo_na_base: false }).in("cnpj", cnpjs.slice(i, i + 300));
      }
      await supabase.from("sala_empresas_importacoes").insert({ arquivo, total: linhas.length, novas: novas.length, atualizadas: atualizadas.length, sairam: completa ? sairam.length : 0, feito_por: ctx.meuNome });
      await carregar();
    }
    setImportando(false);
    setPrevia(null);
    ctx.avisar(`Base atualizada: ${linhas.length} empresas (${novas.length} novas).`);
  };

  const ativas = (base || []).filter((b) => b.ativo_na_base !== false);
  const ultimaImport = importacoes[0];
  const limiteNovas = new Date(); limiteNovas.setDate(limiteNovas.getDate() - 45);
  const limNovas = limiteNovas.toLocaleDateString("sv-SE");
  // "Nova" = entrou depois da primeira carga da base (na 1ª importação ninguém é "nova")
  const primeiraCarga = (base || []).reduce((m, b) => (b.primeira_vez && b.primeira_vez < m ? b.primeira_vez : m), "9999-12-31");
  const ehNova = (b) => b.primeira_vez >= limNovas && b.primeira_vez > primeiraCarga;
  const nAtendidas = ativas.filter((b) => atendidos[b.cnpj]).length;
  const cobertura = ativas.length ? (nAtendidas / ativas.length) * 100 : 0;
  const contaPorte = {}; ativas.forEach((b) => { const p = b.porte || "—"; contaPorte[p] = (contaPorte[p] || 0) + 1; });

  const lista = (filtro === "saiu" ? (base || []).filter((b) => b.ativo_na_base === false) : ativas).filter((b) => {
    if (porte && b.porte !== porte) return false;
    if (filtro === "atendidas" && !atendidos[b.cnpj]) return false;
    if (filtro === "nao_atendidas" && atendidos[b.cnpj]) return false;
    if (filtro === "novas" && !ehNova(b)) return false;
    const t = busca.trim().toLowerCase();
    if (!t) return true;
    const td = soDigitos(t);
    return `${b.razao_social} ${b.cnae || ""}`.toLowerCase().includes(t) || (td.length >= 4 && b.cnpj.includes(td));
  });
  const POR_PAG = 50;
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAG));
  const visiveis = lista.slice((pagina - 1) * POR_PAG, pagina * POR_PAG);
  useEffect(() => { setPagina(1); }, [busca, porte, filtro]);

  const exportar = () => {
    registrarAcessoSala("exportou_relatorio", `Base de empresas (${lista.length})`, ctx.meuNome);
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const txt = [["CNPJ", "Razão social", "Porte", "CNAE", "Telefone 1", "Telefone 2", "Atendida pela Sala", "Na base desde"], ...lista.map((b) => [formatarCNPJ(b.cnpj), b.razao_social, b.porte, b.cnae, formatarFone(b.telefone1), formatarFone(b.telefone2), atendidos[b.cnpj] ? `Sim (${atendidos[b.cnpj].n})` : "Não", dataBR(b.primeira_vez)])].map((l) => l.map(esc).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + txt], { type: "text/csv;charset=utf-8" }));
    a.download = `empresas-ivatuba-${filtro}.csv`; a.click();
  };

  const Chip = ({ k, r }) => <button onClick={() => setFiltro(k)} className="font-body text-xs font-bold rounded-full px-3 py-1.5 border" style={filtro === k ? { background: E.blue, color: "#fff", borderColor: E.blue } : { background: "#fff", color: "#425A70", borderColor: E.line }}>{r}</button>;

  return (
    <div>
      <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
        <div>
          <p className="font-body text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: E.blue }}>Município</p>
          <h2 className="font-display font-extrabold text-xl md:text-2xl mt-1" style={{ color: E.ink }}>Base de empresas de Ivatuba</h2>
          <p className="font-body text-sm mt-1" style={{ color: E.muted }}>Importe a planilha de CNPJs sempre que tiver uma nova: a base é atualizada e cruzada com os atendimentos da Sala.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ctx.gerir && (
            <label className="font-body text-xs font-bold rounded-lg px-3 py-2 inline-flex items-center gap-1.5 text-white cursor-pointer" style={{ background: E.blue }}>
              <Upload size={14} /> Importar / atualizar planilha
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={escolherArquivo} />
            </label>
          )}
          {lista.length > 0 && <button onClick={exportar} className="font-body text-xs font-bold rounded-lg px-3 py-2 inline-flex items-center gap-1.5 border bg-white" style={{ borderColor: E.line, color: E.blue }}><Download size={14} /> Exportar lista (CSV)</button>}
        </div>
      </div>

      {previa && (
        <div className="rounded-2xl border-2 p-4 md:p-5 mb-5 bg-white" style={{ borderColor: E.blue }}>
          <p className="font-display font-bold text-sm" style={{ color: E.ink }}>Conferir antes de atualizar — {previa.arquivo}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            {[["Empresas na planilha", previa.linhas.length, E.blue], ["Novas", previa.novas.length, E.green], ["Com dados alterados", previa.atualizadas.length, E.amber], ["Saíram da lista", previa.sairam.length, E.danger]].map(([r, v, c]) => (
              <div key={r} className="rounded-xl p-3" style={{ background: `${c}12` }}><p className="font-body text-[11px] font-bold" style={{ color: c }}>{r}</p><p className="font-display font-extrabold text-xl" style={{ color: E.ink }}>{v}</p></div>
            ))}
          </div>
          {previa.novas.length > 0 && <p className="font-body text-xs mt-3" style={{ color: E.muted }}>Novas: {previa.novas.slice(0, 6).map((n) => esconderCPF(n.razao_social)).join(" · ")}{previa.novas.length > 6 ? ` e mais ${previa.novas.length - 6}` : ""}</p>}
          {previa.sairam.length > 0 && (
            <label className="flex items-start gap-2 font-body text-xs mt-3" style={{ color: E.ink }}>
              <input type="checkbox" className="mt-0.5" checked={completa} onChange={(e) => setCompleta(e.target.checked)} />
              <span>Esta planilha é a lista completa do município (as {previa.sairam.length} que não vieram ficam marcadas como "saíram da base" — nada é apagado)</span>
            </label>
          )}
          <div className="flex gap-2 mt-4">
            <button onClick={confirmarImportacao} disabled={importando} className="font-body text-xs font-bold rounded-lg px-4 py-2 text-white inline-flex items-center gap-1.5 disabled:opacity-60" style={{ background: E.green }}><CheckCircle2 size={14} /> {importando ? "Atualizando..." : "Confirmar e atualizar a base"}</button>
            <button onClick={() => setPrevia(null)} className="font-body text-xs font-bold rounded-lg px-4 py-2 border bg-white" style={{ borderColor: E.line, color: E.muted }}>Cancelar</button>
          </div>
        </div>
      )}

      {base === null ? <p className="font-body text-sm" style={{ color: E.muted }}>Carregando...</p> : ativas.length === 0 && !previa ? (
        <div className="rounded-2xl border p-8 text-center bg-white" style={{ borderColor: E.line }}>
          <Building2 size={32} className="mx-auto" color={E.blue} />
          <p className="font-display font-bold mt-2" style={{ color: E.ink }}>Nenhuma empresa na base ainda</p>
          <p className="font-body text-sm mt-1" style={{ color: E.muted }}>{ctx.gerir ? 'Clique em "Importar / atualizar planilha" e escolha o Excel com os CNPJs de Ivatuba.' : "Peça ao gestor da Sala para importar a planilha de empresas."}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border p-4 bg-white" style={{ borderColor: E.line }}>
              <p className="font-body text-xs font-bold flex items-center gap-1.5" style={{ color: E.muted }}><Building2 size={14} color={E.blue} /> Empresas na base</p>
              <p className="font-display font-extrabold text-2xl mt-1" style={{ color: E.ink }}>{ativas.length}</p>
              <p className="font-body text-[11px]" style={{ color: E.soft }}>{Object.entries(contaPorte).sort((a, b) => b[1] - a[1]).map(([p, n]) => `${n} ${p}`).join(" · ")}</p>
            </div>
            <div className="rounded-2xl border p-4 bg-white" style={{ borderColor: E.line }}>
              <p className="font-body text-xs font-bold flex items-center gap-1.5" style={{ color: E.muted }}><CheckCircle2 size={14} color={E.green} /> Já atendidas pela Sala</p>
              <p className="font-display font-extrabold text-2xl mt-1" style={{ color: E.ink }}>{nAtendidas}</p>
              <p className="font-body text-[11px]" style={{ color: E.soft }}>CNPJ registrado nos atendimentos</p>
            </div>
            <div className="rounded-2xl border p-4 bg-white" style={{ borderColor: E.line }}>
              <p className="font-body text-xs font-bold flex items-center gap-1.5" style={{ color: E.muted }}><Percent size={14} color="#7E5BEF" /> Cobertura</p>
              <p className="font-display font-extrabold text-2xl mt-1" style={{ color: E.ink }}>{cobertura.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</p>
              <p className="font-body text-[11px]" style={{ color: E.soft }}>Selo, critério 17: {faixaCobertura(cobertura)}</p>
            </div>
            <div className="rounded-2xl border p-4 bg-white" style={{ borderColor: E.line }}>
              <p className="font-body text-xs font-bold flex items-center gap-1.5" style={{ color: E.muted }}><Sparkles size={14} color={E.amber} /> Novas (45 dias)</p>
              <p className="font-display font-extrabold text-2xl mt-1" style={{ color: E.ink }}>{ativas.filter(ehNova).length}</p>
              <p className="font-body text-[11px]" style={{ color: E.soft }}>{ultimaImport ? `Última atualização: ${new Date(ultimaImport.criado_em).toLocaleDateString("pt-BR")}` : "boas para visitar e dar boas-vindas"}</p>
            </div>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden mt-3" style={{ background: E.tint }}><div className="h-full" style={{ width: `${Math.min(100, cobertura * 4)}%`, background: "#7E5BEF" }} /></div>
          <p className="font-body text-[10px] mt-1" style={{ color: E.soft }}>Barra cheia = 25% de cobertura (faixa máxima do critério 17). Estimativa interna: no Selo, a apuração oficial usa a base da Receita e o relatório do Sebrae.</p>

          <div className="flex flex-wrap gap-2 items-center mt-5 mb-3">
            <Chip k="todas" r="Todas" /><Chip k="nao_atendidas" r="Ainda não atendidas" /><Chip k="atendidas" r="Já atendidas" /><Chip k="novas" r="Novas" />
            {(base || []).some((b) => b.ativo_na_base === false) && <Chip k="saiu" r="Saíram da base" />}
            <select value={porte} onChange={(e) => setPorte(e.target.value)} className="font-body text-sm border rounded-lg px-2 py-1.5 outline-none" style={{ borderColor: E.line }}>
              <option value="">Todos os portes</option>{Object.keys(contaPorte).map((p) => <option key={p}>{p}</option>)}
            </select>
            <div className="relative ml-auto"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" color={E.soft} /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, CNPJ ou atividade" className="font-body text-sm border rounded-lg pl-8 pr-3 py-2 outline-none w-64" style={{ borderColor: E.line }} /></div>
          </div>
          <p className="font-body text-xs mb-2" style={{ color: E.muted }}>{lista.length} empresa(s)</p>

          <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: E.line }}>
            {visiveis.map((b, i) => {
              const at = atendidos[b.cnpj];
              const zap = linkWhats(b.telefone1) || linkWhats(b.telefone2);
              return (
                <div key={b.cnpj} className="px-4 py-3 flex flex-col md:flex-row md:items-center gap-2" style={{ borderTop: i ? `1px solid ${E.line}` : "none" }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-bold" style={{ color: E.ink }}>
                      {esconderCPF(b.razao_social)} {b.porte && <span className="font-body text-[10px] font-bold px-1.5 py-0.5 rounded-full align-middle" style={{ background: `${PORTES[b.porte] || E.soft}1A`, color: PORTES[b.porte] || E.soft }}>{b.porte}</span>}
                      {ehNova(b) && <span className="ml-1 font-body text-[10px] font-bold px-1.5 py-0.5 rounded-full align-middle" style={{ background: "#FFF4E0", color: "#B4602F" }}>nova</span>}
                    </p>
                    <p className="font-body text-[11px]" style={{ color: E.soft }}>{formatarCNPJ(b.cnpj)}{b.cnae ? ` · ${b.cnae}` : ""}</p>
                    <p className="font-body text-[11px]" style={{ color: E.muted }}>{[b.telefone1, b.telefone2].filter(Boolean).map(formatarFone).join(" · ") || "sem telefone"}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {at ? <span className="font-body text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: "#E7F6EE", color: E.green }}>✓ Atendida {at.n}x · {dataBR(at.ultimo)}</span> : <span className="font-body text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: E.tint2, color: E.soft }}>Ainda não atendida</span>}
                    {zap && <a href={zap} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg" style={{ color: "#25A85B" }} title="WhatsApp"><MessageCircle size={15} /></a>}
                    <button onClick={() => ctx.abrirAtendimento({ nome: esconderCPF(b.razao_social).replace(/\s*\*\*\*.*$/, ""), empresa: esconderCPF(b.razao_social).replace(/\s*\*\*\*.*$/, ""), documento: b.cnpj, whatsapp: b.telefone1 || b.telefone2 || "" })}
                      className="font-body text-[11px] font-bold rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1 text-white" style={{ background: E.blue }} title="Registrar atendimento desta empresa"><PlusCircle size={12} /> Atender</button>
                  </div>
                </div>
              );
            })}
          </div>
          {paginas > 1 && (
            <div className="flex items-center justify-center gap-2 mt-3 font-body text-xs">
              <button disabled={pagina === 1} onClick={() => setPagina(pagina - 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40" style={{ borderColor: E.line }}>Anterior</button>
              <span style={{ color: E.muted }}>Página {pagina} de {paginas}</span>
              <button disabled={pagina === paginas} onClick={() => setPagina(pagina + 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40" style={{ borderColor: E.line }}>Próxima</button>
            </div>
          )}
          {!ctx.gerir && <p className="font-body text-[11px] mt-3 flex items-center gap-1" style={{ color: E.soft }}><AlertTriangle size={12} /> Só o gestor ou o administrador da Sala importa planilhas novas.</p>}
        </>
      )}
    </div>
  );
}
