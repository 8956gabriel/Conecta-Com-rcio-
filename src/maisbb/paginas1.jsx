import React, { useEffect, useMemo, useState } from "react";
import {
  Plus, UserPlus, Target, Radar as RadarI, Bot, MessageSquareText, Library, CalendarDays, Megaphone, CalendarCheck, Medal, BarChart3,
  Search, Play, Copy, ClipboardCheck, CheckCircle2, ChevronLeft, Lightbulb, Pencil, Save, Phone, MapPin, Clock, Trophy,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { C, Titulo, Btn, Card, KPI, Aviso, Chip, Vazio, Selo, Modal, Campos, Copiar, BtnWhats, Texto, inputCls, inputSty } from "../central/ui.jsx";
import { CATEGORIAS_ATENDIMENTO, RESULTADOS, COR_RESULTADO, OPORTUNIDADE, ORIGENS, TIPOS_PROSPECCAO, CATEGORIAS_LOCAL, SECOES_PUBLICO, GRUPOS, SEMANA } from "./conteudo.js";
import { listaPublicos, nomeGrupo, planoSalvoOuGerado, indicadores, periodo, hojeISO, dataBR, diasEntre, isoData, progressoMeta, NOMES_INDICADOR, pontuacao, msgErro, mesConteudo } from "./base.js";

const NAVY = "#0B2559", AMARELO = "#FCD535";
export default function Paginas1({ K, pagina }) {
  if (pagina === "atendimentos") return <Atendimentos K={K} />;
  if (pagina === "clientes") return <Clientes K={K} />;
  if (pagina === "radar") return <RadarClientes K={K} />;
  if (pagina === "prospeccao") return <Prospeccao K={K} />;
  if (pagina === "ivatuba") return <RadarIvatuba K={K} />;
  return <Inicio K={K} />;
}

// ============================================================================= INÍCIO
function Relogio() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 30000); return () => clearInterval(i); }, []);
  return <span>{t.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })} · {t.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>;
}
export function EstrategiaHoje({ K, compacto }) {
  const iso = hojeISO();
  const p = planoSalvoOuGerado(K.d, iso);
  const salvo = p._salvo;
  const status = salvo?.concluido ? "concluida" : salvo?.conteudo?.iniciado ? "iniciada" : "pendente";
  const marcar = async (dados) => { try { await K.salvar("plano", iso, { data: iso, conteudo: { ...(salvo?.conteudo || {}), ...(dados.conteudo || {}) }, ...(dados.extra || {}) }); } catch (e) { K.avisar(msgErro(e), "erro"); } };
  return (
    <div className="rounded-3xl p-5 relative overflow-hidden" style={{ background: `linear-gradient(130deg, ${NAVY}, #13357A)` }}>
      <span aria-hidden className="absolute -right-10 -top-10 w-44 h-44 rounded-full" style={{ background: "rgba(252,213,53,0.18)" }} />
      <div className="relative">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="font-body text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: AMARELO }}>⭐ Minha estratégia de hoje · {p.foco}</p>
          <Chip cor={status === "concluida" ? "#16A34A" : status === "iniciada" ? AMARELO : "#94A3B8"} ativo>{status === "concluida" ? "Concluída" : status === "iniciada" ? "Em andamento" : "Pendente"}</Chip>
        </div>
        <p className="font-display font-extrabold text-xl md:text-2xl text-white mt-1">Público do dia: {p.publico}</p>
        <p className="font-body text-sm text-white/80 mt-1"><b className="text-white">Objetivo:</b> {p.objetivo} · <b className="text-white">Serviço a divulgar:</b> {p.servico}</p>
        {!compacto && <ol className="mt-3 space-y-1">{p.acoes.map((a, i) => <li key={i} className="font-body text-sm text-white/90 flex gap-2"><span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: AMARELO, color: NAVY }}>{i + 1}</span>{a}</li>)}</ol>}
        <div className="mt-3 rounded-2xl bg-white/10 p-3"><p className="font-body text-[11px] font-bold uppercase text-white/60 mb-1">Mensagem pronta</p><p className="font-body text-sm text-white whitespace-pre-line">{p.mensagem}</p></div>
        <div className="grid sm:grid-cols-3 gap-2 mt-3 font-body text-xs text-white/85">
          <p><b className="text-white">🎯 Meta:</b> {p.meta}</p><p><b className="text-white">💡 Dica:</b> {p.dica?.texto}</p><p><b className="text-white">➜ Próximo passo:</b> {p.proximo}</p>
        </div>
        <div className="flex gap-2 flex-wrap mt-4">
          <Btn small tipo="amarelo" icon={Play} onClick={() => marcar({ conteudo: { iniciado: new Date().toISOString() } })}>Iniciar estratégia</Btn>
          <Copiar texto={p.mensagem} rotulo="Copiar mensagem" />
          <Btn small tipo="claro" icon={ClipboardCheck} onClick={() => K.abrir("prospeccao", { publico: p.publico, objetivo: p.objetivo, servico: p.servico })}>Registrar ação</Btn>
          <Btn small tipo="verde" icon={CheckCircle2} onClick={() => marcar({ extra: { concluido: true } })}>Concluir tarefa</Btn>
        </div>
      </div>
    </div>
  );
}

function Inicio({ K }) {
  const hora = new Date().getHours();
  const saud = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const hoje = periodo("dia"), mes = periodo("mes");
  const kh = indicadores(K.d, hoje), km = indicadores(K.d, mes);
  const retornos = K.d.tarefas.filter((t) => !t.concluida && t.tipo === "retorno" && t.data <= hojeISO());
  const agendaHoje = K.d.tarefas.filter((t) => !t.concluida && t.data === hojeISO());
  const metas = K.d.metas.filter((m) => m.ativo && !m.usuario_id).slice(0, 4);
  const camp = K.d.campanhas.filter((c) => c.status === "ativa");
  const ranking = K.d.usuarios.filter((u) => u.ativo).map((u) => ({ u, pts: pontuacao(K.d, indicadores(K.d, mes, u.id)) })).sort((a, b) => b.pts - a.pts).slice(0, 3);
  const mesC = mesConteudo(K.d, new Date().getMonth() + 1);
  const atalhos = [
    ["Novo atendimento", Plus, () => K.abrir("atendimento", {})], ["Cadastrar cliente", UserPlus, () => K.abrir("cliente", null)], ["Prospectar clientes", Target, () => K.ir("prospeccao")],
    ["Radar de clientes", RadarI, () => K.ir("radar")], ["Meu assistente Mais BB", Bot, () => K.ir("assistente")], ["Gerar abordagem", MessageSquareText, () => K.ir("abordagens")],
    ["Produtos e serviços", Library, () => K.ir("servicos")], ["Calendário comercial", CalendarDays, () => K.ir("calendario")], ["Campanhas", Megaphone, () => K.ir("campanhas")],
    ["Agenda", CalendarCheck, () => K.ir("agenda")], ["Ranking", Medal, () => K.ir("ranking")], ["Relatórios", BarChart3, () => K.ir("relatorios")],
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div><p className="font-display font-extrabold text-2xl md:text-3xl" style={{ color: NAVY }}>{saud}, {(K.eu?.nome || "").split(" ")[0] || "atendente"}! 👋</p><p className="font-body text-sm capitalize" style={{ color: C.muted }}><Relogio /></p></div>
        <Chip cor={NAVY}>Tema do mês: {mesC.tema}</Chip>
      </div>
      <EstrategiaHoje K={K} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI titulo="Atendimentos hoje" valor={kh.atendimentos} sub={`${km.atendimentos} no mês`} cor={NAVY} />
        <KPI titulo="Novos clientes" valor={km.novos_clientes} sub="no mês" cor={NAVY} />
        <KPI titulo="Prospecções" valor={km.prospeccoes} sub={`${km.contatos} contatos no mês`} cor={NAVY} />
        <KPI titulo="Retornos pendentes" valor={retornos.length} sub={retornos.length ? "ver agenda" : "tudo em dia"} cor={retornos.length ? C.danger : C.green} destaque={retornos.length > 0} />
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {atalhos.map(([l, I, f], i) => (
          <button key={l} onClick={f} className="rounded-2xl bg-white border p-3 flex flex-col items-center gap-2 text-center transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: "#E2E8F0" }}>
            <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: i === 0 ? AMARELO : "#EEF2FA" }}><I size={20} color={NAVY} /></span>
            <span className="font-body text-[11.5px] font-bold leading-tight" style={{ color: NAVY }}>{l}</span>
          </button>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card><p className="font-display font-bold mb-2" style={{ color: NAVY }}>📅 Agenda de hoje ({agendaHoje.length})</p>
          {agendaHoje.length ? agendaHoje.slice(0, 6).map((t) => <TarefaLinha key={t.id} t={t} K={K} />) : <p className="font-body text-sm" style={{ color: C.soft }}>Nada agendado para hoje.</p>}
          {retornos.filter((t) => t.data < hojeISO()).length > 0 && <p className="font-body text-xs mt-2 font-bold" style={{ color: C.danger }}>{retornos.filter((t) => t.data < hojeISO()).length} retorno(s) atrasado(s)</p>}
          <Btn small tipo="fantasma" className="mt-2" icon={Plus} onClick={() => K.abrir("tarefa", {})}>Nova tarefa</Btn></Card>
        <Card><div className="flex justify-between"><p className="font-display font-bold mb-2" style={{ color: NAVY }}>🎯 Metas</p><button className="font-body text-xs font-bold" style={{ color: C.blueHex }} onClick={() => K.ir("metas")}>ver todas</button></div>
          {metas.length ? metas.map((m) => { const r = progressoMeta(K.d, m); return <div key={m.id} className="mb-2"><div className="flex justify-between font-body text-xs"><span>{NOMES_INDICADOR[m.indicador]} ({m.periodo})</span><b>{r.valor}/{m.alvo}</b></div><div className="h-2 rounded-full mt-1" style={{ background: "#EEF2FA" }}><div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.pct >= 100 ? "#16A34A" : AMARELO }} /></div></div>; }) : <p className="font-body text-sm" style={{ color: C.soft }}>{K.admin ? "Configure as metas em Metas." : "Nenhuma meta configurada."}</p>}</Card>
        <Card><div className="flex justify-between"><p className="font-display font-bold mb-2" style={{ color: NAVY }}>🏆 Ranking do mês</p><button className="font-body text-xs font-bold" style={{ color: C.blueHex }} onClick={() => K.ir("ranking")}>ver</button></div>
          {ranking.map(({ u, pts }, i) => <p key={u.id} className="font-body text-sm flex justify-between py-1"><span>{["🥇", "🥈", "🥉"][i]} {u.nome}</span><b>{pts} pts</b></p>)}
          <p className="font-display font-bold mt-3 mb-1" style={{ color: NAVY }}>📣 Campanhas ativas</p>
          {camp.length ? camp.slice(0, 3).map((c) => <p key={c.id} className="font-body text-sm">• {c.nome}</p>) : <p className="font-body text-sm" style={{ color: C.soft }}>Nenhuma campanha ativa.</p>}</Card>
      </div>
    </div>
  );
}
export function TarefaLinha({ t, K }) {
  const atras = t.data < hojeISO();
  return (
    <div className="flex items-center gap-2 py-1.5 border-b last:border-0" style={{ borderColor: "#EEF2F7" }}>
      <input type="checkbox" checked={t.concluida} onChange={async (e) => { try { await K.salvar("tarefas", t.id, { concluida: e.target.checked, concluida_em: e.target.checked ? new Date().toISOString() : null }); } catch (er) { K.avisar(msgErro(er), "erro"); } }} className="w-4 h-4" />
      <button onClick={() => K.abrir("tarefa", t)} className="flex-1 text-left font-body text-sm" style={{ color: t.concluida ? C.soft : C.ink, textDecoration: t.concluida ? "line-through" : "none" }}>
        {t.hora && <b style={{ color: NAVY }}>{t.hora.slice(0, 5)} </b>}{t.titulo}
        <span className="block text-[11px]" style={{ color: atras && !t.concluida ? C.danger : C.soft }}>{({ retorno: "Retorno", visita: "Visita", prospeccao: "Prospecção", pendencia: "Pendência", lembrete: "Lembrete" })[t.tipo]} · {dataBR(t.data)}{atras && !t.concluida ? " · atrasada" : ""} · prioridade {t.prioridade}</span>
      </button>
    </div>
  );
}

// ============================================================================= ATENDIMENTOS
function Atendimentos({ K }) {
  const [f, setF] = useState({ busca: "", cat: "", res: "", per: "mes" });
  const p = periodo(f.per === "tudo" ? "ano" : f.per);
  const nomeAt = (id) => K.d.usuarios.find((u) => u.id === id)?.nome || "—";
  const lista = K.d.atendimentos.filter((a) => (f.per === "tudo" || (a.data >= p.de && a.data <= p.ate)) && (!f.cat || a.categoria === f.cat) && (!f.res || a.resultado === f.res) && (!f.busca || `${a.numero} ${a.cliente_nome || ""} ${a.servico || ""} ${a.descricao || ""}`.toLowerCase().includes(f.busca.toLowerCase())));
  const porCat = Object.entries(CATEGORIAS_ATENDIMENTO).map(([k, n]) => ({ n, v: lista.filter((a) => a.categoria === k).length })).filter((x) => x.v);
  return (
    <div>
      <Titulo eyebrow="Atendimentos" title="Atendimentos" sub="Número automático, histórico completo. Nunca registre senhas, tokens, códigos ou dados completos de cartão." direita={<Btn tipo="amarelo" icon={Plus} onClick={() => K.abrir("atendimento", {})}>NOVO ATENDIMENTO</Btn>} />
      <div className="flex gap-2 flex-wrap mb-3">
        <div className="relative flex-1 min-w-[180px]"><Search size={15} className="absolute left-3 top-3" color={C.soft} /><input value={f.busca} onChange={(e) => setF({ ...f, busca: e.target.value })} placeholder="Buscar nº, cliente, serviço..." className={inputCls} style={{ ...inputSty, paddingLeft: 34 }} /></div>
        <select value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })} className={inputCls} style={{ ...inputSty, width: "auto" }}><option value="">Todas as categorias</option>{Object.entries(CATEGORIAS_ATENDIMENTO).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select>
        <select value={f.res} onChange={(e) => setF({ ...f, res: e.target.value })} className={inputCls} style={{ ...inputSty, width: "auto" }}><option value="">Todos os resultados</option>{Object.entries(RESULTADOS).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select>
        {[["dia", "Hoje"], ["semana", "Semana"], ["mes", "Mês"], ["tudo", "Tudo"]].map(([k, l]) => <Chip key={k} ativo={f.per === k} cor={NAVY} onClick={() => setF({ ...f, per: k })}>{l}</Chip>)}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">{Object.entries(RESULTADOS).map(([k, n]) => <Card key={k} className="!p-3"><p className="font-body text-[11px] font-bold uppercase" style={{ color: COR_RESULTADO[k] }}>{n}</p><p className="font-display font-extrabold text-xl" style={{ color: NAVY }}>{lista.filter((a) => a.resultado === k).length}</p></Card>)}</div>
      {lista.length ? <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: "#E2E8F0" }}><div className="overflow-x-auto"><table className="w-full font-body text-sm">
        <thead><tr className="text-left text-[11px] uppercase" style={{ background: "#F5F7FB", color: C.muted }}><th className="px-3 py-2">Nº</th><th className="px-3 py-2">Data</th><th className="px-3 py-2">Cliente</th><th className="px-3 py-2">Categoria</th><th className="px-3 py-2">Serviço</th><th className="px-3 py-2">Resultado</th><th className="px-3 py-2">Atendente</th></tr></thead>
        <tbody>{lista.map((a) => <tr key={a.id} className="border-t cursor-pointer hover:bg-yellow-50/50" style={{ borderColor: "#EEF2F7" }} onClick={() => K.abrir("atendimento", a)}>
          <td className="px-3 py-2 font-bold" style={{ color: NAVY }}>{a.numero}</td><td className="px-3 py-2 whitespace-nowrap">{dataBR(a.data)} {String(a.hora || "").slice(0, 5)}</td><td className="px-3 py-2">{a.cliente_nome || "—"}</td>
          <td className="px-3 py-2 text-xs">{CATEGORIAS_ATENDIMENTO[a.categoria]}</td><td className="px-3 py-2 text-xs">{a.servico || "—"}</td>
          <td className="px-3 py-2"><Chip cor={COR_RESULTADO[a.resultado]}>{RESULTADOS[a.resultado]}</Chip>{a.status === "aberto" && <Chip cor={C.danger}>aberto</Chip>}</td><td className="px-3 py-2 text-xs">{nomeAt(a.atendente)}</td></tr>)}</tbody></table></div></div>
        : <Vazio>Nenhum atendimento neste filtro. Use o botão NOVO ATENDIMENTO.</Vazio>}
      {porCat.length > 0 && <Card className="mt-4"><p className="font-display font-bold mb-2" style={{ color: NAVY }}>Atendimentos por categoria</p><ResponsiveContainer width="100%" height={200}><BarChart data={porCat}><CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" /><XAxis dataKey="n" fontSize={10} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="v" name="Atendimentos" fill={NAVY} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Card>}
    </div>
  );
}

// ============================================================================= CLIENTES (CRM)
function Clientes({ K }) {
  const [f, setF] = useState({ busca: "", cat: "", op: "", lista: "todos" });
  const [hist, setHist] = useState(null);
  const L = { todos: ["Todos", () => true], retorno: ["Retorno vencido", (c) => c.proximo_contato && c.proximo_contato <= hojeISO()], interessados: ["Interessados", (c) => c.oportunidade === "interessado"], semcontato: ["Sem atendimento", (c) => !K.d.atendimentos.some((a) => a.cliente_id === c.id)], naocontatar: ["Não contatar", (c) => c.nao_contatar] };
  const lista = K.d.clientes.filter((c) => L[f.lista][1](c) && (!f.cat || c.categoria === f.cat) && (!f.op || c.oportunidade === f.op) && (!f.busca || `${c.nome} ${c.whatsapp || ""} ${c.telefone || ""} ${c.email || ""}`.toLowerCase().includes(f.busca.toLowerCase())));
  return (
    <div>
      <Titulo eyebrow="CRM" title={`Clientes (${K.d.clientes.length})`} sub="Cadastro com aviso de duplicidade por WhatsApp/telefone ou CPF. CPF só quando necessário." direita={<Btn icon={UserPlus} onClick={() => K.abrir("cliente", null)}>Cadastrar cliente</Btn>} />
      <div className="flex gap-1.5 flex-wrap mb-3">{Object.entries(L).map(([k, [n, fn]]) => <Chip key={k} cor={NAVY} ativo={f.lista === k} onClick={() => setF({ ...f, lista: k })}>{n} ({K.d.clientes.filter(fn).length})</Chip>)}</div>
      <div className="flex gap-2 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[180px]"><Search size={15} className="absolute left-3 top-3" color={C.soft} /><input value={f.busca} onChange={(e) => setF({ ...f, busca: e.target.value })} placeholder="Pesquisar nome, telefone, e-mail..." className={inputCls} style={{ ...inputSty, paddingLeft: 34 }} /></div>
        <select value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })} className={inputCls} style={{ ...inputSty, width: "auto" }}><option value="">Todas as categorias</option>{listaPublicos(K.d).map((p) => <option key={p.chave} value={p.nome}>{p.nome}</option>)}</select>
        <select value={f.op} onChange={(e) => setF({ ...f, op: e.target.value })} className={inputCls} style={{ ...inputSty, width: "auto" }}><option value="">Todas as oportunidades</option>{Object.entries(OPORTUNIDADE).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select>
      </div>
      {lista.length ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{lista.map((c) => { const n = K.d.atendimentos.filter((a) => a.cliente_id === c.id).length; return (
        <Card key={c.id}>
          <div className="flex justify-between gap-2"><button className="text-left" onClick={() => K.abrir("cliente", c)}><p className="font-display font-bold" style={{ color: NAVY }}>{c.nome}</p><p className="font-body text-xs" style={{ color: C.soft }}>{c.categoria || "Sem categoria"} · {ORIGENS[c.origem] || "—"}</p></button><Chip cor={{ nova: "#64748B", interessado: "#D97706", em_atendimento: NAVY, convertida: "#16A34A", sem_interesse: C.danger }[c.oportunidade]}>{OPORTUNIDADE[c.oportunidade]}</Chip></div>
          <p className="font-body text-xs mt-2" style={{ color: C.muted }}>{n} atendimento(s){c.proximo_contato ? ` · próximo contato ${dataBR(c.proximo_contato)}` : ""}{c.nao_contatar ? " · 🚫 não contatar" : ""}</p>
          <div className="flex gap-1.5 mt-3 flex-wrap">
            <Btn small icon={Plus} onClick={() => K.abrir("atendimento", { cliente_id: c.id })}>Atendimento</Btn>
            <Btn small tipo="claro" icon={Clock} onClick={() => K.abrir("tarefa", { titulo: `Retorno: ${c.nome}`, tipo: "retorno", cliente_id: c.id })}>Retorno</Btn>
            <Btn small tipo="fantasma" onClick={() => setHist(c)}>Histórico</Btn>
            {(c.whatsapp || c.telefone) && !c.nao_contatar && c.consentimento && <BtnWhats numero={c.whatsapp || c.telefone} rotulo="" texto={`Olá, ${c.nome.split(" ")[0]}! Aqui é do Mais BB de Ivatuba. 😊`} />}
          </div>
        </Card>); })}</div> : <Vazio>Nenhum cliente neste filtro.</Vazio>}
      {hist && <Modal aberto onFechar={() => setHist(null)} titulo={`Histórico · ${hist.nome}`}>
        {[...K.d.atendimentos.filter((a) => a.cliente_id === hist.id).map((a) => ({ d: `${a.data}T${a.hora || "00:00"}`, t: `Atendimento nº ${a.numero} · ${CATEGORIAS_ATENDIMENTO[a.categoria]} · ${RESULTADOS[a.resultado]}`, x: [a.servico, a.descricao].filter(Boolean).join(" — ") })),
          ...K.d.prospeccoes.filter((p) => p.cliente_id === hist.id).map((p) => ({ d: p.data, t: `Prospecção (${TIPOS_PROSPECCAO[p.tipo]})`, x: [p.objetivo, p.resultado].filter(Boolean).join(" — ") })),
          ...K.d.tarefas.filter((t) => t.cliente_id === hist.id).map((t) => ({ d: t.data, t: `Tarefa: ${t.titulo}${t.concluida ? " ✓" : ""}`, x: t.observacao })),
        ].sort((a, b) => String(b.d).localeCompare(String(a.d))).map((h, i) => <div key={i} className="border-l-2 pl-3 pb-3" style={{ borderColor: AMARELO }}><p className="font-body text-xs font-bold" style={{ color: NAVY }}>{dataBR(h.d)} · {h.t}</p>{h.x && <p className="font-body text-sm">{h.x}</p>}</div>)}
        {!K.d.atendimentos.some((a) => a.cliente_id === hist.id) && <Vazio>Sem atendimentos registrados.</Vazio>}
      </Modal>}
    </div>
  );
}

// ============================================================================= RADAR DE CLIENTES (públicos)
function RadarClientes({ K }) {
  const [sel, setSel] = useState(K.param?.publico || null);
  const [editar, setEditar] = useState(null);
  const pubs = listaPublicos(K.d);
  const mes = periodo("mes");
  const p = pubs.find((x) => x.chave === sel);
  if (!p) return (
    <div>
      <Titulo eyebrow="Radar" title="Radar de clientes" sub="Públicos que podem ter interesse nos serviços do correspondente e como planejar o relacionamento. Nunca presuma direito a crédito ou condições por profissão, idade ou vínculo."
        direita={K.admin && <Btn icon={Plus} onClick={() => setEditar({ novo: true, chave: "", grupo: "outros", nome: "", conteudo: {} })}>Nova categoria</Btn>} />
      {Object.entries({ ...GRUPOS, extra: { nome: "Categorias criadas", emoji: "➕" } }).map(([g, info]) => { const lista = pubs.filter((x) => (g === "extra" ? x.personalizado && !GRUPOS[x.grupo] : x.grupo === g)); if (!lista.length) return null; return (
        <div key={g} className="mb-5"><p className="font-display font-bold mb-2" style={{ color: NAVY }}>{info.emoji} {info.nome}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">{lista.map((x) => { const nCli = K.d.clientes.filter((c) => c.categoria === x.nome).length; const nPr = K.d.prospeccoes.filter((pp) => pp.publico === x.nome && pp.data >= mes.de).length; return (
            <Card key={x.chave} onClick={() => setSel(x.chave)} className="!p-3"><p className="font-body text-sm font-bold" style={{ color: NAVY }}>{x.nome}</p><p className="font-body text-[11px] mt-0.5" style={{ color: C.soft }}>{nCli} cliente(s) · {nPr} prospecção(ões) no mês</p></Card>); })}</div></div>); })}
      {editar && <ModalPublico K={K} pub={editar} onFechar={() => setEditar(null)} />}
    </div>
  );
  const ct = p.conteudo;
  const servicos = K.d.servicos.filter((s) => s.ativo && (ct.servicos || []).includes(s.categoria));
  const lst = (v) => (Array.isArray(v) ? <ul className="list-disc ml-5 space-y-0.5">{v.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="whitespace-pre-line">{v}</p>);
  return (
    <div>
      <Btn small tipo="claro" icon={ChevronLeft} onClick={() => setSel(null)}>Todos os públicos</Btn>
      <div className="mt-3"><Titulo eyebrow={nomeGrupo(p.grupo)} title={p.nome} direita={<><Btn tipo="amarelo" icon={Target} onClick={() => K.abrir("prospeccao", { publico: p.nome })}>Prospectar este público</Btn><Btn tipo="claro" icon={UserPlus} onClick={() => K.abrir("cliente", { categoria: p.nome })}>Cadastrar cliente</Btn>{K.admin && <Btn tipo="claro" icon={Pencil} onClick={() => setEditar(p)}>Editar</Btn>}</>} /></div>
      <Aviso tipo="amarelo">Sugestões de relacionamento. Não presuma que alguém tem direito a crédito ou condições especiais pela profissão, idade ou vínculo. Informações de serviços: somente as da biblioteca oficial.</Aviso>
      <div className="grid lg:grid-cols-2 gap-3 mt-4">
        {SECOES_PUBLICO.map(([k, t]) => (
          <Card key={k} className={["mensagens", "inicio"].includes(k) ? "lg:col-span-2" : ""}>
            <p className="font-display font-bold text-sm mb-1.5" style={{ color: NAVY }}>{t}</p>
            <div className="font-body text-sm" style={{ color: C.ink }}>
              {k === "servicos" ? (servicos.length ? <ul className="space-y-1">{servicos.map((s) => <li key={s.id}>• <b>{s.nome}</b> <span style={{ color: C.soft }}>({s.categoria})</span></li>)}</ul> : <p style={{ color: C.soft }}>Categorias relacionadas: {(ct.servicos || []).join(", ")}. Nenhum serviço dessas categorias cadastrado ainda na biblioteca{K.admin ? " — cadastre em Produtos e serviços." : "."}</p>)
                : k === "mensagens" ? (ct.mensagens || []).map((m, i) => <div key={i} className="rounded-xl p-3 mb-2" style={{ background: "#F5F7FB" }}><p className="whitespace-pre-line">{m}</p><div className="mt-2 flex gap-2"><Copiar texto={m} rotulo="Copiar mensagem" /></div></div>)
                  : k === "inicio" ? <div className="rounded-xl p-3" style={{ background: "#FFF9DB" }}><p>{ct.inicio}</p><div className="mt-2"><Copiar texto={ct.inicio} /></div></div>
                    : k === "meta" ? <p className="font-bold">{ct.meta}</p> : lst(ct[k] || "—")}
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-3"><p className="font-display font-bold text-sm mb-1" style={{ color: NAVY }}>Resultado com este público</p>
        <p className="font-body text-sm">{K.d.clientes.filter((c) => c.categoria === p.nome).length} cliente(s) cadastrados · {K.d.prospeccoes.filter((x) => x.publico === p.nome).length} prospecção(ões) · {K.d.prospeccoes.filter((x) => x.publico === p.nome).reduce((s, x) => s + (x.contatos || 0), 0)} contatos</p></Card>
      {editar && <ModalPublico K={K} pub={editar} onFechar={() => setEditar(null)} />}
    </div>
  );
}
function ModalPublico({ K, pub, onFechar }) {
  const ct = pub.conteudo || {};
  const txt = (v) => (Array.isArray(v) ? v.join("\n") : v || "");
  const [v, setV] = useState({ nome: pub.nome, grupo: pub.grupo, ...Object.fromEntries(SECOES_PUBLICO.map(([k]) => [k, txt(ct[k])])) });
  const listas = ["necessidades", "onde", "perguntas", "servicos", "faq", "mensagens", "campanhas"];
  const salvar = async () => {
    if (!v.nome) { K.avisar("Informe o nome.", "erro"); return; }
    const conteudo = Object.fromEntries(SECOES_PUBLICO.map(([k]) => [k, listas.includes(k) ? String(v[k] || "").split("\n").map((x) => x.trim()).filter(Boolean) : v[k]]));
    const chave = pub.chave || v.nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    try { await K.salvar("publicos", chave, { chave, grupo: v.grupo, nome: v.nome, conteudo, personalizado: !!pub.novo || !!pub.personalizado }); K.avisar("Público salvo."); onFechar(); } catch (e) { K.avisar(msgErro(e), "erro"); }
  };
  return (
    <Modal aberto onFechar={onFechar} titulo={pub.novo ? "Nova categoria de público" : `Editar · ${pub.nome}`} largura="max-w-3xl">
      <p className="font-body text-xs mb-3" style={{ color: C.muted }}>Em campos de lista, escreva um item por linha.</p>
      <Campos campos={[{ k: "nome", l: "Nome", req: true }, { k: "grupo", l: "Grupo", t: "select", semVazio: true, op: Object.entries(GRUPOS).map(([k, g]) => [k, g.nome]) }, ...SECOES_PUBLICO.map(([k, l]) => ({ k, l, t: "textarea", full: true, rows: k === "mensagens" ? 4 : 3 }))]} valores={v} set={setV} />
      <div className="flex justify-between mt-4">
        {pub.personalizado && !pub.novo ? <Btn small tipo="perigo" onClick={async () => { await K.apagar("publicos", pub.chave); onFechar(); }}>Excluir categoria</Btn> : <span />}
        <Btn icon={Save} onClick={salvar}>Salvar</Btn>
      </div>
    </Modal>
  );
}

// ============================================================================= PROSPECÇÃO
function Prospeccao({ K }) {
  const [f, setF] = useState({ st: "", tipo: "", per: "mes" });
  const p = periodo(f.per);
  const lista = K.d.prospeccoes.filter((x) => (f.per === "tudo" || (x.data >= p.de && x.data <= p.ate)) && (!f.st || x.status === f.st) && (!f.tipo || x.tipo === f.tipo));
  const retornos = K.d.prospeccoes.filter((x) => x.proximo_contato && x.status !== "encerrada" && x.proximo_contato <= hojeISO());
  const nome = (id) => K.d.usuarios.find((u) => u.id === id)?.nome || "—";
  const tot = { c: lista.reduce((s, x) => s + (x.contatos || 0), 0), i: lista.reduce((s, x) => s + (x.interessados || 0), 0), m: lista.reduce((s, x) => s + (x.meta || 0), 0) };
  return (
    <div>
      <Titulo eyebrow="Prospecção inteligente" title="Prospecção" sub="Planeje e registre cada ação: público, objetivo, serviço, local, tipo, responsável, meta, resultado e próximo passo." direita={<Btn tipo="amarelo" icon={Plus} onClick={() => K.abrir("prospeccao", {})}>Nova prospecção</Btn>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPI titulo="Ações no período" valor={lista.length} cor={NAVY} /><KPI titulo="Contatos" valor={tot.c} sub={tot.m ? `meta ${tot.m}` : ""} cor={NAVY} />
        <KPI titulo="Interessados" valor={tot.i} cor="#16A34A" /><KPI titulo="Retornos vencidos" valor={retornos.length} cor={retornos.length ? C.danger : "#16A34A"} destaque={retornos.length > 0} />
      </div>
      <div className="flex gap-1.5 flex-wrap mb-4">
        {[["semana", "Semana"], ["mes", "Mês"], ["ano", "Ano"], ["tudo", "Tudo"]].map(([k, l]) => <Chip key={k} cor={NAVY} ativo={f.per === k} onClick={() => setF({ ...f, per: k })}>{l}</Chip>)}
        <select value={f.st} onChange={(e) => setF({ ...f, st: e.target.value })} className={inputCls} style={{ ...inputSty, width: "auto", padding: "4px 10px" }}><option value="">Todas as situações</option><option value="planejada">Planejadas</option><option value="realizada">Realizadas</option><option value="retorno">Aguardando retorno</option><option value="encerrada">Encerradas</option></select>
        <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} className={inputCls} style={{ ...inputSty, width: "auto", padding: "4px 10px" }}><option value="">Todos os tipos</option>{Object.entries(TIPOS_PROSPECCAO).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select>
      </div>
      {retornos.length > 0 && <Card className="mb-4" style={{ borderColor: AMARELO }}><p className="font-display font-bold mb-1" style={{ color: NAVY }}>🔔 Retornos de prospecção</p>{retornos.map((x) => <button key={x.id} onClick={() => K.abrir("prospeccao", x)} className="block font-body text-sm text-left py-0.5">• {dataBR(x.proximo_contato)} — {x.publico || x.local} · {x.proximo_passo || "retornar"}</button>)}</Card>}
      {lista.length ? <div className="space-y-2">{lista.map((x) => (
        <Card key={x.id} onClick={() => K.abrir("prospeccao", x)} className="!p-3">
          <div className="flex justify-between gap-2 flex-wrap"><p className="font-body text-sm font-bold" style={{ color: NAVY }}>{dataBR(x.data)} · {x.publico || "Público não definido"} {x.local && <span className="font-normal" style={{ color: C.soft }}>· {x.local}</span>}</p>
            <div className="flex gap-1"><Chip cor={NAVY}>{TIPOS_PROSPECCAO[x.tipo]}</Chip><Chip cor={{ planejada: "#64748B", realizada: "#16A34A", retorno: "#D97706", encerrada: "#94A3B8" }[x.status]}>{x.status}</Chip></div></div>
          <p className="font-body text-xs mt-1" style={{ color: C.muted }}>{[x.objetivo, x.servico && `Serviço: ${x.servico}`, `${x.contatos || 0}${x.meta ? `/${x.meta}` : ""} contatos`, `${x.interessados || 0} interessados`, `Resp.: ${nome(x.responsavel)}`].filter(Boolean).join(" · ")}</p>
          {(x.resultado || x.proximo_passo) && <p className="font-body text-xs mt-1" style={{ color: C.ink }}>{x.resultado}{x.proximo_passo ? ` ➜ ${x.proximo_passo}` : ""}</p>}
        </Card>))}</div> : <Vazio>Nenhuma prospecção no período.</Vazio>}
    </div>
  );
}

// ============================================================================= RADAR DE OPORTUNIDADES DE IVATUBA
function RadarIvatuba({ K }) {
  const [cat, setCat] = useState("");
  const [st, setSt] = useState("");
  const lista = K.d.locais.filter((l) => (!cat || l.categoria === cat) && (!st || l.status === st));
  const proximas = K.d.locais.filter((l) => l.proxima_data && l.proxima_data >= hojeISO()).sort((a, b) => a.proxima_data.localeCompare(b.proxima_data));
  return (
    <div>
      <Titulo eyebrow="Ações locais" title="Radar de oportunidades de Ivatuba" sub="Comércios, empresas, escolas, associações, comunidades e eventos para planejar visitas. Registre contatos de pessoas só com autorização." direita={<Btn tipo="amarelo" icon={Plus} onClick={() => K.abrir("local", {})}>Cadastrar local</Btn>} />
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">{CATEGORIAS_LOCAL.map((c) => <button key={c} onClick={() => setCat(cat === c ? "" : c)} className="rounded-2xl p-3 text-left border transition" style={{ background: cat === c ? NAVY : "#fff", borderColor: cat === c ? NAVY : "#E2E8F0" }}><p className="font-display font-extrabold text-lg" style={{ color: cat === c ? AMARELO : NAVY }}>{K.d.locais.filter((l) => l.categoria === c).length}</p><p className="font-body text-[11px] font-bold" style={{ color: cat === c ? "#fff" : C.muted }}>{c}</p></button>)}</div>
      <div className="flex gap-1.5 mb-4 flex-wrap">{[["", "Todos"], ["a_visitar", "A visitar"], ["visitado", "Visitados"], ["parceiro", "Parceiros"], ["sem_interesse", "Sem interesse"]].map(([k, l]) => <Chip key={k} cor={NAVY} ativo={st === k} onClick={() => setSt(k)}>{l}</Chip>)}</div>
      <div className="grid lg:grid-cols-[1fr_300px] gap-4">
        <div className="space-y-2">{lista.length ? lista.map((l) => (
          <Card key={l.id} className="!p-3">
            <div className="flex justify-between gap-2"><button className="text-left" onClick={() => K.abrir("local", l)}><p className="font-body text-sm font-bold" style={{ color: NAVY }}>{l.nome}</p><p className="font-body text-xs" style={{ color: C.soft }}>{l.categoria}{l.endereco ? ` · ${l.endereco}` : ""}{l.contato ? ` · contato: ${l.contato}` : ""}</p></button>
              <Chip cor={{ a_visitar: "#D97706", visitado: NAVY, parceiro: "#16A34A", sem_interesse: "#94A3B8" }[l.status]}>{({ a_visitar: "A visitar", visitado: "Visitado", parceiro: "Parceiro", sem_interesse: "Sem interesse" })[l.status]}</Chip></div>
            {(l.objetivo || l.resultado) && <p className="font-body text-xs mt-1">{l.objetivo && <><b>Objetivo:</b> {l.objetivo} </>}{l.resultado && <><b>Resultado:</b> {l.resultado}</>}</p>}
            <div className="flex gap-1.5 mt-2 flex-wrap">
              <Btn small tipo="claro" icon={Target} onClick={() => K.abrir("prospeccao", { local: l.nome, local_id: l.id, tipo: "visita" })}>Registrar visita</Btn>
              <Btn small tipo="fantasma" icon={CalendarCheck} onClick={() => K.abrir("tarefa", { titulo: `Visita: ${l.nome}`, tipo: "visita", local_id: l.id })}>Agendar</Btn>
            </div>
          </Card>)) : <Vazio>Nenhum local cadastrado nesta categoria. Cadastre apenas estabelecimentos e organizações reais.</Vazio>}</div>
        <Card className="h-fit"><p className="font-display font-bold mb-2" style={{ color: NAVY }}>📍 Próximas ações</p>{proximas.length ? proximas.slice(0, 10).map((l) => <p key={l.id} className="font-body text-sm py-1 border-b last:border-0" style={{ borderColor: "#EEF2F7" }}><b>{dataBR(l.proxima_data)}</b> · {l.nome}<span className="block text-xs" style={{ color: C.soft }}>{l.proxima_acao || "Visita"}</span></p>) : <p className="font-body text-sm" style={{ color: C.soft }}>Nenhuma ação agendada.</p>}</Card>
      </div>
    </div>
  );
}
