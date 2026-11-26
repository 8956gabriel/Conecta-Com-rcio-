// =============================================================================
// MÓDULO SALA DO EMPREENDEDOR — Conecta Comércio (Ivatuba)
//
// Mesmo modelo do módulo Fomento Paraná, com links separados:
//   • <SalaPublico />            → página pública       #/sala        (/sala)
//   • <SalaPainel area="agente"> → área do atendente    #/sala-agente (/sala/agente)
//   • <SalaPainel area="admin">  → administração        #/sala-admin  (/sala/admin)
//   • useSalaAcesso()            → diz se a conta logada pode abrir o painel
//
// Tabelas próprias com prefixo sala_ (ver supabase-sala-empreendedor.sql).
// Os totais mensais públicos continuam na tabela sala_atendimentos_totais
// (a mesma do Painel Admin → "Sala do Empreendedor - Atendimentos").
// =============================================================================
import React, { useEffect, useMemo, useState } from "react";
import {
  Store, MessageCircle, MapPin, Clock, CalendarDays, ClipboardList, Inbox, BarChart3, Settings, Users,
  ExternalLink, Download, Trash2, Pencil, CheckCircle2, X, ShieldCheck, PlusCircle, Search, LayoutDashboard,
  ChevronLeft, ChevronRight, Link2, Upload, Send, Phone, Mail, Target, CalendarRange, Award, BookOpen, Briefcase, Contact, Gauge, Building2,
} from "lucide-react";
import { supabase, supabaseConfigurado } from "./supabaseClient";
import { ImportarGise } from "./SalaImportarGise.jsx";
import { exportarPDF } from "./central/motor.js";
import { AbaEstrategias, AbaCalendario, AgendaPublicaSala } from "./SalaPlanejamento.jsx";
import { AbaBaseEmpresas } from "./SalaEmpresas.jsx";
import PainelLateral from "./shared/PainelLateral.jsx";
import { AbaSelo, AbaGestao, AbaOrientacoes, AbaEmpreendedores, AbaIndicadores, OrientacoesPublicas, DocProtegido } from "./SalaGestao.jsx";

// As mesmas categorias do relatório oficial do Sebrae (usadas também no
// Painel Admin → "Sala do Empreendedor - Atendimentos").
export const CATEGORIAS_SALA = [
  "Alteração de Dados",
  "Alvará",
  "Baixa da Inscrição do MEI (CNPJ)",
  "Boleto DAS - (INSS/ICMS/ISS)",
  "CNPJ MEI",
  "Compras Públicas",
  "Crédito",
  "Declaração Anual - DASN-SIMEI",
  "Formalização - Abertura de Empresa",
  "Nota Fiscal MEI - SERVIÇO (ISS)",
  "Orientações sobre o MEI",
  "Parcelamento Especial - Microempreendedor Individual",
  "Parcelamento - Microempreendedor Individual",
  "Parcelamento - Regularize (Dívida Ativa)",
  "Outros",
];
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const CANAIS = { presencial: "Presencial", whatsapp: "WhatsApp", telefone: "Telefone", online: "Online" };
const SITUACOES = { concluido: { r: "Concluído", c: "#1E8E5A" }, pendente: { r: "Pendente", c: "#E8A23D" }, encaminhado: { r: "Encaminhado", c: "#7E5BEF" } };
const STATUS_PEDIDO = {
  novo: { r: "Novo", c: "#0A5AA8" },
  agendado: { r: "Agendado", c: "#7E5BEF" },
  atendido: { r: "Atendido", c: "#1E8E5A" },
  cancelado: { r: "Cancelado", c: "#8896A6" },
};

export const LOGO_SALA = "/sala-do-empreendedor-logo.png";
// No site próprio da Sala (VITE_SITE=sala) os links são curtos: /publico, /agente, /admin
export const SITE_SALA = import.meta.env.VITE_SITE === "sala";
export const LINKS_SALA = SITE_SALA ? { publico: "/publico", agente: "/agente", admin: "/admin" } : { publico: "/sala", agente: "/sala/agente", admin: "/sala/admin" };

const S = {
  blue: "var(--cor-principal, #0A5AA8)",
  blueDeep: "var(--cor-principal-profunda, #052A4D)",
  blueTint: "#EAF2FB",
  blueTint2: "#F5F9FD",
  amber: "#F5B700",
  green: "#1E8E5A",
  greenBright: "#25A85B",
  greenTint: "#E7F6EE",
  ink: "#0E2233",
  muted: "#5C7186",
  soft: "#8896A6",
  line: "#DCE7F2",
  danger: "#B4462F",
};

const CONFIG_PADRAO = {
  ativo: true,
  texto_intro: "Atendimento gratuito para quem quer abrir, formalizar ou cuidar do seu negócio: MEI, DAS, nota fiscal, alvará, parcelamentos, crédito e orientação.",
  atendente_nome: "Atendente da Sala do Empreendedor",
  whatsapp: "",
  email: "",
  endereco: "Ivatuba - PR",
  horario_texto: "Segunda a sexta, das 8h às 11h30 e das 13h às 17h",
  mapa_url: "",
  logo_url: "",
  banner_url: "",
  agenda_ativa: true,
  agenda_horarios: "08:30,09:00,09:30,10:00,10:30,11:00,13:30,14:00,14:30,15:00,15:30,16:00",
  agenda_dias: "1,2,3,4,5",
};

const SERVICOS_PADRAO = [
  { titulo: "Abrir e gerenciar o MEI", descricao: "Emita o DAS mensal, consulte débitos e regularize seu MEI (PGMEI).", url: "https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao", cor_hex: "#0A5AA8" },
  { titulo: "Declaração Anual do MEI", descricao: "Envie a DASN-SIMEI, obrigatória todo ano para quem é MEI.", url: "https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/dasnsimei.app/Identificacao", cor_hex: "#0A5AA8" },
  { titulo: "Emitir Nota Fiscal (NFS-e)", descricao: "Emissor Nacional de Nota Fiscal de Serviço eletrônica.", url: "https://www.nfse.gov.br/EmissorNacional/Login?ReturnUrl=%2fEmissorNacional", cor_hex: "#0A5AA8" },
];

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
const soDigitos = (v) => String(v || "").replace(/\D/g, "");
const hojeISO = () => new Date().toLocaleDateString("sv-SE");
const dataBR = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR") : "—");
const somarDias = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv-SE"); };
function formatarFone(f) {
  const d = soDigitos(f).replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return f || "";
}
function linkWhats(numero, texto) {
  const d = soDigitos(numero);
  if (d.length < 10) return null;
  const n = d.startsWith("55") && d.length > 11 ? d : `55${d}`;
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}
const horariosDaConfig = (cfg) => String(cfg?.agenda_horarios || "").split(",").map((h) => h.trim()).filter((h) => /^\d{1,2}:\d{2}$/.test(h));
const diasDaConfig = (cfg) => String(cfg?.agenda_dias ?? "1,2,3,4,5").split(",").map((d) => Number(d.trim())).filter((d) => d >= 0 && d <= 6);
const diaSemana = (iso) => new Date(`${iso}T12:00:00`).getDay();
function exportarCSV(nome, cabecalho, linhas) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const texto = [cabecalho, ...linhas].map((l) => l.map(esc).join(";")).join("\n");
  const blob = new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function exportarExcel(nome, abas) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  abas.forEach(({ titulo, cabecalho, linhas }) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([cabecalho, ...linhas]), titulo.slice(0, 31)));
  XLSX.writeFile(wb, `${nome}.xlsx`);
}
function copiar(texto) { try { navigator.clipboard?.writeText(texto); } catch { /* */ } }
const linkCompleto = (caminho) => `${window.location.origin}${caminho}`;

// ---------------------------------------------------------------------------
// Dados públicos + acesso
// ---------------------------------------------------------------------------
function useSalaConfig() {
  const [config, setConfig] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) { setConfig(CONFIG_PADRAO); return; }
    supabase.from("sala_config").select("*").eq("id", 1).maybeSingle().then(({ data }) => setConfig({ ...CONFIG_PADRAO, ...(data || {}) }));
  }, []);
  return [config, setConfig];
}

export function useSalaAcesso(sessao, perfil) {
  // { pode, gerir } — null enquanto verifica
  const [acesso, setAcesso] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) { setAcesso({ pode: true, gerir: true }); return; }
    if (sessao === undefined) { setAcesso(null); return; }
    if (!sessao) { setAcesso({ pode: false, gerir: false }); return; }
    if (perfil?.tipo === "admin") { setAcesso({ pode: true, gerir: true }); return; }
    setAcesso(null);
    Promise.all([supabase.rpc("sala_pode_acessar"), supabase.rpc("sala_pode_gerir")]).then(([a, g]) => {
      setAcesso({ pode: !a.error && a.data === true, gerir: !g.error && g.data === true });
    });
  }, [sessao?.user?.id, perfil?.tipo]);
  return acesso;
}

// ---------------------------------------------------------------------------
// Peças de interface
// ---------------------------------------------------------------------------
function Titulo({ eyebrow, title, sub, direita }) {
  return (
    <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
      <div>
        {eyebrow && <p className="font-body text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: S.blue }}>{eyebrow}</p>}
        <h2 className="font-display font-extrabold text-xl md:text-2xl mt-1" style={{ color: S.ink }}>{title}</h2>
        {sub && <p className="font-body text-sm mt-1" style={{ color: S.muted }}>{sub}</p>}
      </div>
      {direita}
    </div>
  );
}
function Campo({ label, children, className = "" }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="font-body text-xs font-bold" style={{ color: S.ink }}>{label}</span>
      {children}
    </label>
  );
}
const inputCls = "font-body text-sm border rounded-lg px-3 py-2.5 outline-none bg-white w-full";
const inputStyle = { borderColor: S.line };
function Selo({ texto, cor }) {
  return <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: `${cor}1A`, color: cor }}>{texto}</span>;
}
function Botao({ children, onClick, cor = S.blue, contorno = false, className = "", type = "button", disabled = false, title }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title}
      className={`font-body text-xs font-bold rounded-lg px-3 py-2 inline-flex items-center gap-1.5 disabled:opacity-50 ${className}`}
      style={contorno ? { border: `1px solid ${S.line}`, color: cor, background: "#fff" } : { background: cor, color: "#fff" }}>
      {children}
    </button>
  );
}
function KPI({ titulo, valor, sub, cor = S.blue, icon: Icon }) {
  return (
    <div className="rounded-2xl border p-4 bg-white" style={{ borderColor: S.line }}>
      <div className="flex items-center gap-2">
        {Icon && <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${cor}14`, color: cor }}><Icon size={16} /></span>}
        <p className="font-body text-xs font-bold" style={{ color: S.muted }}>{titulo}</p>
      </div>
      <p className="font-display font-extrabold text-2xl mt-2" style={{ color: S.ink }}>{valor}</p>
      {sub && <p className="font-body text-[11px] mt-0.5" style={{ color: S.soft }}>{sub}</p>}
    </div>
  );
}

// =============================================================================
// PÁGINA PÚBLICA
// =============================================================================
export function SalaPublico() {
  const [config] = useSalaConfig();
  const [servicos, setServicos] = useState(null);
  const [totais, setTotais] = useState(null);

  useEffect(() => {
    document.title = "Sala do Empreendedor — Conecta Comércio";
    return () => { document.title = "Conecta Comércio · Ivatuba - PR"; };
  }, []);

  useEffect(() => {
    if (!supabaseConfigurado) { setServicos(SERVICOS_PADRAO); setTotais([]); return; }
    supabase.from("servicos_empreendedor").select("*").eq("ativo", true).order("ordem").then(({ data, error }) => setServicos(!error && data?.length ? data : SERVICOS_PADRAO));
    supabase.from("sala_atendimentos_totais").select("*").then(({ data, error }) => setTotais(error ? [] : data || []));
  }, []);

  const resumo = useMemo(() => {
    const comTotal = (totais || []).filter((r) => r.total > 0);
    if (!comTotal.length) return null;
    const ano = Math.max(...comTotal.map((r) => r.ano));
    const doAno = comTotal.filter((r) => r.ano === ano);
    const porCat = {};
    doAno.forEach((r) => { porCat[r.categoria] = (porCat[r.categoria] || 0) + r.total; });
    const lista = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
    return { ano, total: lista.reduce((s, [, v]) => s + v, 0), lista: lista.slice(0, 6), maior: lista[0]?.[1] || 1 };
  }, [totais]);

  const rolar = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (!config) return <div className="py-24 text-center font-body text-sm" style={{ color: S.muted }}>Carregando...</div>;
  if (config.ativo === false) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <Store size={36} className="mx-auto" color={S.blue} />
        <p className="font-display font-bold text-lg mt-3" style={{ color: S.ink }}>Seção temporariamente indisponível</p>
        <p className="font-body text-sm mt-1" style={{ color: S.muted }}>As informações da Sala do Empreendedor estão sendo atualizadas. Volte em breve.</p>
      </div>
    );
  }

  const zap = linkWhats(config.whatsapp, `Olá! Vim pelo Conecta Comércio e preciso de atendimento da Sala do Empreendedor.`);
  const mapa = config.mapa_url || (config.endereco ? `https://www.google.com/maps?q=${encodeURIComponent(config.endereco)}&output=embed` : "");
  const mapaEmbed = mapa.includes("output=embed") || mapa.includes("/embed") ? mapa : config.endereco ? `https://www.google.com/maps?q=${encodeURIComponent(config.endereco)}&output=embed` : "";

  return (
    <div className="pb-16">
      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-6">
        <div className="rounded-3xl overflow-hidden relative text-white p-6 md:p-10" style={{ background: `linear-gradient(125deg, ${S.blueDeep}, ${S.blue})` }}>
          <div aria-hidden className="absolute -right-16 -top-16 w-72 h-72 rounded-full" style={{ background: "rgba(245,183,0,0.18)" }} />
          <div aria-hidden className="absolute right-24 -bottom-20 w-48 h-48 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className={`relative ${config.banner_url ? "grid md:grid-cols-[1.25fr_1fr] gap-6 items-center" : ""}`}>
            <div className="max-w-2xl">
              <span className="inline-flex items-center bg-white rounded-2xl px-4 py-2.5 mb-4 shadow-lg">
                <img src={config.logo_url || LOGO_SALA} alt="Sala do Empreendedor" className="h-10 md:h-14 w-auto object-contain" />
              </span>
              <div>
                <span className="inline-flex items-center gap-2 font-body text-[11px] font-bold uppercase tracking-[0.16em] px-3 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.14)" }}>
                  <MapPin size={13} /> Ivatuba - PR
                </span>
              </div>
              <h1 className="font-display font-extrabold text-3xl md:text-5xl mt-4 leading-tight">Seu negócio em dia, sem complicação</h1>
              <p className="font-body text-sm md:text-base mt-3 text-white/80">{config.texto_intro || CONFIG_PADRAO.texto_intro}</p>
              <div className="flex flex-wrap gap-2 mt-6">
                {config.agenda_ativa && (
                  <button onClick={() => rolar("sala-agendar")} className="font-body text-sm font-bold rounded-xl px-4 py-2.5 bg-white flex items-center gap-2" style={{ color: S.blue }}>
                    <CalendarDays size={15} /> Agendar atendimento
                  </button>
                )}
                <button onClick={() => rolar("sala-servicos")} className="font-body text-sm font-bold rounded-xl px-4 py-2.5 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.14)" }}>
                  <ClipboardList size={15} /> Serviços online
                </button>
                <button onClick={() => rolar("sala-onde")} className="font-body text-sm font-bold rounded-xl px-4 py-2.5 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.14)" }}>
                  <MapPin size={15} /> Onde fica
                </button>
              </div>
            </div>
            {config.banner_url && <img src={config.banner_url} alt="Sala do Empreendedor de Ivatuba" className="w-full max-w-sm mx-auto rounded-2xl shadow-2xl border border-white/20" loading="lazy" />}
          </div>
        </div>
      </section>

      {/* ATENDENTE */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 mt-5">
        <div className="rounded-2xl border p-4 md:p-5 flex items-center justify-between gap-4 flex-wrap" style={{ borderColor: S.line, background: S.greenTint }}>
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: S.green }}><Store size={20} /></span>
            <div>
              <p className="font-body text-[11px] font-bold uppercase tracking-wide" style={{ color: S.green }}>Atendimento</p>
              <p className="font-display font-extrabold text-sm md:text-base" style={{ color: S.ink }}>{config.atendente_nome || CONFIG_PADRAO.atendente_nome}</p>
              <p className="font-body text-xs" style={{ color: S.muted }}>{config.horario_texto}</p>
            </div>
          </div>
          {zap && (
            <a href={zap} target="_blank" rel="noopener noreferrer" className="glow-btn font-body text-sm font-extrabold rounded-xl px-5 py-3 text-white flex items-center gap-2" style={{ background: S.greenBright }}>
              <MessageCircle size={16} /> Falar no WhatsApp
            </a>
          )}
        </div>
      </section>

      {/* SERVIÇOS ONLINE */}
      <section id="sala-servicos" className="max-w-6xl mx-auto px-4 md:px-6 mt-10 scroll-mt-20">
        <Titulo eyebrow="Faça você mesmo" title="Serviços online" sub="Links oficiais do governo. Se travar em alguma etapa, agende um atendimento que a gente ajuda." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(servicos || []).map((s, i) => (
            <a key={s.id || i} href={s.url} target="_blank" rel="noopener noreferrer" className="rounded-2xl border p-4 bg-white flex gap-3 items-start hover:shadow-md transition-shadow" style={{ borderColor: S.line }}>
              <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden" style={{ background: `${s.cor_hex || "#0A5AA8"}14` }}>
                {s.logo_url ? <img src={s.logo_url} alt="" className="w-full h-full object-contain" /> : <ExternalLink size={18} color={s.cor_hex || "#0A5AA8"} />}
              </span>
              <span className="min-w-0">
                <span className="block font-display font-bold text-sm" style={{ color: S.ink }}>{s.titulo}</span>
                {s.descricao && <span className="block font-body text-xs mt-0.5" style={{ color: S.muted }}>{s.descricao}</span>}
                <span className="font-body text-[11px] font-bold mt-1.5 inline-flex items-center gap-1" style={{ color: s.cor_hex || S.blue }}>Abrir <ExternalLink size={11} /></span>
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* AGENDAR */}
      {config.agenda_ativa && (
        <section id="sala-agendar" className="max-w-6xl mx-auto px-4 md:px-6 mt-10 scroll-mt-20">
          <Titulo eyebrow="Atendimento gratuito" title="Agende seu atendimento" sub="Escolha o assunto, o dia e o horário. A equipe confirma pelo WhatsApp." />
          <FormAgendamento config={config} />
        </section>
      )}

      <AgendaPublicaSala />

      <OrientacoesPublicas />

      {/* ONDE FICA + NÚMEROS */}
      <section id="sala-onde" className="max-w-6xl mx-auto px-4 md:px-6 mt-10 scroll-mt-20 grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: S.line }}>
          <div className="p-5">
            <Titulo eyebrow="Venha até nós" title="Onde fica" />
            <div className="flex flex-col gap-2 font-body text-sm" style={{ color: S.ink }}>
              {config.endereco && <p className="flex gap-2"><MapPin size={16} className="shrink-0 mt-0.5" color={S.blue} /> {config.endereco}</p>}
              {config.horario_texto && <p className="flex gap-2"><Clock size={16} className="shrink-0 mt-0.5" color={S.blue} /> {config.horario_texto}</p>}
              {config.whatsapp && <p className="flex gap-2"><Phone size={16} className="shrink-0 mt-0.5" color={S.blue} /> {formatarFone(config.whatsapp)}</p>}
              {config.email && <p className="flex gap-2"><Mail size={16} className="shrink-0 mt-0.5" color={S.blue} /> {config.email}</p>}
            </div>
          </div>
          {mapaEmbed && <iframe title="Mapa da Sala do Empreendedor" src={mapaEmbed} className="w-full h-56 border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />}
        </div>
        <div className="rounded-2xl border bg-white p-5" style={{ borderColor: S.line }}>
          <Titulo eyebrow="Transparência" title="Atendimentos realizados" sub={resumo ? `Números oficiais de ${resumo.ano}` : "Os números do ano aparecem aqui assim que forem lançados."} />
          {resumo && (
            <>
              <p className="font-display font-extrabold text-4xl" style={{ color: S.blue }}>{resumo.total.toLocaleString("pt-BR")}</p>
              <p className="font-body text-xs mb-4" style={{ color: S.muted }}>atendimentos em {resumo.ano}</p>
              <div className="flex flex-col gap-2">
                {resumo.lista.map(([cat, v]) => (
                  <div key={cat}>
                    <div className="flex justify-between font-body text-xs mb-1" style={{ color: "#425A70" }}><span className="truncate pr-2">{cat}</span><span className="font-bold">{v}</span></div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: S.blueTint }}><div className="h-full rounded-full" style={{ width: `${(v / resumo.maior) * 100}%`, background: S.blue }} /></div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-4 md:px-6 mt-10 text-center">
        <a href="#/acesso" className="font-body text-xs font-bold inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border bg-white" style={{ borderColor: S.line, color: S.muted }}><ShieldCheck size={13} /> Acesso da equipe da Sala</a>
      </section>
    </div>
  );
}

function FormAgendamento({ config }) {
  const vazio = { nome: "", whatsapp: "", documento: "", servico: "", data: "", hora: "", mensagem: "" };
  const [f, setF] = useState(vazio);
  const [ocupados, setOcupados] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(null);
  const dias = diasDaConfig(config);
  const horarios = horariosDaConfig(config);

  useEffect(() => {
    if (!f.data) { setOcupados([]); return; }
    if (!supabaseConfigurado) { setOcupados([]); return; }
    supabase.rpc("sala_horarios_ocupados", { p_data: f.data }).then(({ data, error }) => setOcupados(error ? [] : (data || []).map((x) => (typeof x === "string" ? x : Object.values(x)[0]))));
  }, [f.data]);

  const diaInvalido = f.data && !dias.includes(diaSemana(f.data));
  const agora = new Date();
  const livres = horarios.filter((h) => {
    if (ocupados.includes(h)) return false;
    if (f.data === hojeISO()) { const [hh, mm] = h.split(":").map(Number); return hh * 60 + mm > agora.getHours() * 60 + agora.getMinutes() + 30; }
    return true;
  });

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    if (f.nome.trim().length < 3) return setErro("Informe seu nome.");
    if (soDigitos(f.whatsapp).length < 10) return setErro("Informe um WhatsApp com DDD.");
    if (!f.servico) return setErro("Escolha o assunto do atendimento.");
    if (f.data && diaInvalido) return setErro("A Sala não atende nesse dia da semana. Escolha outro dia.");
    if (f.data && !f.hora) return setErro("Escolha um horário.");
    const registro = {
      nome: f.nome.trim(), whatsapp: soDigitos(f.whatsapp), documento: soDigitos(f.documento) || null, servico: f.servico,
      mensagem: f.mensagem.trim() || null, data_agendada: f.data || null, hora_agendada: f.data ? f.hora : null, status: "novo", origem: "site",
    };
    if (!supabaseConfigurado) { setEnviado(registro); setF(vazio); return; }
    setEnviando(true);
    const { error } = await supabase.from("sala_pedidos").insert(registro);
    setEnviando(false);
    if (error) {
      if (error.code === "23505") { setErro("Esse horário acabou de ser reservado por outra pessoa. Escolha outro."); setF((v) => ({ ...v, hora: "" })); setOcupados((o) => [...o, f.hora]); return; }
      setErro("Não consegui enviar agora. Tente de novo ou chame no WhatsApp.");
      return;
    }
    setEnviado(registro);
    setF(vazio);
  };

  if (enviado) {
    const zap = linkWhats(config.whatsapp, `Olá! Acabei de agendar pelo site: ${enviado.servico}${enviado.data_agendada ? `, dia ${dataBR(enviado.data_agendada)} às ${enviado.hora_agendada}` : ""}. Meu nome é ${enviado.nome}.`);
    return (
      <div className="rounded-2xl border p-6 text-center bg-white" style={{ borderColor: S.line }}>
        <CheckCircle2 size={36} className="mx-auto" color={S.green} />
        <p className="font-display font-extrabold text-lg mt-2" style={{ color: S.ink }}>Pedido enviado!</p>
        <p className="font-body text-sm mt-1" style={{ color: S.muted }}>
          {enviado.data_agendada ? `Reservamos ${dataBR(enviado.data_agendada)} às ${enviado.hora_agendada}. ` : ""}A equipe vai confirmar pelo WhatsApp.
        </p>
        <div className="flex flex-wrap gap-2 justify-center mt-4">
          {zap && <a href={zap} target="_blank" rel="noopener noreferrer" className="font-body text-sm font-bold rounded-xl px-4 py-2.5 text-white inline-flex items-center gap-2" style={{ background: S.greenBright }}><MessageCircle size={15} /> Avisar no WhatsApp</a>}
          <Botao contorno onClick={() => setEnviado(null)}>Fazer outro pedido</Botao>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="rounded-2xl border p-5 bg-white grid md:grid-cols-2 gap-3" style={{ borderColor: S.line }}>
      <Campo label="Seu nome *"><input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} className={inputCls} style={inputStyle} /></Campo>
      <Campo label="WhatsApp com DDD *"><input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} inputMode="tel" placeholder="(44) 99999-9999" className={inputCls} style={inputStyle} /></Campo>
      <Campo label="Assunto *">
        <select value={f.servico} onChange={(e) => setF({ ...f, servico: e.target.value })} className={inputCls} style={inputStyle}>
          <option value="">Escolha...</option>
          {CATEGORIAS_SALA.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Campo>
      <Campo label="CPF ou CNPJ (opcional)"><input value={f.documento} onChange={(e) => setF({ ...f, documento: e.target.value })} inputMode="numeric" className={inputCls} style={inputStyle} /></Campo>
      <Campo label="Dia (opcional)">
        <input type="date" min={hojeISO()} value={f.data} onChange={(e) => setF({ ...f, data: e.target.value, hora: "" })} className={inputCls} style={inputStyle} />
      </Campo>
      <Campo label="Horário">
        <select value={f.hora} disabled={!f.data || diaInvalido} onChange={(e) => setF({ ...f, hora: e.target.value })} className={inputCls} style={inputStyle}>
          <option value="">{!f.data ? "Escolha o dia primeiro" : diaInvalido ? "Sem atendimento neste dia" : livres.length ? "Escolha..." : "Nenhum horário livre"}</option>
          {!diaInvalido && livres.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
      </Campo>
      <Campo label="Conte rapidinho o que você precisa (opcional)" className="md:col-span-2">
        <textarea rows={3} value={f.mensagem} onChange={(e) => setF({ ...f, mensagem: e.target.value })} className={inputCls} style={inputStyle} />
      </Campo>
      {erro && <p className="md:col-span-2 font-body text-xs" style={{ color: S.danger }}>{erro}</p>}
      <div className="md:col-span-2 flex items-center justify-between gap-3 flex-wrap">
        <p className="font-body text-[11px]" style={{ color: S.soft }}>Seus dados são usados só para o atendimento da Sala do Empreendedor.</p>
        <button type="submit" disabled={enviando} className="glow-btn font-body text-sm font-bold rounded-xl px-5 py-3 text-white inline-flex items-center gap-2 disabled:opacity-60" style={{ background: S.blue }}>
          <Send size={15} /> {enviando ? "Enviando..." : f.data ? "Agendar" : "Pedir atendimento"}
        </button>
      </div>
    </form>
  );
}

// =============================================================================
// PAINEL — área do atendente e administração
// =============================================================================
const DEMO_EQUIPE = [{ id: "demo-eq", nome: "Gabriel", papel: "gestor", ativo: true, whatsapp: "" }];
const demoPedidos = () => [
  { id: "demo-p1", nome: "Maria Souza", whatsapp: "44999990001", servico: "Boleto DAS - (INSS/ICMS/ISS)", data_agendada: hojeISO(), hora_agendada: "09:00", status: "novo", origem: "site", criado_em: new Date().toISOString() },
  { id: "demo-p2", nome: "João Lima", whatsapp: "44999990002", servico: "Formalização - Abertura de Empresa", data_agendada: somarDias(hojeISO(), 1), hora_agendada: "14:00", status: "agendado", origem: "site", criado_em: new Date().toISOString() },
];
const demoAtendimentos = () => [
  { id: "demo-a1", data: hojeISO(), nome: "Ana Paula", categoria: "Nota Fiscal MEI - SERVIÇO (ISS)", canal: "presencial", situacao: "concluido", atendente_nome: "Gabriel" },
  { id: "demo-a2", data: somarDias(hojeISO(), -3), nome: "Carlos Mendes", categoria: "Declaração Anual - DASN-SIMEI", canal: "whatsapp", situacao: "concluido", atendente_nome: "Gabriel" },
];

export function SalaPainel({ sessao, perfil, area = "agente" }) {
  const acesso = useSalaAcesso(sessao, perfil);
  const [config, setConfig] = useSalaConfig();
  const [pedidos, setPedidos] = useState(null);
  const [atendimentos, setAtendimentos] = useState(null);
  const [totais, setTotais] = useState(null); // totais mensais já lançados (histórico, antes das fichas)
  const [equipe, setEquipe] = useState(null);
  const [toast, setToast] = useState(null);
  const avisar = (m, tipo = "ok") => { setToast({ m, tipo }); setTimeout(() => setToast(null), 3200); };
  const abaInicial = area === "admin" ? "indicadores" : "painel";
  const [aba, setAbaEstado] = useState(() => { try { return sessionStorage.getItem(`sala-aba-${area}`) || abaInicial; } catch { return abaInicial; } });
  const setAba = (a) => { setAbaEstado(a); try { sessionStorage.setItem(`sala-aba-${area}`, a); } catch { /* */ } };
  const [formAtendimento, setFormAtendimento] = useState(null); // registro inicial ao abrir o formulário

  useEffect(() => {
    document.title = area === "admin" ? "Sala do Empreendedor · Administração" : "Sala do Empreendedor · Atendente";
  }, [area]);

  const carregar = () => {
    if (!supabaseConfigurado) {
      setPedidos((p) => p ?? demoPedidos()); setAtendimentos((a) => a ?? demoAtendimentos()); setEquipe((e) => e ?? DEMO_EQUIPE); setTotais((t) => t ?? []);
      return;
    }
    const desde = somarDias(hojeISO(), -400);
    supabase.from("sala_pedidos").select("*").order("criado_em", { ascending: false }).limit(1000).then(({ data, error }) => setPedidos(error ? [] : data || []));
    supabase.from("sala_atendimentos").select("*").gte("data", desde).order("data", { ascending: false }).order("criado_em", { ascending: false }).then(({ data, error }) => setAtendimentos(error ? [] : data || []));
    supabase.from("sala_equipe").select("*").order("nome").then(({ data, error }) => setEquipe(error ? [] : data || []));
    supabase.from("sala_atendimentos_totais").select("ano,mes,categoria,total").limit(10000).then(({ data, error }) => setTotais(error ? [] : data || []));
  };
  useEffect(() => { if (acesso?.pode) carregar(); }, [acesso?.pode]);

  if (acesso === null) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <span className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin inline-block" style={{ borderColor: S.blueTint, borderTopColor: S.blue }} />
        <p className="font-body text-sm mt-3" style={{ color: S.muted }}>Verificando seu acesso...</p>
      </div>
    );
  }
  if (!acesso.pode) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <span className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#FBEAE5" }}><ShieldCheck size={24} color={S.danger} /></span>
        <p className="font-display font-bold text-lg" style={{ color: S.ink }}>Acesso exclusivo da equipe da Sala do Empreendedor</p>
        <p className="font-body text-sm mt-2" style={{ color: S.muted }}>{sessao ? "Sua conta ainda não foi liberada. Peça ao administrador para incluir seu e-mail na equipe da Sala." : "Entre com sua conta do Conecta Comércio para acessar."}</p>
        {!sessao && <a href="#/entrar" className="inline-block glow-btn font-body text-sm font-bold mt-6 px-5 py-2.5 rounded-xl text-white" style={{ background: S.blue }}>Entrar</a>}
      </div>
    );
  }
  if (area === "admin" && !acesso.gerir) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <span className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#FBEAE5" }}><ShieldCheck size={24} color={S.danger} /></span>
        <p className="font-display font-bold text-lg" style={{ color: S.ink }}>Administração da Sala do Empreendedor</p>
        <p className="font-body text-sm mt-2" style={{ color: S.muted }}>Sua conta tem acesso de atendente. Use a área do atendente.</p>
        <a href="#/sala-agente" className="inline-block glow-btn font-body text-sm font-bold mt-6 px-5 py-2.5 rounded-xl text-white" style={{ background: S.blue }}>Abrir área do atendente</a>
      </div>
    );
  }

  const meuCadastro = (equipe || []).find((m) => m.user_id && m.user_id === sessao?.user?.id);
  const meuNome = meuCadastro?.nome || perfil?.nome || (equipe === null ? "" : sessao?.user?.email?.split("@")[0]) || "Atendente";
  const novos = (pedidos || []).filter((p) => p.status === "novo").length;

  // Menu lateral (Projeto Master · Fase 5): mesmas abas de antes, agrupadas por categoria.
  const grupos = [
    { titulo: "Início", itens: [
      ...(area === "admin" ? [{ id: "indicadores", label: "Indicadores", icon: Gauge }] : []),
      { id: "painel", label: "Painel do dia", icon: LayoutDashboard },
    ] },
    { titulo: "Atendimento", itens: [
      { id: "pedidos", label: "Pedidos do site", icon: Inbox, badge: novos },
      { id: "agenda", label: "Agenda", icon: CalendarDays },
      { id: "atendimentos", label: "Atendimentos", icon: ClipboardList },
      { id: "orientacoes", label: "Orientações", icon: BookOpen },
    ] },
    { titulo: "Cadastros", itens: [
      { id: "empreendedores", label: "Empreendedores", icon: Contact },
      { id: "empresas", label: "Base de empresas", icon: Building2 },
    ] },
    { titulo: "Planejamento", itens: [
      { id: "estrategias", label: "Estratégias", icon: Target },
      { id: "calendario", label: "Calendário", icon: CalendarRange },
      { id: "gestao", label: "Gestão da Sala", icon: Briefcase },
    ] },
    { titulo: "Selo e relatórios", itens: [
      { id: "selo", label: "Selo Sebrae", icon: Award },
      { id: "relatorio", label: "Relatório", icon: BarChart3 },
    ] },
    ...(area === "admin" ? [{ titulo: "Administração", itens: [
      { id: "config", label: "Página pública", icon: Settings },
      { id: "equipe", label: "Equipe e permissões", icon: Users },
    ] }] : []),
  ];
  const itens = grupos.flatMap((g) => g.itens);
  const abaAtual = itens.some((i) => i.id === aba) ? aba : itens[0].id;
  const ctx = { config, setConfig, pedidos, setPedidos, atendimentos, setAtendimentos, totais, equipe, setEquipe, avisar, meuNome, meuCadastro, gerir: acesso.gerir, abrirAtendimento: (ini) => { setFormAtendimento(ini || {}); setAba("atendimentos"); }, formAtendimento, setFormAtendimento, recarregar: carregar };

  return (
    <PainelLateral logo={config?.logo_url || LOGO_SALA} logoAlt="Sala do Empreendedor" ambiente={area === "admin" ? "Administração" : "Área do atendente"}
      cor={S.blue} corProfunda={S.blueDeep} destaque={S.amber} grupos={grupos} atual={abaAtual} onSelecionar={setAba} chave={`sala-${area}`}>
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 font-body text-sm font-semibold px-4 py-2.5 rounded-xl text-white shadow-lg" style={{ background: toast.tipo === "erro" ? S.danger : S.green }}>{toast.m}</div>
      )}
      <div className="rounded-3xl p-5 md:p-6 text-white relative overflow-hidden" style={{ background: `linear-gradient(125deg, ${S.blueDeep}, ${S.blue})` }}>
        <div aria-hidden className="absolute -right-10 -top-10 w-48 h-48 rounded-full" style={{ background: "rgba(245,183,0,0.18)" }} />
        <span className="inline-flex items-center bg-white rounded-xl px-3 py-1.5 mb-3 relative"><img src={config?.logo_url || LOGO_SALA} alt="Sala do Empreendedor" className="h-8 w-auto object-contain" /></span>
        <p className="font-body text-[11px] font-bold uppercase tracking-[0.16em] text-white/70 relative">{area === "admin" ? "Administração" : "Área do atendente"}</p>
        <h1 className="font-display font-extrabold text-2xl md:text-3xl mt-1 relative">Olá{meuNome ? `, ${meuNome.split(" ")[0]}` : ""}!</h1>
        <div className="flex flex-wrap gap-2 mt-4 relative">
          {[["Página pública", LINKS_SALA.publico], ["Área do atendente", LINKS_SALA.agente], ...(acesso.gerir ? [["Administração", LINKS_SALA.admin]] : [])].map(([r, l]) => (
            <button key={l} onClick={() => { copiar(linkCompleto(l)); avisar(`Link copiado: ${linkCompleto(l)}`); }} className="font-body text-[11px] font-bold rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1" style={{ background: "rgba(255,255,255,0.14)" }}>
              <Link2 size={12} /> {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {abaAtual === "painel" && <AbaPainel ctx={ctx} setAba={setAba} />}
        {abaAtual === "pedidos" && <AbaPedidos ctx={ctx} />}
        {abaAtual === "agenda" && <AbaAgenda ctx={ctx} />}
        {abaAtual === "atendimentos" && <AbaAtendimentos ctx={ctx} />}
        {abaAtual === "indicadores" && <AbaIndicadores ctx={ctx} />}
        {abaAtual === "empreendedores" && <AbaEmpreendedores ctx={ctx} />}
        {abaAtual === "empresas" && <AbaBaseEmpresas ctx={ctx} />}
        {abaAtual === "orientacoes" && <AbaOrientacoes ctx={ctx} />}
        {abaAtual === "gestao" && <AbaGestao ctx={ctx} />}
        {abaAtual === "selo" && <AbaSelo ctx={ctx} />}
        {abaAtual === "estrategias" && <AbaEstrategias ctx={ctx} />}
        {abaAtual === "calendario" && <AbaCalendario ctx={ctx} />}
        {abaAtual === "relatorio" && <AbaRelatorio ctx={ctx} />}
        {abaAtual === "config" && <AbaConfig ctx={ctx} />}
        {abaAtual === "equipe" && <AbaEquipe ctx={ctx} />}
      </div>
    </div>
    </PainelLateral>
  );
}

// ---------------------------------------------------------------------------
// Ações em pedidos (compartilhadas por Pedidos, Agenda e Painel)
// ---------------------------------------------------------------------------
async function mudarStatusPedido(ctx, pedido, status) {
  const atualizar = (lista) => (lista || []).map((p) => (p.id === pedido.id ? { ...p, status } : p));
  if (!supabaseConfigurado || String(pedido.id).startsWith("demo-")) { ctx.setPedidos(atualizar); return true; }
  const { error } = await supabase.from("sala_pedidos").update({ status }).eq("id", pedido.id);
  if (error) { ctx.avisar(error.code === "23505" ? "Esse horário já está ocupado por outro agendamento." : "Não consegui atualizar: " + error.message, "erro"); return false; }
  ctx.setPedidos(atualizar);
  return true;
}
function mensagemWhats(ctx, p) {
  const quando = p.data_agendada ? ` para ${dataBR(p.data_agendada)} às ${p.hora_agendada}` : "";
  return `Olá, ${p.nome.split(" ")[0]}! Aqui é ${ctx.meuNome}, da Sala do Empreendedor de Ivatuba. Recebemos seu pedido de atendimento (${p.servico || "atendimento"})${quando}. Podemos confirmar?`;
}
function CartaoPedido({ ctx, p, compacto = false }) {
  const st = STATUS_PEDIDO[p.status] || STATUS_PEDIDO.novo;
  const zap = linkWhats(p.whatsapp, mensagemWhats(ctx, p));
  return (
    <div className="rounded-2xl border p-3.5 bg-white" style={{ borderColor: S.line }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display font-bold text-sm" style={{ color: S.ink }}>{p.nome}</p>
          <p className="font-body text-xs" style={{ color: S.muted }}>{p.servico || "Atendimento"}</p>
        </div>
        <Selo texto={st.r} cor={st.c} />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 font-body text-[11px]" style={{ color: "#425A70" }}>
        {p.data_agendada && <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> {dataBR(p.data_agendada)} {p.hora_agendada}</span>}
        <span className="inline-flex items-center gap-1"><Phone size={12} /> {formatarFone(p.whatsapp)}</span>
        {p.documento && <DocProtegido doc={p.documento} referencia={p.nome} ctx={ctx} />}
        <span style={{ color: S.soft }}>{p.origem === "balcao" ? "Lançado pela equipe" : `Pedido em ${new Date(p.criado_em).toLocaleDateString("pt-BR")}`}</span>
      </div>
      {!compacto && p.mensagem && <p className="font-body text-xs mt-2 rounded-lg px-2.5 py-2" style={{ background: S.blueTint2, color: "#425A70" }}>{p.mensagem}</p>}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {zap && <a href={zap} target="_blank" rel="noopener noreferrer" className="font-body text-xs font-bold rounded-lg px-3 py-2 inline-flex items-center gap-1.5 text-white" style={{ background: S.greenBright }}><MessageCircle size={13} /> WhatsApp</a>}
        {p.status === "novo" && <Botao cor="#7E5BEF" onClick={async () => { if (await mudarStatusPedido(ctx, p, "agendado")) ctx.avisar("Agendamento confirmado."); }}><CheckCircle2 size={13} /> Confirmar</Botao>}
        {(p.status === "novo" || p.status === "agendado") && (
          <Botao onClick={() => ctx.abrirAtendimento({ nome: p.nome, whatsapp: p.whatsapp, documento: p.documento || "", categoria: CATEGORIAS_SALA.includes(p.servico) ? p.servico : "", observacoes: p.mensagem || "", pedido_id: p.id })}>
            <ClipboardList size={13} /> Registrar atendimento
          </Botao>
        )}
        {(p.status === "novo" || p.status === "agendado") && <Botao contorno cor={S.danger} onClick={async () => { if (await mudarStatusPedido(ctx, p, "cancelado")) ctx.avisar("Pedido cancelado. O horário ficou livre."); }}><X size={13} /> Cancelar</Botao>}
        {p.status === "cancelado" && <Botao contorno onClick={async () => { if (await mudarStatusPedido(ctx, p, "novo")) ctx.avisar("Pedido reaberto."); }}>Reabrir</Botao>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: Painel
// ---------------------------------------------------------------------------
function AbaPainel({ ctx, setAba }) {
  const hoje = hojeISO();
  const mes = hoje.slice(0, 7);
  const pedidos = ctx.pedidos || [];
  const atend = ctx.atendimentos || [];
  const agendaHoje = pedidos.filter((p) => p.data_agendada === hoje && (p.status === "novo" || p.status === "agendado")).sort((a, b) => (a.hora_agendada || "").localeCompare(b.hora_agendada || ""));
  const doMes = atend.filter((a) => String(a.data).startsWith(mes));
  const porCat = {};
  doMes.forEach((a) => { porCat[a.categoria] = (porCat[a.categoria] || 0) + 1; });
  const top = Object.entries(porCat).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI titulo="Pedidos novos" valor={pedidos.filter((p) => p.status === "novo").length} sub="aguardando retorno" icon={Inbox} cor="#0A5AA8" />
        <KPI titulo="Agenda de hoje" valor={agendaHoje.length} sub={dataBR(hoje)} icon={CalendarDays} cor="#7E5BEF" />
        <KPI titulo="Atendimentos hoje" valor={atend.filter((a) => a.data === hoje).length} icon={ClipboardList} cor={S.green} />
        <KPI titulo="Atendimentos no mês" valor={doMes.length} sub={`${MESES[Number(mes.slice(5)) - 1]}/${mes.slice(0, 4)}`} icon={BarChart3} cor="#E8A23D" />
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <Botao onClick={() => ctx.abrirAtendimento({})}><PlusCircle size={14} /> Novo atendimento</Botao>
        <Botao contorno onClick={() => setAba("pedidos")}><Inbox size={14} /> Ver pedidos</Botao>
      </div>
      <div className="grid md:grid-cols-2 gap-4 mt-5">
        <div>
          <p className="font-display font-bold text-sm mb-2" style={{ color: S.ink }}>Agenda de hoje</p>
          {agendaHoje.length === 0 ? <p className="font-body text-sm" style={{ color: S.muted }}>Nenhum agendamento para hoje.</p> : (
            <div className="flex flex-col gap-2">{agendaHoje.map((p) => <CartaoPedido key={p.id} ctx={ctx} p={p} compacto />)}</div>
          )}
        </div>
        <div>
          <p className="font-display font-bold text-sm mb-2" style={{ color: S.ink }}>Mais procurados no mês</p>
          {top.length === 0 ? <p className="font-body text-sm" style={{ color: S.muted }}>Nenhum atendimento registrado neste mês ainda.</p> : (
            <div className="rounded-2xl border p-4 bg-white flex flex-col gap-2" style={{ borderColor: S.line }}>
              {top.map(([c, v]) => (
                <div key={c}>
                  <div className="flex justify-between font-body text-xs mb-1" style={{ color: "#425A70" }}><span className="truncate pr-2">{c}</span><span className="font-bold">{v}</span></div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: S.blueTint }}><div className="h-full rounded-full" style={{ width: `${(v / top[0][1]) * 100}%`, background: S.blue }} /></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: Pedidos do site
// ---------------------------------------------------------------------------
function AbaPedidos({ ctx }) {
  const [filtro, setFiltro] = useState("abertos");
  const [busca, setBusca] = useState("");
  const lista = (ctx.pedidos || []).filter((p) => {
    if (filtro === "abertos" && !(p.status === "novo" || p.status === "agendado")) return false;
    if (filtro !== "abertos" && filtro !== "todos" && p.status !== filtro) return false;
    const b = busca.trim().toLowerCase();
    return !b || `${p.nome} ${p.servico} ${p.whatsapp}`.toLowerCase().includes(b);
  });
  return (
    <div>
      <Titulo eyebrow="Caixa de entrada" title="Pedidos e agendamentos do site" sub="Confirme pelo WhatsApp e, depois de atender, clique em Registrar atendimento." />
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {[["abertos", "Em aberto"], ["novo", "Novos"], ["agendado", "Agendados"], ["atendido", "Atendidos"], ["cancelado", "Cancelados"], ["todos", "Todos"]].map(([k, r]) => (
          <button key={k} onClick={() => setFiltro(k)} className="font-body text-xs font-bold rounded-full px-3 py-1.5 border" style={filtro === k ? { background: S.blue, color: "#fff", borderColor: S.blue } : { background: "#fff", color: "#425A70", borderColor: S.line }}>{r}</button>
        ))}
        <div className="relative ml-auto">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" color={S.soft} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar" className="font-body text-sm border rounded-lg pl-8 pr-3 py-2 outline-none" style={inputStyle} />
        </div>
      </div>
      {ctx.pedidos === null ? <p className="font-body text-sm" style={{ color: S.muted }}>Carregando...</p> : lista.length === 0 ? (
        <p className="font-body text-sm" style={{ color: S.muted }}>Nenhum pedido aqui.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">{lista.map((p) => <CartaoPedido key={p.id} ctx={ctx} p={p} />)}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: Agenda
// ---------------------------------------------------------------------------
function AbaAgenda({ ctx }) {
  const [dia, setDia] = useState(hojeISO());
  const [novo, setNovo] = useState(null); // { hora }
  const [form, setForm] = useState({ nome: "", whatsapp: "", servico: "" });
  const horarios = horariosDaConfig(ctx.config);
  const diaAtende = diasDaConfig(ctx.config).includes(diaSemana(dia));
  const doDia = (ctx.pedidos || []).filter((p) => p.data_agendada === dia && (p.status === "novo" || p.status === "agendado" || p.status === "atendido"));
  const extras = doDia.filter((p) => !horarios.includes(p.hora_agendada));

  const agendar = async (e) => {
    e.preventDefault();
    if (!form.nome.trim() || soDigitos(form.whatsapp).length < 10) { ctx.avisar("Informe nome e WhatsApp com DDD.", "erro"); return; }
    const registro = { nome: form.nome.trim(), whatsapp: soDigitos(form.whatsapp), servico: form.servico || null, data_agendada: dia, hora_agendada: novo.hora, status: "agendado", origem: "balcao" };
    if (!supabaseConfigurado) { ctx.setPedidos((l) => [{ id: `demo-${Date.now()}`, criado_em: new Date().toISOString(), ...registro }, ...(l || [])]); }
    else {
      const { data, error } = await supabase.from("sala_pedidos").insert(registro).select().single();
      if (error) { ctx.avisar(error.code === "23505" ? "Esse horário já foi ocupado." : "Não consegui agendar: " + error.message, "erro"); return; }
      ctx.setPedidos((l) => [data, ...(l || [])]);
    }
    ctx.avisar(`Agendado: ${dataBR(dia)} às ${novo.hora}.`);
    setNovo(null); setForm({ nome: "", whatsapp: "", servico: "" });
  };

  return (
    <div>
      <Titulo eyebrow="Agenda" title={dataBR(dia)} sub={diaAtende ? "Clique num horário livre para agendar alguém do balcão ou do telefone." : "A Sala não abre agenda neste dia da semana (veja Página pública → dias da agenda)."}
        direita={
          <div className="flex items-center gap-1.5">
            <Botao contorno onClick={() => setDia(somarDias(dia, -1))} title="Dia anterior"><ChevronLeft size={14} /></Botao>
            <input type="date" value={dia} onChange={(e) => e.target.value && setDia(e.target.value)} className="font-body text-sm border rounded-lg px-2 py-1.5 outline-none" style={inputStyle} />
            <Botao contorno onClick={() => setDia(somarDias(dia, 1))} title="Próximo dia"><ChevronRight size={14} /></Botao>
            <Botao contorno onClick={() => setDia(hojeISO())}>Hoje</Botao>
          </div>
        } />
      <div className="flex flex-col gap-2">
        {horarios.map((h) => {
          const p = doDia.find((x) => x.hora_agendada === h && x.status !== "atendido") || doDia.find((x) => x.hora_agendada === h);
          return (
            <div key={h} className="grid grid-cols-[64px_1fr] gap-3 items-start">
              <p className="font-display font-bold text-sm pt-3" style={{ color: S.ink }}>{h}</p>
              {p ? <CartaoPedido ctx={ctx} p={p} compacto /> : novo?.hora === h ? (
                <form onSubmit={agendar} className="rounded-2xl border p-3 bg-white grid sm:grid-cols-3 gap-2" style={{ borderColor: S.blue }}>
                  <input autoFocus value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome" className={inputCls} style={inputStyle} />
                  <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="WhatsApp com DDD" className={inputCls} style={inputStyle} />
                  <select value={form.servico} onChange={(e) => setForm({ ...form, servico: e.target.value })} className={inputCls} style={inputStyle}>
                    <option value="">Assunto...</option>
                    {CATEGORIAS_SALA.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <div className="sm:col-span-3 flex gap-2"><Botao type="submit"><CheckCircle2 size={13} /> Agendar</Botao><Botao contorno onClick={() => setNovo(null)}>Cancelar</Botao></div>
                </form>
              ) : (
                <button disabled={!diaAtende} onClick={() => setNovo({ hora: h })} className="rounded-2xl border border-dashed px-3 py-3 text-left font-body text-xs font-semibold disabled:opacity-40" style={{ borderColor: S.line, color: S.soft }}>
                  Livre {diaAtende && "— clique para agendar"}
                </button>
              )}
            </div>
          );
        })}
        {extras.map((p) => (
          <div key={p.id} className="grid grid-cols-[64px_1fr] gap-3 items-start">
            <p className="font-display font-bold text-sm pt-3" style={{ color: S.ink }}>{p.hora_agendada || "—"}</p>
            <CartaoPedido ctx={ctx} p={p} compacto />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: Atendimentos
// ---------------------------------------------------------------------------
const ATENDIMENTO_VAZIO = { data: "", nome: "", documento: "", whatsapp: "", empresa: "", categoria: "", canal: "presencial", situacao: "concluido", observacoes: "", pedido_id: null, encaminhado_para: "", retorno_em: "" };

function AbaAtendimentos({ ctx }) {
  const [form, setForm] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [mes, setMes] = useState(hojeISO().slice(0, 7));
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState("");
  const [apagando, setApagando] = useState(null);
  const [importar, setImportar] = useState(false);

  // Abriu vindo de "Registrar atendimento" / "Novo atendimento"
  useEffect(() => {
    if (ctx.formAtendimento) {
      setForm({ ...ATENDIMENTO_VAZIO, data: hojeISO(), ...ctx.formAtendimento });
      setEditandoId(null);
      ctx.setFormAtendimento(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [ctx.formAtendimento]);

  const salvar = async (e) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.categoria) { ctx.avisar("Preencha o nome e o tipo de atendimento.", "erro"); return; }
    const registro = {
      data: form.data || hojeISO(), nome: form.nome.trim(), documento: soDigitos(form.documento) || null, whatsapp: soDigitos(form.whatsapp) || null,
      empresa: form.empresa?.trim() || null, categoria: form.categoria, canal: form.canal, situacao: form.situacao, observacoes: form.observacoes?.trim() || null,
      pedido_id: form.pedido_id && !String(form.pedido_id).startsWith("demo-") ? form.pedido_id : null,
      ...(form.encaminhado_para?.trim() ? { encaminhado_para: form.encaminhado_para.trim() } : editandoId ? { encaminhado_para: null } : {}),
      ...(form.retorno_em ? { retorno_em: form.retorno_em } : editandoId ? { retorno_em: null } : {}),
      ...(editandoId ? {} : { atendente_id: ctx.meuCadastro?.id || null, atendente_nome: ctx.meuNome }),
    };
    setSalvando(true);
    let salvo = null;
    if (!supabaseConfigurado) {
      salvo = { id: editandoId || `demo-${Date.now()}`, ...registro };
    } else {
      const q = editandoId ? supabase.from("sala_atendimentos").update(registro).eq("id", editandoId) : supabase.from("sala_atendimentos").insert(registro);
      const { data, error } = await q.select().single();
      if (error) { setSalvando(false); ctx.avisar("Não consegui salvar: " + error.message, "erro"); return; }
      salvo = data;
    }
    setSalvando(false);
    ctx.setAtendimentos((l) => (editandoId ? (l || []).map((a) => (a.id === editandoId ? { ...a, ...salvo } : a)) : [salvo, ...(l || [])]));
    if (!editandoId && form.pedido_id) {
      const pedido = (ctx.pedidos || []).find((p) => p.id === form.pedido_id);
      if (pedido) await mudarStatusPedido(ctx, pedido, "atendido");
    }
    ctx.avisar(editandoId ? "Atendimento atualizado." : "Atendimento registrado.");
    setForm(null); setEditandoId(null);
  };

  const apagar = async (a) => {
    setApagando(null);
    if (supabaseConfigurado && !String(a.id).startsWith("demo-")) {
      const { error } = await supabase.from("sala_atendimentos").delete().eq("id", a.id);
      if (error) { ctx.avisar("Não consegui excluir: " + error.message, "erro"); return; }
    }
    ctx.setAtendimentos((l) => (l || []).filter((x) => x.id !== a.id));
    ctx.avisar("Atendimento excluído.");
  };

  // Totais lançados antes das fichas (Painel Admin do Conecta → Sala do Empreendedor - Atendimentos)
  const historico = useMemo(() => {
    if (!mes) return [];
    const [a, m] = mes.split("-").map(Number);
    const fichas = {};
    (ctx.atendimentos || []).forEach((x) => { if (String(x.data).startsWith(mes)) { const c = CATEGORIAS_SALA.includes(x.categoria) ? x.categoria : "Outros"; fichas[c] = (fichas[c] || 0) + 1; } });
    return (ctx.totais || [])
      .filter((t) => Number(t.ano) === a && Number(t.mes) === m && (!cat || t.categoria === cat))
      .map((t) => ({ categoria: t.categoria, semFicha: Math.max(0, (Number(t.total) || 0) - (fichas[t.categoria] || 0)) }))
      .filter((t) => t.semFicha > 0)
      .sort((x, y) => y.semFicha - x.semFicha);
  }, [ctx.totais, ctx.atendimentos, mes, cat]);
  const totHistorico = historico.reduce((s, t) => s + t.semFicha, 0);

  const lista = (ctx.atendimentos || []).filter((a) => {
    if (mes && !String(a.data).startsWith(mes)) return false;
    if (cat && a.categoria !== cat) return false;
    const b = busca.trim().toLowerCase();
    return !b || `${a.nome} ${a.documento || ""} ${a.empresa || ""} ${a.observacoes || ""}`.toLowerCase().includes(b);
  });

  const linhasExport = {
    cab: ["Data", "Nome", "CPF/CNPJ", "Empresa", "Tipo", "Canal", "Situação", "Atendente", "Observações"],
    linhas: lista.map((a) => [dataBR(a.data), a.nome, a.documento || "", a.empresa || "", a.categoria, CANAIS[a.canal] || a.canal, (SITUACOES[a.situacao] || {}).r || a.situacao, a.atendente_nome || "", a.observacoes || ""]),
  };

  return (
    <div>
      <Titulo eyebrow="Ficha de atendimento" title="Atendimentos" sub="Tudo o que é registrado aqui entra no relatório mensal automaticamente."
        direita={!form && (
          <div className="flex flex-wrap gap-2">
            <Botao contorno onClick={() => setImportar((x) => !x)}><Upload size={14} /> Importar do GISE</Botao>
            <Botao onClick={() => { setForm({ ...ATENDIMENTO_VAZIO, data: hojeISO() }); setEditandoId(null); }}><PlusCircle size={14} /> Novo atendimento</Botao>
          </div>
        )} />

      {importar && !form && <ImportarGise ctx={ctx} categorias={CATEGORIAS_SALA} onFechar={() => setImportar(false)} />}

      {form && (
        <form onSubmit={salvar} className="rounded-2xl border p-4 md:p-5 bg-white grid md:grid-cols-3 gap-3 mb-6" style={{ borderColor: S.blue }}>
          <p className="md:col-span-3 font-display font-bold text-sm" style={{ color: S.ink }}>{editandoId ? "Editar atendimento" : form.pedido_id ? "Registrar atendimento do pedido" : "Novo atendimento"}</p>
          <Campo label="Data"><input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className={inputCls} style={inputStyle} /></Campo>
          <Campo label="Nome *" className="md:col-span-2"><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inputCls} style={inputStyle} /></Campo>
          <Campo label="Tipo de atendimento *" className="md:col-span-2">
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className={inputCls} style={inputStyle}>
              <option value="">Escolha...</option>
              {CATEGORIAS_SALA.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Campo>
          <Campo label="Canal">
            <select value={form.canal} onChange={(e) => setForm({ ...form, canal: e.target.value })} className={inputCls} style={inputStyle}>
              {Object.entries(CANAIS).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
            </select>
          </Campo>
          <Campo label="CPF ou CNPJ"><input value={form.documento || ""} onChange={(e) => setForm({ ...form, documento: e.target.value })} inputMode="numeric" className={inputCls} style={inputStyle} /></Campo>
          <Campo label="WhatsApp"><input value={form.whatsapp || ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} inputMode="tel" className={inputCls} style={inputStyle} /></Campo>
          <Campo label="Empresa / nome fantasia"><input value={form.empresa || ""} onChange={(e) => setForm({ ...form, empresa: e.target.value })} className={inputCls} style={inputStyle} /></Campo>
          <Campo label="Situação">
            <select value={form.situacao} onChange={(e) => setForm({ ...form, situacao: e.target.value })} className={inputCls} style={inputStyle}>
              {Object.entries(SITUACOES).map(([k, v]) => <option key={k} value={k}>{v.r}</option>)}
            </select>
          </Campo>
          {form.situacao !== "concluido" && (
            <>
              <Campo label={form.situacao === "encaminhado" ? "Encaminhado para" : "O que falta"}><input value={form.encaminhado_para || ""} onChange={(e) => setForm({ ...form, encaminhado_para: e.target.value })} placeholder={form.situacao === "encaminhado" ? "Ex.: Fomento Paraná, contador, prefeitura" : "Ex.: trazer comprovante"} className={inputCls} style={inputStyle} /></Campo>
              <Campo label="Retornar em"><input type="date" value={form.retorno_em || ""} onChange={(e) => setForm({ ...form, retorno_em: e.target.value })} className={inputCls} style={inputStyle} /></Campo>
            </>
          )}
          <Campo label="Observações" className="md:col-span-2"><textarea rows={2} value={form.observacoes || ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className={inputCls} style={inputStyle} /></Campo>
          <div className="md:col-span-3 flex gap-2">
            <Botao type="submit" disabled={salvando}><CheckCircle2 size={14} /> {salvando ? "Salvando..." : "Salvar atendimento"}</Botao>
            <Botao contorno onClick={() => { setForm(null); setEditandoId(null); }}>Cancelar</Botao>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="font-body text-sm border rounded-lg px-2 py-2 outline-none" style={inputStyle} />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="font-body text-sm border rounded-lg px-2 py-2 outline-none max-w-[240px]" style={inputStyle}>
          <option value="">Todos os tipos</option>
          {CATEGORIAS_SALA.map((c) => <option key={c}>{c}</option>)}
        </select>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" color={S.soft} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, CPF/CNPJ..." className="font-body text-sm border rounded-lg pl-8 pr-3 py-2 outline-none" style={inputStyle} />
        </div>
        {lista.length > 0 && (
          <>
            <Botao contorno onClick={() => exportarExcel(`atendimentos-sala-${mes || "todos"}`, [{ titulo: "Atendimentos", cabecalho: linhasExport.cab, linhas: linhasExport.linhas }])}><Download size={14} /> Excel</Botao>
            <Botao contorno onClick={() => exportarPDF(`atendimentos-sala-${mes || "todos"}`, `Atendimentos — Sala do Empreendedor${mes ? ` · ${mes.split("-").reverse().join("/")}` : ""}`, [{ titulo: `${lista.length} atendimento(s)`, cabecalho: linhasExport.cab, linhas: linhasExport.linhas }], "", "Sala do Empreendedor · Ivatuba-PR")}><Download size={14} /> PDF</Botao>
          </>
        )}
        <span className="font-body text-xs ml-auto" style={{ color: S.muted }}>{lista.length} com ficha{totHistorico ? ` + ${totHistorico} lançado(s) por total = ${lista.length + totHistorico}` : ""}</span>
      </div>

      {historico.length > 0 && (
        <div className="rounded-2xl border p-4 mb-3" style={{ borderColor: S.line, background: S.blueTint2 }}>
          <p className="font-display font-bold text-sm" style={{ color: S.ink }}>{totHistorico} atendimento(s) lançado(s) por total neste mês</p>
          <p className="font-body text-[11px] mb-2" style={{ color: S.muted }}>Números lançados antes da ficha individual (Painel Admin do Conecta → Sala do Empreendedor - Atendimentos). Contam no relatório e nos indicadores, mas não têm nome nem CPF/CNPJ.</p>
          <div className="flex flex-wrap gap-1.5">
            {historico.map((t) => (
              <span key={t.categoria} className="font-body text-xs rounded-lg px-2.5 py-1 bg-white border" style={{ borderColor: S.line, color: "#425A70" }}>{t.categoria}: <b style={{ color: S.ink }}>{t.semFicha}</b></span>
            ))}
          </div>
        </div>
      )}

      {ctx.atendimentos === null ? <p className="font-body text-sm" style={{ color: S.muted }}>Carregando...</p> : lista.length === 0 ? (
        <p className="font-body text-sm" style={{ color: S.muted }}>{totHistorico ? "Nenhuma ficha individual nesse filtro." : "Nenhum atendimento nesse filtro."}</p>
      ) : (
        <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: S.line }}>
          {lista.map((a, i) => {
            const st = SITUACOES[a.situacao] || SITUACOES.concluido;
            return (
              <div key={a.id} className="px-4 py-3 flex flex-col md:flex-row md:items-center gap-2" style={{ borderTop: i ? `1px solid ${S.line}` : "none" }}>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm" style={{ color: S.ink }}>{a.nome} {a.empresa && <span className="font-body font-normal text-xs" style={{ color: S.muted }}>· {a.empresa}</span>}</p>
                  <p className="font-body text-xs" style={{ color: "#425A70" }}>{a.categoria}</p>
                  <p className="font-body text-[11px]" style={{ color: S.soft }}>{dataBR(a.data)} · {CANAIS[a.canal] || a.canal}{a.atendente_nome ? ` · ${a.atendente_nome}` : ""}{a.encaminhado_para ? ` · → ${a.encaminhado_para}` : ""}{a.retorno_em ? ` · retorno ${dataBR(a.retorno_em)}` : ""}{a.observacoes ? ` · ${a.observacoes}` : ""}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Selo texto={st.r} cor={st.c} />
                  {a.whatsapp && <a href={linkWhats(a.whatsapp, `Olá, ${a.nome.split(" ")[0]}! Aqui é ${ctx.meuNome}, da Sala do Empreendedor de Ivatuba.`)} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg" style={{ color: S.greenBright }} title="WhatsApp"><MessageCircle size={15} /></a>}
                  <button onClick={() => { setForm({ ...ATENDIMENTO_VAZIO, ...a, documento: a.documento || "", whatsapp: a.whatsapp || "", empresa: a.empresa || "", observacoes: a.observacoes || "", encaminhado_para: a.encaminhado_para || "", retorno_em: a.retorno_em || "" }); setEditandoId(a.id); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="p-2 rounded-lg" style={{ color: S.blue }} title="Editar"><Pencil size={15} /></button>
                  {apagando === a.id ? (
                    <span className="flex gap-1"><Botao cor={S.danger} onClick={() => apagar(a)}>Excluir</Botao><Botao contorno onClick={() => setApagando(null)}>Não</Botao></span>
                  ) : (
                    <button onClick={() => setApagando(a.id)} className="p-2 rounded-lg" style={{ color: S.danger }} title="Excluir"><Trash2 size={15} /></button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: Relatório mensal
// ---------------------------------------------------------------------------
function AbaRelatorio({ ctx }) {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [dados, setDados] = useState(null);
  const [publicando, setPublicando] = useState(false);
  const anosComDados = useMemo(() => {
    const set = new Set([anoAtual, anoAtual - 1, anoAtual - 2]);
    (ctx.totais || []).forEach((t) => { if ((Number(t.total) || 0) > 0) set.add(Number(t.ano)); });
    return [...set].sort((a, b) => b - a);
  }, [ctx.totais, anoAtual]);

  useEffect(() => {
    if (!supabaseConfigurado) { setDados((ctx.atendimentos || []).filter((a) => String(a.data).startsWith(String(ano)))); return; }
    setDados(null);
    supabase.from("sala_atendimentos").select("data,categoria,canal,situacao").gte("data", `${ano}-01-01`).lte("data", `${ano}-12-31`).limit(20000)
      .then(({ data, error }) => setDados(error ? [] : data || []));
  }, [ano, ctx.atendimentos]);

  const grade = useMemo(() => {
    const g = Object.fromEntries(CATEGORIAS_SALA.map((c) => [c, Array(12).fill(0)]));
    (dados || []).forEach((a) => {
      const m = Number(String(a.data).slice(5, 7)) - 1;
      const c = g[a.categoria] ? a.categoria : "Outros";
      if (m >= 0 && m < 12) g[c][m] += 1;
    });
    // Totais já lançados (antes das fichas): em cada mês/tipo vale o MAIOR dos dois,
    // assim o histórico não some e nada é contado em dobro.
    (ctx.totais || []).forEach((t) => {
      if (Number(t.ano) !== Number(ano)) return;
      const m = Number(t.mes) - 1;
      const c = g[t.categoria] ? t.categoria : "Outros";
      if (m >= 0 && m < 12) g[c][m] = Math.max(g[c][m], Number(t.total) || 0);
    });
    return g;
  }, [dados, ctx.totais, ano]);
  const totMes = MESES.map((_, i) => CATEGORIAS_SALA.reduce((s, c) => s + grade[c][i], 0));
  const totGeral = totMes.reduce((s, v) => s + v, 0);
  const porCanal = {};
  (dados || []).forEach((a) => { porCanal[a.canal] = (porCanal[a.canal] || 0) + 1; });

  const csv = () => exportarCSV(`sala-do-empreendedor-${ano}.csv`, ["Categoria", ...MESES, "Total"],
    [...CATEGORIAS_SALA.map((c) => [c, ...grade[c], grade[c].reduce((s, v) => s + v, 0)]), ["TOTAL", ...totMes, totGeral]]);

  const tabela = [...CATEGORIAS_SALA.map((c) => [c, ...grade[c], grade[c].reduce((s, v) => s + v, 0)]), ["TOTAL", ...totMes, totGeral]];
  const excel = () => exportarExcel(`relatorio-sala-do-empreendedor-${ano}`, [{ titulo: `Relatório ${ano}`, cabecalho: ["Categoria", ...MESES, "Total"], linhas: tabela }]);
  const pdf = () => exportarPDF(`relatorio-sala-do-empreendedor-${ano}`, `Relatório de atendimentos ${ano}`, [{ titulo: "Atendimentos por tipo e mês", cabecalho: ["Categoria", ...MESES, "Total"], linhas: tabela }], "Fichas registradas + totais lançados (GISE).", "Sala do Empreendedor · Ivatuba-PR");

  const publicar = async () => {
    if (!supabaseConfigurado) { ctx.avisar("Modo demonstração: conecte o Supabase para publicar."); return; }
    setPublicando(true);
    const linhas = CATEGORIAS_SALA.flatMap((categoria) => grade[categoria].map((total, i) => ({ ano, mes: i + 1, categoria, total })));
    const { error } = await supabase.from("sala_atendimentos_totais").upsert(linhas, { onConflict: "ano,mes,categoria" });
    setPublicando(false);
    ctx.avisar(error ? "Não consegui publicar: " + error.message : `Números de ${ano} publicados no site.`, error ? "erro" : "ok");
  };

  return (
    <div>
      <Titulo eyebrow="Prestação de contas" title={`Relatório ${ano}`} sub="Fichas registradas + totais já lançados antes das fichas, por tipo e mês (mesmas categorias do relatório do Sebrae)."
        direita={
          <div className="flex flex-wrap gap-2 items-center">
            <select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="font-body text-sm border rounded-lg px-2 py-2 outline-none" style={inputStyle}>
              {anosComDados.map((a) => <option key={a}>{a}</option>)}
            </select>
            <Botao contorno onClick={excel}><Download size={14} /> Excel</Botao>
            <Botao contorno onClick={pdf}><Download size={14} /> PDF</Botao>
            <Botao contorno onClick={csv}><Download size={14} /> CSV</Botao>
            {ctx.gerir && <Botao onClick={publicar} disabled={publicando}><Upload size={14} /> {publicando ? "Publicando..." : "Publicar números no site"}</Botao>}
          </div>
        } />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPI titulo={`Total ${ano}`} valor={totGeral} icon={BarChart3} />
        {Object.entries(CANAIS).map(([k, r]) => <KPI key={k} titulo={r} valor={porCanal[k] || 0} cor={S.green} />).slice(0, 3)}
      </div>
      {dados === null ? <p className="font-body text-sm" style={{ color: S.muted }}>Carregando...</p> : (
        <div className="rounded-2xl border bg-white overflow-x-auto" style={{ borderColor: S.line }}>
          <table className="w-full font-body text-xs">
            <thead>
              <tr style={{ background: S.blueTint2 }}>
                <th className="text-left px-3 py-2 sticky left-0" style={{ background: S.blueTint2, color: S.ink }}>Categoria</th>
                {MESES.map((m) => <th key={m} className="px-2 py-2 text-center" style={{ color: S.ink }}>{m}</th>)}
                <th className="px-3 py-2 text-center" style={{ color: S.ink }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIAS_SALA.map((c) => {
                const t = grade[c].reduce((s, v) => s + v, 0);
                return (
                  <tr key={c} style={{ borderTop: `1px solid ${S.line}` }}>
                    <td className="px-3 py-2 sticky left-0 bg-white min-w-[220px]" style={{ color: "#425A70" }}>{c}</td>
                    {grade[c].map((v, i) => <td key={i} className="px-2 py-2 text-center" style={{ color: v ? S.ink : "#C5D0DB", fontWeight: v ? 700 : 400 }}>{v}</td>)}
                    <td className="px-3 py-2 text-center font-bold" style={{ color: S.blue }}>{t}</td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: `2px solid ${S.line}`, background: S.blueTint2 }}>
                <td className="px-3 py-2 font-bold sticky left-0" style={{ background: S.blueTint2, color: S.ink }}>TOTAL</td>
                {totMes.map((v, i) => <td key={i} className="px-2 py-2 text-center font-bold" style={{ color: S.ink }}>{v}</td>)}
                <td className="px-3 py-2 text-center font-extrabold" style={{ color: S.blue }}>{totGeral}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {ctx.gerir && <p className="font-body text-[11px] mt-2" style={{ color: S.soft }}>"Publicar números no site" atualiza os totais de {ano} (nunca diminui o que já foi lançado) que aparecem na página pública e no Painel Admin → Sala do Empreendedor - Atendimentos.</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: Configuração da página pública (gestor)
// ---------------------------------------------------------------------------
function AbaConfig({ ctx }) {
  const [f, setF] = useState(() => ({ ...CONFIG_PADRAO, ...(ctx.config || {}) }));
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(null);
  useEffect(() => { if (ctx.config) setF({ ...CONFIG_PADRAO, ...ctx.config }); }, [ctx.config]);
  const dias = diasDaConfig(f);
  const NOMES_DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const enviarImagem = async (campo, e) => {
    const arq = e.target.files?.[0];
    e.target.value = "";
    if (!arq) return;
    if (!supabaseConfigurado) { setF((v) => ({ ...v, [campo]: URL.createObjectURL(arq) })); return; }
    setEnviando(campo);
    const caminho = `sala/${Date.now()}-${arq.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error } = await supabase.storage.from("uploads").upload(caminho, arq, { contentType: arq.type });
    setEnviando(null);
    if (error) { ctx.avisar("Não consegui enviar a imagem: " + error.message, "erro"); return; }
    setF((v) => ({ ...v, [campo]: supabase.storage.from("uploads").getPublicUrl(caminho).data.publicUrl }));
  };

  const salvar = async (e) => {
    e.preventDefault();
    const { id, atualizado_em, ...resto } = f;
    const registro = { id: 1, ...resto, agenda_horarios: horariosDaConfig(f).join(","), atualizado_em: new Date().toISOString() };
    if (!supabaseConfigurado) { ctx.setConfig(registro); ctx.avisar("Salvo (demonstração)."); return; }
    setSalvando(true);
    const { data, error } = await supabase.from("sala_config").upsert(registro).select().single();
    setSalvando(false);
    if (error) { ctx.avisar("Não consegui salvar: " + error.message, "erro"); return; }
    ctx.setConfig({ ...CONFIG_PADRAO, ...data });
    ctx.avisar("Página pública atualizada.");
  };

  return (
    <form onSubmit={salvar}>
      <Titulo eyebrow="Administração" title="Página pública" sub={`O que aparece em ${linkCompleto(LINKS_SALA.publico)}`}
        direita={<a href="#/sala" className="font-body text-xs font-bold inline-flex items-center gap-1" style={{ color: S.blue }}>Ver página <ExternalLink size={12} /></a>} />
      <div className="rounded-2xl border p-4 md:p-5 bg-white grid md:grid-cols-2 gap-3" style={{ borderColor: S.line }}>
        <label className="md:col-span-2 flex items-center gap-2 font-body text-sm font-semibold" style={{ color: S.ink }}>
          <input type="checkbox" checked={f.ativo !== false} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> Página pública no ar
        </label>
        <Campo label="Texto de apresentação" className="md:col-span-2"><textarea rows={3} value={f.texto_intro || ""} onChange={(e) => setF({ ...f, texto_intro: e.target.value })} className={inputCls} style={inputStyle} /></Campo>
        <Campo label="Nome de quem atende"><input value={f.atendente_nome || ""} onChange={(e) => setF({ ...f, atendente_nome: e.target.value })} className={inputCls} style={inputStyle} /></Campo>
        <Campo label="WhatsApp da Sala"><input value={f.whatsapp || ""} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} inputMode="tel" placeholder="44999999999" className={inputCls} style={inputStyle} /></Campo>
        <Campo label="E-mail"><input value={f.email || ""} onChange={(e) => setF({ ...f, email: e.target.value })} className={inputCls} style={inputStyle} /></Campo>
        <Campo label="Horário de funcionamento (texto)"><input value={f.horario_texto || ""} onChange={(e) => setF({ ...f, horario_texto: e.target.value })} className={inputCls} style={inputStyle} /></Campo>
        <Campo label="Endereço" className="md:col-span-2"><input value={f.endereco || ""} onChange={(e) => setF({ ...f, endereco: e.target.value })} placeholder="Rua, número, centro — Ivatuba - PR" className={inputCls} style={inputStyle} /></Campo>
        <Campo label="Link do mapa (opcional — se vazio, usa o endereço)" className="md:col-span-2"><input value={f.mapa_url || ""} onChange={(e) => setF({ ...f, mapa_url: e.target.value })} placeholder="Google Maps → Compartilhar → Incorporar mapa → copie o link do src" className={inputCls} style={inputStyle} /></Campo>
        {[["logo_url", "Logo"], ["banner_url", "Foto/banner do topo"]].map(([campo, rotulo]) => (
          <div key={campo} className="flex items-center gap-3">
            <span className="w-16 h-16 rounded-xl border overflow-hidden flex items-center justify-center shrink-0" style={{ borderColor: S.line, background: S.blueTint2 }}>
              {f[campo] ? <img src={f[campo]} alt="" className="w-full h-full object-contain" /> : campo === "logo_url" ? <img src={LOGO_SALA} alt="" className="w-full h-full object-contain p-1" /> : <Store size={18} color={S.soft} />}
            </span>
            <div className="flex flex-col gap-1">
              <span className="font-body text-xs font-bold" style={{ color: S.ink }}>{rotulo}</span>
              <div className="flex gap-2">
                <label className="font-body text-xs font-bold px-3 py-1.5 rounded-lg border cursor-pointer" style={{ borderColor: S.line, color: S.blue }}>
                  {enviando === campo ? "Enviando..." : "Enviar imagem"}<input type="file" accept="image/*" className="hidden" onChange={(e) => enviarImagem(campo, e)} />
                </label>
                {f[campo] && <button type="button" onClick={() => setF({ ...f, [campo]: "" })} className="font-body text-[11px]" style={{ color: S.danger }}>remover</button>}
              </div>
            </div>
          </div>
        ))}
        <div className="md:col-span-2 rounded-xl border p-3 flex flex-col gap-2" style={{ borderColor: S.line }}>
          <label className="flex items-center gap-2 font-body text-sm font-semibold" style={{ color: S.ink }}>
            <input type="checkbox" checked={!!f.agenda_ativa} onChange={(e) => setF({ ...f, agenda_ativa: e.target.checked })} /> Agendamento pelo site ligado
          </label>
          <div className="flex flex-wrap gap-1.5">
            {NOMES_DIAS.map((n, i) => (
              <button type="button" key={n} onClick={() => setF({ ...f, agenda_dias: (dias.includes(i) ? dias.filter((d) => d !== i) : [...dias, i]).sort().join(",") })}
                className="font-body text-xs font-bold rounded-lg px-2.5 py-1.5 border" style={dias.includes(i) ? { background: S.blue, color: "#fff", borderColor: S.blue } : { color: "#425A70", borderColor: S.line }}>{n}</button>
            ))}
          </div>
          <Campo label="Horários da agenda (separados por vírgula)"><input value={f.agenda_horarios || ""} onChange={(e) => setF({ ...f, agenda_horarios: e.target.value })} className={inputCls} style={inputStyle} /></Campo>
        </div>
        <div className="md:col-span-2"><Botao type="submit" disabled={salvando}><CheckCircle2 size={14} /> {salvando ? "Salvando..." : "Salvar página pública"}</Botao></div>
      </div>
      <p className="font-body text-[11px] mt-2" style={{ color: S.soft }}>Os botões de serviços online (MEI, DAS, nota fiscal...) são os mesmos do Painel Admin → Serviços do Empreendedor.</p>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Aba: Equipe (gestor)
// ---------------------------------------------------------------------------
function AbaEquipe({ ctx }) {
  const [f, setF] = useState({ email: "", nome: "", whatsapp: "", papel: "atendente" });
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(null);

  const adicionar = async (e) => {
    e.preventDefault();
    if (!f.nome.trim() || !f.email.trim()) { ctx.avisar("Informe nome e e-mail.", "erro"); return; }
    if (!supabaseConfigurado) { ctx.setEquipe((l) => [...(l || []), { id: `demo-${Date.now()}`, nome: f.nome, whatsapp: f.whatsapp, papel: f.papel, ativo: true }]); setF({ email: "", nome: "", whatsapp: "", papel: "atendente" }); return; }
    setSalvando(true);
    const { data: uid } = await supabase.rpc("sala_buscar_usuario", { p_email: f.email });
    if (!uid) { setSalvando(false); ctx.avisar("Não achei uma conta com esse e-mail. A pessoa precisa se cadastrar no Conecta Comércio primeiro.", "erro"); return; }
    const { data, error } = await supabase.from("sala_equipe").insert({ user_id: uid, nome: f.nome.trim(), whatsapp: soDigitos(f.whatsapp) || null, papel: f.papel }).select().single();
    setSalvando(false);
    if (error) { ctx.avisar(error.code === "23505" ? "Essa conta já está na equipe." : "Não consegui adicionar: " + error.message, "erro"); return; }
    ctx.setEquipe((l) => [...(l || []), data]);
    setF({ email: "", nome: "", whatsapp: "", papel: "atendente" });
    ctx.avisar(`${data.nome} já pode entrar em ${linkCompleto(LINKS_SALA.agente)}`);
  };
  const alterar = async (m, campos) => {
    if (supabaseConfigurado && !String(m.id).startsWith("demo-")) {
      const { error } = await supabase.from("sala_equipe").update(campos).eq("id", m.id);
      if (error) { ctx.avisar("Não consegui alterar: " + error.message, "erro"); return; }
    }
    ctx.setEquipe((l) => (l || []).map((x) => (x.id === m.id ? { ...x, ...campos } : x)));
  };
  const remover = async (m) => {
    setRemovendo(null);
    if (supabaseConfigurado && !String(m.id).startsWith("demo-")) {
      const { error } = await supabase.from("sala_equipe").delete().eq("id", m.id);
      if (error) { ctx.avisar("Não consegui remover: " + error.message, "erro"); return; }
    }
    ctx.setEquipe((l) => (l || []).filter((x) => x.id !== m.id));
    ctx.avisar("Acesso removido.");
  };

  return (
    <div>
      <Titulo eyebrow="Administração" title="Equipe da Sala" sub="Quem pode entrar na área do atendente. Gestor também mexe na página pública e na equipe. O administrador do site sempre tem acesso." />
      <form onSubmit={adicionar} className="rounded-2xl border p-4 bg-white grid md:grid-cols-5 gap-2 mb-5" style={{ borderColor: S.line }}>
        <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Nome" className={inputCls} style={inputStyle} />
        <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="E-mail da conta" className={`${inputCls} md:col-span-2`} style={inputStyle} />
        <input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} placeholder="WhatsApp" className={inputCls} style={inputStyle} />
        <select value={f.papel} onChange={(e) => setF({ ...f, papel: e.target.value })} className={inputCls} style={inputStyle}>
          <option value="atendente">Atendente</option>
          <option value="gestor">Gestor</option>
        </select>
        <div className="md:col-span-5"><Botao type="submit" disabled={salvando}><PlusCircle size={14} /> {salvando ? "Adicionando..." : "Liberar acesso"}</Botao></div>
      </form>
      {(ctx.equipe || []).length === 0 ? <p className="font-body text-sm" style={{ color: S.muted }}>Ninguém na equipe ainda.</p> : (
        <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: S.line }}>
          {(ctx.equipe || []).map((m, i) => (
            <div key={m.id} className="px-4 py-3 flex flex-wrap items-center gap-2" style={{ borderTop: i ? `1px solid ${S.line}` : "none" }}>
              <div className="flex-1 min-w-[160px]">
                <p className="font-display font-bold text-sm" style={{ color: m.ativo ? S.ink : S.soft }}>{m.nome}</p>
                <p className="font-body text-[11px]" style={{ color: S.soft }}>{m.whatsapp ? formatarFone(m.whatsapp) : "sem WhatsApp"}</p>
              </div>
              <select value={m.papel} onChange={(e) => alterar(m, { papel: e.target.value })} className="font-body text-xs border rounded-lg px-2 py-1.5 outline-none" style={inputStyle}>
                <option value="atendente">Atendente</option>
                <option value="gestor">Gestor</option>
              </select>
              <Botao contorno onClick={() => alterar(m, { ativo: !m.ativo })}>{m.ativo ? "Desativar" : "Ativar"}</Botao>
              {removendo === m.id ? (
                <span className="flex gap-1"><Botao cor={S.danger} onClick={() => remover(m)}>Remover</Botao><Botao contorno onClick={() => setRemovendo(null)}>Não</Botao></span>
              ) : <button onClick={() => setRemovendo(m.id)} className="p-2" style={{ color: S.danger }} title="Remover"><Trash2 size={15} /></button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
