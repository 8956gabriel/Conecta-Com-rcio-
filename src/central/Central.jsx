// =============================================================================
// CENTRAL DE PROSPECÇÃO E INTELIGÊNCIA COMERCIAL DO AGENTE DE CRÉDITO
// Módulo do Fomento Paraná dentro do Conecta Comércio. Usa as tabelas
// existentes (fomento_propostas, fomento_linhas, fomento_interesses) e as
// tabelas novas fomento_cp_* (carteira, atendimentos, visitas, campanhas...).
// =============================================================================
import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, CalendarDays, Lightbulb, Library, Users, Radar as RadarIcon, Target, Layers, Megaphone, Sparkles,
  CalendarClock, Map as MapIcon, MessagesSquare, Calculator, FileText, BadgeCheck, Trophy, BarChart3, Bot, Bell,
  UserPlus, Search, Upload, Download, MessageSquarePlus, CalendarPlus, FilePlus2, ChevronRight, Phone, Clock, X,
  AlertTriangle, TrendingUp, HandCoins, CheckCircle2, Wallet,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, CartesianGrid, Cell } from "recharts";
import { supabase, supabaseConfigurado } from "../supabaseClient";
import { C, Titulo, Btn, Card, KPI, Aviso, Chip, Vazio, Selo, Modal, Campos, inputCls, inputSty, BtnWhats, chamarIA, Texto } from "./ui.jsx";
import { useCentralDados, ModalCliente, ModalAtendimento, ModalVisita, ModalProposta, msgErro, SITUACAO_PROPOSTA } from "./acoes.jsx";
import { STATUS_CLIENTE, FUNIL, CATEGORIAS, ORIGENS, ATIVIDADES, PUBLICOS, montarMensagem } from "./dados.js";
import { indicadores, serieMensal, radar, GRUPOS_RADAR, gerarDia, hojeISO, dataBR, moeda, diasEntre, isoData, agrupar, zap, soDigitos, MES_NOME, metaRealizado, INDICADORES_META } from "./motor.js";
import { AbaCalendario, AbaIdeiasDiarias, AbaBancoIdeias, AbaCampanhas, AbaGeradorCampanha } from "./Planejamento.jsx";
import { AbaEstrategias, AbaSegmentos, AbaAgenda, AbaMapa, AbaAbordagens, AbaSimulador } from "./Campo.jsx";
import { AbaPropostasCentral, AbaConcessoes, AbaMetas, AbaRelatorios, AbaAssistente } from "./Resultados.jsx";

export const ABAS_CENTRAL = [
  { g: "Visão geral", itens: [
    { id: "dashboard", label: "Dashboard comercial", icon: LayoutDashboard },
    { id: "radar", label: "Radar de oportunidades", icon: RadarIcon },
    { id: "assistente", label: "Assistente inteligente", icon: Bot },
  ] },
  { g: "Planejamento", itens: [
    { id: "calendario", label: "Calendário anual", icon: CalendarDays },
    { id: "hoje", label: "Ideias diárias", icon: Lightbulb },
    { id: "ideias", label: "Banco de ideias", icon: Library },
    { id: "campanhas", label: "Campanhas comerciais", icon: Megaphone },
    { id: "gerador", label: "Gerador de campanhas (IA)", icon: Sparkles },
  ] },
  { g: "Clientes e campo", itens: [
    { id: "carteira", label: "Carteira de clientes", icon: Users },
    { id: "segmentos", label: "Prospecção por segmento", icon: Layers },
    { id: "estrategias", label: "Estratégias por linha", icon: Target },
    { id: "agenda", label: "Agenda de visitas", icon: CalendarClock },
    { id: "mapa", label: "Mapa de prospecção", icon: MapIcon },
    { id: "abordagens", label: "Gerador de abordagens", icon: MessagesSquare },
    { id: "simulador", label: "Simulador de oportunidades", icon: Calculator },
  ] },
  { g: "Resultados", itens: [
    { id: "propostas", label: "Gestão de propostas", icon: FileText },
    { id: "concessoes", label: "Acompanhamento de concessões", icon: BadgeCheck },
    { id: "metas", label: "Metas e desafios", icon: Trophy },
    { id: "relatorios", label: "Relatórios comerciais", icon: BarChart3 },
  ] },
];
const TODAS = ABAS_CENTRAL.flatMap((g) => g.itens);

export default function CentralProspeccao(ctx) {
  const [aba, setAba] = useState(() => { try { return sessionStorage.getItem("central-aba") || "dashboard"; } catch { return "dashboard"; } });
  const [param, setParam] = useState(null);
  const { d, setD, carregar, salvar, apagar, recarregarCliente, erroBanco } = useCentralDados(true);
  const [modal, setModal] = useState(null);
  const [alertasAbertos, setAlertasAbertos] = useState(false);
  const irPara = (id, p = null) => { setAba(id); setParam(p); try { sessionStorage.setItem("central-aba", id); } catch { /* */ } window.scrollTo({ top: 0, behavior: "smooth" }); };

  const agente = ctx.config?.agente_nome || (ctx.agentes || [])[0]?.nome || "Agente de Crédito";
  const cfgCentral = { rotina: null, alertas: {}, ...(ctx.config?.central_config || {}) };
  const K = useMemo(() => d && ({
    ...ctx, d, setD, salvar, apagar, recarregarCliente, carregar, agente, irPara, param, cfgCentral,
    abrir: (tipo, dados) => setModal({ tipo, dados }),
  }), [d, ctx.propostas, ctx.linhas, ctx.interesses, ctx.config, param, agente]);

  const alertas = useMemo(() => (K ? calcularAlertas(K) : []), [K]);

  useEffect(() => { // notificação do navegador (quando permitido) para visitas da próxima hora
    if (!K || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const t = setInterval(() => {
      const agora = Date.now();
      for (const v of K.d.visitas.filter((x) => x.status === "agendada" && x.lembrete)) {
        const ms = new Date(v.data_hora) - agora;
        const chave = `notif-visita-${v.id}`;
        if (ms > 0 && ms < 60 * 6e4 && !sessionStorage.getItem(chave)) { sessionStorage.setItem(chave, "1"); new Notification("Visita em breve", { body: `${v.nome || "Visita"} às ${new Date(v.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` }); }
      }
    }, 60000);
    return () => clearInterval(t);
  }, [K]);

  if (!d) return <div className="py-16 text-center font-body text-sm" style={{ color: C.muted }}><span className="w-9 h-9 rounded-full border-4 border-t-transparent animate-spin inline-block mb-2" style={{ borderColor: C.blueTint, borderTopColor: C.blueHex }} /><br />Carregando a Central de Prospecção...</div>;

  const fechar = (tipo) => (r) => { setModal(null); if (tipo === "novoCliente" && r?.id && modal?.dados?.depois) modal.dados.depois(r); };
  const atual = TODAS.find((i) => i.id === aba) || TODAS[0];
  const props = { K };

  return (
    <div className="min-w-0">
      {/* Cabeçalho da Central */}
      <div className="rounded-2xl p-4 mb-4 relative overflow-hidden" style={{ background: `linear-gradient(120deg, ${C.blueDeep}, ${C.blue})` }}>
        <span aria-hidden className="absolute -right-6 -top-8 w-32 h-32 rounded-full" style={{ background: "rgba(245,183,0,0.28)" }} />
        <div className="relative flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="font-body text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: C.yellow }}>Central de Prospecção e Inteligência Comercial</p>
            <p className="font-display text-lg md:text-xl font-extrabold text-white flex items-center gap-2"><atual.icon size={20} /> {atual.label}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Btn small tipo="amarelo" icon={UserPlus} onClick={() => K.abrir("cliente", null)}>Novo cliente</Btn>
            <Btn small tipo="claro" icon={MessageSquarePlus} onClick={() => K.abrir("atendimento", {})}>Atendimento</Btn>
            <Btn small tipo="claro" icon={CalendarPlus} onClick={() => K.abrir("visita", {})}>Visita</Btn>
            <button onClick={() => setAlertasAbertos(true)} className="relative w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.16)" }} title="Alertas">
              <Bell size={17} color="#fff" />
              {alertas.length > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full font-body text-[10px] font-bold flex items-center justify-center" style={{ background: C.yellow, color: "#2B1F00" }}>{alertas.length}</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Navegação das 19 abas, agrupadas */}
      <nav className="mb-5 space-y-2">
        {ABAS_CENTRAL.map((g) => (
          <div key={g.g} className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="font-body text-[10px] font-bold uppercase tracking-wider shrink-0 w-24 hidden lg:block" style={{ color: C.soft }}>{g.g}</span>
            {g.itens.map((it) => {
              const on = aba === it.id; const I = it.icon;
              return (
                <button key={it.id} onClick={() => irPara(it.id)} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-body text-xs font-bold border transition"
                  style={{ background: on ? C.blue : "#fff", color: on ? "#fff" : "#425A70", borderColor: on ? C.blue : C.line, boxShadow: on ? `0 0 0 2px ${C.yellow}` : "none" }}>
                  <I size={13} /> {it.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {erroBanco && <div className="mb-4"><Aviso tipo="erro">{msgErro({ message: erroBanco })}</Aviso></div>}
      {!supabaseConfigurado && <div className="mb-4"><Aviso>Modo demonstração: os dados não são salvos.</Aviso></div>}

      {aba === "dashboard" && <AbaDashboard {...props} />}
      {aba === "radar" && <AbaRadar {...props} />}
      {aba === "assistente" && <AbaAssistente {...props} />}
      {aba === "calendario" && <AbaCalendario {...props} />}
      {aba === "hoje" && <AbaIdeiasDiarias {...props} />}
      {aba === "ideias" && <AbaBancoIdeias {...props} />}
      {aba === "campanhas" && <AbaCampanhas {...props} />}
      {aba === "gerador" && <AbaGeradorCampanha {...props} />}
      {aba === "carteira" && <AbaCarteira {...props} />}
      {aba === "segmentos" && <AbaSegmentos {...props} />}
      {aba === "estrategias" && <AbaEstrategias {...props} />}
      {aba === "agenda" && <AbaAgenda {...props} />}
      {aba === "mapa" && <AbaMapa {...props} />}
      {aba === "abordagens" && <AbaAbordagens {...props} />}
      {aba === "simulador" && <AbaSimulador {...props} />}
      {aba === "propostas" && <AbaPropostasCentral {...props} />}
      {aba === "concessoes" && <AbaConcessoes {...props} />}
      {aba === "metas" && <AbaMetas {...props} />}
      {aba === "relatorios" && <AbaRelatorios {...props} />}

      {modal?.tipo === "cliente" && <ModalCliente K={K} cliente={modal.dados?.id ? modal.dados : null} inicial={modal.dados?.id ? null : modal.dados} onFechar={(r) => { const dep = modal.dados?.depois; setModal(null); if (r?.id && dep) dep(r); }} />}
      {modal?.tipo === "atendimento" && <ModalAtendimento K={K} inicial={modal.dados} onFechar={() => setModal(null)} />}
      {modal?.tipo === "visita" && <ModalVisita K={K} visita={modal.dados?.id ? modal.dados : null} inicial={modal.dados?.id ? null : modal.dados} onFechar={() => setModal(null)} />}
      {modal?.tipo === "proposta" && <ModalProposta K={K} proposta={modal.dados?.id ? modal.dados : null} inicial={modal.dados?.id ? null : modal.dados} onFechar={() => setModal(null)} />}
      {alertasAbertos && <PainelAlertas K={K} alertas={alertas} onFechar={() => setAlertasAbertos(false)} />}
    </div>
  );
}

// ============================================================================= ALERTAS
const ALERTAS_PADRAO = { visitas: true, sem_retorno: true, documentos: true, propostas: true, campanhas: true, metas: true, atrasadas: true, dias_parada: 15 };
function calcularAlertas(K) {
  const cfg = { ...ALERTAS_PADRAO, ...(K.cfgCentral.alertas || {}), ...lerLocal("central-alertas") };
  const hoje = hojeISO(), agora = new Date();
  const out = [];
  if (cfg.visitas) for (const v of K.d.visitas.filter((x) => x.status === "agendada" && x.lembrete)) {
    const dia = isoData(v.data_hora);
    if (dia === hoje || dia === isoData(new Date(Date.now() + 864e5))) out.push({ tipo: "visitas", txt: `Visita ${dia === hoje ? "hoje" : "amanhã"} às ${new Date(v.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}: ${v.nome || "—"}`, ir: ["agenda"] });
    else if (new Date(v.data_hora) < agora) out.push({ tipo: "atrasadas", txt: `Visita de ${dataBR(dia)} com ${v.nome || "—"} ainda sem resultado`, ir: ["agenda"] });
  }
  if (cfg.sem_retorno) { const n = K.d.clientes.filter((c) => c.proximo_contato && c.proximo_contato < hoje && !["perdido", "liberado"].includes(c.status)).length; if (n) out.push({ tipo: "sem_retorno", txt: `${n} cliente(s) com retorno atrasado`, ir: ["radar"] }); }
  if (cfg.documentos) { const n = K.d.clientes.filter((c) => c.status === "documentacao").length + (K.propostas || []).filter((p) => p.pendencias && !["concedido", "negado", "excluido"].includes(p.status)).length; if (n) out.push({ tipo: "documentos", txt: `${n} caso(s) com documentação pendente`, ir: ["radar"] }); }
  if (cfg.propostas) { const n = (K.propostas || []).filter((p) => !["concedido", "negado", "excluido"].includes(p.status) && diasEntre(p.atualizado_em || p.criado_em) >= Number(cfg.dias_parada || 15)).length; if (n) out.push({ tipo: "propostas", txt: `${n} proposta(s) sem atualização há ${cfg.dias_parada}+ dias`, ir: ["propostas"] }); }
  if (cfg.campanhas) for (const c of K.d.campanhas.filter((x) => x.inicio && x.status !== "arquivada" && x.status !== "concluida")) { const n = -diasEntre(c.inicio); if (n >= 0 && n <= 7) out.push({ tipo: "campanhas", txt: `Campanha "${c.nome}" começa ${n === 0 ? "hoje" : `em ${n} dia(s)`}`, ir: ["campanhas"] }); }
  if (cfg.metas && [4, 5].includes(agora.getDay())) for (const m of K.d.metas.filter((x) => x.ativo && x.periodo === "semana")) { const r = metaRealizado(m, { ...K.d, propostas: K.propostas, interesses: K.interesses }); if (r.pct < 50) out.push({ tipo: "metas", txt: `Meta semanal de ${INDICADORES_META[m.indicador].toLowerCase()} em ${r.pct}% (${r.realizado}/${m.alvo})`, ir: ["metas"] }); }
  if (cfg.atrasadas) { const pend = []; for (let i = 1; i <= 5; i++) { const dia = isoData(new Date(Date.now() - i * 864e5)); const reg = K.d.dias.find((x) => x.data === dia); const dw = new Date(`${dia}T12:00`).getDay(); if (dw > 0 && dw < 6 && (!reg || reg.status === "pendente")) pend.push(dia); } if (pend.length) out.push({ tipo: "atrasadas", txt: `${pend.length} ação(ões) do calendário sem conclusão nos últimos dias úteis`, ir: ["calendario", pend[pend.length - 1]] }); }
  return out;
}
const lerLocal = (k) => { try { return JSON.parse(localStorage.getItem(k) || "{}"); } catch { return {}; } };

function PainelAlertas({ K, alertas, onFechar }) {
  const [cfg, setCfg] = useState({ ...ALERTAS_PADRAO, ...(K.cfgCentral.alertas || {}), ...lerLocal("central-alertas") });
  const [perm, setPerm] = useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  const salvarCfg = async (novo) => {
    setCfg(novo);
    try { localStorage.setItem("central-alertas", JSON.stringify(novo)); } catch { /* */ }
    if (supabaseConfigurado && K.podeGerir) {
      const cc = { ...(K.config?.central_config || {}), alertas: novo };
      const { error } = await supabase.from("fomento_modulo_config").update({ central_config: cc }).eq("id", 1);
      if (!error) K.setConfig((c) => ({ ...c, central_config: cc }));
    }
  };
  const nomes = { visitas: "Visitas agendadas", sem_retorno: "Clientes sem retorno", documentos: "Documentos pendentes", propostas: "Propostas sem atualização", campanhas: "Campanhas próximas", metas: "Metas não atingidas", atrasadas: "Atividades atrasadas" };
  return (
    <Modal aberto onFechar={onFechar} titulo={`Alertas (${alertas.length})`}>
      <div className="space-y-2">
        {alertas.length ? alertas.map((a, i) => (
          <button key={i} onClick={() => { onFechar(); K.irPara(...a.ir); }} className="w-full text-left rounded-xl border px-3 py-2.5 flex items-center gap-2 hover:bg-blue-50" style={{ borderColor: C.line }}>
            <AlertTriangle size={15} color={C.yellowInk} /><span className="font-body text-sm flex-1" style={{ color: C.ink }}>{a.txt}</span><ChevronRight size={15} color={C.soft} />
          </button>
        )) : <Aviso tipo="ok">Nenhum alerta agora. Tudo em dia! ✅</Aviso>}
      </div>
      <div className="mt-6 pt-4 border-t" style={{ borderColor: C.line }}>
        <p className="font-display font-bold text-sm mb-2" style={{ color: C.ink }}>Configurar notificações e lembretes</p>
        <div className="grid sm:grid-cols-2 gap-1.5">
          {Object.entries(nomes).map(([k, n]) => <label key={k} className="flex items-center gap-2 font-body text-sm"><input type="checkbox" checked={!!cfg[k]} onChange={(e) => salvarCfg({ ...cfg, [k]: e.target.checked })} /> {n}</label>)}
        </div>
        <label className="flex items-center gap-2 font-body text-sm mt-2">Proposta parada após <input type="number" min={3} value={cfg.dias_parada} onChange={(e) => salvarCfg({ ...cfg, dias_parada: Number(e.target.value) || 15 })} className={inputCls} style={{ ...inputSty, width: 80 }} /> dias</label>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {perm === "granted" ? <Aviso tipo="ok">Notificações do navegador ativadas (avisa 1h antes das visitas enquanto o painel estiver aberto).</Aviso>
            : perm !== "unsupported" && <Btn small tipo="fantasma" icon={Bell} onClick={async () => setPerm(await Notification.requestPermission())}>Ativar notificações do navegador</Btn>}
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================= DASHBOARD
function periodoDe(p) {
  const h = new Date(); const y = h.getFullYear();
  if (p === "mes") return { de: `${hojeISO().slice(0, 7)}-01`, ate: hojeISO(), rot: `${MES_NOME[h.getMonth()]} de ${y}` };
  if (p === "ano") return { de: `${y}-01-01`, ate: `${y}-12-31`, rot: String(y) };
  if (p === "ciclo") { const ini = h.getMonth() >= 10 ? y : y - 1; return { de: `${ini}-11-01`, ate: `${ini + 1}-10-31`, rot: `Ciclo nov/${ini} – out/${ini + 1}` }; }
  return { de: null, ate: null, rot: "Todo o período" };
}
const CORES = ["#0A5AA8", "#F5B700", "#1E8E5A", "#7C3AED", "#C2410C", "#0891B2", "#DB2777", "#5C7186"];

function AbaDashboard({ K }) {
  const [per, setPer] = useState("mes");
  const p = periodoDe(per);
  const dados = { ...K.d, propostas: K.propostas || [], interesses: K.interesses || [] };
  const k = indicadores(dados, p);
  const ano = new Date().getFullYear();
  const serie = useMemo(() => serieMensal(dados, ano), [K.d, K.propostas]);
  const pv = (K.propostas || []).filter((x) => x.status !== "excluido" && (!p.de || String(x.data_proposta || x.criado_em).slice(0, 10) >= p.de) && (!p.ate || String(x.data_proposta || x.criado_em).slice(0, 10) <= p.ate));
  const cliPorId = Object.fromEntries(K.d.clientes.map((c) => [c.id, c]));
  const porSegmento = agrupar(pv, (x) => cliPorId[x.cliente_id]?.atividade || "Sem vínculo com a carteira").slice(0, 8);
  const porCampanha = agrupar(pv.filter((x) => x.campanha_id), (x) => K.d.campanhas.find((c) => c.id === x.campanha_id)?.nome).slice(0, 8);
  const porLinha = Object.values(pv.reduce((m, x) => { const n = K.nomeLinha(x.linha_id, x.linha_fomentonet); m[n] = m[n] || { nome: n, propostas: 0, aprovadas: 0, valor: 0 }; m[n].propostas++; if (x.status === "concedido") { m[n].aprovadas++; m[n].valor += Number(x.valor_liberado || x.valor_contratado || x.valor_concedido || x.valor_solicitado || 0); } return m; }, {})).sort((a, b) => b.propostas - a.propostas).slice(0, 8);
  const funil = [["Prospectados", k.prospectados], ["Interessados", k.interessados], ["Qualificados", k.qualificados], ["Propostas", k.propostasIniciadas], ["Aprovadas", k.aprovadas], ["Contratos", k.contratos], ["Liberados", k.liberados]];
  const dia = gerarDia(hojeISO(), { linhas: K.linhas, agente: K.agente, datasLocais: K.d.datas, ajustes: K.d.dias.find((x) => x.data === hojeISO())?.ajustes });
  const top = radar({ clientes: K.d.clientes, propostas: K.propostas, interesses: K.interesses, visitas: K.d.visitas }).slice(0, 5);
  const visHoje = K.d.visitas.filter((v) => isoData(v.data_hora) === hojeISO() && v.status === "agendada");

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2" style={{ borderColor: C.yellow, background: `linear-gradient(135deg, #fff, ${C.yellowTint})` }}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-body text-[11px] font-bold uppercase tracking-wide" style={{ color: C.yellowInk }}>🎯 Ação comercial de hoje · {dataBR(hojeISO())}</p>
            <Selo tipo="sistema" />
          </div>
          <p className="font-display font-extrabold text-lg mt-1" style={{ color: C.ink }}>{dia.tema}</p>
          <p className="font-body text-sm mt-1" style={{ color: C.muted }}><b>Foco do dia:</b> {dia.foco} · <b>Meta:</b> {dia.meta}</p>
          <p className="font-body text-sm mt-1" style={{ color: C.muted }}><b>Onde encontrar:</b> {dia.onde}</p>
          <div className="flex gap-2 mt-3 flex-wrap">
            <Btn small icon={ChevronRight} onClick={() => K.irPara("hoje")}>Ver roteiro completo</Btn>
            <Btn small tipo="claro" icon={UserPlus} onClick={() => K.abrir("cliente", { atividade: dia.segmento, categoria: dia.categoria, origem: "visita" })}>Cadastrar cliente</Btn>
          </div>
        </Card>
        <Card>
          <p className="font-body text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: C.muted }}>📅 Visitas de hoje ({visHoje.length})</p>
          {visHoje.length ? visHoje.slice(0, 4).map((v) => (
            <button key={v.id} onClick={() => K.abrir("visita", v)} className="w-full text-left font-body text-sm py-1.5 border-b last:border-0 flex gap-2" style={{ borderColor: C.line }}>
              <b style={{ color: C.blueHex }}>{new Date(v.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</b> {v.nome}
            </button>
          )) : <p className="font-body text-sm" style={{ color: C.soft }}>Nenhuma visita agendada para hoje.</p>}
          <Btn small tipo="fantasma" className="mt-2" icon={CalendarPlus} onClick={() => K.abrir("visita", { data: hojeISO() })}>Agendar</Btn>
        </Card>
      </div>

      {top.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-2"><p className="font-display font-bold" style={{ color: C.ink }}>📡 Quem merece atenção hoje</p><Btn small tipo="fantasma" onClick={() => K.irPara("radar")}>Abrir radar</Btn></div>
          {top.map((r, i) => <ItemRadar key={i} r={r} K={K} compacto />)}
        </Card>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="font-display font-extrabold text-lg" style={{ color: C.ink }}>Indicadores · {p.rot}</p>
        <div className="flex gap-1.5 flex-wrap">{[["mes", "Mês"], ["ciclo", "Ciclo Fomento"], ["ano", "Ano"], ["tudo", "Tudo"]].map(([k2, l]) => <Chip key={k2} ativo={per === k2} onClick={() => setPer(k2)}>{l}</Chip>)}</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI titulo="Empreendedores cadastrados" valor={k.totalClientes} sub={`${k.novosMes} novos no mês`} icon={Users} />
        <KPI titulo="Novos clientes no período" valor={k.novosPeriodo} icon={UserPlus} />
        <KPI titulo="Clientes prospectados" valor={k.prospectados} icon={RadarIcon} />
        <KPI titulo="Visitas realizadas" valor={k.visitas} icon={MapIcon} />
        <KPI titulo="Atendimentos realizados" valor={k.atendimentos} icon={MessageSquarePlus} />
        <KPI titulo="Clientes interessados" valor={k.interessados} icon={Lightbulb} />
        <KPI titulo="Clientes qualificados" valor={k.qualificados} icon={CheckCircle2} />
        <KPI titulo="Propostas iniciadas" valor={k.propostasIniciadas} icon={FileText} />
        <KPI titulo="Propostas encaminhadas" valor={k.propostasEncaminhadas} icon={ChevronRight} />
        <KPI titulo="Propostas aprovadas" valor={k.aprovadas} cor={C.green} icon={BadgeCheck} />
        <KPI titulo="Contratos assinados" valor={k.contratos} cor={C.green} icon={HandCoins} />
        <KPI titulo="Créditos liberados" valor={k.liberados} cor={C.green} icon={Wallet} destaque />
        <KPI titulo="Valor solicitado" valor={moeda(k.valorSolicitado)} icon={TrendingUp} />
        <KPI titulo="Valor aprovado" valor={moeda(k.valorAprovado)} cor={C.green} icon={BadgeCheck} />
        <KPI titulo="Valor contratado" valor={moeda(k.valorContratado)} cor={C.green} icon={HandCoins} />
        <KPI titulo="Valor efetivamente liberado" valor={moeda(k.valorLiberado)} cor={C.green} icon={Wallet} destaque />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <p className="font-display font-bold mb-3" style={{ color: C.ink }}>Evolução mensal · {ano}</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={serie}><CartesianGrid strokeDasharray="3 3" stroke="#EEF3F8" /><XAxis dataKey="mes" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
              <Line dataKey="novos" name="Novos clientes" stroke="#0A5AA8" strokeWidth={2} /><Line dataKey="atendimentos" name="Atendimentos" stroke="#5C7186" /><Line dataKey="propostas" name="Propostas" stroke="#F5B700" strokeWidth={2} /><Line dataKey="aprovadas" name="Aprovadas" stroke="#1E8E5A" strokeWidth={2} /></LineChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <p className="font-display font-bold mb-3" style={{ color: C.ink }}>Conversão comercial</p>
          <div className="space-y-2">
            {funil.map(([n, v], i) => { const max = Math.max(1, funil[0][1]); return (
              <div key={n} className="flex items-center gap-2">
                <span className="font-body text-xs w-24 shrink-0" style={{ color: C.muted }}>{n}</span>
                <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ background: C.blueTint2 }}><div className="h-full rounded-lg flex items-center px-2 font-body text-[11px] font-bold text-white" style={{ width: `${Math.max(6, (100 * v) / max)}%`, background: i >= 4 ? C.green : i === 3 ? C.yellow : C.blueHex }}>{v}</div></div>
                <span className="font-body text-[11px] w-10 text-right" style={{ color: C.soft }}>{i ? `${funil[i - 1][1] ? Math.round((100 * v) / funil[i - 1][1]) : 0}%` : ""}</span>
              </div>); })}
          </div>
        </Card>
        <Card>
          <p className="font-display font-bold mb-3" style={{ color: C.ink }}>Propostas por segmento</p>
          {porSegmento.length ? <ResponsiveContainer width="100%" height={220}><BarChart data={porSegmento} layout="vertical" margin={{ left: 30 }}><XAxis type="number" allowDecimals={false} fontSize={11} /><YAxis type="category" dataKey="nome" width={130} fontSize={10} /><Tooltip /><Bar dataKey="total" name="Propostas" radius={[0, 6, 6, 0]}>{porSegmento.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}</Bar></BarChart></ResponsiveContainer> : <Vazio>Sem propostas no período.</Vazio>}
        </Card>
        <Card>
          <p className="font-display font-bold mb-3" style={{ color: C.ink }}>Desempenho por linha de crédito</p>
          {porLinha.length ? <ResponsiveContainer width="100%" height={220}><BarChart data={porLinha} layout="vertical" margin={{ left: 30 }}><XAxis type="number" allowDecimals={false} fontSize={11} /><YAxis type="category" dataKey="nome" width={130} fontSize={10} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="propostas" name="Propostas" fill="#0A5AA8" radius={[0, 6, 6, 0]} /><Bar dataKey="aprovadas" name="Aprovadas" fill="#1E8E5A" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer> : <Vazio>Sem propostas no período.</Vazio>}
        </Card>
        <Card className="lg:col-span-2">
          <p className="font-display font-bold mb-3" style={{ color: C.ink }}>Resultados por campanha</p>
          {porCampanha.length ? <ResponsiveContainer width="100%" height={200}><BarChart data={porCampanha}><XAxis dataKey="nome" fontSize={10} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="total" name="Propostas" fill="#F5B700" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <Vazio>Nenhuma proposta vinculada a campanha no período. Vincule a campanha ao criar a proposta.</Vazio>}
        </Card>
      </div>
    </div>
  );
}

// ============================================================================= RADAR
function ItemRadar({ r, K, compacto }) {
  const cli = r.tipo === "cliente" ? K.d.clientes.find((c) => c.id === r.id) : null;
  const prop = r.tipo === "proposta" ? (K.propostas || []).find((p) => p.id === r.id) : null;
  const int = r.tipo === "interesse" ? (K.interesses || []).find((i) => i.id === r.id) : null;
  const cor = { alta: C.danger, media: C.yellowInk, baixa: C.muted }[r.prioridade];
  const zapN = cli?.whatsapp || prop?.whatsapp || int?.whatsapp;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0" style={{ borderColor: C.line }}>
      <span className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: cor }} />
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-bold truncate" style={{ color: C.ink }}>{r.nome} {r.sub && <span className="font-normal" style={{ color: C.soft }}>· {r.sub}</span>}</p>
        <p className="font-body text-xs" style={{ color: C.muted }}>{r.motivo}</p>
        <p className="font-body text-xs font-semibold" style={{ color: C.blueHex }}>➜ {r.acao}</p>
      </div>
      <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
        {zapN && <BtnWhats numero={zapN} rotulo="" texto={montarMensagem(r.grupo === "documentacao" ? "documentacao" : r.grupo === "paradas" ? "proposta" : r.grupo === "desistentes" ? "recuperar" : r.grupo === "novos" ? "pos" : cli?.ultimo_contato ? "recuperar" : "primeiro", { nome: r.nome, categoria: cli?.categoria, atividade: cli?.atividade, investimento: cli?.necessidade, agente: K.agente, pendencias: prop?.pendencias })} />}
        {cli && <Btn small tipo="claro" onClick={() => K.abrir("cliente", cli)}>Abrir</Btn>}
        {cli && !compacto && <Btn small tipo="fantasma" onClick={() => K.abrir("atendimento", { cliente_id: cli.id })}>Registrar</Btn>}
        {prop && <Btn small tipo="claro" onClick={() => K.abrir("proposta", prop)}>Abrir</Btn>}
        {int && <Btn small tipo="amarelo" onClick={() => K.abrir("cliente", { nome: int.nome, whatsapp: int.whatsapp, cidade: int.cidade || "Ivatuba", linha_id: int.linha_id, valor_pretendido: int.valor_desejado, necessidade: int.mensagem, origem: "site", status: "interessado", interesse_id: int.id, consentimento_lgpd: !!int.consentimento_lgpd })}>Trazer p/ carteira</Btn>}
      </div>
    </div>
  );
}

function AbaRadar({ K }) {
  const itens = useMemo(() => radar({ clientes: K.d.clientes, propostas: K.propostas, interesses: (K.interesses || []).filter((i) => !K.d.clientes.some((c) => c.interesse_id === i.id || (c.zap_digitos && c.zap_digitos === zap(i.whatsapp)))), visitas: K.d.visitas }), [K.d, K.propostas, K.interesses]);
  const [grupo, setGrupo] = useState("todos");
  const [ia, setIa] = useState({ txt: "", carregando: false, erro: "" });
  const lista = grupo === "todos" ? itens : itens.filter((i) => i.grupo === grupo);
  const pedirIA = async () => {
    setIa({ txt: "", carregando: true, erro: "" });
    try {
      const contexto = itens.slice(0, 60).map((i) => `- [${i.prioridade}] ${i.nome.split(" ")[0]} (${i.sub || i.tipo}): ${i.motivo}`).join("\n");
      setIa({ txt: await chamarIA({ modo: "radar", pedido: "Quais clientes devo acompanhar hoje e por quê?", contexto }), carregando: false, erro: "" });
    } catch (e) { setIa({ txt: "", carregando: false, erro: e.message }); }
  };
  return (
    <div>
      <Titulo eyebrow="Radar" title="Radar de oportunidades" sub="Calculado a partir da carteira, propostas e pré-cadastros reais. Prioridade: vermelho = alta, amarelo = média, cinza = baixa."
        direita={<Btn tipo="amarelo" icon={Sparkles} onClick={pedirIA} disabled={ia.carregando || !itens.length}>{ia.carregando ? "Analisando..." : "Sugestão da IA para hoje"}</Btn>} />
      {(ia.txt || ia.erro) && <Card className="mb-4" style={{ borderColor: C.yellow }}>{ia.erro ? <Aviso tipo={/chave/i.test(ia.erro) ? "amarelo" : "erro"}>{ia.erro}</Aviso> : <><Selo tipo="ia" /><Texto className="mt-2">{ia.txt}</Texto></>}</Card>}
      <div className="flex gap-1.5 flex-wrap mb-4">
        <Chip ativo={grupo === "todos"} onClick={() => setGrupo("todos")}>Todos ({itens.length})</Chip>
        {Object.entries(GRUPOS_RADAR).map(([k, n]) => { const q = itens.filter((i) => i.grupo === k).length; return <Chip key={k} ativo={grupo === k} onClick={() => setGrupo(k)}>{n} ({q})</Chip>; })}
      </div>
      <Card>{lista.length ? lista.map((r, i) => <ItemRadar key={`${r.tipo}-${r.id}-${r.grupo}-${i}`} r={r} K={K} />) : <Vazio>Nenhuma oportunidade neste grupo. Cadastre clientes e registre atendimentos para alimentar o radar.</Vazio>}</Card>
    </div>
  );
}

// ============================================================================= CARTEIRA
const LISTAS = {
  todos: ["Todos", () => true],
  sem_contato: ["Nunca contatados", (c) => !c.ultimo_contato && c.status !== "perdido"],
  atrasados: ["Retorno atrasado", (c) => c.proximo_contato && c.proximo_contato < hojeISO() && !["perdido", "liberado"].includes(c.status)],
  quentes: ["Interessados e qualificados", (c) => ["interessado", "qualificado", "atendimento"].includes(c.status)],
  documentacao: ["Documentação/proposta", (c) => ["documentacao", "elaboracao", "analise"].includes(c.status)],
  ganhos: ["Aprovados/liberados", (c) => ["aprovado", "contratado", "liberado"].includes(c.status)],
  sem_visita: ["Ainda não visitados", (c) => !c.visitado && c.status !== "perdido"],
  perdidos: ["Perdidos/desistentes", (c) => c.status === "perdido"],
};
function AbaCarteira({ K }) {
  const [f, setF] = useState({ busca: "", lista: "todos", status: "", categoria: "", origem: "", linha: "", ...(K.param || {}) });
  const [importar, setImportar] = useState(false);
  const lista = K.d.clientes.filter((c) => LISTAS[f.lista][1](c)
    && (!f.status || c.status === f.status) && (!f.categoria || c.categoria === f.categoria) && (!f.origem || c.origem === f.origem) && (!f.linha || c.linha_id === f.linha)
    && (!f.busca || `${c.nome} ${c.empresa || ""} ${c.atividade || ""} ${c.bairro || ""} ${c.whatsapp || ""}`.toLowerCase().includes(f.busca.toLowerCase())))
    .sort((a, b) => (a.proximo_contato || "9999").localeCompare(b.proximo_contato || "9999") || b.criado_em.localeCompare(a.criado_em));
  const sel = (k, op, vazio) => <select value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={inputCls} style={{ ...inputSty, width: "auto" }}><option value="">{vazio}</option>{op.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>;
  return (
    <div>
      <Titulo eyebrow="Carteira inteligente" title={`Carteira de clientes (${K.d.clientes.length})`} sub="Cadastro único: os pré-cadastros do site, as propostas e as visitas se ligam ao mesmo cliente, sem duplicar."
        direita={<><Btn tipo="claro" icon={Upload} onClick={() => setImportar(true)}>Importar</Btn><Btn icon={UserPlus} onClick={() => K.abrir("cliente", null)}>Novo cliente</Btn></>} />
      <div className="flex gap-1.5 flex-wrap mb-3">{Object.entries(LISTAS).map(([k, [n, fn]]) => <Chip key={k} ativo={f.lista === k} onClick={() => setF({ ...f, lista: k })}>{n} ({K.d.clientes.filter(fn).length})</Chip>)}</div>
      <div className="flex gap-2 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[180px]"><Search size={15} className="absolute left-3 top-3" color={C.soft} /><input value={f.busca} onChange={(e) => setF({ ...f, busca: e.target.value })} placeholder="Buscar nome, empresa, atividade, bairro..." className={inputCls} style={{ ...inputSty, paddingLeft: 34 }} /></div>
        {sel("status", Object.entries(STATUS_CLIENTE).map(([k, s]) => [k, s.nome]), "Classificação")}
        {sel("categoria", Object.entries(CATEGORIAS).map(([k, s]) => [k, s.nome]), "Categoria")}
        {sel("origem", Object.entries(ORIGENS), "Origem")}
        {sel("linha", (K.linhas || []).map((l) => [l.id, l.nome]), "Linha")}
      </div>
      {lista.length ? (
        <div className="rounded-2xl border overflow-hidden bg-white" style={{ borderColor: C.line }}>
          <div className="overflow-x-auto">
            <table className="w-full font-body text-sm">
              <thead><tr style={{ background: C.blueTint2, color: C.muted }} className="text-left text-[11px] uppercase">
                <th className="px-3 py-2">Cliente</th><th className="px-3 py-2">Atividade</th><th className="px-3 py-2">Classificação</th><th className="px-3 py-2">Valor pretendido</th><th className="px-3 py-2">Último contato</th><th className="px-3 py-2">Próximo</th><th className="px-3 py-2"></th>
              </tr></thead>
              <tbody>{lista.map((c) => { const atras = c.proximo_contato && c.proximo_contato < hojeISO(); return (
                <tr key={c.id} className="border-t hover:bg-blue-50/40 cursor-pointer" style={{ borderColor: C.line }} onClick={() => K.abrir("cliente", c)}>
                  <td className="px-3 py-2"><b style={{ color: C.ink }}>{c.nome}</b>{c.empresa && <div className="text-xs" style={{ color: C.soft }}>{c.empresa}</div>}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: C.muted }}>{c.atividade || "—"}{c.bairro && <div>{c.bairro}</div>}</td>
                  <td className="px-3 py-2"><Chip cor={STATUS_CLIENTE[c.status]?.cor}>{STATUS_CLIENTE[c.status]?.nome}</Chip></td>
                  <td className="px-3 py-2 whitespace-nowrap">{moeda(c.valor_pretendido)}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: C.muted }}>{c.ultimo_contato ? `${diasEntre(c.ultimo_contato)}d atrás` : "nunca"}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap font-bold" style={{ color: atras ? C.danger : C.muted }}>{dataBR(c.proximo_contato)}</td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}><div className="flex gap-1">
                    {c.whatsapp && <BtnWhats numero={c.whatsapp} rotulo="" texto={montarMensagem(c.ultimo_contato ? "recuperar" : "primeiro", { nome: c.nome, categoria: c.categoria, atividade: c.atividade, investimento: c.necessidade, agente: K.agente })} />}
                    <Btn small tipo="fantasma" title="Registrar atendimento" icon={MessageSquarePlus} onClick={() => K.abrir("atendimento", { cliente_id: c.id })} />
                    <Btn small tipo="fantasma" title="Agendar visita" icon={CalendarPlus} onClick={() => K.abrir("visita", { cliente_id: c.id, endereco: c.endereco, segmento: c.atividade, linha_id: c.linha_id })} />
                  </div></td>
                </tr>); })}</tbody>
            </table>
          </div>
        </div>
      ) : <Vazio>{K.d.clientes.length ? "Nenhum cliente neste filtro." : "A carteira está vazia. Cadastre o primeiro empreendedor ou importe os pré-cadastros do site e as propostas que já existem."}</Vazio>}
      {importar && <ModalImportar K={K} onFechar={() => setImportar(false)} />}
    </div>
  );
}

// Importação de cadastros legítimos (sem inventar dados)
function ModalImportar({ K, onFechar }) {
  const [fonte, setFonte] = useState("interesses");
  const [prev, setPrev] = useState(null);
  const [rodando, setRodando] = useState(false);
  const [csv, setCsv] = useState("");
  const existentes = () => ({ zaps: new Set(K.d.clientes.map((c) => c.zap_digitos).filter(Boolean)), docs: new Set(K.d.clientes.map((c) => c.doc_digitos).filter(Boolean)) });
  const mapCat = (t) => (/aliment|restaur|lanch|bar|padar|beleza|sal[aã]o|est[eé]t|servi|oficina|mec[aâ]n|sa[uú]de/i.test(t || "") ? "servicos" : /agro|rural|fazend|s[ií]tio/i.test(t || "") ? "agro" : /f[aá]brica|ind[uú]stri|marcen|serralh|confec/i.test(t || "") ? "industria" : "comercio");

  const preparar = async () => {
    setPrev(null);
    const { zaps, docs } = existentes();
    let itens = [];
    if (fonte === "interesses") itens = (K.interesses || []).filter((i) => i.status !== "descartado").map((i) => ({ nome: i.nome, whatsapp: i.whatsapp, cidade: i.cidade || "Ivatuba", linha_id: i.linha_id, valor_pretendido: i.valor_desejado, necessidade: i.mensagem, origem: "site", status: i.status === "convertido" ? "elaboracao" : "interessado", interesse_id: i.id, consentimento_lgpd: !!i.consentimento_lgpd }));
    if (fonte === "propostas") itens = (K.propostas || []).filter((p) => !p.cliente_id && p.status !== "excluido").map((p) => ({ _prop: p.id, nome: p.nome, whatsapp: p.whatsapp, cpf_cnpj: p.cnpj || p.cpf || null, cidade: p.municipio || "Ivatuba", linha_id: p.linha_id, valor_pretendido: p.valor_solicitado, origem: "outro", status: p.status === "concedido" ? "aprovado" : p.status === "negado" ? "perdido" : p.status === "em_analise" ? "analise" : p.status === "documentacao" ? "documentacao" : "elaboracao", motivo_perda: p.status === "negado" ? "Outro" : null, consentimento_lgpd: true }));
    if (["empresas", "prestadores", "feirantes"].includes(fonte) && supabaseConfigurado) {
      const sel = { empresas: "nome, categoria, endereco, bairro, whatsapp, latitude, longitude, status", prestadores: "nome, servico, endereco, whatsapp, status", feirantes: "nome, produto, whatsapp, status" }[fonte];
      const ok = { empresas: "aprovada", prestadores: "aprovado", feirantes: "aprovado" }[fonte];
      const { data, error } = await supabase.from(fonte).select(sel).eq("status", ok).limit(2000);
      if (error) { setPrev({ erro: error.message }); return; }
      itens = (data || []).map((e) => fonte === "empresas" ? { nome: e.nome, empresa: e.nome, atividade: e.categoria, categoria: mapCat(e.categoria), endereco: e.endereco, bairro: e.bairro, whatsapp: e.whatsapp, lat: e.latitude, lng: e.longitude, origem: "conecta_comercio", status: "novo", observacoes: "Importado do cadastro público de empresas do Conecta Comércio." }
        : fonte === "prestadores" ? { nome: e.nome, atividade: e.servico, categoria: "servicos", endereco: e.endereco, whatsapp: e.whatsapp, origem: "conecta_comercio", status: "novo", observacoes: "Importado do cadastro público de prestadores do Conecta Comércio." }
          : { nome: e.nome, atividade: e.produto, categoria: "comercio", whatsapp: e.whatsapp, origem: "evento", status: "novo", observacoes: "Importado do cadastro da Feira do Empreendedor (Conecta Comércio)." });
    }
    if (fonte === "csv") {
      const linhas = csv.trim().split(/\r?\n/); const sep = (linhas[0] || "").includes(";") ? ";" : ",";
      const cab = (linhas.shift() || "").split(sep).map((h) => h.trim().toLowerCase());
      const col = (r, ...n) => { const i = cab.findIndex((h) => n.some((x) => h.includes(x))); return i >= 0 ? (r[i] || "").trim() : ""; };
      itens = linhas.filter((l) => l.trim()).map((l) => { const r = l.split(sep); const at = col(r, "atividade", "segmento", "ramo"); return { nome: col(r, "nome"), empresa: col(r, "empresa", "fantasia") || null, whatsapp: col(r, "whats", "celular", "telefone") || null, cpf_cnpj: col(r, "cpf", "cnpj") || null, endereco: col(r, "endere") || null, bairro: col(r, "bairro") || null, atividade: at || null, categoria: at ? mapCat(at) : null, cnae: col(r, "cnae") || null, origem: "importacao", status: "novo" }; }).filter((x) => x.nome);
    }
    const novos = [], dup = [];
    for (const it of itens) {
      const z = zap(it.whatsapp), dc = soDigitos(it.cpf_cnpj);
      if ((z && z.length >= 10 && zaps.has(z)) || (dc && docs.has(dc))) dup.push(it); else { novos.push(it); if (z) zaps.add(z); if (dc) docs.add(dc); }
    }
    setPrev({ novos, dup });
  };
  const executar = async () => {
    setRodando(true);
    let ok = 0;
    for (const it of prev.novos) {
      const { _prop, ...dados } = it;
      try {
        const row = await K.salvar("clientes", null, dados); ok++;
        if (_prop && supabaseConfigurado) { const { data } = await supabase.from("fomento_propostas").update({ cliente_id: row.id }).eq("id", _prop).select().single(); if (data) K.setPropostas((l) => l.map((p) => (p.id === data.id ? data : p))); }
      } catch { /* duplicado no banco: ignora */ }
    }
    // vincula propostas sem cliente a clientes já existentes (mesmo WhatsApp/documento)
    if (fonte === "propostas" && supabaseConfigurado) for (const it of prev.dup) {
      const c = K.d.clientes.find((x) => (x.zap_digitos && x.zap_digitos === zap(it.whatsapp)) || (x.doc_digitos && x.doc_digitos === soDigitos(it.cpf_cnpj)));
      if (c && it._prop) { const { data } = await supabase.from("fomento_propostas").update({ cliente_id: c.id }).eq("id", it._prop).select().single(); if (data) K.setPropostas((l) => l.map((p) => (p.id === data.id ? data : p))); }
    }
    setRodando(false); K.avisar(`${ok} cliente(s) importado(s).`); onFechar();
  };
  return (
    <Modal aberto onFechar={onFechar} titulo="Importar cadastros para a carteira">
      <Aviso>Só importamos cadastros reais: pré-cadastros do site, propostas já lançadas, empresas/prestadores/feirantes aprovados no Conecta Comércio ou uma planilha sua. Quem já está na carteira (mesmo WhatsApp ou CPF/CNPJ) não é duplicado.</Aviso>
      <div className="grid sm:grid-cols-2 gap-2 my-4">
        {[["interesses", "Pré-cadastros do site do Fomento"], ["propostas", "Propostas existentes (vincula à carteira)"], ["empresas", "Empresas do Conecta Comércio"], ["prestadores", "Prestadores de serviço"], ["feirantes", "Feirantes (Feira do Empreendedor)"], ["csv", "Planilha CSV"]].map(([k, l]) => (
          <label key={k} className="flex items-center gap-2 rounded-xl border px-3 py-2 font-body text-sm cursor-pointer" style={{ borderColor: fonte === k ? C.blueHex : C.line, background: fonte === k ? C.blueTint2 : "#fff" }}><input type="radio" checked={fonte === k} onChange={() => { setFonte(k); setPrev(null); }} /> {l}</label>
        ))}
      </div>
      {fonte === "csv" && <div className="mb-3"><p className="font-body text-xs mb-1" style={{ color: C.muted }}>Cole a planilha (CSV com cabeçalho). Colunas reconhecidas: nome, empresa, whatsapp/telefone, cpf/cnpj, endereço, bairro, atividade, cnae.</p><textarea rows={6} value={csv} onChange={(e) => setCsv(e.target.value)} className={inputCls} style={inputSty} placeholder={"nome;whatsapp;atividade;bairro\nMaria Souza;44999990000;Salões de beleza;Centro"} />
        <input type="file" accept=".csv,text/csv" className="mt-2 font-body text-xs" onChange={async (e) => { const f2 = e.target.files?.[0]; if (f2) setCsv(await f2.text()); }} /></div>}
      <Btn tipo="claro" onClick={preparar}>Verificar</Btn>
      {prev?.erro && <div className="mt-3"><Aviso tipo="erro">{prev.erro}</Aviso></div>}
      {prev && !prev.erro && (
        <div className="mt-4 space-y-2">
          <Aviso tipo="ok"><b>{prev.novos.length}</b> novo(s) para importar · <b>{prev.dup.length}</b> já estão na carteira{fonte === "propostas" ? " (serão vinculados)" : " (ignorados)"}.</Aviso>
          {prev.novos.slice(0, 8).map((x, i) => <p key={i} className="font-body text-xs" style={{ color: C.muted }}>• {x.nome} {x.atividade ? `· ${x.atividade}` : ""}</p>)}
          {(prev.novos.length > 0 || (fonte === "propostas" && prev.dup.length > 0)) && <Btn icon={Download} onClick={executar} disabled={rodando}>{rodando ? "Importando..." : "Importar agora"}</Btn>}
        </div>
      )}
    </Modal>
  );
}
