import React, { useEffect, useState } from "react";
import { X, Copy, Check, MessageCircle, Sparkles, ShieldCheck } from "lucide-react";
import { supabase, supabaseConfigurado } from "../supabaseClient";

// Identidade: azul-marinho, amarelo institucional, branco e cinza-claro
export const C = {
  navy: "#0B1F44", navy2: "#14306B", navyTint: "#EEF2F9", yellow: "#F9D10B", yellowDeep: "#E2B800", yellowTint: "#FFF8D6", yellowInk: "#6B5400",
  gray: "#F3F5F8", line: "#E1E6EE", ink: "#101A2B", muted: "#5B6B80", soft: "#8A98AB",
  green: "#178A57", greenTint: "#E5F5EC", red: "#B4362F", redTint: "#FBEAE8", blue: "#2257D6",
};
export const inp = "font-body text-sm border rounded-xl px-3 py-2.5 outline-none bg-white w-full focus:ring-2 focus:ring-yellow-300";
export const inpS = { borderColor: C.line };

export function Titulo({ eyebrow, title, sub, direita }) {
  return (
    <div className="flex items-end justify-between gap-3 flex-wrap mb-5">
      <div className="min-w-0">
        {eyebrow && <p className="font-body text-[11px] font-bold tracking-[0.16em] uppercase flex items-center gap-1.5" style={{ color: C.yellowInk }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: C.yellow }} />{eyebrow}</p>}
        <h2 className="font-display font-extrabold text-xl md:text-2xl mt-0.5" style={{ color: C.navy }}>{title}</h2>
        {sub && <p className="font-body text-sm mt-1 max-w-3xl" style={{ color: C.muted }}>{sub}</p>}
      </div>
      {direita && <div className="flex gap-2 flex-wrap">{direita}</div>}
    </div>
  );
}
export function Btn({ children, onClick, tipo = "navy", icon: Icon, className = "", disabled, title, type = "button", small, big }) {
  const st = { navy: { background: C.navy, color: "#fff" }, amarelo: { background: C.yellow, color: C.navy }, claro: { background: "#fff", color: C.ink, border: `1px solid ${C.line}` }, verde: { background: C.green, color: "#fff" }, perigo: { background: C.redTint, color: C.red }, fantasma: { background: C.navyTint, color: C.navy } }[tipo];
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 font-body font-bold rounded-xl transition active:scale-[0.98] hover:brightness-95 disabled:opacity-50 ${small ? "text-xs px-2.5 py-1.5" : big ? "text-base px-5 py-3.5" : "text-sm px-3.5 py-2.5"} ${className}`} style={st}>
      {Icon && <Icon size={small ? 13 : big ? 18 : 15} />}{children}
    </button>
  );
}
export function Card({ children, className = "", style, onClick }) {
  return <div onClick={onClick} className={`rounded-2xl border bg-white p-4 ${onClick ? "cursor-pointer hover:shadow-md transition" : ""} ${className}`} style={{ borderColor: C.line, ...style }}>{children}</div>;
}
export function KPI({ titulo, valor, sub, icon: Icon, cor = C.navy, destaque, onClick }) {
  return (
    <div onClick={onClick} className={`rounded-2xl border bg-white p-4 relative overflow-hidden ${onClick ? "cursor-pointer hover:shadow-md" : ""}`} style={{ borderColor: destaque ? C.yellow : C.line }}>
      {destaque && <span className="absolute inset-x-0 top-0 h-1" style={{ background: C.yellow }} />}
      <div className="flex items-start justify-between gap-2">
        <p className="font-body text-[11px] font-bold uppercase tracking-wide leading-tight" style={{ color: C.muted }}>{titulo}</p>
        {Icon && <span className="w-8 h-8 shrink-0 rounded-xl flex items-center justify-center" style={{ background: `${cor}14`, color: cor }}><Icon size={15} /></span>}
      </div>
      <p className="font-display font-extrabold text-2xl mt-1" style={{ color: C.ink }}>{valor}</p>
      {sub && <p className="font-body text-[11px]" style={{ color: C.soft }}>{sub}</p>}
    </div>
  );
}
export function Aviso({ children, tipo = "info" }) {
  const c = { erro: [C.redTint, C.red], ok: [C.greenTint, C.green], amarelo: [C.yellowTint, C.yellowInk], info: [C.navyTint, C.navy2] }[tipo];
  return <div className="rounded-xl px-3.5 py-2.5 font-body text-xs leading-relaxed" style={{ background: c[0], color: c[1] }}>{children}</div>;
}
export function Chip({ children, cor = C.navy, ativo, onClick }) {
  return <span onClick={onClick} className={`inline-flex items-center gap-1 font-body text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${onClick ? "cursor-pointer select-none" : ""}`} style={{ background: ativo ? cor : `${cor}14`, color: ativo ? (cor === C.yellow ? C.navy : "#fff") : cor }}>{children}</span>;
}
export function Selo({ tipo }) {
  const s = { ia: [C.yellowTint, C.yellowInk, Sparkles, "Sugestão da IA"], sistema: [C.navyTint, C.navy2, Sparkles, "Sugestão do sistema"], oficial: [C.greenTint, C.green, ShieldCheck, "Cadastrado pelo administrador"] }[tipo];
  const I = s[2];
  return <span className="inline-flex items-center gap-1 font-body text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: s[0], color: s[1] }}><I size={11} />{s[3]}</span>;
}
export function Vazio({ children }) {
  return <div className="rounded-2xl border border-dashed p-8 text-center font-body text-sm" style={{ borderColor: C.line, color: C.muted }}>{children}</div>;
}
export function Texto({ children, className = "" }) {
  return <p className={`font-body text-sm whitespace-pre-line leading-relaxed ${className}`} style={{ color: C.ink }}>{children}</p>;
}
export function Modal({ aberto = true, onFechar, titulo, children, largura = "max-w-2xl" }) {
  useEffect(() => { const e = (ev) => ev.key === "Escape" && onFechar(); window.addEventListener("keydown", e); return () => window.removeEventListener("keydown", e); }, []);
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center sm:p-4" style={{ background: "rgba(11,31,68,0.55)" }} onClick={onFechar}>
      <div className={`bg-white w-full ${largura} max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl animate-[subir_.18s_ease-out]`} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white/95 backdrop-blur flex items-center justify-between gap-3 px-5 py-4 border-b z-10" style={{ borderColor: C.line }}>
          <p className="font-display font-extrabold text-base" style={{ color: C.navy }}>{titulo}</p>
          <button onClick={onFechar} aria-label="Fechar" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: C.gray }}><X size={17} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
export function Campo({ label, children, className = "", dica }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="font-body text-[11px] font-bold uppercase tracking-wide" style={{ color: C.muted }}>{label}</span>
      {children}
      {dica && <span className="font-body text-[11px]" style={{ color: C.soft }}>{dica}</span>}
    </label>
  );
}
export function Campos({ campos, v, set }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {campos.filter(Boolean).map((c) => {
        const val = v[c.k] ?? "";
        const on = (e) => set({ ...v, [c.k]: c.t === "checkbox" ? e.target.checked : e.target.value });
        let el;
        if (c.t === "select") el = <select value={val} onChange={on} className={inp} style={inpS}>{!c.semVazio && <option value="">{c.vazio || "—"}</option>}{c.op.map(([a, b]) => <option key={a} value={a}>{b}</option>)}</select>;
        else if (c.t === "textarea") el = <textarea value={val} onChange={on} rows={c.rows || 3} className={inp} style={inpS} placeholder={c.ph} />;
        else if (c.t === "checkbox") el = <span className="flex items-center gap-2 font-body text-sm py-2"><input type="checkbox" checked={!!val} onChange={on} className="w-4 h-4" /> {c.texto}</span>;
        else if (c.t === "multi") { const arr = Array.isArray(val) ? val : []; el = <div className="flex flex-wrap gap-1.5 py-1">{c.op.map(([a, b]) => { const on2 = arr.includes(a); return <button type="button" key={a} onClick={() => set({ ...v, [c.k]: on2 ? arr.filter((x) => x !== a) : [...arr, a] })} className="font-body text-xs font-bold px-2.5 py-1 rounded-full border" style={{ background: on2 ? C.navy : "#fff", color: on2 ? "#fff" : C.muted, borderColor: on2 ? C.navy : C.line }}>{b}</button>; })}</div>; }
        else el = <input type={c.t || "text"} value={val} onChange={on} className={inp} style={inpS} placeholder={c.ph} step={c.t === "number" ? "any" : undefined} inputMode={c.im} />;
        return <Campo key={c.k} label={`${c.l}${c.req ? " *" : ""}`} dica={c.dica} className={c.full ? "sm:col-span-2" : ""}>{el}</Campo>;
      })}
    </div>
  );
}
export function Copiar({ texto, rotulo = "Copiar", small = true, tipo = "claro" }) {
  const [ok, setOk] = useState(false);
  return <Btn small={small} tipo={tipo} icon={ok ? Check : Copy} onClick={async () => { try { await navigator.clipboard.writeText(texto); } catch { window.prompt("Copie o texto:", texto); } setOk(true); setTimeout(() => setOk(false), 1600); }}>{ok ? "Copiado!" : rotulo}</Btn>;
}
export function linkZap(numero, texto) { const n = String(numero || "").replace(/\D/g, ""); return `https://wa.me/${n ? (n.length <= 11 ? `55${n}` : n) : ""}?text=${encodeURIComponent(texto || "")}`; }
export function Zap({ numero, texto, rotulo = "WhatsApp", small = true }) {
  return <a href={linkZap(numero, texto)} target="_blank" rel="noopener" className={`inline-flex items-center gap-1.5 font-body font-bold rounded-xl ${small ? "text-xs px-2.5 py-1.5" : "text-sm px-3.5 py-2.5"}`} style={{ background: "#25D366", color: "#063D1D" }}><MessageCircle size={small ? 13 : 15} />{rotulo}</a>;
}
export function Barra({ pct, cor = C.navy }) {
  return <div className="h-2.5 rounded-full overflow-hidden" style={{ background: C.gray }}><div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, pct || 0))}%`, background: cor }} /></div>;
}

export async function chamarIA({ modo, pedido, messages, contexto }) {
  if (!supabaseConfigurado) throw new Error("Modo demonstração.");
  const { data } = await supabase.auth.getSession();
  const r = await fetch("/api/maisbb-ia", { method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${data?.session?.access_token || ""}` }, body: JSON.stringify({ modo, pedido, messages, contexto }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || "Não foi possível falar com a IA."); e.semChave = j.semChave; throw e; }
  return j.texto || "";
}

// ----------------------------------------------------------------- DADOS
const TAB = {
  config: ["maisbb_config", "id", true, true], membros: ["maisbb_membros", "nome", true], servicos: ["maisbb_servicos", "nome", true], publicos: ["maisbb_publicos", "nome", true],
  clientes: ["maisbb_clientes", "criado_em", false], atendimentos: ["maisbb_atendimentos", "numero", false], prospeccoes: ["maisbb_prospeccoes", "data", false],
  locais: ["maisbb_locais", "criado_em", false], tarefas: ["maisbb_tarefas", "data", true], campanhas: ["maisbb_campanhas", "criado_em", false], marketing: ["maisbb_marketing", "criado_em", false],
  metas: ["maisbb_metas", "criado_em", true], dias: ["maisbb_dias", "data", false], desafios: ["maisbb_desafios", "inicio", false], sorteios: ["maisbb_sorteios", "realizado_em", false],
  conhecimento: ["maisbb_conhecimento", "titulo", true], dicas: ["maisbb_dicas", "criado_em", false], treinamentos: ["maisbb_treinamentos", "ordem", true], progresso: ["maisbb_progresso", "concluido_em", false],
};
const PK = { dias: ["data", "user_id"], progresso: ["user_id", "chave"], membros: ["user_id"] };
export const msgErro = (e) => { const m = e?.message || String(e); if (/maisbb_clientes_cpf_uk|duplicate key/i.test(m)) return "Já existe um cadastro com este CPF."; if (/row-level security|permission denied/i.test(m)) return "Sem permissão para esta ação (somente administrador)."; if (/does not exist|schema cache/i.test(m)) return "O banco do Mais BB Digital ainda não foi instalado."; return m; };

export function useDados(ativo) {
  const [D, setD] = useState(null);
  const [erro, setErro] = useState(null);
  const carregar = async () => {
    if (!supabaseConfigurado) { setD(Object.fromEntries(Object.keys(TAB).map((k) => [k, k === "config" ? {} : []]))); return; }
    const res = await Promise.all(Object.entries(TAB).map(async ([k, [t, ord, asc, um]]) => {
      const out = [];
      for (let de = 0; ; de += 1000) { const { data, error } = await supabase.from(t).select("*").order(ord, { ascending: asc }).range(de, de + 999); if (error) return [k, um ? {} : [], error]; out.push(...data); if (data.length < 1000) break; }
      return [k, um ? out[0] || {} : out];
    }));
    const f = res.find((r) => r[2]); setErro(f ? f[2].message : null);
    setD(Object.fromEntries(res.map(([k, v]) => [k, v])));
  };
  useEffect(() => { if (ativo) carregar(); }, [ativo]);
  const chave = (k, row) => (PK[k] || ["id"]).map((c) => row[c]).join("|");
  const salvar = async (k, id, dados) => {
    const [t] = TAB[k];
    if (!supabaseConfigurado) { const row = { id: id || `demo-${Date.now()}`, criado_em: new Date().toISOString(), ...dados }; setD((x) => ({ ...x, [k]: k === "config" ? { ...x.config, ...dados } : [row, ...x[k].filter((r) => r.id !== row.id)] })); return row; }
    let q;
    if (k === "config") q = supabase.from(t).update(dados).eq("id", 1).select().single();
    else if (PK[k] && k !== "membros") q = supabase.from(t).upsert(dados).select().single();
    else if (id) q = supabase.from(t).update(dados).eq(k === "membros" ? "user_id" : "id", id).select().single();
    else q = supabase.from(t).insert(dados).select().single();
    const { data, error } = await q;
    if (error) throw error;
    setD((x) => { if (k === "config") return { ...x, config: data }; const c = chave(k, data); const has = x[k].some((r) => chave(k, r) === c); return { ...x, [k]: has ? x[k].map((r) => (chave(k, r) === c ? data : r)) : [data, ...x[k]] }; });
    return data;
  };
  const apagar = async (k, id) => {
    const [t] = TAB[k];
    if (supabaseConfigurado) { const { error } = await supabase.from(t).delete().eq(k === "membros" ? "user_id" : "id", id); if (error) throw error; }
    setD((x) => ({ ...x, [k]: x[k].filter((r) => (r.id ?? r.user_id) !== id) }));
  };
  const enviarArquivo = async (file, pasta) => {
    if (!supabaseConfigurado) return URL.createObjectURL(file);
    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("maisbb").upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    return supabase.storage.from("maisbb").getPublicUrl(path).data.publicUrl;
  };
  return { D, setD, carregar, salvar, apagar, enviarArquivo, erro };
}
