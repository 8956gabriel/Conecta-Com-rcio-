// =============================================================================
// MÓDULO FOMENTO PARANÁ — Conecta Comércio (Ivatuba)
//
// Módulo acrescentado à plataforma existente. Não substitui nada do Conecta
// Comércio: usa o mesmo Supabase, a mesma autenticação (perfis) e o mesmo
// padrão visual. Tabelas próprias com prefixo fomento_ (ver
// supabase-fomento-parana.sql).
//
//   • <FomentoPublico />  → página pública  #/fomento
//   • <FomentoAdmin />    → painel do Agente de Crédito  #/fomento-admin
//                           (e também dentro do Painel Admin, item "Fomento Paraná")
//   • useFomentoAcesso()  → diz se o usuário logado pode abrir o painel
// =============================================================================
import React, { useState, useEffect, useMemo } from "react";
import {
  Landmark, HandCoins, MessageCircle, FileText, Download, Calculator, ClipboardList,
  CheckCircle2, X, Search, Bell, Trophy, Settings, LayoutDashboard, Users, Pencil,
  Trash2, Eye, EyeOff, Upload, Calendar, ChevronRight, ShieldCheck, PlusCircle,
  Clock, ArrowRight, ExternalLink, Columns, Inbox, History,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { supabase, supabaseConfigurado } from "./supabaseClient";

// ---------------------------------------------------------------------------
// Identidade do módulo — azul + branco com detalhes em verde, no mesmo padrão
// de tokens do Conecta Comércio (a cor principal do site continua mandando).
// ---------------------------------------------------------------------------
const F = {
  blue: "var(--cor-principal, #0A5AA8)",
  blueDeep: "var(--cor-principal-profunda, #052A4D)",
  blueTint: "#EAF2FB",
  blueTint2: "#F5F9FD",
  green: "#1E8E5A",
  greenBright: "#25A85B",
  greenTint: "#E7F6EE",
  ink: "#0E2233",
  muted: "#5C7186",
  soft: "#8896A6",
  line: "#DCE7F2",
  danger: "#B4462F",
};

export const STATUS_PROPOSTA = {
  novo: { rotulo: "Novos contratos", curto: "Novo", cor: "#0A5AA8", pontos: 1 },
  em_contato: { rotulo: "Em contato", curto: "Em contato", cor: "#7E5BEF", pontos: 2 },
  documentacao: { rotulo: "Documentação", curto: "Documentação", cor: "#E8A23D", pontos: 3 },
  em_analise: { rotulo: "Em análise", curto: "Em análise", cor: "#0EA5A5", pontos: 4 },
  concedido: { rotulo: "Concedidos", curto: "Concedido", cor: "#1E8E5A", pontos: 10 },
  negado: { rotulo: "Negados", curto: "Negado", cor: "#B4462F", pontos: 1 },
  excluido: { rotulo: "Excluídos", curto: "Excluído", cor: "#8896A6", pontos: 0 },
};

// Ranking oficial dos agentes no FomentoNet (sistema da Fomento Paraná).
// Só redireciona para o link oficial — o login é feito lá, no próprio FomentoNet.
const FOMENTONET_RANKING_URL = "https://www.fomentonet.pr.gov.br/fomentonet/rankingAgente.do?action=exibirRankingGeral";

const TIPOS_MATERIAL = {
  cartilha: "Cartilha de linhas de crédito",
  taxas: "Taxas e condições",
  documentacao: "Documentação necessária",
  informativo: "Informativo da modalidade",
};

const TIPOS_CONTATO = {
  atendimento: "Solicitar atendimento",
  duvida: "Tirar dúvidas",
  agendamento: "Agendar atendimento",
  interesse: "Tenho interesse nesta linha",
  simulacao: "Fiz uma simulação",
};

// Dados de exemplo — usados só no modo demonstração (sem Supabase).
const LINHAS_DEMO = [
  ["pesca-nautica", "Fomento Pesca e Náutica", "Crédito para quem trabalha com pesca, aquicultura, turismo náutico e atividades ligadas à água.", "Compra de barcos, motores, equipamentos e capital de giro da atividade.", "Pescadores, marinas, prestadores de serviços náuticos.", "#0A5AA8"],
  ["taxista", "Fomento Taxista", "Financiamento para taxistas trocarem ou adquirirem o veículo de trabalho.", "Aquisição de veículo novo ou seminovo para uso como táxi.", "Taxistas com permissão/alvará ativo.", "#0A5AA8"],
  ["taxista-mulher", "Fomento Taxista Mulher", "Condição especial para mulheres taxistas.", "Aquisição de veículo para uso como táxi.", "Mulheres taxistas com permissão/alvará ativo.", "#1E8E5A"],
  ["micro-emergencial", "Micro Emergencial", "Linha de apoio a empreendedores de municípios em situação de emergência ou calamidade.", "Recompor capital de giro, estoques e equipamentos após eventos adversos.", "Empreendedores de municípios com decreto de emergência reconhecido.", "#C2410C"],
  ["micro-facil", "Micro Fácil", "Microcrédito ágil para pequenos negócios formais e informais.", "Capital de giro e investimentos no negócio.", "MEI, microempresas e empreendedores informais.", "#0A5AA8"],
  ["micro-mulher", "Micro Mulher", "Microcrédito com condições especiais para empreendedoras (Banco da Mulher Paranaense).", "Capital de giro e investimentos no negócio.", "Mulheres empreendedoras, formais ou informais.", "#1E8E5A"],
  ["micro-mulher-rural", "Micro Mulher Rural", "Microcrédito para mulheres que empreendem no meio rural.", "Investimento e capital de giro de atividades rurais.", "Produtoras rurais e empreendedoras do campo.", "#1E8E5A"],
  ["micro-rural", "Micro Rural", "Microcrédito para pequenos negócios do meio rural.", "Investimento e capital de giro de atividades rurais.", "Produtores e empreendedores rurais.", "#3F7D20"],
  ["recupera-micro", "Recupera de Micro", "Linha de recuperação para micro e pequenos negócios.", "Reorganizar o capital de giro e retomar a atividade.", "Micro e pequenos empreendedores.", "#0A5AA8"],
].map(([slug, nome, descricao, finalidade, publico_alvo, cor], i) => ({
  id: `demo-${slug}`, slug, nome, descricao, finalidade, publico_alvo, cor, ordem: i + 1, ativo: true,
  taxas: "", prazos: "", carencia: "", valores: "", requisitos: "", documentos: [], pdf_url: "",
  taxa_mensal_ref: null, valor_min: null, valor_max: null, prazo_max_meses: null, carencia_max_meses: null,
  atualizado_em: new Date().toISOString(),
}));

const CONFIG_PADRAO = {
  ativo: true,
  whatsapp_oficial: "",
  agente_nome: "Ademir",
  titulo: "Fomento Paraná — Crédito para Empreendedores",
  texto_intro: "Conheça as linhas de crédito da Fomento Paraná, agência oficial de crédito do Governo do Paraná, com atendimento do Agente de Crédito em Ivatuba.",
  link_oficial: "https://www.fomento.pr.gov.br/Linhas-de-Credito",
  aviso_simulacao: "Simulação apenas estimativa. Taxas, prazos e valores finais dependem da análise de crédito da Fomento Paraná.",
};

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
export const moeda = (v) => (v == null || v === "" || isNaN(Number(v)) ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const dataBR = (d) => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("pt-BR") : "—");
const dataHoraBR = (d) => (d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");
const hojeLocal = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const soDigitos = (s) => String(s || "").replace(/\D/g, "");
function parseValor(texto) {
  if (texto == null || texto === "") return null;
  if (typeof texto === "number") return texto;
  const limpo = String(texto).replace(/[^\d,.-]/g, "");
  const n = limpo.includes(",") ? Number(limpo.replace(/\./g, "").replace(",", ".")) : Number(limpo);
  return isNaN(n) ? null : n;
}
// LGPD: mostra só parte do documento nas listas.
export function mascararDoc(doc) {
  const d = soDigitos(doc);
  if (!d) return "—";
  if (d.length === 11) return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
  if (d.length === 14) return `**.${d.slice(2, 5)}.${d.slice(5, 8)}/****-**`;
  return `${d.slice(0, 2)}****${d.slice(-2)}`;
}
function formatarDoc(doc) {
  const d = soDigitos(doc);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return doc || "—";
}
function mascararFone(f) {
  const d = soDigitos(f);
  if (d.length < 8) return f || "—";
  return `(${d.slice(0, 2)}) *****-${d.slice(-4)}`;
}
function linkWhats(numero, texto) {
  const d = soDigitos(numero);
  if (!d) return null;
  const comPais = d.startsWith("55") && d.length > 11 ? d : `55${d}`;
  return `https://wa.me/${comPais}?text=${encodeURIComponent(texto)}`;
}

// Tabela Price com carência (juros da carência somados ao saldo) — estimativa.
export function simular({ valor, taxaMensal, meses, carencia = 0 }) {
  const pv = Number(valor) || 0;
  const n = Math.max(1, Number(meses) || 1);
  const c = Math.max(0, Number(carencia) || 0);
  const i = (Number(taxaMensal) || 0) / 100;
  const saldo = pv * Math.pow(1 + i, c);
  const parcela = i === 0 ? saldo / n : (saldo * i) / (1 - Math.pow(1 + i, -n));
  const total = parcela * n;
  return { parcela, total, juros: total - pv, saldoAposCarencia: saldo };
}

async function registrarAcesso(acao, referencia = null) {
  if (!supabaseConfigurado) return;
  try { await supabase.from("fomento_acessos").insert({ acao, referencia }); } catch { /* best-effort */ }
}

// Carrega config + linhas + materiais (público).
function useFomentoPublico() {
  const [config, setConfig] = useState(null);
  const [linhas, setLinhas] = useState(null);
  const [materiais, setMateriais] = useState(null);
  const [rankingOficial, setRankingOficial] = useState(null);
  const recarregar = async () => {
    if (!supabaseConfigurado) {
      setConfig((c) => c ?? CONFIG_PADRAO); setLinhas((l) => l ?? LINHAS_DEMO); setMateriais((m) => m ?? []); setRankingOficial((r) => r ?? []);
      return;
    }
    const [cfg, lin, mat, rk] = await Promise.all([
      supabase.from("fomento_config").select("*").eq("id", 1).maybeSingle(),
      supabase.from("fomento_linhas").select("*").order("ordem"),
      supabase.from("fomento_materiais").select("*").order("atualizado_em", { ascending: false }),
      supabase.from("fomento_ranking_oficial").select("*").order("data_referencia", { ascending: false }).order("criado_em", { ascending: false }).limit(24),
    ]);
    setConfig({ ...CONFIG_PADRAO, ...(cfg.data || {}) });
    setLinhas(lin.error ? [] : lin.data || []);
    setMateriais(mat.error ? [] : mat.data || []);
    setRankingOficial(rk.error ? [] : rk.data || []);
  };
  useEffect(() => { recarregar(); }, []);
  return { config, setConfig, linhas, setLinhas, materiais, setMateriais, rankingOficial, setRankingOficial, recarregar };
}

// Quem pode ver o painel do Fomento: admin do site ou agente liberado.
export function useFomentoAcesso(sessao, perfil) {
  // null = ainda verificando (evita mostrar "sem acesso" enquanto carrega)
  const [pode, setPode] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) { setPode(true); return; }
    if (sessao === undefined) { setPode(null); return; }
    if (!sessao) { setPode(false); return; }
    if (perfil?.tipo === "admin") { setPode(true); return; }
    setPode(null);
    supabase.rpc("fomento_pode_acessar").then(({ data, error }) => setPode(!error && data === true));
  }, [sessao?.user?.id, perfil?.tipo]);
  return pode;
}

// ---------------------------------------------------------------------------
// Peças de interface
// ---------------------------------------------------------------------------
function Titulo({ eyebrow, title, sub, direita }) {
  return (
    <div className="flex items-end justify-between gap-3 flex-wrap mb-5">
      <div>
        {eyebrow && <p className="font-display text-[11px] font-bold tracking-[0.16em] uppercase" style={{ color: F.green }}>{eyebrow}</p>}
        <h2 className="font-display font-extrabold text-xl md:text-2xl mt-1" style={{ color: F.ink }}>{title}</h2>
        {sub && <p className="font-body text-sm mt-1" style={{ color: F.muted }}>{sub}</p>}
      </div>
      {direita}
    </div>
  );
}

function Campo({ label, children, className = "" }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="font-body text-[11px] font-bold uppercase tracking-wide" style={{ color: F.muted }}>{label}</span>
      {children}
    </label>
  );
}
const inputCls = "font-body text-sm border rounded-lg px-3 py-2.5 outline-none bg-white w-full focus:ring-2 focus:ring-blue-200";
const inputSty = { borderColor: F.line };

function BadgeStatus({ status }) {
  const s = STATUS_PROPOSTA[status] || { curto: status, cor: F.soft };
  return (
    <span className="font-body text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: `${s.cor}1A`, color: s.cor }}>{s.curto}</span>
  );
}

function Aviso({ children, tipo = "info" }) {
  const cores = tipo === "erro" ? ["#FBEAE5", F.danger] : tipo === "ok" ? [F.greenTint, F.green] : ["#FFF6E9", "#8A5A12"];
  return <div className="rounded-xl px-3.5 py-2.5 font-body text-xs" style={{ background: cores[0], color: cores[1] }}>{children}</div>;
}

function Modal({ aberto, onFechar, titulo, children, largura = "max-w-2xl" }) {
  useEffect(() => {
    if (!aberto) return;
    const esc = (e) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto]);
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(5,42,77,0.55)" }} onClick={onFechar}>
      <div className={`bg-white w-full ${largura} max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white/95 backdrop-blur flex items-center justify-between gap-3 px-5 py-4 border-b z-10" style={{ borderColor: F.line }}>
          <p className="font-display font-extrabold text-base" style={{ color: F.ink }}>{titulo}</p>
          <button onClick={onFechar} aria-label="Fechar" className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: F.blueTint2 }}><X size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ivatuba no Ranking Geral oficial da Fomento Paraná (lançado manualmente)
// ---------------------------------------------------------------------------
const FAIXAS_RANKING = ["Até 5 mil hab", "Até 10 mil hab", "Até 20 mil hab", "Até 50 mil hab", "Até 100 mil hab", "Até 200 mil hab", "Acima de 200 mil hab"];

function CardRankingIvatuba({ registro, anterior, compacto = false }) {
  if (!registro) return null;
  const variacao = anterior?.posicao_geral && registro.posicao_geral ? anterior.posicao_geral - registro.posicao_geral : null;
  const itens = [
    registro.posicao_geral ? [`${registro.posicao_geral}º`, registro.total_geral ? `de ${registro.total_geral} agentes no Paraná` : "no Paraná (geral)"] : null,
    registro.posicao_faixa ? [`${registro.posicao_faixa}º`, `${registro.total_faixa ? `de ${registro.total_faixa} agentes` : ""}${registro.faixa ? ` · faixa ${registro.faixa}` : " na faixa"}`.trim()] : null,
    registro.pontuacao != null ? [Number(registro.pontuacao).toLocaleString("pt-BR"), "pontos"] : null,
  ].filter(Boolean);
  return (
    <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: `linear-gradient(120deg, ${F.blueDeep}, ${F.blue})` }}>
      <div aria-hidden className="absolute -right-10 -top-12 w-44 h-44 rounded-full" style={{ background: "rgba(37,168,91,0.25)" }} />
      <div className="relative flex items-start gap-3 flex-wrap">
        <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(37,168,91,0.4)" }}><Trophy size={20} /></span>
        <div className="flex-1 min-w-[180px]">
          <p className="font-body text-[11px] font-bold uppercase tracking-wider text-white/70">Ranking Geral dos Agentes de Crédito · Fomento Paraná</p>
          <p className={`font-display font-extrabold ${compacto ? "text-base" : "text-lg md:text-xl"} mt-0.5`}>Ivatuba no ranking estadual</p>
          {variacao ? (
            <p className="font-body text-xs mt-0.5" style={{ color: variacao > 0 ? "#8FF2C4" : "#F2C4B8" }}>
              {variacao > 0 ? `▲ subiu ${variacao} posição(ões)` : `▼ caiu ${Math.abs(variacao)} posição(ões)`} desde {dataBR(anterior.data_referencia)}
            </p>
          ) : null}
        </div>
      </div>
      <div className="relative grid grid-cols-3 gap-2 mt-4">
        {itens.map(([n, r]) => (
          <div key={r} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.12)" }}>
            <p className="font-display font-extrabold text-2xl leading-none">{n}</p>
            <p className="font-body text-[11px] text-white/70 mt-1">{r}</p>
          </div>
        ))}
      </div>
      {registro.observacao && <p className="relative font-body text-xs text-white/80 mt-3">{registro.observacao}</p>}
      <p className="relative font-body text-[10px] text-white/60 mt-3">Atualizado em {dataBR(registro.data_referencia)} · fonte: FomentoNet (Fomento Paraná)</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel de crédito público — só totais (nenhum dado pessoal), via função
// fomento_resumo_publico() do banco.
// ---------------------------------------------------------------------------
function PainelCreditoPublico({ resumo }) {
  if (!resumo) return null;
  const itens = [
    ["Propostas", Number(resumo.total_propostas).toLocaleString("pt-BR"), ClipboardList, F.blue],
    ["Concedidas", Number(resumo.concedidos).toLocaleString("pt-BR"), CheckCircle2, F.green],
    ["Recusadas", Number(resumo.recusados).toLocaleString("pt-BR"), X, F.danger],
    ["Valor solicitado", moeda(resumo.valor_solicitado), HandCoins, "#7E5BEF"],
    ["Valor concedido", moeda(resumo.valor_concedido), Landmark, F.green],
    ["Taxa de aprovação", `${resumo.taxa_aprovacao}%`, Trophy, "#E8A23D"],
  ];
  return (
    <div>
      <Titulo eyebrow="Painel de crédito · Ivatuba" title="Crédito que já chegou aos empreendedores" sub="Números do atendimento do Agente de Crédito da Fomento Paraná em Ivatuba." />
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {itens.map(([rotulo, valor, Icon, cor]) => (
          <div key={rotulo} className="rounded-2xl border p-4 bg-white" style={{ borderColor: F.line }}>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${cor}1A`, color: cor }}><Icon size={15} /></span>
            <p className="font-display font-extrabold text-xl md:text-2xl mt-2 leading-tight" style={{ color: F.ink }}>{valor}</p>
            <p className="font-body text-[11px] mt-0.5" style={{ color: F.muted }}>{rotulo}</p>
          </div>
        ))}
      </div>
      <p className="font-body text-[10px] mt-2" style={{ color: F.soft }}>
        Taxa de aprovação = concedidas ÷ (concedidas + recusadas). Propostas excluídas não entram na conta.{resumo.atualizado_em ? ` Atualizado em ${dataBR(resumo.atualizado_em)}.` : ""}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Simulador (usado na área pública e no painel)
// ---------------------------------------------------------------------------
function Simulador({ linhas, config, modoAdmin = false, linhaInicial, onInteresse }) {
  const ativas = (linhas || []).filter((l) => l.ativo);
  const [linhaId, setLinhaId] = useState(linhaInicial || ativas[0]?.id || "");
  useEffect(() => { if (linhaInicial) setLinhaId(linhaInicial); }, [linhaInicial]);
  useEffect(() => { if (!linhaId && ativas[0]) setLinhaId(ativas[0].id); }, [ativas.length]);
  const linha = ativas.find((l) => l.id === linhaId);
  const [valor, setValor] = useState("5000");
  const [meses, setMeses] = useState(12);
  const [carencia, setCarencia] = useState(0);
  const [taxaManual, setTaxaManual] = useState("");

  const taxaRef = linha?.taxa_mensal_ref != null ? Number(linha.taxa_mensal_ref) : null;
  const taxa = taxaManual !== "" ? parseValor(taxaManual) : taxaRef;
  const prazoMax = linha?.prazo_max_meses || 60;
  const carenciaMax = linha?.carencia_max_meses ?? 6;
  const v = parseValor(valor) || 0;
  const foraDaFaixa = linha && ((linha.valor_min && v < Number(linha.valor_min)) || (linha.valor_max && v > Number(linha.valor_max)));
  const r = taxa != null ? simular({ valor: v, taxaMensal: taxa, meses, carencia: Math.min(carencia, carenciaMax) }) : null;

  return (
    <div className="grid lg:grid-cols-[1.1fr_1fr] gap-5">
      <div className="rounded-2xl border p-5 grid sm:grid-cols-2 gap-3" style={{ borderColor: F.line }}>
        <Campo label="Linha de crédito" className="sm:col-span-2">
          <select value={linhaId} onChange={(e) => { setLinhaId(e.target.value); setTaxaManual(""); }} className={inputCls} style={inputSty}>
            {ativas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </Campo>
        <Campo label="Valor desejado (R$)">
          <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" className={inputCls} style={inputSty} />
        </Campo>
        <Campo label={`Prazo: ${meses} meses`}>
          <input type="range" min={1} max={prazoMax} value={Math.min(meses, prazoMax)} onChange={(e) => setMeses(Number(e.target.value))} className="w-full accent-green-600 mt-3" />
        </Campo>
        <Campo label={`Carência: ${Math.min(carencia, carenciaMax)} meses`}>
          <input type="range" min={0} max={carenciaMax} value={Math.min(carencia, carenciaMax)} onChange={(e) => setCarencia(Number(e.target.value))} className="w-full accent-green-600 mt-3" />
        </Campo>
        <Campo label={taxaRef != null ? `Taxa (% a.m.) — referência ${taxaRef}%` : "Taxa (% ao mês)"}>
          <input value={taxaManual} onChange={(e) => setTaxaManual(e.target.value)} inputMode="decimal"
            placeholder={taxaRef != null ? String(taxaRef).replace(".", ",") : "Informe a taxa"} className={inputCls} style={inputSty} />
        </Campo>
        {linha && (linha.valores || linha.prazos) && (
          <p className="sm:col-span-2 font-body text-[11px]" style={{ color: F.muted }}>
            {linha.valores && <>Valores: {linha.valores}. </>}{linha.prazos && <>Prazos: {linha.prazos}.</>}
          </p>
        )}
        {foraDaFaixa && <div className="sm:col-span-2"><Aviso>O valor informado está fora da faixa cadastrada para esta linha ({moeda(linha.valor_min)} a {moeda(linha.valor_max)}).</Aviso></div>}
      </div>

      <div className="rounded-2xl p-5 text-white relative overflow-hidden flex flex-col" style={{ background: `linear-gradient(135deg, ${F.blueDeep}, ${F.blue})` }}>
        <div aria-hidden className="absolute -right-10 -top-10 w-40 h-40 rounded-full" style={{ background: "rgba(37,168,91,0.25)" }} />
        <p className="font-body text-[11px] font-bold uppercase tracking-wider text-white/70 relative">Estimativa da parcela</p>
        {r ? (
          <>
            <p className="font-display font-extrabold text-4xl mt-1 relative">{moeda(r.parcela)}</p>
            <p className="font-body text-xs text-white/70 relative">{meses}x {carencia > 0 ? `após ${Math.min(carencia, carenciaMax)} meses de carência` : ""}</p>
            <div className="grid grid-cols-2 gap-2 mt-4 relative">
              {[["Valor solicitado", moeda(v)], ["Total estimado", moeda(r.total)], ["Juros estimados", moeda(r.juros)], ["Taxa usada", `${String(taxa).replace(".", ",")}% a.m.`]].map(([k, val]) => (
                <div key={k} className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <p className="font-body text-[10px] text-white/60">{k}</p>
                  <p className="font-display font-bold text-sm">{val}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="font-body text-sm mt-3 text-white/80 relative">
            {modoAdmin ? "Esta linha ainda não tem taxa de referência cadastrada. Informe a taxa ao lado ou cadastre em Linhas de crédito." : "Informe uma taxa ao lado para ver a estimativa, ou fale com o Agente de Crédito para saber a taxa vigente."}
          </p>
        )}
        <p className="font-body text-[10px] text-white/60 mt-auto pt-4 relative">{config?.aviso_simulacao || CONFIG_PADRAO.aviso_simulacao}</p>
        {onInteresse && linha && (
          <button onClick={() => onInteresse({ linha, valor: v, meses })}
            className="glow-btn relative mt-3 font-body text-sm font-bold rounded-xl px-4 py-2.5 flex items-center justify-center gap-2" style={{ background: F.greenBright }}>
            <MessageCircle size={15} /> Enviar esta simulação ao Agente
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formulário de pré-cadastro de interesse (público) — NÃO é proposta oficial
// ---------------------------------------------------------------------------
function FormInteresse({ linhas, inicial, whatsAgente, nomeAgente, onEnviado }) {
  const [form, setForm] = useState({ nome: "", whatsapp: "", cidade: "Ivatuba", linha_id: "", tipo_contato: "interesse", valor_desejado: "", mensagem: "", consentimento: false });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (inicial) setForm((f) => ({ ...f, linha_id: inicial.linha?.id || f.linha_id, tipo_contato: inicial.tipo || f.tipo_contato, valor_desejado: inicial.valor ? String(inicial.valor) : f.valor_desejado }));
  }, [inicial]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    if (!form.nome.trim() || soDigitos(form.whatsapp).length < 10) { setErro("Informe seu nome e um WhatsApp com DDD."); return; }
    if (!form.consentimento) { setErro("Para continuar, autorize o uso dos seus dados para o atendimento."); return; }
    setEnviando(true);
    const registro = {
      nome: form.nome.trim(), whatsapp: form.whatsapp.trim(), cidade: form.cidade.trim() || null,
      linha_id: form.linha_id && !String(form.linha_id).startsWith("demo-") ? form.linha_id : null,
      tipo_contato: form.tipo_contato, valor_desejado: parseValor(form.valor_desejado),
      prazo_meses: inicial?.meses || null, mensagem: form.mensagem.trim() || null, consentimento_lgpd: true,
    };
    try {
      if (supabaseConfigurado) {
        const { error } = await supabase.from("fomento_interesses").insert(registro);
        if (error) throw error;
      }
      setOk(true);
      onEnviado?.();
    } catch (err) {
      setErro(err.message || "Não foi possível enviar agora. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  if (ok) {
    const linha = linhas?.find((l) => l.id === form.linha_id);
    const zap = linkWhats(whatsAgente, `Olá, ${nomeAgente}! Sou ${form.nome} e acabei de fazer meu pré-cadastro no Conecta Comércio${linha ? ` para a linha ${linha.nome}` : ""}.`);
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: F.greenTint }}>
        <CheckCircle2 size={36} className="mx-auto" color={F.green} />
        <p className="font-display font-extrabold text-lg mt-2" style={{ color: F.ink }}>Pré-cadastro enviado!</p>
        <p className="font-body text-sm mt-1" style={{ color: F.muted }}>O Agente de Crédito vai entrar em contato. Isso ainda não é uma proposta de crédito — é só o seu interesse.</p>
        {zap && <a href={zap} target="_blank" rel="noopener noreferrer" className="inline-flex mt-4 font-body text-sm font-bold rounded-xl px-4 py-2.5 text-white items-center gap-2" style={{ background: F.greenBright }}><MessageCircle size={15} /> Avisar pelo WhatsApp</a>}
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="grid sm:grid-cols-2 gap-3">
      <Campo label="Nome completo"><input value={form.nome} onChange={set("nome")} className={inputCls} style={inputSty} autoComplete="name" /></Campo>
      <Campo label="WhatsApp (com DDD)"><input value={form.whatsapp} onChange={set("whatsapp")} inputMode="tel" className={inputCls} style={inputSty} autoComplete="tel" /></Campo>
      <Campo label="Linha de interesse">
        <select value={form.linha_id} onChange={set("linha_id")} className={inputCls} style={inputSty}>
          <option value="">Ainda não sei</option>
          {(linhas || []).filter((l) => l.ativo).map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>
      </Campo>
      <Campo label="O que você precisa?">
        <select value={form.tipo_contato} onChange={set("tipo_contato")} className={inputCls} style={inputSty}>
          {Object.entries(TIPOS_CONTATO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Campo>
      <Campo label="Valor aproximado (opcional)"><input value={form.valor_desejado} onChange={set("valor_desejado")} inputMode="decimal" className={inputCls} style={inputSty} /></Campo>
      <Campo label="Cidade"><input value={form.cidade} onChange={set("cidade")} className={inputCls} style={inputSty} /></Campo>
      <Campo label="Mensagem (opcional)" className="sm:col-span-2"><textarea value={form.mensagem} onChange={set("mensagem")} rows={2} className={inputCls} style={inputSty} /></Campo>
      <label className="sm:col-span-2 flex items-start gap-2 font-body text-xs cursor-pointer" style={{ color: F.muted }}>
        <input type="checkbox" checked={form.consentimento} onChange={set("consentimento")} className="mt-0.5 accent-green-600" />
        Autorizo o uso do meu nome e WhatsApp apenas para o Agente de Crédito entrar em contato sobre o crédito da Fomento Paraná (LGPD). Não envie CPF ou documentos por aqui.
      </label>
      {erro && <p className="sm:col-span-2 font-body text-xs" style={{ color: F.danger }}>{erro}</p>}
      <button type="submit" disabled={enviando} className="sm:col-span-2 glow-btn font-body text-sm font-bold text-white rounded-xl py-3 disabled:opacity-60" style={{ background: F.blue }}>
        {enviando ? "Enviando..." : "Enviar pré-cadastro"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Detalhe de uma linha (público)
// ---------------------------------------------------------------------------
function DetalheLinha({ linha, materiais, whatsAgente, nomeAgente, onPreCadastro, onSimular }) {
  const pdfs = (materiais || []).filter((m) => m.publicado && m.linha_id === linha.id);
  const acoes = [
    ["atendimento", "Solicitar atendimento"],
    ["duvida", "Tirar dúvidas"],
    ["agendamento", "Agendar atendimento"],
    ["interesse", "Tenho interesse nesta linha"],
  ];
  const info = [
    ["Finalidade", linha.finalidade], ["Público-alvo", linha.publico_alvo], ["Taxas", linha.taxas],
    ["Prazos", linha.prazos], ["Carência", linha.carencia], ["Valores disponíveis", linha.valores], ["Requisitos", linha.requisitos],
  ];
  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-sm" style={{ color: F.muted }}>{linha.descricao}</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {info.map(([k, v]) => (
          <div key={k} className="rounded-xl p-3" style={{ background: F.blueTint2 }}>
            <p className="font-body text-[10px] font-bold uppercase tracking-wide" style={{ color: F.green }}>{k}</p>
            <p className="font-body text-sm mt-0.5 whitespace-pre-line" style={{ color: v ? F.ink : F.soft }}>{v || "Consulte o Agente de Crédito"}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="font-display font-bold text-sm mb-2" style={{ color: F.ink }}>Documentos necessários</p>
        {(linha.documentos || []).length ? (
          <ul className="flex flex-col gap-1.5">
            {linha.documentos.map((d, i) => (
              <li key={i} className="font-body text-sm flex items-start gap-2" style={{ color: F.ink }}><CheckCircle2 size={15} color={F.green} className="mt-0.5 shrink-0" />{d}</li>
            ))}
          </ul>
        ) : <p className="font-body text-xs" style={{ color: F.soft }}>A lista de documentos desta linha será publicada em breve. Fale com o Agente de Crédito.</p>}
      </div>
      {(linha.pdf_url || pdfs.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {linha.pdf_url && <a href={linha.pdf_url} target="_blank" rel="noopener noreferrer" className="font-body text-xs font-bold rounded-lg px-3 py-2 border flex items-center gap-1.5" style={{ borderColor: F.line, color: F.blue }}><Download size={13} /> Informativo em PDF</a>}
          {pdfs.map((m) => <a key={m.id} href={m.arquivo_url} target="_blank" rel="noopener noreferrer" className="font-body text-xs font-bold rounded-lg px-3 py-2 border flex items-center gap-1.5" style={{ borderColor: F.line, color: F.blue }}><Download size={13} /> {m.titulo}</a>)}
        </div>
      )}
      <p className="font-body text-[11px]" style={{ color: F.soft }}>Última atualização: {dataBR(linha.atualizado_em)}</p>
      <div className="grid sm:grid-cols-2 gap-2 pt-3 border-t" style={{ borderColor: F.line }}>
        {acoes.map(([tipo, rotulo]) => {
          const zap = linkWhats(whatsAgente, `Olá, ${nomeAgente}! Vim pelo Conecta Comércio. Linha de crédito: ${linha.nome}. Quero: ${rotulo.toLowerCase()}.`);
          return zap ? (
            <a key={tipo} href={zap} target="_blank" rel="noopener noreferrer" className="font-body text-xs font-bold rounded-xl px-3 py-2.5 border flex items-center justify-center gap-1.5" style={{ borderColor: F.line, color: F.green }}>
              <MessageCircle size={13} /> {rotulo}
            </a>
          ) : (
            <button key={tipo} onClick={() => onPreCadastro({ linha, tipo })} className="font-body text-xs font-bold rounded-xl px-3 py-2.5 border flex items-center justify-center gap-1.5" style={{ borderColor: F.line, color: F.green }}>
              <ClipboardList size={13} /> {rotulo}
            </button>
          );
        })}
        <button onClick={() => onSimular(linha)} className="font-body text-xs font-bold rounded-xl px-3 py-2.5 text-white flex items-center justify-center gap-1.5" style={{ background: F.blue }}><Calculator size={13} /> Simular</button>
        <button onClick={() => onPreCadastro({ linha, tipo: "interesse" })} className="font-body text-xs font-bold rounded-xl px-3 py-2.5 text-white flex items-center justify-center gap-1.5" style={{ background: F.greenBright }}><ClipboardList size={13} /> Fazer pré-cadastro</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ÁREA PÚBLICA — FOMENTO PARANÁ – CRÉDITO PARA EMPREENDEDORES   (#/fomento)
// ---------------------------------------------------------------------------
export function FomentoPublico({ siteConfig }) {
  const { config, linhas, materiais, rankingOficial } = useFomentoPublico();
  const rankingPublicado = (rankingOficial || []).filter((r) => r.publicar);
  const [resumoPublico, setResumoPublico] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.rpc("fomento_resumo_publico").then(({ data, error }) => { if (!error && data) setResumoPublico(data); });
  }, []);
  const [aberta, setAberta] = useState(null);
  const [linhaSimulador, setLinhaSimulador] = useState(null);
  const [preCadastro, setPreCadastro] = useState(null);
  const [docLinhaId, setDocLinhaId] = useState("");

  useEffect(() => {
    document.title = "Fomento Paraná — Conecta Comércio";
    return () => { document.title = "Conecta Comércio · Ivatuba - PR"; };
  }, []);

  const whats = config?.whatsapp_oficial || siteConfig?.fomento_whatsapp || "";
  const nomeAgente = config?.agente_nome || siteConfig?.fomento_agente_nome || "Agente de Crédito";
  const ativas = (linhas || []).filter((l) => l.ativo);
  const pdfsGerais = (materiais || []).filter((m) => m.publicado);
  const linhaDoc = ativas.find((l) => l.id === docLinhaId) || ativas[0];
  const zapPrincipal = linkWhats(whats, `Olá, ${nomeAgente}! Vim pelo Conecta Comércio e quero falar com o Agente de Crédito da Fomento Paraná.`);
  const rolar = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (config && config.ativo === false) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <Landmark size={36} className="mx-auto" color={F.blue} />
        <p className="font-display font-bold text-lg mt-3" style={{ color: F.ink }}>Seção temporariamente indisponível</p>
        <p className="font-body text-sm mt-1" style={{ color: F.muted }}>As informações da Fomento Paraná estão sendo atualizadas. Volte em breve.</p>
      </div>
    );
  }

  return (
    <div className="pb-16">
      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-6">
        <div className="rounded-3xl overflow-hidden relative text-white p-6 md:p-10" style={{ background: `linear-gradient(125deg, ${F.blueDeep}, ${F.blue})` }}>
          <div aria-hidden className="absolute -right-16 -top-16 w-72 h-72 rounded-full" style={{ background: "rgba(37,168,91,0.22)" }} />
          <div aria-hidden className="absolute right-24 -bottom-20 w-48 h-48 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 font-body text-[11px] font-bold uppercase tracking-[0.16em] px-3 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.14)" }}>
              <Landmark size={13} /> Fomento Paraná · Ivatuba
            </span>
            <h1 className="font-display font-extrabold text-3xl md:text-5xl mt-4 leading-tight">Crédito para empreendedores</h1>
            <p className="font-body text-sm md:text-base mt-3 text-white/80">{config?.texto_intro || CONFIG_PADRAO.texto_intro}</p>
            <div className="flex flex-wrap gap-2 mt-6">
              <button onClick={() => rolar("fp-linhas")} className="font-body text-sm font-bold rounded-xl px-4 py-2.5 bg-white flex items-center gap-2" style={{ color: F.blue }}>Conheça as linhas <ArrowRight size={15} /></button>
              <button onClick={() => rolar("fp-simulador")} className="font-body text-sm font-bold rounded-xl px-4 py-2.5 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.14)" }}><Calculator size={15} /> Simule seu crédito</button>
              <button onClick={() => rolar("fp-docs")} className="font-body text-sm font-bold rounded-xl px-4 py-2.5 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.14)" }}><FileText size={15} /> Documentos</button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA AGENTE */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 mt-5">
        <div className="rounded-2xl border p-4 md:p-5 flex items-center justify-between gap-4 flex-wrap" style={{ borderColor: F.line, background: F.greenTint }}>
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: F.green }}><HandCoins size={20} /></span>
            <div>
              <p className="font-display font-extrabold text-sm md:text-base" style={{ color: F.ink }}>Atendimento com o Agente de Crédito</p>
              <p className="font-body text-xs" style={{ color: F.muted }}>{nomeAgente} orienta você na escolha da linha e na documentação.</p>
            </div>
          </div>
          {zapPrincipal ? (
            <a href={zapPrincipal} target="_blank" rel="noopener noreferrer" className="glow-btn font-body text-sm font-extrabold rounded-xl px-5 py-3 text-white flex items-center gap-2 uppercase tracking-wide" style={{ background: F.greenBright }}>
              <MessageCircle size={16} /> Quero falar com o agente de crédito
            </a>
          ) : (
            <button onClick={() => { setPreCadastro({ tipo: "atendimento" }); }} className="glow-btn font-body text-sm font-extrabold rounded-xl px-5 py-3 text-white flex items-center gap-2 uppercase tracking-wide" style={{ background: F.greenBright }}>
              <MessageCircle size={16} /> Quero falar com o agente de crédito
            </button>
          )}
        </div>
      </section>

      {/* IVATUBA NO RANKING OFICIAL */}
      {rankingPublicado[0] && (
        <section className="max-w-6xl mx-auto px-4 md:px-6 mt-5">
          <CardRankingIvatuba registro={rankingPublicado[0]} anterior={rankingPublicado[1]} />
        </section>
      )}

      {/* PAINEL DE CRÉDITO PÚBLICO */}
      {resumoPublico && Number(resumoPublico.total_propostas) > 0 && (
        <section className="max-w-6xl mx-auto px-4 md:px-6 mt-10">
          <PainelCreditoPublico resumo={resumoPublico} />
        </section>
      )}

      {/* LINHAS */}
      <section id="fp-linhas" className="max-w-6xl mx-auto px-4 md:px-6 mt-12 scroll-mt-24">
        <Titulo eyebrow="Conheça as linhas de crédito" title="Escolha a modalidade ideal" sub="Informações, taxas, condições e documentação de cada linha." />
        {linhas === null ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <div key={i} className="h-44 rounded-2xl animate-pulse" style={{ background: F.blueTint2 }} />)}</div>
        ) : ativas.length === 0 ? (
          <Aviso>As linhas de crédito ainda não foram publicadas.</Aviso>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ativas.map((l) => (
              <button key={l.id} onClick={() => setAberta(l)} className="text-left rounded-2xl border p-5 bg-white hover:shadow-lg transition-shadow flex flex-col gap-2 group" style={{ borderColor: F.line }}>
                <div className="flex items-center justify-between">
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${l.cor || "#0A5AA8"}1A`, color: l.cor || F.blue }}><HandCoins size={18} /></span>
                  <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" color={F.soft} />
                </div>
                <p className="font-display font-extrabold text-base" style={{ color: F.ink }}>{l.nome}</p>
                <p className="font-body text-xs line-clamp-3" style={{ color: F.muted }}>{l.descricao}</p>
                <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                  {l.valores && <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: F.blueTint, color: F.blue }}>{l.valores}</span>}
                  {l.taxas && <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: F.greenTint, color: F.green }}>{l.taxas.split("\n")[0].slice(0, 40)}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* SIMULADOR */}
      <section id="fp-simulador" className="max-w-6xl mx-auto px-4 md:px-6 mt-14 scroll-mt-24">
        <Titulo eyebrow="Simule seu crédito" title="Quanto ficaria a parcela?" sub="Faça uma estimativa e envie ao Agente de Crédito, sem compromisso." />
        {linhas && <Simulador linhas={linhas} config={config} linhaInicial={linhaSimulador} onInteresse={({ linha, valor, meses }) => setPreCadastro({ linha, tipo: "simulacao", valor, meses })} />}
      </section>

      {/* DOCUMENTOS */}
      <section id="fp-docs" className="max-w-6xl mx-auto px-4 md:px-6 mt-14 scroll-mt-24 grid lg:grid-cols-2 gap-6">
        <div>
          <Titulo eyebrow="Documentos necessários" title="O que separar" />
          {ativas.length > 0 && (
            <select value={linhaDoc?.id || ""} onChange={(e) => setDocLinhaId(e.target.value)} className={`${inputCls} mb-3`} style={inputSty}>
              {ativas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          )}
          <div className="rounded-2xl border p-4" style={{ borderColor: F.line }}>
            {(linhaDoc?.documentos || []).length ? (
              <ul className="flex flex-col gap-2">
                {linhaDoc.documentos.map((d, i) => <li key={i} className="font-body text-sm flex items-start gap-2" style={{ color: F.ink }}><CheckCircle2 size={15} color={F.green} className="mt-0.5 shrink-0" />{d}</li>)}
              </ul>
            ) : <p className="font-body text-sm" style={{ color: F.soft }}>A lista de documentos desta modalidade ainda não foi publicada. Fale com o Agente de Crédito.</p>}
            <p className="font-body text-[10px] mt-3" style={{ color: F.soft }}>A Fomento Paraná pode solicitar outros documentos conforme cada caso. Nunca envie documentos pessoais por formulários públicos — entregue diretamente ao Agente.</p>
          </div>
        </div>
        <div>
          <Titulo eyebrow="Informativos em PDF" title="Materiais para baixar" />
          {pdfsGerais.length ? (
            <div className="flex flex-col gap-2">
              {pdfsGerais.map((m) => (
                <a key={m.id} href={m.arquivo_url} target="_blank" rel="noopener noreferrer" className="rounded-2xl border p-3.5 flex items-center gap-3 hover:shadow-md transition-shadow" style={{ borderColor: F.line }}>
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#FBEAE5", color: F.danger }}><FileText size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold text-sm truncate" style={{ color: F.ink }}>{m.titulo}</p>
                    <p className="font-body text-[11px]" style={{ color: F.muted }}>{TIPOS_MATERIAL[m.tipo]}{m.linha_id ? ` · ${ativas.find((l) => l.id === m.linha_id)?.nome || ""}` : ""} · atualizado em {dataBR(m.atualizado_em)}</p>
                  </div>
                  <Download size={16} color={F.blue} />
                </a>
              ))}
            </div>
          ) : <div className="rounded-2xl border p-4 font-body text-sm" style={{ borderColor: F.line, color: F.soft }}>Os informativos serão publicados em breve.</div>}
          {config?.link_oficial && (
            <a href={config.link_oficial} target="_blank" rel="noopener noreferrer" className="inline-flex mt-3 font-body text-xs font-bold items-center gap-1.5" style={{ color: F.blue }}><ExternalLink size={13} /> Site oficial da Fomento Paraná</a>
          )}
        </div>
      </section>

      {/* PRÉ-CADASTRO */}
      <section id="fp-interesse" className="max-w-3xl mx-auto px-4 md:px-6 mt-14 scroll-mt-24">
        <Titulo eyebrow="Pré-cadastro de interesse" title="Quer ajuda para solicitar?" sub="Deixe seu contato e o Agente de Crédito retorna. Isto não é uma proposta oficial." />
        <div className="rounded-2xl border p-5" style={{ borderColor: F.line }}>
          <FormInteresse linhas={linhas} inicial={preCadastro && !aberta ? preCadastro : null} whatsAgente={whats} nomeAgente={nomeAgente} />
        </div>
      </section>

      <Modal aberto={!!aberta} onFechar={() => setAberta(null)} titulo={aberta?.nome}>
        {aberta && (
          <DetalheLinha linha={aberta} materiais={materiais} whatsAgente={whats} nomeAgente={nomeAgente}
            onPreCadastro={(p) => { setAberta(null); setPreCadastro(p); setTimeout(() => rolar("fp-interesse"), 50); }}
            onSimular={(l) => { setAberta(null); setLinhaSimulador(l.id); setTimeout(() => rolar("fp-simulador"), 50); }} />
        )}
      </Modal>

      <ScrollPreCadastro alvo={preCadastro} rolar={rolar} />
    </div>
  );
}

function ScrollPreCadastro({ alvo, rolar }) {
  useEffect(() => { if (alvo) rolar("fp-interesse"); }, [alvo]);
  return null;
}

// ===========================================================================
// ÁREA ADMINISTRATIVA — PAINEL DO AGENTE DE CRÉDITO (Ademir)
// ===========================================================================
const PROPOSTA_VAZIA = {
  numero: "", data_proposta: hojeLocal(), nome: "", cpf: "", cnpj: "", whatsapp: "",
  linha_id: "", valor_solicitado: "", valor_concedido: "", prazo_meses: "", status: "novo", agente_id: "", observacoes: "",
};

function pontosDaProposta(p) {
  const base = STATUS_PROPOSTA[p.status]?.pontos ?? 0;
  const bonus = p.status === "concedido" ? Math.floor((Number(p.valor_concedido) || 0) / 1000) : 0;
  return base + bonus;
}

function exportarCSV(nome, cabecalho, linhas) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [cabecalho, ...linhas].map((l) => l.map(esc).join(";")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  URL.revokeObjectURL(a.href);
}

function KPI({ titulo, valor, sub, cor = F.blue, icon: Icon }) {
  return (
    <div className="rounded-2xl border p-4 bg-white" style={{ borderColor: F.line }}>
      <div className="flex items-center justify-between">
        <p className="font-body text-[11px] font-bold uppercase tracking-wide" style={{ color: F.muted }}>{titulo}</p>
        {Icon && <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${cor}1A`, color: cor }}><Icon size={14} /></span>}
      </div>
      <p className="font-display font-extrabold text-2xl mt-1" style={{ color: F.ink }}>{valor}</p>
      {sub && <p className="font-body text-[11px] mt-0.5" style={{ color: F.soft }}>{sub}</p>}
    </div>
  );
}

export function FomentoAdmin({ sessao, perfil, embutido = false }) {
  const podeAcessar = useFomentoAcesso(sessao, perfil);
  const [podeGerir, setPodeGerir] = useState(!supabaseConfigurado);
  const [aba, setAba] = useState("painel");
  const { config, setConfig, linhas, setLinhas, materiais, setMateriais, rankingOficial, setRankingOficial } = useFomentoPublico();
  const [propostas, setPropostas] = useState(null);
  const [interesses, setInteresses] = useState(null);
  const [lembretes, setLembretes] = useState(null);
  const [agentes, setAgentes] = useState(null);
  const [toast, setToast] = useState(null);
  const avisar = (m, tipo = "ok") => { setToast({ m, tipo }); setTimeout(() => setToast(null), 3200); };

  useEffect(() => {
    if (!podeAcessar) return;
    if (!supabaseConfigurado) { setPropostas([]); setInteresses([]); setLembretes([]); setAgentes([{ id: "demo-ag", nome: "Ademir", papel: "gestor", ativo: true }]); return; }
    registrarAcesso("abriu_painel");
    if (perfil?.tipo === "admin") setPodeGerir(true);
    else supabase.rpc("fomento_pode_gerir").then(({ data }) => setPodeGerir(data === true));
    supabase.from("fomento_propostas").select("*").order("criado_em", { ascending: false }).then(({ data, error }) => setPropostas(error ? [] : data || []));
    supabase.from("fomento_interesses").select("*").order("criado_em", { ascending: false }).then(({ data, error }) => setInteresses(error ? [] : data || []));
    supabase.from("fomento_lembretes").select("*").order("data_hora").then(({ data, error }) => setLembretes(error ? [] : data || []));
    supabase.from("fomento_agentes").select("*").order("nome").then(({ data, error }) => setAgentes(error ? [] : data || []));
  }, [podeAcessar]);

  if (podeAcessar === null) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <span className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin inline-block" style={{ borderColor: F.blueTint, borderTopColor: F.blue }} />
        <p className="font-body text-sm mt-3" style={{ color: F.muted }}>Verificando seu acesso...</p>
      </div>
    );
  }
  if (!podeAcessar) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <span className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#FBEAE5" }}><ShieldCheck size={24} color={F.danger} /></span>
        <p className="font-display font-bold text-lg" style={{ color: F.ink }}>Acesso exclusivo da equipe do Fomento Paraná</p>
        <p className="font-body text-sm mt-2" style={{ color: F.muted }}>{sessao ? "Sua conta ainda não foi liberada para o painel do Agente de Crédito. Peça ao administrador do Conecta Comércio." : "Entre com sua conta do Conecta Comércio para acessar."}</p>
        {!sessao && <a href="#/entrar" className="inline-block glow-btn font-body text-sm font-bold mt-6 px-5 py-2.5 rounded-xl text-white" style={{ background: F.blue }}>Entrar</a>}
      </div>
    );
  }

  const nomeLinha = (id, alternativo) => (linhas || []).find((l) => l.id === id)?.nome || alternativo || "—";
  const nomeAgente = (id) => (agentes || []).find((a) => a.id === id)?.nome || "—";
  const novosInteresses = (interesses || []).filter((i) => i.status === "novo").length;
  const lembretesPendentes = (lembretes || []).filter((l) => !l.concluido).length;

  const itens = [
    { id: "painel", label: "Painel de crédito", icon: LayoutDashboard },
    { id: "propostas", label: "Cadastrar propostas", icon: PlusCircle },
    { id: "contratos", label: "Contratos e andamento", icon: Columns },
    { id: "interesses", label: "Pré-cadastros do site", icon: Inbox, badge: novosInteresses },
    { id: "simulacao", label: "Simulação", icon: Calculator },
    { id: "ranking", label: "Ranking de pontuação", icon: Trophy },
    { id: "linhas", label: "Linhas de crédito", icon: HandCoins },
    { id: "materiais", label: "Documentos e PDFs", icon: FileText },
    { id: "lembretes", label: "Lembretes", icon: Bell, badge: lembretesPendentes },
    { id: "config", label: "Configurações", icon: Settings },
  ];

  const ctx = { rankingOficial, setRankingOficial, config, setConfig, linhas, setLinhas, materiais, setMateriais, propostas, setPropostas, interesses, setInteresses, lembretes, setLembretes, agentes, setAgentes, avisar, nomeLinha, nomeAgente, podeGerir, setAba };

  return (
    <div className={embutido ? "" : "max-w-6xl mx-auto px-4 md:px-6 py-8"}>
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[70] rounded-xl px-4 py-2.5 font-body text-sm font-semibold shadow-lg text-white" style={{ background: toast.tipo === "erro" ? F.danger : F.green }}>{toast.m}</div>
      )}
      <div className="rounded-2xl p-5 mb-6 flex items-center justify-between gap-4 flex-wrap overflow-hidden relative" style={{ background: `linear-gradient(120deg, ${F.blueDeep}, ${F.blue})` }}>
        <div aria-hidden className="absolute -right-8 -top-10 w-40 h-40 rounded-full" style={{ background: "rgba(37,168,91,0.25)" }} />
        <div className="relative">
          <p className="font-body text-[11px] font-bold uppercase tracking-wider text-white/70 flex items-center gap-1.5"><Landmark size={12} /> Fomento Paraná · Agente de Crédito</p>
          <h1 className="font-display text-xl md:text-2xl font-extrabold text-white mt-0.5">{itens.find((i) => i.id === aba)?.label}</h1>
        </div>
        <div className="relative flex items-center gap-2">
          {[[(propostas || []).filter((p) => !["concedido", "negado", "excluido"].includes(p.status)).length, "Em andamento"], [(propostas || []).filter((p) => p.status === "concedido").length, "Concedidos"], [novosInteresses, "Novos interesses"]].map(([n, l]) => (
            <div key={l} className="rounded-xl px-3.5 py-2 text-center" style={{ background: "rgba(255,255,255,0.14)" }}>
              <p className="font-display font-extrabold text-lg text-white leading-none">{propostas ? n : "…"}</p>
              <p className="font-body text-[10px] text-white/70 mt-1">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {!supabaseConfigurado && <div className="mb-4"><Aviso>Modo demonstração: conecte o Supabase para salvar os dados de verdade.</Aviso></div>}

      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        <aside className="rounded-2xl border p-2 h-fit flex md:flex-col gap-1 overflow-x-auto no-scrollbar" style={{ borderColor: F.line }}>
          {itens.map((it) => {
            const Icon = it.icon;
            const ativo = aba === it.id;
            return (
              <button key={it.id} onClick={() => setAba(it.id)} className="shrink-0 md:w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-body font-semibold text-left"
                style={{ background: ativo ? F.blueTint : "transparent", color: ativo ? F.blue : "#425A70" }}>
                <Icon size={16} /> <span className="whitespace-nowrap">{it.label}</span>
                {it.badge > 0 && <span className="ml-auto font-body text-[10px] font-bold px-1.5 rounded-full text-white" style={{ background: F.greenBright }}>{it.badge}</span>}
              </button>
            );
          })}
        </aside>
        <div className="min-w-0">
          {aba === "painel" && <AbaPainel {...ctx} />}
          {aba === "propostas" && <AbaPropostas {...ctx} />}
          {aba === "contratos" && <AbaContratos {...ctx} />}
          {aba === "interesses" && <AbaInteresses {...ctx} />}
          {aba === "simulacao" && <div><Titulo eyebrow="Simulação" title="Simulador de crédito" sub="Use durante o atendimento. Valores são estimativas." /><Simulador linhas={linhas} config={config} modoAdmin /></div>}
          {aba === "ranking" && <AbaRanking {...ctx} />}
          {aba === "linhas" && <AbaLinhas {...ctx} />}
          {aba === "materiais" && <AbaMateriais {...ctx} />}
          {aba === "lembretes" && <AbaLembretes {...ctx} />}
          {aba === "config" && <AbaConfig {...ctx} />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Painel
function AbaPainel({ propostas, interesses, lembretes, linhas, nomeLinha, setAba }) {
  const lista = propostas || [];
  const somar = (arr, campo) => arr.reduce((s, p) => s + (Number(p[campo]) || 0), 0);
  const concedidos = lista.filter((p) => p.status === "concedido");
  const porStatus = Object.entries(STATUS_PROPOSTA).map(([k, s]) => ({ nome: s.curto, qtd: lista.filter((p) => p.status === k).length, cor: s.cor }));
  const porLinha = (linhas || []).map((l) => ({ nome: l.nome.replace("Fomento ", ""), qtd: lista.filter((p) => p.linha_id === l.id && p.status !== "excluido").length })).filter((d) => d.qtd > 0);
  const hoje = new Date(); hoje.setHours(23, 59, 59, 999);
  const proximos = (lembretes || []).filter((l) => !l.concluido && new Date(l.data_hora) <= new Date(hoje.getTime() + 7 * 864e5)).slice(0, 5);
  const taxaAprov = (() => { const fim = lista.filter((p) => ["concedido", "negado"].includes(p.status)).length; return fim ? Math.round((concedidos.length / fim) * 100) : 0; })();

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI titulo="Propostas" valor={propostas ? lista.filter((p) => p.status !== "excluido").length : "…"} sub="sem contar excluídas" icon={ClipboardList} />
        <KPI titulo="Valor solicitado" valor={moeda(somar(lista.filter((p) => p.status !== "excluido"), "valor_solicitado"))} icon={HandCoins} cor="#7E5BEF" />
        <KPI titulo="Valor concedido" valor={moeda(somar(concedidos, "valor_concedido"))} sub={`${concedidos.length} contrato(s)`} icon={CheckCircle2} cor={F.green} />
        <KPI titulo="Taxa de aprovação" valor={`${taxaAprov}%`} sub="concedidos / finalizados" icon={Trophy} cor="#E8A23D" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {Object.entries(STATUS_PROPOSTA).map(([k, s]) => (
          <button key={k} onClick={() => setAba("contratos")} className="rounded-xl border p-3 text-left bg-white" style={{ borderColor: F.line }}>
            <p className="font-display font-extrabold text-xl" style={{ color: s.cor }}>{lista.filter((p) => p.status === k).length}</p>
            <p className="font-body text-[11px]" style={{ color: F.muted }}>{s.rotulo}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-4" style={{ borderColor: F.line }}>
          <p className="font-display font-bold text-sm mb-3" style={{ color: F.ink }}>Propostas por situação</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={porStatus}><XAxis dataKey="nome" tick={{ fontSize: 10 }} interval={0} angle={-20} height={40} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} /><Tooltip />
              <Bar dataKey="qtd" name="Propostas" radius={[6, 6, 0, 0]}>{porStatus.map((d) => <Cell key={d.nome} fill={d.cor} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-2xl border p-4" style={{ borderColor: F.line }}>
          <p className="font-display font-bold text-sm mb-3" style={{ color: F.ink }}>Propostas por linha</p>
          {porLinha.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={porLinha} layout="vertical"><XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={110} /><Tooltip />
                <Bar dataKey="qtd" name="Propostas" fill="#1E8E5A" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="font-body text-xs" style={{ color: F.soft }}>Nenhuma proposta cadastrada ainda.</p>}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-4" style={{ borderColor: F.line }}>
          <div className="flex items-center justify-between mb-2"><p className="font-display font-bold text-sm" style={{ color: F.ink }}>Próximos lembretes (7 dias)</p><button onClick={() => setAba("lembretes")} className="font-body text-xs font-bold" style={{ color: F.blue }}>Ver todos</button></div>
          {proximos.length ? proximos.map((l) => (
            <div key={l.id} className="flex items-center gap-2 py-1.5 border-t first:border-0" style={{ borderColor: F.line }}>
              <Clock size={13} color={new Date(l.data_hora) < new Date() ? F.danger : F.green} /><p className="font-body text-sm flex-1 truncate" style={{ color: F.ink }}>{l.titulo}</p><p className="font-body text-[11px]" style={{ color: F.muted }}>{dataHoraBR(l.data_hora)}</p>
            </div>
          )) : <p className="font-body text-xs" style={{ color: F.soft }}>Nenhum lembrete próximo.</p>}
        </div>
        <div className="rounded-2xl border p-4" style={{ borderColor: F.line }}>
          <div className="flex items-center justify-between mb-2"><p className="font-display font-bold text-sm" style={{ color: F.ink }}>Últimos pré-cadastros do site</p><button onClick={() => setAba("interesses")} className="font-body text-xs font-bold" style={{ color: F.blue }}>Ver todos</button></div>
          {(interesses || []).slice(0, 5).map((i) => (
            <div key={i.id} className="flex items-center gap-2 py-1.5 border-t first:border-0" style={{ borderColor: F.line }}>
              <Inbox size={13} color={F.blue} /><p className="font-body text-sm flex-1 truncate" style={{ color: F.ink }}>{i.nome} · {nomeLinha(i.linha_id)}</p><p className="font-body text-[11px]" style={{ color: F.muted }}>{dataBR(i.criado_em)}</p>
            </div>
          ))}
          {!(interesses || []).length && <p className="font-body text-xs" style={{ color: F.soft }}>Nenhum pré-cadastro ainda.</p>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Formulário de proposta
function FormProposta({ inicial, linhas, agentes, onSalvar, onCancelar, salvando }) {
  const [f, setF] = useState(() => ({ ...PROPOSTA_VAZIA, ...Object.fromEntries(Object.entries(inicial || {}).map(([k, v]) => [k, v ?? ""])) }));
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSalvar(f); }} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <Campo label="Nº da proposta"><input value={f.numero} onChange={set("numero")} placeholder="Automático se vazio" className={inputCls} style={inputSty} /></Campo>
      <Campo label="Data da proposta"><input type="date" value={f.data_proposta} onChange={set("data_proposta")} className={inputCls} style={inputSty} /></Campo>
      <Campo label="Situação">
        <select value={f.status} onChange={set("status")} className={inputCls} style={inputSty}>{Object.entries(STATUS_PROPOSTA).map(([k, s]) => <option key={k} value={k}>{s.curto}</option>)}</select>
      </Campo>
      <Campo label="Nome *" className="sm:col-span-2 lg:col-span-1"><input value={f.nome} onChange={set("nome")} required className={inputCls} style={inputSty} /></Campo>
      <Campo label="CPF"><input value={f.cpf} onChange={set("cpf")} inputMode="numeric" className={inputCls} style={inputSty} /></Campo>
      <Campo label="CNPJ"><input value={f.cnpj} onChange={set("cnpj")} inputMode="numeric" className={inputCls} style={inputSty} /></Campo>
      <Campo label="WhatsApp"><input value={f.whatsapp} onChange={set("whatsapp")} inputMode="tel" className={inputCls} style={inputSty} /></Campo>
      <Campo label="Linha de crédito">
        <select value={f.linha_id} onChange={set("linha_id")} className={inputCls} style={inputSty}><option value="">Selecione</option>{(linhas || []).map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}</select>
      </Campo>
      <Campo label="Agente responsável">
        <select value={f.agente_id} onChange={set("agente_id")} className={inputCls} style={inputSty}><option value="">—</option>{(agentes || []).filter((a) => a.ativo).map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}</select>
      </Campo>
      <Campo label="Valor solicitado (R$)"><input value={f.valor_solicitado} onChange={set("valor_solicitado")} inputMode="decimal" className={inputCls} style={inputSty} /></Campo>
      <Campo label="Valor concedido (R$)"><input value={f.valor_concedido} onChange={set("valor_concedido")} inputMode="decimal" className={inputCls} style={inputSty} /></Campo>
      <Campo label="Prazo (meses)"><input value={f.prazo_meses} onChange={set("prazo_meses")} inputMode="numeric" className={inputCls} style={inputSty} /></Campo>
      <Campo label="Observações" className="sm:col-span-2 lg:col-span-3"><textarea value={f.observacoes} onChange={set("observacoes")} rows={2} className={inputCls} style={inputSty} /></Campo>
      <div className="sm:col-span-2 lg:col-span-3 flex gap-2 justify-end">
        {onCancelar && <button type="button" onClick={onCancelar} className="font-body text-sm font-bold px-4 py-2.5 rounded-xl border" style={{ borderColor: F.line, color: "#425A70" }}>Cancelar</button>}
        <button type="submit" disabled={salvando} className="glow-btn font-body text-sm font-bold px-5 py-2.5 rounded-xl text-white disabled:opacity-60" style={{ background: F.blue }}>{salvando ? "Salvando..." : "Salvar proposta"}</button>
      </div>
    </form>
  );
}

function normalizarProposta(f) {
  const n = (v) => (v === "" || v == null ? null : v);
  return {
    numero: n(String(f.numero || "").trim()), data_proposta: f.data_proposta || null, nome: String(f.nome || "").trim(),
    cpf: n(soDigitos(f.cpf)), cnpj: n(soDigitos(f.cnpj)), whatsapp: n(String(f.whatsapp || "").trim()),
    linha_id: n(f.linha_id && !String(f.linha_id).startsWith("demo-") ? f.linha_id : (supabaseConfigurado ? null : f.linha_id)),
    valor_solicitado: parseValor(f.valor_solicitado), valor_concedido: parseValor(f.valor_concedido),
    prazo_meses: f.prazo_meses ? Number(f.prazo_meses) : null, status: f.status || "novo",
    agente_id: n(f.agente_id && !String(f.agente_id).startsWith("demo-") ? f.agente_id : (supabaseConfigurado ? null : f.agente_id)),
    observacoes: n(f.observacoes), interesse_id: f.interesse_id || null,
  };
}

// Hook com as ações de proposta (usado nas abas Propostas / Contratos / Interesses)
function useAcoesProposta({ setPropostas, avisar }) {
  const [salvando, setSalvando] = useState(false);
  const salvar = async (f, id) => {
    const dados = normalizarProposta(f);
    if (!dados.nome) { avisar("Informe o nome.", "erro"); return null; }
    setSalvando(true);
    try {
      if (!supabaseConfigurado) {
        const reg = { ...dados, id: id || `demo-${Date.now()}`, numero: dados.numero || `FP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`, criado_em: new Date().toISOString() };
        setPropostas((l) => (id ? l.map((p) => (p.id === id ? { ...p, ...reg } : p)) : [reg, ...(l || [])]));
        avisar("Proposta salva."); return reg;
      }
      const q = id ? supabase.from("fomento_propostas").update(dados).eq("id", id) : supabase.from("fomento_propostas").insert(dados);
      const { data, error } = await q.select().single();
      if (error) throw error;
      setPropostas((l) => (id ? l.map((p) => (p.id === id ? data : p)) : [data, ...(l || [])]));
      avisar(id ? "Proposta atualizada." : `Proposta ${data.numero} cadastrada.`);
      return data;
    } catch (err) { avisar(err.message || "Erro ao salvar.", "erro"); return null; }
    finally { setSalvando(false); }
  };
  const mudarStatus = async (p, status) => {
    if (!supabaseConfigurado) { setPropostas((l) => l.map((x) => (x.id === p.id ? { ...x, status } : x))); return; }
    const { data, error } = await supabase.from("fomento_propostas").update({ status }).eq("id", p.id).select().single();
    if (error) { avisar(error.message, "erro"); return; }
    setPropostas((l) => l.map((x) => (x.id === p.id ? data : x)));
    avisar(`Situação: ${STATUS_PROPOSTA[status].curto}`);
  };
  return { salvar, mudarStatus, salvando };
}

function DocProtegido({ valor, rotulo, propostaId }) {
  const [ver, setVer] = useState(false);
  if (!valor) return <span style={{ color: F.soft }}>—</span>;
  return (
    <span className="inline-flex items-center gap-1">
      {ver ? (rotulo === "WhatsApp" ? valor : formatarDoc(valor)) : (rotulo === "WhatsApp" ? mascararFone(valor) : mascararDoc(valor))}
      <button type="button" title={ver ? "Ocultar" : `Mostrar ${rotulo}`} onClick={() => { if (!ver) registrarAcesso(`viu_${rotulo.toLowerCase()}`, propostaId); setVer(!ver); }}>
        {ver ? <EyeOff size={12} color={F.soft} /> : <Eye size={12} color={F.soft} />}
      </button>
    </span>
  );
}

function HistoricoProposta({ proposta }) {
  const [itens, setItens] = useState(null);
  useEffect(() => {
    if (!supabaseConfigurado) { setItens([]); return; }
    supabase.from("fomento_historico").select("*").eq("proposta_id", proposta.id).order("criado_em", { ascending: false }).then(({ data }) => setItens(data || []));
  }, [proposta.id]);
  if (itens === null) return <p className="font-body text-xs" style={{ color: F.soft }}>Carregando histórico...</p>;
  if (!itens.length) return <p className="font-body text-xs" style={{ color: F.soft }}>Sem histórico registrado.</p>;
  return (
    <ol className="flex flex-col gap-2">
      {itens.map((h) => (
        <li key={h.id} className="flex items-start gap-2 font-body text-xs" style={{ color: F.ink }}>
          <History size={13} className="mt-0.5 shrink-0" color={F.blue} />
          <span className="flex-1">
            {h.acao === "status" ? <>Situação: <b>{STATUS_PROPOSTA[h.de_status]?.curto || h.de_status}</b> → <b>{STATUS_PROPOSTA[h.para_status]?.curto || h.para_status}</b></> : h.detalhe || h.acao}
          </span>
          <span style={{ color: F.soft }}>{dataHoraBR(h.criado_em)}</span>
        </li>
      ))}
    </ol>
  );
}

function ModalProposta({ proposta, onFechar, ctx, acoes }) {
  const [editando, setEditando] = useState(false);
  if (!proposta) return null;
  const p = proposta;
  return (
    <Modal aberto={!!proposta} onFechar={onFechar} titulo={`Proposta ${p.numero || ""}`} largura="max-w-3xl">
      {editando ? (
        <FormProposta inicial={p} linhas={ctx.linhas} agentes={ctx.agentes} salvando={acoes.salvando} onCancelar={() => setEditando(false)}
          onSalvar={async (f) => { const r = await acoes.salvar(f, p.id); if (r) setEditando(false); }} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div><p className="font-display font-extrabold text-lg" style={{ color: F.ink }}>{p.nome}</p><p className="font-body text-xs" style={{ color: F.muted }}>{ctx.nomeLinha(p.linha_id, p.linha_fomentonet)} · {dataBR(p.data_proposta)}</p></div>
            <BadgeStatus status={p.status} />
          </div>
          <div className="grid sm:grid-cols-3 gap-2 font-body text-sm">
            {[["CPF", <DocProtegido valor={p.cpf} rotulo="CPF" propostaId={p.id} />], ["CNPJ", <DocProtegido valor={p.cnpj} rotulo="CNPJ" propostaId={p.id} />], ["WhatsApp", <DocProtegido valor={p.whatsapp} rotulo="WhatsApp" propostaId={p.id} />],
              ["Valor solicitado", moeda(p.valor_solicitado)], ["Valor concedido", moeda(p.valor_concedido)], ["Prazo", p.prazo_meses ? `${p.prazo_meses} meses` : "—"],
              ["Agente", ctx.nomeAgente(p.agente_id)], ["Pontos no ranking", pontosDaProposta(p)], ["Atualizada", dataHoraBR(p.atualizado_em || p.criado_em)],
              ...(p.etapa_fomentonet ? [["Etapa no FomentoNet", `${p.etapa_fomentonet}${p.etapa_desde ? ` desde ${dataBR(p.etapa_desde)}` : ""}`], ["Contrato FomentoNet", p.codigo_contrato || "—"], ["Município", p.municipio || "—"]] : []),
              ...(p.motivo_recusa ? [["Motivo da recusa", p.motivo_recusa]] : [])].map(([k, v]) => (
              <div key={k} className="rounded-xl p-2.5" style={{ background: F.blueTint2 }}><p className="text-[10px] font-bold uppercase" style={{ color: F.muted }}>{k}</p><div style={{ color: F.ink }}>{v}</div></div>
            ))}
          </div>
          {p.observacoes && <p className="font-body text-sm whitespace-pre-line rounded-xl p-3 border" style={{ borderColor: F.line, color: F.ink }}>{p.observacoes}</p>}
          <div>
            <p className="font-body text-[11px] font-bold uppercase mb-1.5" style={{ color: F.muted }}>Mudar situação</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(STATUS_PROPOSTA).map(([k, s]) => (
                <button key={k} onClick={() => acoes.mudarStatus(p, k)} disabled={p.status === k} className="font-body text-[11px] font-bold px-2.5 py-1.5 rounded-lg border disabled:opacity-100"
                  style={{ borderColor: p.status === k ? s.cor : F.line, background: p.status === k ? `${s.cor}1A` : "#fff", color: s.cor }}>{s.curto}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setEditando(true)} className="font-body text-xs font-bold px-3 py-2 rounded-lg text-white flex items-center gap-1.5" style={{ background: F.blue }}><Pencil size={13} /> Editar</button>
            {p.whatsapp && <a href={linkWhats(p.whatsapp, `Olá, ${p.nome.split(" ")[0]}! Aqui é do atendimento da Fomento Paraná em Ivatuba, sobre a sua proposta ${p.numero || ""}.`)} target="_blank" rel="noopener noreferrer" className="font-body text-xs font-bold px-3 py-2 rounded-lg text-white flex items-center gap-1.5" style={{ background: F.greenBright }}><MessageCircle size={13} /> WhatsApp</a>}
            <NovoLembreteRapido proposta={p} ctx={ctx} />
          </div>
          <div className="pt-3 border-t" style={{ borderColor: F.line }}>
            <p className="font-display font-bold text-sm mb-2" style={{ color: F.ink }}>Histórico da proposta</p>
            <HistoricoProposta proposta={p} />
          </div>
        </div>
      )}
    </Modal>
  );
}

function NovoLembreteRapido({ proposta, ctx }) {
  const [aberto, setAberto] = useState(false);
  const [quando, setQuando] = useState("");
  if (!aberto) return <button onClick={() => setAberto(true)} className="font-body text-xs font-bold px-3 py-2 rounded-lg border flex items-center gap-1.5" style={{ borderColor: F.line, color: "#425A70" }}><Bell size={13} /> Lembrete</button>;
  return (
    <span className="flex items-center gap-1.5">
      <input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} className="font-body text-xs border rounded-lg px-2 py-1.5" style={inputSty} />
      <button onClick={async () => { if (!quando) return; await criarLembrete(ctx, { titulo: `Retornar contato: ${proposta.nome}`, data_hora: new Date(quando).toISOString(), proposta_id: proposta.id }); setAberto(false); }}
        className="font-body text-xs font-bold px-2.5 py-1.5 rounded-lg text-white" style={{ background: F.green }}>OK</button>
    </span>
  );
}

// ---------------------------------------------------------------- Propostas
function TabelaPropostas({ lista, ctx, onAbrir }) {
  if (!lista.length) return <p className="font-body text-sm py-6 text-center" style={{ color: F.soft }}>Nenhuma proposta encontrada.</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: F.line }}>
      <table className="w-full font-body text-xs" style={{ borderCollapse: "collapse" }}>
        <thead><tr style={{ background: F.blueTint }}>{["Nº / data", "Nome", "CPF/CNPJ", "Linha", "Solicitado", "Situação", ""].map((h) => <th key={h} className="text-left px-3 py-2 font-bold whitespace-nowrap" style={{ color: F.blue }}>{h}</th>)}</tr></thead>
        <tbody>
          {lista.map((p) => (
            <tr key={p.id} className="border-t hover:bg-slate-50 cursor-pointer" style={{ borderColor: F.line }} onClick={() => onAbrir(p)}>
              <td className="px-3 py-2 whitespace-nowrap"><b style={{ color: F.ink }}>{p.numero || "—"}</b><br /><span style={{ color: F.soft }}>{dataBR(p.data_proposta)}</span></td>
              <td className="px-3 py-2" style={{ color: F.ink }}>{p.nome}<br /><span style={{ color: F.soft }}>{mascararFone(p.whatsapp)}</span></td>
              <td className="px-3 py-2 whitespace-nowrap" style={{ color: F.muted }}>{mascararDoc(p.cpf)}{p.cnpj ? <><br />{mascararDoc(p.cnpj)}</> : null}</td>
              <td className="px-3 py-2" style={{ color: F.ink }}>{ctx.nomeLinha(p.linha_id, p.linha_fomentonet)}</td>
              <td className="px-3 py-2 whitespace-nowrap" style={{ color: F.ink }}>{moeda(p.valor_solicitado)}</td>
              <td className="px-3 py-2"><BadgeStatus status={p.status} />{p.etapa_fomentonet && <><br /><span className="text-[10px]" style={{ color: F.soft }}>FomentoNet: {p.etapa_fomentonet}</span></>}</td>
              <td className="px-3 py-2"><ChevronRight size={14} color={F.soft} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function filtrarPropostas(lista, busca, linhaId) {
  const t = busca.trim().toLowerCase();
  const d = soDigitos(busca);
  return lista.filter((p) => (!linhaId || p.linha_id === linhaId) && (!t ||
    (p.nome || "").toLowerCase().includes(t) || (p.numero || "").toLowerCase().includes(t) ||
    (d && (soDigitos(p.cpf).includes(d) || soDigitos(p.cnpj).includes(d) || soDigitos(p.whatsapp).includes(d)))));
}

// ---------------------------------------------------------------- Importação do FomentoNet (CSV "Operação Microcrédito")
// O Agente exporta a planilha no FomentoNet e envia aqui. Cada linha vira (ou
// atualiza) uma proposta, usando o "Código da Operação" como número — então
// importar de novo não duplica, só atualiza a etapa/valores.
function lerCSV(texto, sep = ";") {
  const linhas = []; let campo = ""; let linha = []; let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else aspas = false; }
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo); campo = "";
      if (linha.some((x) => x.trim() !== "")) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  if (campo || linha.length) { linha.push(campo); if (linha.some((x) => x.trim() !== "")) linhas.push(linha); }
  return linhas;
}
const dataISO = (br) => { const m = String(br || "").match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
const semAcento = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();

function statusDaEtapa(etapa) {
  const e = semAcento(etapa);
  if (!e) return "novo";
  if (e.includes("EXCLU")) return "excluido";
  if (e.includes("RECUS") || e.includes("NEGAD") || e.includes("INDEFER")) return "negado";
  if (e.includes("CONCEDID") || e.includes("LIBERAD") || e.includes("DISPONIBILIZ") || e.includes("PAGO")) return "concedido";
  if (e.includes("CADASTRAMENTO")) return "novo";
  if (e.includes("REGULARIZ") || e.includes("DOCUMENT") || e.includes("PENDEN")) return "documentacao";
  return "em_analise";
}
function slugDaLinhaFomentoNet(nome) {
  const n = semAcento(nome);
  if (n.includes("PESCA") || n.includes("NAUTIC")) return "pesca-nautica";
  if (n.includes("TAXI") && (n.includes("MULHER") || n.includes(" M "))) return "taxista-mulher";
  if (n.includes("TAXI")) return "taxista";
  if (n.includes("EMERGENC")) return "micro-emergencial";
  if (n.includes("RECUPERA")) return "recupera-micro";
  if (n.includes("RURAL") && (n.includes("MULHER") || /\bM\b/.test(n))) return "micro-mulher-rural";
  if (n.includes("RURAL")) return "micro-rural";
  if (n.includes("MULHER")) return "micro-mulher";
  if (n.includes("FACIL")) return "micro-facil";
  return null;
}

function converterLinhasFomentoNet(tabela, linhasCredito) {
  const [cab, ...dados] = tabela;
  const idx = (nome) => cab.findIndex((c) => semAcento(c) === semAcento(nome));
  const col = {
    operacao: idx("Código da Operação"), contrato: idx("Código do Contrato"), linha: idx("Linha de Crédito"), valor: idx("Valor Solicitado"),
    nome: idx("Nome do Cliente"), doc: idx("CPF/CNPJ"), municipio: idx("Município"), cadastro: idx("Data de Cadastro"),
    desde: idx("Na Etapa Desde"), etapa: idx("Etapa"), motivo: idx("Motivo Recusa"), amortizacao: idx("Prazo amortização"),
    disponib: idx("Data de Disponibilização"),
  };
  if (col.operacao < 0 || col.nome < 0 || col.etapa < 0) throw new Error("Este arquivo não parece ser a planilha \"Operação Microcrédito\" do FomentoNet (faltam as colunas Código da Operação, Nome do Cliente ou Etapa).");
  const v = (l, k) => (col[k] >= 0 ? String(l[col[k]] ?? "").trim() : "");
  const porSlug = Object.fromEntries((linhasCredito || []).map((l) => [l.slug, l.id]));
  const ignoradas = [];
  const registros = [];
  for (const l of dados) {
    const op = v(l, "operacao");
    if (!op) { ignoradas.push("linha sem Código da Operação"); continue; }
    const doc = soDigitos(v(l, "doc"));
    const status = statusDaEtapa(v(l, "etapa"));
    const valor = parseValor(v(l, "valor"));
    const slug = slugDaLinhaFomentoNet(v(l, "linha"));
    registros.push({
      numero: op,
      data_proposta: dataISO(v(l, "cadastro")) || hojeLocal(),
      nome: v(l, "nome").replace(/^\d{2}\.\d{3}\.\d{3}\s+/, "") || "(sem nome)",
      cpf: doc.length === 11 ? doc : null,
      cnpj: doc.length === 14 ? doc : null,
      linha_id: slug && porSlug[slug] && !String(porSlug[slug]).startsWith("demo-") ? porSlug[slug] : null,
      valor_solicitado: valor,
      ...(status === "concedido" && valor ? { valor_concedido: valor } : {}),
      prazo_meses: parseInt(v(l, "amortizacao"), 10) || null,
      status,
      etapa_fomentonet: v(l, "etapa") || null,
      etapa_desde: dataISO(v(l, "desde")),
      codigo_contrato: v(l, "contrato") || null,
      linha_fomentonet: v(l, "linha") || null,
      municipio: v(l, "municipio") || null,
      motivo_recusa: v(l, "motivo") || null,
      importado_em: new Date().toISOString(),
      _linhaNome: v(l, "linha"),
    });
  }
  return { registros, ignoradas };
}

function ImportarFomentoNet({ ctx }) {
  const [previa, setPrevia] = useState(null);
  const [erro, setErro] = useState("");
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const lerArquivo = async (arquivo) => {
    setErro(""); setResultado(null); setPrevia(null);
    if (!arquivo) return;
    try {
      const buf = await arquivo.arrayBuffer();
      let texto = new TextDecoder("utf-8").decode(buf);
      if (texto.includes("�")) texto = new TextDecoder("iso-8859-1").decode(buf);
      const tabela = lerCSV(texto.replace(/^﻿/, ""));
      const { registros, ignoradas } = converterLinhasFomentoNet(tabela, ctx.linhas);
      const existentes = new Set((ctx.propostas || []).map((p) => p.numero));
      setPrevia({ nomeArquivo: arquivo.name, registros, ignoradas, novos: registros.filter((r) => !existentes.has(r.numero)).length });
    } catch (err) { setErro(err.message || "Não consegui ler o arquivo."); }
  };

  const importar = async () => {
    if (!previa?.registros.length) return;
    setImportando(true); setErro("");
    const linhasEnvio = previa.registros.map(({ _linhaNome, ...r }) => r);
    try {
      if (!supabaseConfigurado) {
        ctx.setPropostas((atual) => {
          const mapa = new Map((atual || []).map((p) => [p.numero, p]));
          linhasEnvio.forEach((r) => mapa.set(r.numero, { ...(mapa.get(r.numero) || { id: `demo-${r.numero}`, criado_em: new Date().toISOString() }), ...r }));
          return [...mapa.values()].sort((a, b) => (b.data_proposta || "").localeCompare(a.data_proposta || ""));
        });
      } else {
        const salvos = [];
        for (let i = 0; i < linhasEnvio.length; i += 200) {
          const { data, error } = await supabase.from("fomento_propostas").upsert(linhasEnvio.slice(i, i + 200), { onConflict: "numero" }).select();
          if (error) throw error;
          salvos.push(...(data || []));
        }
        ctx.setPropostas((atual) => {
          const mapa = new Map((atual || []).map((p) => [p.id, p]));
          salvos.forEach((p) => mapa.set(p.id, p));
          return [...mapa.values()].sort((a, b) => (b.data_proposta || "").localeCompare(a.data_proposta || ""));
        });
        registrarAcesso("importou_fomentonet", `${linhasEnvio.length} linhas`);
      }
      setResultado({ total: linhasEnvio.length, novos: previa.novos });
      setPrevia(null);
      ctx.avisar(`${linhasEnvio.length} operação(ões) importada(s) do FomentoNet.`);
    } catch (err) {
      setErro(err.message || "Erro ao importar.");
    } finally { setImportando(false); }
  };

  const contagem = previa ? Object.entries(STATUS_PROPOSTA).map(([k, s]) => [s.curto, previa.registros.filter((r) => r.status === k).length, s.cor]).filter(([, n]) => n) : [];
  const semLinha = previa ? previa.registros.filter((r) => !r.linha_id).length : 0;

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: F.line, background: F.greenTint }}>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: F.green }}><Upload size={18} /></span>
        <div className="flex-1 min-w-[200px]">
          <p className="font-display font-extrabold text-sm" style={{ color: F.ink }}>Importar do FomentoNet (cadastro automático)</p>
          <p className="font-body text-xs" style={{ color: F.muted }}>Exporte a planilha "Operação Microcrédito" no FomentoNet e envie aqui. Novas operações são cadastradas e as que já existem têm a etapa atualizada — sem duplicar.</p>
        </div>
        <label className="font-body text-sm font-bold px-4 py-2.5 rounded-xl text-white cursor-pointer flex items-center gap-2" style={{ background: F.green }}>
          <Upload size={15} /> Escolher arquivo CSV
          <input type="file" accept=".csv,text/csv" hidden onChange={(e) => { lerArquivo(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>
      {erro && <div className="mt-3"><Aviso tipo="erro">{erro}</Aviso></div>}
      {resultado && <div className="mt-3"><Aviso tipo="ok">Importação concluída: {resultado.total} operação(ões) — {resultado.novos} nova(s), {resultado.total - resultado.novos} atualizada(s).</Aviso></div>}
      {previa && (
        <div className="mt-4 rounded-xl bg-white border p-4" style={{ borderColor: F.line }}>
          <p className="font-display font-bold text-sm" style={{ color: F.ink }}>{previa.nomeArquivo}: {previa.registros.length} operação(ões) · {previa.novos} nova(s) · {previa.registros.length - previa.novos} já cadastrada(s) (serão atualizadas)</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {contagem.map(([r, n, cor]) => <span key={r} className="font-body text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${cor}1A`, color: cor }}>{r}: {n}</span>)}
          </div>
          {semLinha > 0 && <p className="font-body text-[11px] mt-2" style={{ color: "#8A5A12" }}>{semLinha} operação(ões) com linha de crédito não reconhecida — serão importadas sem linha.</p>}
          {previa.ignoradas.length > 0 && <p className="font-body text-[11px] mt-1" style={{ color: F.soft }}>{previa.ignoradas.length} linha(s) ignorada(s).</p>}
          <div className="max-h-56 overflow-y-auto mt-3 border rounded-lg" style={{ borderColor: F.line }}>
            <table className="w-full font-body text-[11px]">
              <thead className="sticky top-0" style={{ background: F.blueTint }}><tr>{["Operação", "Cliente", "CPF/CNPJ", "Linha", "Valor", "Etapa"].map((h) => <th key={h} className="text-left px-2 py-1.5" style={{ color: F.blue }}>{h}</th>)}</tr></thead>
              <tbody>
                {previa.registros.slice(0, 100).map((r) => (
                  <tr key={r.numero} className="border-t" style={{ borderColor: F.line }}>
                    <td className="px-2 py-1">{r.numero}</td><td className="px-2 py-1">{r.nome}</td><td className="px-2 py-1">{mascararDoc(r.cpf || r.cnpj)}</td>
                    <td className="px-2 py-1">{r._linhaNome}</td><td className="px-2 py-1 whitespace-nowrap">{moeda(r.valor_solicitado)}</td><td className="px-2 py-1"><BadgeStatus status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 justify-end mt-3">
            <button onClick={() => setPrevia(null)} className="font-body text-sm font-bold px-4 py-2 rounded-xl border" style={{ borderColor: F.line, color: "#425A70" }}>Cancelar</button>
            <button onClick={importar} disabled={importando} className="glow-btn font-body text-sm font-bold px-5 py-2 rounded-xl text-white disabled:opacity-60" style={{ background: F.green }}>{importando ? "Importando..." : `Importar ${previa.registros.length} operação(ões)`}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AbaPropostas(ctx) {
  const acoes = useAcoesProposta(ctx);
  const [chaveForm, setChaveForm] = useState(0);
  const [aberta, setAberta] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroLinha, setFiltroLinha] = useState("");
  const lista = filtrarPropostas(ctx.propostas || [], busca, filtroLinha).filter((p) => !filtroStatus || p.status === filtroStatus);
  const propostaAberta = aberta ? (ctx.propostas || []).find((p) => p.id === aberta.id) || aberta : null;

  const exportar = () => {
    registrarAcesso("exportou_propostas");
    exportarCSV("fomento-propostas.csv", ["Número", "Data", "Nome", "CPF", "CNPJ", "WhatsApp", "Linha", "Solicitado", "Concedido", "Prazo", "Situação", "Agente"],
      lista.map((p) => [p.numero, dataBR(p.data_proposta), p.nome, formatarDoc(p.cpf), formatarDoc(p.cnpj), p.whatsapp, ctx.nomeLinha(p.linha_id, p.linha_fomentonet), p.valor_solicitado, p.valor_concedido, p.prazo_meses, STATUS_PROPOSTA[p.status]?.curto, ctx.nomeAgente(p.agente_id)]));
  };

  return (
    <div className="flex flex-col gap-6">
      <ImportarFomentoNet ctx={ctx} />
      <div>
        <Titulo eyebrow="Nova proposta" title="Cadastrar proposta" sub="Dados pessoais ficam visíveis só para a equipe do Fomento (LGPD)." />
        <div className="rounded-2xl border p-5" style={{ borderColor: F.line }}>
          <FormProposta key={chaveForm} linhas={ctx.linhas} agentes={ctx.agentes} salvando={acoes.salvando}
            onSalvar={async (f) => { const r = await acoes.salvar(f); if (r) setChaveForm((k) => k + 1); }} />
        </div>
      </div>
      <div>
        <Titulo eyebrow="Histórico das propostas" title="Todas as propostas" direita={<button onClick={exportar} className="font-body text-xs font-bold px-3 py-2 rounded-lg border flex items-center gap-1.5" style={{ borderColor: F.line, color: "#425A70" }}><Download size={13} /> Exportar CSV</button>} />
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px]"><Search size={14} className="absolute left-3 top-3" color={F.soft} /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, nº, CPF, CNPJ ou WhatsApp" className={`${inputCls} pl-8`} style={inputSty} /></div>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className={`${inputCls} w-auto`} style={inputSty}><option value="">Todas as situações</option>{Object.entries(STATUS_PROPOSTA).map(([k, s]) => <option key={k} value={k}>{s.rotulo}</option>)}</select>
          <select value={filtroLinha} onChange={(e) => setFiltroLinha(e.target.value)} className={`${inputCls} w-auto`} style={inputSty}><option value="">Todas as linhas</option>{(ctx.linhas || []).map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}</select>
        </div>
        {ctx.propostas === null ? <p className="font-body text-sm" style={{ color: F.soft }}>Carregando...</p> : <TabelaPropostas lista={lista} ctx={ctx} onAbrir={setAberta} />}
      </div>
      <ModalProposta proposta={propostaAberta} onFechar={() => setAberta(null)} ctx={ctx} acoes={acoes} />
    </div>
  );
}

// ---------------------------------------------------------------- Contratos e andamento (quadro)
function AbaContratos(ctx) {
  const acoes = useAcoesProposta(ctx);
  const [aberta, setAberta] = useState(null);
  const [busca, setBusca] = useState("");
  const [mostrarExcluidos, setMostrarExcluidos] = useState(false);
  const lista = filtrarPropostas(ctx.propostas || [], busca, "");
  const colunas = Object.entries(STATUS_PROPOSTA).filter(([k]) => mostrarExcluidos || k !== "excluido");
  const propostaAberta = aberta ? (ctx.propostas || []).find((p) => p.id === aberta.id) || aberta : null;
  const ordem = Object.keys(STATUS_PROPOSTA);

  return (
    <div>
      <Titulo eyebrow="Contratos e andamento" title="Quadro de acompanhamento" sub="Avance cada proposta pelas etapas. Toque no card para ver detalhes e histórico."
        direita={<label className="font-body text-xs flex items-center gap-1.5 cursor-pointer" style={{ color: F.muted }}><input type="checkbox" checked={mostrarExcluidos} onChange={(e) => setMostrarExcluidos(e.target.checked)} /> Mostrar excluídos</label>} />
      <div className="relative mb-3 max-w-md"><Search size={14} className="absolute left-3 top-3" color={F.soft} /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar" className={`${inputCls} pl-8`} style={inputSty} /></div>
      <div className="flex gap-3 overflow-x-auto pb-3 snap-x">
        {colunas.map(([k, s]) => {
          const itens = lista.filter((p) => p.status === k);
          return (
            <div key={k} className="snap-start shrink-0 w-64 rounded-2xl p-2.5" style={{ background: F.blueTint2 }}>
              <div className="flex items-center justify-between px-1 mb-2">
                <p className="font-display font-bold text-xs flex items-center gap-1.5" style={{ color: s.cor }}><span className="w-2 h-2 rounded-full" style={{ background: s.cor }} />{s.rotulo}</p>
                <span className="font-body text-[11px] font-bold" style={{ color: F.muted }}>{itens.length}</span>
              </div>
              <div className="flex flex-col gap-2 min-h-[60px]">
                {itens.map((p) => {
                  const idx = ordem.indexOf(p.status);
                  const prox = ordem[idx + 1] && !["concedido", "negado", "excluido"].includes(p.status) ? ordem[idx + 1] : null;
                  return (
                    <div key={p.id} className="rounded-xl bg-white border p-2.5" style={{ borderColor: F.line }}>
                      <button onClick={() => setAberta(p)} className="text-left w-full">
                        <p className="font-body text-[10px] font-bold" style={{ color: F.soft }}>{p.numero} · {dataBR(p.data_proposta)}</p>
                        <p className="font-display font-bold text-sm truncate" style={{ color: F.ink }}>{p.nome}</p>
                        <p className="font-body text-[11px] truncate" style={{ color: F.muted }}>{ctx.nomeLinha(p.linha_id, p.linha_fomentonet)}</p>
                        <p className="font-body text-xs font-bold mt-1" style={{ color: F.ink }}>{moeda(p.status === "concedido" ? p.valor_concedido ?? p.valor_solicitado : p.valor_solicitado)}</p>
                      </button>
                      {prox && (
                        <div className="flex gap-1 mt-2">
                          <button onClick={() => acoes.mudarStatus(p, prox)} className="flex-1 font-body text-[10px] font-bold px-2 py-1 rounded-md text-white flex items-center justify-center gap-1" style={{ background: STATUS_PROPOSTA[prox].cor }}>{STATUS_PROPOSTA[prox].curto} <ArrowRight size={10} /></button>
                          {p.status === "em_analise" && <button onClick={() => acoes.mudarStatus(p, "negado")} className="font-body text-[10px] font-bold px-2 py-1 rounded-md border" style={{ borderColor: F.line, color: F.danger }}>Negar</button>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <ModalProposta proposta={propostaAberta} onFechar={() => setAberta(null)} ctx={ctx} acoes={acoes} />
    </div>
  );
}

// ---------------------------------------------------------------- Pré-cadastros do site
function AbaInteresses(ctx) {
  const acoes = useAcoesProposta(ctx);
  const [filtro, setFiltro] = useState("novo");
  const [convertendo, setConvertendo] = useState(null);
  const lista = (ctx.interesses || []).filter((i) => !filtro || i.status === filtro);
  const rotulos = { novo: "Novos", contatado: "Contatados", convertido: "Viraram proposta", descartado: "Descartados" };

  const mudar = async (i, status, extra = {}) => {
    if (supabaseConfigurado) {
      const { error } = await supabase.from("fomento_interesses").update({ status, ...extra }).eq("id", i.id);
      if (error) { ctx.avisar(error.message, "erro"); return; }
    }
    ctx.setInteresses((l) => l.map((x) => (x.id === i.id ? { ...x, status, ...extra } : x)));
  };

  return (
    <div>
      <Titulo eyebrow="Pré-cadastros do site" title="Interessados" sub="Contatos enviados pelos empreendedores na área pública. Não são propostas oficiais até você converter." />
      <div className="flex flex-wrap gap-1.5 mb-4">
        {[["", "Todos"], ...Object.entries(rotulos)].map(([k, r]) => (
          <button key={k} onClick={() => setFiltro(k)} className="font-body text-xs font-bold px-3 py-1.5 rounded-full border" style={{ borderColor: filtro === k ? F.blue : F.line, background: filtro === k ? F.blueTint : "#fff", color: filtro === k ? F.blue : "#425A70" }}>
            {r} ({(ctx.interesses || []).filter((i) => !k || i.status === k).length})
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2.5">
        {lista.map((i) => (
          <div key={i.id} className="rounded-2xl border p-4" style={{ borderColor: F.line }}>
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <p className="font-display font-bold text-sm" style={{ color: F.ink }}>{i.nome} <span className="font-body text-[11px] font-semibold" style={{ color: F.muted }}>· {i.cidade || "—"}</span></p>
                <p className="font-body text-xs" style={{ color: F.muted }}>{TIPOS_CONTATO[i.tipo_contato]} · {ctx.nomeLinha(i.linha_id)}{i.valor_desejado ? ` · ${moeda(i.valor_desejado)}` : ""}{i.prazo_meses ? ` em ${i.prazo_meses}x` : ""} · {dataHoraBR(i.criado_em)}</p>
              </div>
              <span className="font-body text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: F.blueTint, color: F.blue }}>{rotulos[i.status]}</span>
            </div>
            {i.mensagem && <p className="font-body text-sm mt-2" style={{ color: F.ink }}>“{i.mensagem}”</p>}
            <div className="flex flex-wrap gap-1.5 mt-3">
              <a href={linkWhats(i.whatsapp, `Olá, ${i.nome.split(" ")[0]}! Aqui é ${ctx.config?.agente_nome || "o Agente de Crédito"}, da Fomento Paraná em Ivatuba. Recebi seu pré-cadastro no Conecta Comércio.`)} target="_blank" rel="noopener noreferrer"
                onClick={() => i.status === "novo" && mudar(i, "contatado")} className="font-body text-[11px] font-bold px-2.5 py-1.5 rounded-lg text-white flex items-center gap-1" style={{ background: F.greenBright }}><MessageCircle size={12} /> {i.whatsapp}</a>
              {i.status !== "convertido" && <button onClick={() => setConvertendo(i)} className="font-body text-[11px] font-bold px-2.5 py-1.5 rounded-lg text-white flex items-center gap-1" style={{ background: F.blue }}><PlusCircle size={12} /> Converter em proposta</button>}
              {i.status === "novo" && <button onClick={() => mudar(i, "contatado")} className="font-body text-[11px] font-bold px-2.5 py-1.5 rounded-lg border" style={{ borderColor: F.line, color: "#425A70" }}>Marcar contatado</button>}
              {!["descartado", "convertido"].includes(i.status) && <button onClick={() => mudar(i, "descartado")} className="font-body text-[11px] font-bold px-2.5 py-1.5 rounded-lg border" style={{ borderColor: F.line, color: F.danger }}>Descartar</button>}
            </div>
          </div>
        ))}
        {!lista.length && <p className="font-body text-sm py-6 text-center" style={{ color: F.soft }}>Nenhum pré-cadastro aqui.</p>}
      </div>
      <Modal aberto={!!convertendo} onFechar={() => setConvertendo(null)} titulo="Converter em proposta oficial" largura="max-w-3xl">
        {convertendo && (
          <FormProposta inicial={{ nome: convertendo.nome, whatsapp: convertendo.whatsapp, linha_id: convertendo.linha_id || "", valor_solicitado: convertendo.valor_desejado ?? "", prazo_meses: convertendo.prazo_meses ?? "", observacoes: convertendo.mensagem || "", status: "em_contato", interesse_id: convertendo.id }}
            linhas={ctx.linhas} agentes={ctx.agentes} salvando={acoes.salvando} onCancelar={() => setConvertendo(null)}
            onSalvar={async (f) => { const r = await acoes.salvar({ ...f, interesse_id: convertendo.id }); if (r) { await mudar(convertendo, "convertido", { proposta_id: String(r.id).startsWith("demo-") ? null : r.id }); setConvertendo(null); } }} />
        )}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------- Ranking
function RankingOficialIvatuba({ rankingOficial, setRankingOficial, avisar }) {
  const ultimo = (rankingOficial || [])[0];
  const vazio = { data_referencia: hojeLocal(), posicao_geral: "", total_geral: String(ultimo?.total_geral ?? 722), pontuacao: "", faixa: ultimo?.faixa || "Até 5 mil hab", posicao_faixa: "", total_faixa: String(ultimo?.total_faixa ?? 54), observacao: "", publicar: true };
  const [f, setF] = useState(vazio);
  const [salvando, setSalvando] = useState(false);
  const lista = rankingOficial || [];
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const salvar = async (e) => {
    e.preventDefault();
    const dados = {
      data_referencia: f.data_referencia, posicao_geral: f.posicao_geral ? Number(f.posicao_geral) : null, pontuacao: parseValor(f.pontuacao),
      faixa: f.faixa || null, posicao_faixa: f.posicao_faixa ? Number(f.posicao_faixa) : null,
      total_geral: f.total_geral ? Number(f.total_geral) : null, total_faixa: f.total_faixa ? Number(f.total_faixa) : null, observacao: f.observacao.trim() || null, publicar: f.publicar,
    };
    if (!dados.posicao_geral && !dados.posicao_faixa && dados.pontuacao == null) { avisar("Informe ao menos a posição ou a pontuação.", "erro"); return; }
    setSalvando(true);
    try {
      let reg = { ...dados, id: `demo-${Date.now()}`, criado_em: new Date().toISOString() };
      if (supabaseConfigurado) {
        const { data, error } = await supabase.from("fomento_ranking_oficial").insert(dados).select().single();
        if (error) throw error;
        reg = data;
      }
      setRankingOficial((l) => [reg, ...(l || [])].sort((a, b) => (b.data_referencia || "").localeCompare(a.data_referencia || "")));
      setF(vazio);
      avisar(dados.publicar ? "Ranking atualizado — já aparece no site." : "Ranking salvo (não publicado).");
    } catch (err) { avisar(err.message || "Erro ao salvar.", "erro"); }
    finally { setSalvando(false); }
  };
  const alternarPublicar = async (r) => {
    if (supabaseConfigurado) { const { error } = await supabase.from("fomento_ranking_oficial").update({ publicar: !r.publicar }).eq("id", r.id); if (error) { avisar(error.message, "erro"); return; } }
    setRankingOficial((l) => l.map((x) => (x.id === r.id ? { ...x, publicar: !r.publicar } : x)));
  };
  const apagar = async (r) => {
    if (!window.confirm("Excluir este lançamento do ranking?")) return;
    if (supabaseConfigurado) { const { error } = await supabase.from("fomento_ranking_oficial").delete().eq("id", r.id); if (error) { avisar(error.message, "erro"); return; } }
    setRankingOficial((l) => l.filter((x) => x.id !== r.id));
  };

  return (
    <div className="mb-8">
      <Titulo eyebrow="Ranking oficial · FomentoNet" title="Ivatuba no Ranking Geral" sub="Abra o FomentoNet, confira a posição de Ivatuba e lance aqui. O último lançamento publicado aparece na página pública do Fomento." />
      <div className="grid lg:grid-cols-2 gap-4">
        <form onSubmit={salvar} className="rounded-2xl border p-4 grid grid-cols-2 gap-3 h-fit" style={{ borderColor: F.line }}>
          <Campo label="Data da consulta"><input type="date" value={f.data_referencia} onChange={set("data_referencia")} className={inputCls} style={inputSty} /></Campo>
          <Campo label="Pontuação"><input value={f.pontuacao} onChange={set("pontuacao")} inputMode="decimal" placeholder="Ex.: 3500" className={inputCls} style={inputSty} /></Campo>
          <Campo label="Posição geral (PR)"><input value={f.posicao_geral} onChange={set("posicao_geral")} inputMode="numeric" placeholder="Ex.: 12" className={inputCls} style={inputSty} /></Campo>
          <Campo label="Total de agentes (geral)"><input value={f.total_geral} onChange={set("total_geral")} inputMode="numeric" className={inputCls} style={inputSty} /></Campo>
          <Campo label="Faixa"><select value={f.faixa} onChange={set("faixa")} className={inputCls} style={inputSty}>{FAIXAS_RANKING.map((x) => <option key={x}>{x}</option>)}</select></Campo>
          <Campo label="Posição na faixa"><input value={f.posicao_faixa} onChange={set("posicao_faixa")} inputMode="numeric" placeholder="Ex.: 2" className={inputCls} style={inputSty} /></Campo>
          <Campo label="Total de agentes na faixa" className="col-span-2"><input value={f.total_faixa} onChange={set("total_faixa")} inputMode="numeric" className={inputCls} style={inputSty} /></Campo>
          <Campo label="Observação (opcional)" className="col-span-2"><input value={f.observacao} onChange={set("observacao")} placeholder="Ex.: Pódio da faixa no mês de novembro" className={inputCls} style={inputSty} /></Campo>
          <label className="col-span-2 font-body text-sm flex items-center gap-2" style={{ color: F.ink }}><input type="checkbox" checked={f.publicar} onChange={set("publicar")} className="accent-green-600" /> Mostrar na página pública do Fomento</label>
          <div className="col-span-2 flex gap-2 flex-wrap">
            <button type="submit" disabled={salvando} className="glow-btn flex-1 font-body text-sm font-bold text-white rounded-xl py-2.5 disabled:opacity-60" style={{ background: F.green }}>{salvando ? "Salvando..." : "Atualizar ranking de Ivatuba"}</button>
            <a href={FOMENTONET_RANKING_URL} target="_blank" rel="noopener noreferrer" className="font-body text-xs font-bold rounded-xl px-3 py-2.5 border flex items-center gap-1.5" style={{ borderColor: F.line, color: F.blue }}><ExternalLink size={13} /> Abrir FomentoNet</a>
          </div>
        </form>
        <div className="flex flex-col gap-3">
          {lista[0] ? <CardRankingIvatuba registro={lista[0]} anterior={lista[1]} compacto /> : <div className="rounded-2xl border p-4 font-body text-sm" style={{ borderColor: F.line, color: F.soft }}>Nenhum lançamento ainda.</div>}
          {lista.length > 0 && (
            <div className="rounded-2xl border divide-y" style={{ borderColor: F.line }}>
              <p className="font-body text-[11px] font-bold uppercase px-3 py-2" style={{ color: F.muted }}>Histórico</p>
              {lista.map((r) => (
                <div key={r.id} className="flex items-center gap-2 px-3 py-2 font-body text-xs" style={{ borderColor: F.line, color: F.ink }}>
                  <span className="w-20 shrink-0" style={{ color: F.muted }}>{dataBR(r.data_referencia)}</span>
                  <span className="flex-1">{r.posicao_geral ? `${r.posicao_geral}º/${r.total_geral || "?"} geral` : ""}{r.posicao_faixa ? ` · ${r.posicao_faixa}º/${r.total_faixa || "?"} na faixa` : ""}{r.pontuacao != null ? ` · ${Number(r.pontuacao).toLocaleString("pt-BR")} pts` : ""}</span>
                  <button onClick={() => alternarPublicar(r)} className="font-bold" style={{ color: r.publicar ? F.green : F.soft }}>{r.publicar ? "No site" : "Oculto"}</button>
                  <button onClick={() => apagar(r)} title="Excluir"><Trash2 size={12} color={F.danger} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AbaRanking({ propostas, agentes, rankingOficial, setRankingOficial, avisar }) {
  const [periodo, setPeriodo] = useState("mes");
  const inicio = (() => { const d = new Date(); if (periodo === "mes") return new Date(d.getFullYear(), d.getMonth(), 1); if (periodo === "ano") return new Date(d.getFullYear(), 0, 1); return new Date(0); })();
  const lista = (propostas || []).filter((p) => new Date(p.data_proposta || p.criado_em) >= inicio);
  const ranking = (agentes || []).map((a) => {
    const minhas = lista.filter((p) => p.agente_id === a.id);
    return { ...a, pontos: minhas.reduce((s, p) => s + pontosDaProposta(p), 0), qtd: minhas.filter((p) => p.status !== "excluido").length, concedidos: minhas.filter((p) => p.status === "concedido").length, valor: minhas.filter((p) => p.status === "concedido").reduce((s, p) => s + (Number(p.valor_concedido) || 0), 0) };
  }).sort((a, b) => b.pontos - a.pontos);
  const semAgente = lista.filter((p) => !p.agente_id).length;
  const medalha = ["#E8A23D", "#9AA5B1", "#B87333"];

  return (
    <div>
      <RankingOficialIvatuba rankingOficial={rankingOficial} setRankingOficial={setRankingOficial} avisar={avisar} />
      <Titulo eyebrow="Ranking interno" title="Desempenho dos agentes nesta plataforma"
        direita={<select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className={`${inputCls} w-auto`} style={inputSty}><option value="mes">Este mês</option><option value="ano">Este ano</option><option value="tudo">Desde o início</option></select>} />
      <div className="flex flex-col gap-2">
        {ranking.map((a, i) => (
          <div key={a.id} className="rounded-2xl border p-4 flex items-center gap-3" style={{ borderColor: i === 0 && a.pontos > 0 ? "#E8A23D" : F.line }}>
            <span className="w-9 h-9 rounded-full flex items-center justify-center font-display font-extrabold text-sm text-white shrink-0" style={{ background: medalha[i] || F.blue }}>{i + 1}º</span>
            <div className="flex-1 min-w-0"><p className="font-display font-bold text-sm" style={{ color: F.ink }}>{a.nome}</p><p className="font-body text-[11px]" style={{ color: F.muted }}>{a.qtd} proposta(s) · {a.concedidos} concedida(s) · {moeda(a.valor)}</p></div>
            <p className="font-display font-extrabold text-xl" style={{ color: F.green }}>{a.pontos}<span className="font-body text-[10px] ml-1" style={{ color: F.soft }}>pts</span></p>
          </div>
        ))}
        {!ranking.length && <p className="font-body text-sm" style={{ color: F.soft }}>Cadastre agentes em Configurações para montar o ranking.</p>}
      </div>
      {semAgente > 0 && <p className="font-body text-xs mt-3" style={{ color: F.muted }}>{semAgente} proposta(s) do período sem agente responsável não entram no ranking.</p>}
      <div className="rounded-2xl p-4 mt-5" style={{ background: F.blueTint2 }}>
        <p className="font-display font-bold text-sm mb-1" style={{ color: F.ink }}>Como os pontos são calculados</p>
        <p className="font-body text-xs" style={{ color: F.muted }}>
          {Object.values(STATUS_PROPOSTA).map((s) => `${s.curto}: ${s.pontos}`).join(" · ")} · Concedido ganha +1 ponto a cada R$ 1.000 concedidos.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Linhas de crédito
function AbaLinhas({ linhas, setLinhas, avisar, podeGerir }) {
  const [editando, setEditando] = useState(null);
  const [enviandoPdf, setEnviandoPdf] = useState(false);
  const campos = [["descricao", "Descrição", 2], ["finalidade", "Finalidade", 2], ["publico_alvo", "Público-alvo", 2], ["taxas", "Taxas oficiais", 2], ["prazos", "Prazos", 1], ["carencia", "Carência", 1], ["valores", "Valores disponíveis", 1], ["requisitos", "Requisitos", 2]];

  const salvar = async () => {
    const e = editando;
    const dados = {
      nome: e.nome, descricao: e.descricao, finalidade: e.finalidade, publico_alvo: e.publico_alvo, taxas: e.taxas, prazos: e.prazos, carencia: e.carencia,
      valores: e.valores, requisitos: e.requisitos, pdf_url: e.pdf_url || null, cor: e.cor, ativo: e.ativo, ordem: Number(e.ordem) || 0,
      documentos: String(e.documentosTexto || "").split("\n").map((s) => s.trim()).filter(Boolean),
      taxa_mensal_ref: parseValor(e.taxa_mensal_ref), valor_min: parseValor(e.valor_min), valor_max: parseValor(e.valor_max),
      prazo_max_meses: e.prazo_max_meses ? Number(e.prazo_max_meses) : null, carencia_max_meses: e.carencia_max_meses !== "" && e.carencia_max_meses != null ? Number(e.carencia_max_meses) : null,
      atualizado_em: new Date().toISOString(),
    };
    if (!dados.nome) { avisar("Informe o nome da linha.", "erro"); return; }
    if (supabaseConfigurado) {
      const q = e.id ? supabase.from("fomento_linhas").update(dados).eq("id", e.id) : supabase.from("fomento_linhas").insert({ ...dados, slug: `${normalizarSlug(dados.nome)}-${Date.now().toString(36)}` });
      const { data, error } = await q.select().single();
      if (error) { avisar(error.message, "erro"); return; }
      setLinhas((l) => (e.id ? l.map((x) => (x.id === e.id ? data : x)) : [...l, data]).sort((a, b) => a.ordem - b.ordem));
    } else {
      setLinhas((l) => (e.id ? l.map((x) => (x.id === e.id ? { ...x, ...dados } : x)) : [...l, { ...dados, id: `demo-${Date.now()}` }]));
    }
    avisar("Linha de crédito salva.");
    setEditando(null);
  };

  const enviarPdf = async (arquivo) => {
    if (!arquivo) return;
    if (!supabaseConfigurado) { setEditando((x) => ({ ...x, pdf_url: URL.createObjectURL(arquivo) })); return; }
    setEnviandoPdf(true);
    const caminho = `linhas/${Date.now()}-${arquivo.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("fomento-materiais").upload(caminho, arquivo, { contentType: arquivo.type || "application/pdf" });
    setEnviandoPdf(false);
    if (error) { avisar(error.message, "erro"); return; }
    setEditando((x) => ({ ...x, pdf_url: supabase.storage.from("fomento-materiais").getPublicUrl(caminho).data.publicUrl }));
  };

  return (
    <div>
      <Titulo eyebrow="Linhas de crédito" title="As modalidades" sub="O que estiver aqui aparece nos cards da área pública. Preencha com as condições oficiais vigentes."
        direita={podeGerir && <button onClick={() => setEditando({ nome: "", ativo: true, cor: "#0A5AA8", ordem: (linhas || []).length + 1, documentosTexto: "" })} className="font-body text-xs font-bold px-3 py-2 rounded-lg text-white flex items-center gap-1.5" style={{ background: F.blue }}><PlusCircle size={13} /> Nova linha</button>} />
      {!podeGerir && <div className="mb-3"><Aviso>Somente o gestor do módulo pode editar as linhas.</Aviso></div>}
      <div className="grid sm:grid-cols-2 gap-3">
        {(linhas || []).map((l) => {
          const faltando = ["taxas", "prazos", "valores"].filter((k) => !l[k]).length + ((l.documentos || []).length ? 0 : 1);
          return (
            <div key={l.id} className="rounded-2xl border p-4 flex flex-col gap-1.5" style={{ borderColor: F.line, opacity: l.ativo ? 1 : 0.55 }}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-display font-bold text-sm flex items-center gap-2" style={{ color: F.ink }}><span className="w-2.5 h-2.5 rounded-full" style={{ background: l.cor }} />{l.nome}</p>
                {!l.ativo && <span className="font-body text-[10px] font-bold" style={{ color: F.soft }}>Oculta</span>}
              </div>
              <p className="font-body text-xs line-clamp-2" style={{ color: F.muted }}>{l.descricao}</p>
              <p className="font-body text-[11px]" style={{ color: faltando ? "#8A5A12" : F.green }}>{faltando ? `${faltando} informação(ões) a completar` : "Informações completas"} · atualizada em {dataBR(l.atualizado_em)}</p>
              {podeGerir && <button onClick={() => setEditando({ ...l, documentosTexto: (l.documentos || []).join("\n") })} className="self-start mt-1 font-body text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5" style={{ borderColor: F.line, color: F.blue }}><Pencil size={12} /> Editar</button>}
            </div>
          );
        })}
      </div>
      <Modal aberto={!!editando} onFechar={() => setEditando(null)} titulo={editando?.id ? `Editar: ${editando?.nome}` : "Nova linha de crédito"} largura="max-w-3xl">
        {editando && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Campo label="Nome" className="sm:col-span-2"><input value={editando.nome || ""} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} className={inputCls} style={inputSty} /></Campo>
            {campos.map(([k, rot, span]) => (
              <Campo key={k} label={rot} className={span === 2 ? "sm:col-span-2" : ""}><textarea rows={span === 2 ? 2 : 1} value={editando[k] || ""} onChange={(e) => setEditando({ ...editando, [k]: e.target.value })} className={inputCls} style={inputSty} /></Campo>
            ))}
            <Campo label="Documentos necessários (um por linha)" className="sm:col-span-2"><textarea rows={5} value={editando.documentosTexto || ""} onChange={(e) => setEditando({ ...editando, documentosTexto: e.target.value })} className={inputCls} style={inputSty} /></Campo>
            <div className="sm:col-span-2 rounded-xl p-3 grid sm:grid-cols-5 gap-2" style={{ background: F.blueTint2 }}>
              <p className="sm:col-span-5 font-body text-[11px] font-bold" style={{ color: F.muted }}>Números do simulador (estimativa)</p>
              {[["taxa_mensal_ref", "Taxa % a.m."], ["valor_min", "Valor mín."], ["valor_max", "Valor máx."], ["prazo_max_meses", "Prazo máx. (meses)"], ["carencia_max_meses", "Carência máx."]].map(([k, r]) => (
                <Campo key={k} label={r}><input value={editando[k] ?? ""} onChange={(e) => setEditando({ ...editando, [k]: e.target.value })} inputMode="decimal" className={inputCls} style={inputSty} /></Campo>
              ))}
            </div>
            <Campo label="PDF informativo">
              <div className="flex items-center gap-2">
                <label className="font-body text-xs font-bold px-3 py-2 rounded-lg border cursor-pointer flex items-center gap-1.5" style={{ borderColor: F.line, color: F.blue }}><Upload size={13} /> {enviandoPdf ? "Enviando..." : "Enviar PDF"}<input type="file" accept="application/pdf" hidden onChange={(e) => enviarPdf(e.target.files?.[0])} /></label>
                {editando.pdf_url && <><a href={editando.pdf_url} target="_blank" rel="noopener noreferrer" className="font-body text-xs underline" style={{ color: F.blue }}>Ver</a><button onClick={() => setEditando({ ...editando, pdf_url: "" })} className="font-body text-xs" style={{ color: F.danger }}>Remover</button></>}
              </div>
            </Campo>
            <div className="grid grid-cols-3 gap-2">
              <Campo label="Cor"><input type="color" value={editando.cor || "#0A5AA8"} onChange={(e) => setEditando({ ...editando, cor: e.target.value })} className="h-10 w-full rounded-lg border" style={inputSty} /></Campo>
              <Campo label="Ordem"><input value={editando.ordem ?? 0} onChange={(e) => setEditando({ ...editando, ordem: e.target.value })} inputMode="numeric" className={inputCls} style={inputSty} /></Campo>
              <Campo label="Visível"><label className="flex items-center gap-2 h-10 font-body text-sm"><input type="checkbox" checked={!!editando.ativo} onChange={(e) => setEditando({ ...editando, ativo: e.target.checked })} /> Sim</label></Campo>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2"><button onClick={() => setEditando(null)} className="font-body text-sm font-bold px-4 py-2.5 rounded-xl border" style={{ borderColor: F.line, color: "#425A70" }}>Cancelar</button><button onClick={salvar} className="glow-btn font-body text-sm font-bold px-5 py-2.5 rounded-xl text-white" style={{ background: F.blue }}>Salvar</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
function normalizarSlug(s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

// ---------------------------------------------------------------- Documentos e PDFs
function AbaMateriais({ materiais, setMateriais, linhas, avisar, podeGerir, nomeLinha }) {
  const vazio = { titulo: "", tipo: "cartilha", linha_id: "", arquivo: null, publicado: true };
  const [novo, setNovo] = useState(vazio);
  const [enviando, setEnviando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [tituloEdit, setTituloEdit] = useState("");

  const subir = async (arquivo) => {
    const caminho = `materiais/${Date.now()}-${arquivo.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("fomento-materiais").upload(caminho, arquivo, { contentType: arquivo.type || "application/pdf" });
    if (error) throw error;
    return supabase.storage.from("fomento-materiais").getPublicUrl(caminho).data.publicUrl;
  };

  const publicar = async (e) => {
    e.preventDefault();
    if (!novo.titulo.trim() || !novo.arquivo) { avisar("Informe o título e escolha o arquivo.", "erro"); return; }
    setEnviando(true);
    try {
      const reg = { titulo: novo.titulo.trim(), tipo: novo.tipo, linha_id: novo.linha_id || null, publicado: novo.publicado, atualizado_em: new Date().toISOString() };
      if (!supabaseConfigurado) {
        setMateriais((l) => [{ ...reg, id: `demo-${Date.now()}`, arquivo_url: URL.createObjectURL(novo.arquivo) }, ...l]);
      } else {
        const url = await subir(novo.arquivo);
        const { data, error } = await supabase.from("fomento_materiais").insert({ ...reg, arquivo_url: url }).select().single();
        if (error) throw error;
        setMateriais((l) => [data, ...l]);
      }
      setNovo(vazio);
      avisar("Material publicado.");
    } catch (err) { avisar(err.message || "Erro ao enviar.", "erro"); }
    finally { setEnviando(false); }
  };

  const atualizar = async (m, mudancas) => {
    const dados = { ...mudancas, atualizado_em: new Date().toISOString() };
    if (supabaseConfigurado) {
      const { error } = await supabase.from("fomento_materiais").update(dados).eq("id", m.id);
      if (error) { avisar(error.message, "erro"); return; }
    }
    setMateriais((l) => l.map((x) => (x.id === m.id ? { ...x, ...dados } : x)));
  };
  const trocarArquivo = async (m, arquivo) => {
    if (!arquivo) return;
    try { const url = supabaseConfigurado ? await subir(arquivo) : URL.createObjectURL(arquivo); await atualizar(m, { arquivo_url: url }); avisar("Arquivo atualizado."); }
    catch (err) { avisar(err.message, "erro"); }
  };
  const remover = async (m) => {
    if (!window.confirm(`Retirar "${m.titulo}" definitivamente?`)) return;
    if (supabaseConfigurado) {
      const { error } = await supabase.from("fomento_materiais").delete().eq("id", m.id);
      if (error) { avisar(error.message, "erro"); return; }
    }
    setMateriais((l) => l.filter((x) => x.id !== m.id));
    avisar("Material removido.");
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Titulo eyebrow="Documentos e PDFs" title="Publicar material" sub="Cartilhas, tabelas de taxas, documentação necessária e informativos por modalidade." />
        {!podeGerir ? <Aviso>Somente o gestor do módulo pode publicar materiais.</Aviso> : (
          <form onSubmit={publicar} className="rounded-2xl border p-5 grid sm:grid-cols-2 gap-3" style={{ borderColor: F.line }}>
            <Campo label="Título" className="sm:col-span-2"><input value={novo.titulo} onChange={(e) => setNovo({ ...novo, titulo: e.target.value })} className={inputCls} style={inputSty} /></Campo>
            <Campo label="Tipo"><select value={novo.tipo} onChange={(e) => setNovo({ ...novo, tipo: e.target.value })} className={inputCls} style={inputSty}>{Object.entries(TIPOS_MATERIAL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Campo>
            <Campo label="Modalidade (opcional)"><select value={novo.linha_id} onChange={(e) => setNovo({ ...novo, linha_id: e.target.value })} className={inputCls} style={inputSty}><option value="">Geral (todas)</option>{(linhas || []).map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}</select></Campo>
            <label className="font-body text-xs font-bold px-3 py-2.5 rounded-lg border cursor-pointer flex items-center gap-1.5 w-fit" style={{ borderColor: F.line, color: F.blue }}><Upload size={13} /> {novo.arquivo ? novo.arquivo.name : "Escolher arquivo (PDF)"}<input type="file" accept="application/pdf,image/*" hidden onChange={(e) => setNovo({ ...novo, arquivo: e.target.files?.[0] || null })} /></label>
            <label className="font-body text-sm flex items-center gap-2"><input type="checkbox" checked={novo.publicado} onChange={(e) => setNovo({ ...novo, publicado: e.target.checked })} /> Publicar no site agora</label>
            <button type="submit" disabled={enviando} className="sm:col-span-2 glow-btn font-body text-sm font-bold text-white rounded-xl py-2.5 disabled:opacity-60" style={{ background: F.blue }}>{enviando ? "Enviando..." : "Publicar material"}</button>
          </form>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {(materiais || []).map((m) => (
          <div key={m.id} className="rounded-2xl border p-3.5 flex items-center gap-3 flex-wrap" style={{ borderColor: F.line, opacity: m.publicado ? 1 : 0.6 }}>
            <FileText size={18} color={F.danger} />
            <div className="flex-1 min-w-[180px]">
              {editandoId === m.id ? (
                <span className="flex gap-1.5"><input value={tituloEdit} onChange={(e) => setTituloEdit(e.target.value)} className={inputCls} style={inputSty} /><button onClick={async () => { await atualizar(m, { titulo: tituloEdit }); setEditandoId(null); }} className="font-body text-xs font-bold px-3 rounded-lg text-white" style={{ background: F.blue }}>OK</button></span>
              ) : <p className="font-display font-bold text-sm" style={{ color: F.ink }}>{m.titulo}</p>}
              <p className="font-body text-[11px]" style={{ color: F.muted }}>{TIPOS_MATERIAL[m.tipo]} · {m.linha_id ? nomeLinha(m.linha_id) : "Geral"} · {m.publicado ? "Publicado" : "Retirado do site"} · {dataBR(m.atualizado_em)}</p>
            </div>
            <a href={m.arquivo_url} target="_blank" rel="noopener noreferrer" className="font-body text-[11px] font-bold underline" style={{ color: F.blue }}>Abrir</a>
            {podeGerir && <>
              <button onClick={() => { setEditandoId(m.id); setTituloEdit(m.titulo); }} className="font-body text-[11px] font-bold px-2 py-1 rounded-lg border" style={{ borderColor: F.line, color: "#425A70" }}>Editar</button>
              <label className="font-body text-[11px] font-bold px-2 py-1 rounded-lg border cursor-pointer" style={{ borderColor: F.line, color: "#425A70" }}>Atualizar arquivo<input type="file" accept="application/pdf,image/*" hidden onChange={(e) => trocarArquivo(m, e.target.files?.[0])} /></label>
              <button onClick={() => atualizar(m, { publicado: !m.publicado })} className="font-body text-[11px] font-bold px-2 py-1 rounded-lg border" style={{ borderColor: F.line, color: m.publicado ? "#8A5A12" : F.green }}>{m.publicado ? "Retirar do site" : "Publicar"}</button>
              <button onClick={() => remover(m)} className="p-1.5 rounded-lg border" style={{ borderColor: F.line }} title="Excluir"><Trash2 size={12} color={F.danger} /></button>
            </>}
          </div>
        ))}
        {!(materiais || []).length && <p className="font-body text-sm" style={{ color: F.soft }}>Nenhum material publicado ainda.</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Lembretes
async function criarLembrete(ctx, dados) {
  if (!supabaseConfigurado) { ctx.setLembretes((l) => [...(l || []), { ...dados, id: `demo-${Date.now()}`, concluido: false }].sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora))); ctx.avisar("Lembrete criado."); return; }
  const { data, error } = await supabase.from("fomento_lembretes").insert(dados).select().single();
  if (error) { ctx.avisar(error.message, "erro"); return; }
  ctx.setLembretes((l) => [...(l || []), data].sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora)));
  ctx.avisar("Lembrete criado.");
}

function AbaLembretes(ctx) {
  const { lembretes, setLembretes, propostas, avisar } = ctx;
  const [novo, setNovo] = useState({ titulo: "", data_hora: "", proposta_id: "" });
  const [verConcluidos, setVerConcluidos] = useState(false);
  const agora = new Date();
  const lista = (lembretes || []).filter((l) => verConcluidos || !l.concluido);

  const alternar = async (l) => {
    if (supabaseConfigurado) { const { error } = await supabase.from("fomento_lembretes").update({ concluido: !l.concluido }).eq("id", l.id); if (error) { avisar(error.message, "erro"); return; } }
    setLembretes((x) => x.map((y) => (y.id === l.id ? { ...y, concluido: !l.concluido } : y)));
  };
  const apagar = async (l) => {
    if (supabaseConfigurado) { const { error } = await supabase.from("fomento_lembretes").delete().eq("id", l.id); if (error) { avisar(error.message, "erro"); return; } }
    setLembretes((x) => x.filter((y) => y.id !== l.id));
  };
  const baixarIcs = (l) => {
    const dt = new Date(l.data_hora).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:${l.id}@conecta-fomento\nDTSTAMP:${dt}\nDTSTART:${dt}\nSUMMARY:${l.titulo}\nBEGIN:VALARM\nTRIGGER:-PT30M\nACTION:DISPLAY\nDESCRIPTION:${l.titulo}\nEND:VALARM\nEND:VEVENT\nEND:VCALENDAR`;
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" })); a.download = "lembrete-fomento.ics"; a.click();
  };

  return (
    <div>
      <Titulo eyebrow="Lembretes" title="Lembretes de atendimento" direita={<label className="font-body text-xs flex items-center gap-1.5" style={{ color: F.muted }}><input type="checkbox" checked={verConcluidos} onChange={(e) => setVerConcluidos(e.target.checked)} /> Mostrar concluídos</label>} />
      <form onSubmit={async (e) => { e.preventDefault(); if (!novo.titulo || !novo.data_hora) { avisar("Informe o título e a data.", "erro"); return; } await criarLembrete(ctx, { titulo: novo.titulo, data_hora: new Date(novo.data_hora).toISOString(), proposta_id: novo.proposta_id || null }); setNovo({ titulo: "", data_hora: "", proposta_id: "" }); }}
        className="rounded-2xl border p-4 grid sm:grid-cols-[1fr_auto_1fr_auto] gap-2 mb-4 items-end" style={{ borderColor: F.line }}>
        <Campo label="O que fazer"><input value={novo.titulo} onChange={(e) => setNovo({ ...novo, titulo: e.target.value })} placeholder="Ex.: Ligar para conferir documentos" className={inputCls} style={inputSty} /></Campo>
        <Campo label="Quando"><input type="datetime-local" value={novo.data_hora} onChange={(e) => setNovo({ ...novo, data_hora: e.target.value })} className={inputCls} style={inputSty} /></Campo>
        <Campo label="Proposta (opcional)"><select value={novo.proposta_id} onChange={(e) => setNovo({ ...novo, proposta_id: e.target.value })} className={inputCls} style={inputSty}><option value="">—</option>{(propostas || []).filter((p) => p.status !== "excluido").map((p) => <option key={p.id} value={p.id}>{p.numero} · {p.nome}</option>)}</select></Campo>
        <button type="submit" className="font-body text-sm font-bold px-4 py-2.5 rounded-xl text-white" style={{ background: F.blue }}>Adicionar</button>
      </form>
      <div className="flex flex-col gap-2">
        {lista.map((l) => {
          const atrasado = !l.concluido && new Date(l.data_hora) < agora;
          const prop = (propostas || []).find((p) => p.id === l.proposta_id);
          return (
            <div key={l.id} className="rounded-2xl border p-3.5 flex items-center gap-3" style={{ borderColor: atrasado ? "#F2C4B8" : F.line, background: atrasado ? "#FFF8F6" : "#fff" }}>
              <input type="checkbox" checked={l.concluido} onChange={() => alternar(l)} className="w-4 h-4 accent-green-600" />
              <div className="flex-1 min-w-0">
                <p className={`font-body text-sm font-semibold ${l.concluido ? "line-through" : ""}`} style={{ color: F.ink }}>{l.titulo}</p>
                <p className="font-body text-[11px]" style={{ color: atrasado ? F.danger : F.muted }}>{atrasado ? "Atrasado · " : ""}{dataHoraBR(l.data_hora)}{prop ? ` · ${prop.numero} ${prop.nome}` : ""}</p>
              </div>
              <button onClick={() => baixarIcs(l)} title="Adicionar à agenda do celular" className="p-1.5 rounded-lg border" style={{ borderColor: F.line }}><Calendar size={13} color={F.blue} /></button>
              <button onClick={() => apagar(l)} title="Excluir" className="p-1.5 rounded-lg border" style={{ borderColor: F.line }}><Trash2 size={13} color={F.danger} /></button>
            </div>
          );
        })}
        {!lista.length && <p className="font-body text-sm" style={{ color: F.soft }}>Nenhum lembrete.</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Configurações + permissões + acessos
function AbaConfig({ config, setConfig, agentes, setAgentes, avisar, podeGerir }) {
  const [f, setF] = useState(config || CONFIG_PADRAO);
  useEffect(() => { if (config) setF(config); }, [config]);
  const [novoAg, setNovoAg] = useState({ nome: "", whatsapp: "", email: "", papel: "agente" });
  const [acessos, setAcessos] = useState(null);

  useEffect(() => {
    if (!supabaseConfigurado || !podeGerir) return;
    supabase.from("fomento_acessos").select("*").order("criado_em", { ascending: false }).limit(50).then(({ data }) => setAcessos(data || []));
  }, [podeGerir]);

  if (!podeGerir) return <Aviso>Somente o gestor do módulo pode alterar as configurações.</Aviso>;

  const salvarConfig = async () => {
    const dados = { ativo: f.ativo, mostrar_resumo: f.mostrar_resumo !== false, whatsapp_oficial: f.whatsapp_oficial, agente_nome: f.agente_nome, titulo: f.titulo, texto_intro: f.texto_intro, link_oficial: f.link_oficial, aviso_simulacao: f.aviso_simulacao, atualizado_em: new Date().toISOString() };
    if (supabaseConfigurado) { const { error } = await supabase.from("fomento_config").update(dados).eq("id", 1); if (error) { avisar(error.message, "erro"); return; } }
    setConfig({ ...config, ...dados });
    avisar("Configurações salvas.");
  };

  const adicionarAgente = async (e) => {
    e.preventDefault();
    if (!novoAg.nome.trim()) return;
    let user_id = null;
    if (supabaseConfigurado && novoAg.email.trim()) {
      // Vincula a uma conta JÁ existente do Conecta Comércio (não cria usuário novo).
      const { data } = await supabase.rpc("fomento_buscar_usuario", { p_email: novoAg.email.trim() });
      if (!data) { avisar("Nenhuma conta com esse e-mail. Peça para a pessoa se cadastrar no site primeiro.", "erro"); return; }
      user_id = data;
    }
    const reg = { nome: novoAg.nome.trim(), whatsapp: novoAg.whatsapp.trim() || null, papel: novoAg.papel, ativo: true, user_id };
    if (!supabaseConfigurado) { setAgentes((l) => [...l, { ...reg, id: `demo-${Date.now()}` }]); setNovoAg({ nome: "", whatsapp: "", email: "", papel: "agente" }); return; }
    const { data, error } = await supabase.from("fomento_agentes").insert(reg).select().single();
    if (error) { avisar(error.message, "erro"); return; }
    setAgentes((l) => [...l, data]);
    setNovoAg({ nome: "", whatsapp: "", email: "", papel: "agente" });
    avisar("Agente adicionado.");
  };
  const atualizarAgente = async (a, mud) => {
    if (supabaseConfigurado) { const { error } = await supabase.from("fomento_agentes").update(mud).eq("id", a.id); if (error) { avisar(error.message, "erro"); return; } }
    setAgentes((l) => l.map((x) => (x.id === a.id ? { ...x, ...mud } : x)));
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Titulo eyebrow="Configurações" title="Área pública e contato" />
        <div className="rounded-2xl border p-5 grid sm:grid-cols-2 gap-3" style={{ borderColor: F.line }}>
          <Campo label="WhatsApp oficial do Agente"><input value={f.whatsapp_oficial || ""} onChange={(e) => setF({ ...f, whatsapp_oficial: e.target.value })} placeholder="44999999999" className={inputCls} style={inputSty} /></Campo>
          <Campo label="Nome do Agente de Crédito"><input value={f.agente_nome || ""} onChange={(e) => setF({ ...f, agente_nome: e.target.value })} className={inputCls} style={inputSty} /></Campo>
          <Campo label="Texto de apresentação" className="sm:col-span-2"><textarea rows={2} value={f.texto_intro || ""} onChange={(e) => setF({ ...f, texto_intro: e.target.value })} className={inputCls} style={inputSty} /></Campo>
          <Campo label="Link oficial da Fomento Paraná"><input value={f.link_oficial || ""} onChange={(e) => setF({ ...f, link_oficial: e.target.value })} className={inputCls} style={inputSty} /></Campo>
          <Campo label="Seção pública"><label className="flex items-center gap-2 h-10 font-body text-sm"><input type="checkbox" checked={f.ativo !== false} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> Visível no site</label></Campo>
          <Campo label="Painel de crédito público"><label className="flex items-center gap-2 h-10 font-body text-sm"><input type="checkbox" checked={f.mostrar_resumo !== false} onChange={(e) => setF({ ...f, mostrar_resumo: e.target.checked })} /> Mostrar totais (propostas, concedidas, recusadas, valores e taxa)</label></Campo>
          <Campo label="Aviso do simulador" className="sm:col-span-2"><textarea rows={2} value={f.aviso_simulacao || ""} onChange={(e) => setF({ ...f, aviso_simulacao: e.target.value })} className={inputCls} style={inputSty} /></Campo>
          <button onClick={salvarConfig} className="sm:col-span-2 glow-btn font-body text-sm font-bold text-white rounded-xl py-2.5" style={{ background: F.blue }}>Salvar configurações</button>
        </div>
      </div>

      <div>
        <Titulo eyebrow="Permissões" title="Equipe do Fomento" sub="Agentes aparecem no ranking. Com e-mail, a conta do Conecta Comércio ganha acesso a este painel (sem virar admin do site)." />
        <form onSubmit={adicionarAgente} className="rounded-2xl border p-4 grid sm:grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-end mb-3" style={{ borderColor: F.line }}>
          <Campo label="Nome"><input value={novoAg.nome} onChange={(e) => setNovoAg({ ...novoAg, nome: e.target.value })} className={inputCls} style={inputSty} /></Campo>
          <Campo label="WhatsApp"><input value={novoAg.whatsapp} onChange={(e) => setNovoAg({ ...novoAg, whatsapp: e.target.value })} className={inputCls} style={inputSty} /></Campo>
          <Campo label="E-mail da conta (opcional)"><input type="email" value={novoAg.email} onChange={(e) => setNovoAg({ ...novoAg, email: e.target.value })} className={inputCls} style={inputSty} /></Campo>
          <Campo label="Papel"><select value={novoAg.papel} onChange={(e) => setNovoAg({ ...novoAg, papel: e.target.value })} className={inputCls} style={inputSty}><option value="agente">Agente</option><option value="gestor">Gestor</option></select></Campo>
          <button type="submit" className="font-body text-sm font-bold px-4 py-2.5 rounded-xl text-white" style={{ background: F.blue }}>Adicionar</button>
        </form>
        <div className="flex flex-col gap-2">
          {(agentes || []).map((a) => (
            <div key={a.id} className="rounded-xl border p-3 flex items-center gap-3 flex-wrap" style={{ borderColor: F.line, opacity: a.ativo ? 1 : 0.55 }}>
              <Users size={15} color={F.blue} />
              <p className="font-body text-sm font-semibold flex-1" style={{ color: F.ink }}>{a.nome} <span className="text-[11px] font-normal" style={{ color: F.muted }}>{a.user_id ? "· com acesso ao painel" : "· só ranking"}</span></p>
              <select value={a.papel} onChange={(e) => atualizarAgente(a, { papel: e.target.value })} className="font-body text-xs border rounded-lg px-2 py-1" style={inputSty}><option value="agente">Agente</option><option value="gestor">Gestor</option></select>
              <button onClick={() => atualizarAgente(a, { ativo: !a.ativo })} className="font-body text-[11px] font-bold px-2 py-1 rounded-lg border" style={{ borderColor: F.line, color: a.ativo ? F.danger : F.green }}>{a.ativo ? "Desativar" : "Reativar"}</button>
            </div>
          ))}
        </div>
      </div>

      {supabaseConfigurado && (
        <div>
          <Titulo eyebrow="LGPD" title="Registro de acessos" sub="Últimos 50 acessos ao painel e a dados pessoais." />
          <div className="rounded-2xl border divide-y max-h-72 overflow-y-auto" style={{ borderColor: F.line }}>
            {(acessos || []).map((a) => <p key={a.id} className="font-body text-xs px-3 py-2 flex justify-between gap-2" style={{ color: F.ink, borderColor: F.line }}><span>{a.acao.replace(/_/g, " ")}{a.referencia ? ` · ${String(a.referencia).slice(0, 8)}` : ""} · <span style={{ color: F.soft }}>{String(a.usuario_id || "").slice(0, 8)}</span></span><span style={{ color: F.soft }}>{dataHoraBR(a.criado_em)}</span></p>)}
            {acessos && !acessos.length && <p className="font-body text-xs px-3 py-2" style={{ color: F.soft }}>Nenhum acesso registrado.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
