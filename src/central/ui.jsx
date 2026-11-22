import React, { useEffect, useState } from "react";
import { X, Sparkles, ShieldCheck, Copy, MessageCircle, Check } from "lucide-react";
import { supabase, supabaseConfigurado } from "../supabaseClient";

// Identidade da Central: azul institucional + branco + detalhes amarelos
export const C = {
  blue: "var(--cor-principal, #0A5AA8)",
  blueHex: "#0A5AA8",
  blueDeep: "var(--cor-principal-profunda, #052A4D)",
  blueTint: "#EAF2FB",
  blueTint2: "#F5F9FD",
  yellow: "#F5B700",
  yellowTint: "#FFF7DB",
  yellowInk: "#7A5800",
  green: "#1E8E5A",
  greenTint: "#E7F6EE",
  ink: "#0E2233",
  muted: "#5C7186",
  soft: "#8896A6",
  line: "#DCE7F2",
  danger: "#B4462F",
  dangerTint: "#FBEAE5",
};
export const inputCls = "font-body text-sm border rounded-lg px-3 py-2.5 outline-none bg-white w-full focus:ring-2 focus:ring-blue-200";
export const inputSty = { borderColor: C.line };

export function Titulo({ eyebrow, title, sub, direita }) {
  return (
    <div className="flex items-end justify-between gap-3 flex-wrap mb-5">
      <div className="min-w-0">
        {eyebrow && <p className="font-display text-[11px] font-bold tracking-[0.16em] uppercase flex items-center gap-1.5" style={{ color: C.yellowInk }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: C.yellow }} />{eyebrow}</p>}
        <h2 className="font-display font-extrabold text-xl md:text-2xl mt-1" style={{ color: C.ink }}>{title}</h2>
        {sub && <p className="font-body text-sm mt-1 max-w-3xl" style={{ color: C.muted }}>{sub}</p>}
      </div>
      {direita && <div className="flex gap-2 flex-wrap">{direita}</div>}
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

export function Btn({ children, onClick, tipo = "prim", icon: Icon, className = "", disabled, title, type = "button", small }) {
  const st = {
    prim: { background: C.blue, color: "#fff" },
    amarelo: { background: C.yellow, color: "#2B1F00" },
    claro: { background: "#fff", color: C.ink, border: `1px solid ${C.line}` },
    verde: { background: C.green, color: "#fff" },
    perigo: { background: C.dangerTint, color: C.danger },
    fantasma: { background: C.blueTint2, color: C.blue },
  }[tipo];
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 font-body font-bold rounded-xl ${small ? "text-xs px-2.5 py-1.5" : "text-sm px-3.5 py-2.5"} disabled:opacity-50 transition hover:brightness-95 ${className}`} style={st}>
      {Icon && <Icon size={small ? 13 : 15} />}{children}
    </button>
  );
}

export function Card({ children, className = "", style, onClick }) {
  return <div onClick={onClick} className={`rounded-2xl border bg-white p-4 ${onClick ? "cursor-pointer hover:shadow-md transition" : ""} ${className}`} style={{ borderColor: C.line, ...style }}>{children}</div>;
}

export function KPI({ titulo, valor, sub, cor = C.blueHex, icon: Icon, destaque }) {
  return (
    <div className="rounded-2xl border p-4 bg-white relative overflow-hidden" style={{ borderColor: destaque ? C.yellow : C.line }}>
      {destaque && <span className="absolute top-0 left-0 right-0 h-1" style={{ background: C.yellow }} />}
      <div className="flex items-center justify-between gap-2">
        <p className="font-body text-[11px] font-bold uppercase tracking-wide leading-tight" style={{ color: C.muted }}>{titulo}</p>
        {Icon && <span className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center" style={{ background: `${cor}1A`, color: cor }}><Icon size={14} /></span>}
      </div>
      <p className="font-display font-extrabold text-2xl mt-1" style={{ color: C.ink }}>{valor}</p>
      {sub && <p className="font-body text-[11px] mt-0.5" style={{ color: C.soft }}>{sub}</p>}
    </div>
  );
}

export function Aviso({ children, tipo = "info" }) {
  const cores = tipo === "erro" ? [C.dangerTint, C.danger] : tipo === "ok" ? [C.greenTint, C.green] : tipo === "amarelo" ? [C.yellowTint, C.yellowInk] : [C.blueTint2, C.blueHex];
  return <div className="rounded-xl px-3.5 py-2.5 font-body text-xs leading-relaxed" style={{ background: cores[0], color: cores[1] }}>{children}</div>;
}

// Marca visual: sugestão da IA x informação oficial x sugestão do sistema
export function Selo({ tipo }) {
  const s = {
    ia: [C.yellowTint, C.yellowInk, Sparkles, "Sugestão da IA"],
    sistema: [C.blueTint2, C.blueHex, Sparkles, "Sugestão comercial"],
    oficial: [C.greenTint, C.green, ShieldCheck, "Informação oficial cadastrada"],
  }[tipo];
  const Icon = s[2];
  return <span className="inline-flex items-center gap-1 font-body text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: s[0], color: s[1] }}><Icon size={11} />{s[3]}</span>;
}

export function Chip({ children, cor = C.blueHex, onClick, ativo }) {
  return (
    <span onClick={onClick} className={`inline-flex items-center gap-1 font-body text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${onClick ? "cursor-pointer" : ""}`}
      style={{ background: ativo ? cor : `${cor}1A`, color: ativo ? "#fff" : cor }}>{children}</span>
  );
}

export function Modal({ aberto, onFechar, titulo, children, largura = "max-w-2xl" }) {
  useEffect(() => {
    if (!aberto) return;
    const esc = (e) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto]);
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(5,42,77,0.55)" }} onClick={onFechar}>
      <div className={`bg-white w-full ${largura} max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white/95 backdrop-blur flex items-center justify-between gap-3 px-5 py-4 border-b z-10" style={{ borderColor: C.line }}>
          <p className="font-display font-extrabold text-base" style={{ color: C.ink }}>{titulo}</p>
          <button onClick={onFechar} aria-label="Fechar" className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.blueTint2 }}><X size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Copiar({ texto, rotulo = "Copiar", small = true }) {
  const [ok, setOk] = useState(false);
  return <Btn small={small} tipo="claro" icon={ok ? Check : Copy} onClick={async () => { try { await navigator.clipboard.writeText(texto); } catch { window.prompt("Copie o texto:", texto); } setOk(true); setTimeout(() => setOk(false), 1600); }}>{ok ? "Copiado" : rotulo}</Btn>;
}

export function linkWhats(numero, texto) {
  const n = String(numero || "").replace(/\D/g, "");
  const tel = n ? (n.length <= 11 ? `55${n}` : n) : "";
  return `https://wa.me/${tel}?text=${encodeURIComponent(texto || "")}`;
}
export function BtnWhats({ numero, texto, rotulo = "WhatsApp", small = true }) {
  return <a href={linkWhats(numero, texto)} target="_blank" rel="noopener" className={`inline-flex items-center gap-1.5 font-body font-bold rounded-xl ${small ? "text-xs px-2.5 py-1.5" : "text-sm px-3.5 py-2.5"}`} style={{ background: "#25D366", color: "#063D1D" }}><MessageCircle size={small ? 13 : 15} />{rotulo}</a>;
}

export function Vazio({ children }) {
  return <div className="rounded-2xl border border-dashed p-8 text-center font-body text-sm" style={{ borderColor: C.line, color: C.muted }}>{children}</div>;
}

export function Texto({ children, className = "" }) {
  return <p className={`font-body text-sm whitespace-pre-line leading-relaxed ${className}`} style={{ color: C.ink }}>{children}</p>;
}

// Chamada à IA do servidor (com o token do usuário logado)
export async function chamarIA({ modo, pedido, messages, contexto }) {
  if (!supabaseConfigurado) throw new Error("Modo demonstração: conecte o Supabase.");
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const r = await fetch("/api/fomento-ia", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${token || ""}` },
    body: JSON.stringify({ modo, pedido, messages, contexto }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || "Não foi possível falar com a IA."); e.semChave = j.semChave; throw e; }
  return j.texto || "";
}

// Formulário genérico a partir de uma lista de campos
export function Campos({ campos, valores, set }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {campos.map((c) => {
        const v = valores[c.k] ?? "";
        const on = (e) => set({ ...valores, [c.k]: c.t === "checkbox" ? e.target.checked : e.target.value });
        let el;
        if (c.t === "select") el = <select value={v} onChange={on} className={inputCls} style={inputSty}>{!c.semVazio && <option value="">{c.vazio || "—"}</option>}{c.op.map(([val, rot]) => <option key={val} value={val}>{rot}</option>)}</select>;
        else if (c.t === "textarea") el = <textarea value={v} onChange={on} rows={c.rows || 3} className={inputCls} style={inputSty} placeholder={c.ph} />;
        else if (c.t === "multi") { const arr = Array.isArray(v) ? v : []; el = <div className="flex flex-wrap gap-1.5 py-1">{c.op.map(([val, rot]) => { const on2 = arr.includes(val); return <button type="button" key={val} onClick={() => set({ ...valores, [c.k]: on2 ? arr.filter((x) => x !== val) : [...arr, val] })} className="font-body text-xs font-bold px-2.5 py-1 rounded-full border" style={{ background: on2 ? C.blueHex : "#fff", color: on2 ? "#fff" : C.muted, borderColor: on2 ? C.blueHex : C.line }}>{rot}</button>; })}</div>; }
        else if (c.t === "checkbox") el = <span className="flex items-center gap-2 font-body text-sm py-2"><input type="checkbox" checked={!!v} onChange={on} /> {c.texto}</span>;
        else el = <input type={c.t || "text"} value={v} onChange={on} className={inputCls} style={inputSty} placeholder={c.ph} step={c.t === "number" ? "any" : undefined} inputMode={c.inputMode} />;
        return <Campo key={c.k} label={`${c.l}${c.req ? " *" : ""}`} dica={c.dica} className={c.full ? "sm:col-span-2" : ""}>{el}</Campo>;
      })}
    </div>
  );
}
