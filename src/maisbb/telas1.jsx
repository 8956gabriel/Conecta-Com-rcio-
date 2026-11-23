import React, { useEffect, useMemo, useState } from "react";
import { PlusCircle, UserPlus, Target, Radar, Bot, MessageSquareText, Package, CalendarDays, Megaphone, ListChecks, Trophy, FileBarChart, Play, Copy, CheckCircle2, ClipboardList, Users, RotateCcw, Search, Save, Trash2, Phone, CalendarPlus, Lightbulb, Clock, Flag, History } from "lucide-react";
import { C, Titulo, Btn, Card, KPI, Aviso, Chip, Vazio, Selo, Modal, Campos, Campo, inp, inpS, Copiar, Zap, Texto, Barra, msgErro } from "./base.jsx";
import { CATEGORIAS_ATEND, RESULTADOS, STATUS_ATEND, ORIGENS, OPORTUNIDADE, INDICADORES, gerarMensagem } from "./dados.js";
import { estrategiaDoDia, hoje, br, dias, SEMANA, MES_NOME, periodo, indicadores, progressoMeta, ranking, iso, soDig } from "./motor.js";

// ============================================================================= INÍCIO
export function Inicio({ K }) {
  const { D } = K;
  const [agora, setAgora] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setAgora(new Date()), 30000); return () => clearInterval(t); }, []);
  const reg = D.dias.find((x) => x.data === hoje() && x.user_id === K.eu);
  const e = estrategiaDoDia(hoje(), { publicos: K.publicos, servicos: D.servicos, config: D.config, atendente: K.nome, ajustes: reg?.ajustes });
  const kd = indicadores(D, periodo("dia"), K.eu), km = indicadores(D, periodo("mes"), K.eu);
  const tarefasHoje = D.tarefas.filter((t) => !t.concluida && t.data <= hoje() && (!t.responsavel || t.responsavel === K.eu)).sort((a, b) => a.data.localeCompare(b.data));
  const minhasMetas = D.metas.filter((m) => m.ativo && (!m.atendente || m.atendente === K.eu)).slice(0, 4);
  const rk = ranking(D, D.membros, "mes", D.metas).slice(0, 3);
  const camp = D.campanhas.filter((c) => c.status === "ativa");
  const h = agora.getHours();
  const salvarDia = async (dados) => { try { await K.salvar("dias", null, { data: hoje(), user_id: K.eu, ajustes: reg?.ajustes || {}, status: reg?.status || "pendente", ...dados }); } catch (er) { K.avisar(msgErro(er), "erro"); } };
  const [concluir, setConcluir] = useState(false);
  const atalhos = [
    ["Novo atendimento", PlusCircle, () => K.abrir("atendimento", {})], ["Cadastrar cliente", UserPlus, () => K.abrir("cliente", null)], ["Prospectar clientes", Target, () => K.irPara("prospeccao")],
    ["Radar de clientes", Radar, () => K.irPara("radar")], ["Meu assistente Mais BB", Bot, () => K.irPara("assistente")], ["Gerar abordagem", MessageSquareText, () => K.irPara("mensagens")],
    ["Produtos e serviços", Package, () => K.irPara("produtos")], ["Calendário comercial", CalendarDays, () => K.irPara("calendario")], ["Campanhas", Megaphone, () => K.irPara("campanhas")],
    ["Agenda", ListChecks, () => K.irPara("agenda")], ["Ranking", Trophy, () => K.irPara("metas")], ["Relatórios", FileBarChart, () => K.irPara("relatorios")],
  ];
  return (
    <div className="space-y-5">
      <div className="rounded-3xl p-5 md:p-6 relative overflow-hidden" style={{ background: `linear-gradient(125deg, ${C.navy}, ${C.navy2})` }}>
        <span className="absolute -right-10 -top-16 w-56 h-56 rounded-full" style={{ background: "rgba(249,209,11,0.16)" }} />
        <div className="relative flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="font-body text-sm" style={{ color: C.yellow }}>{h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"},</p>
            <p className="font-display font-extrabold text-2xl md:text-3xl text-white">{K.nome.split(" ")[0]} 👋</p>
            <p className="font-body text-sm mt-1 text-white/75">{SEMANA[agora.getDay()]}, {agora.getDate()} de {MES_NOME[agora.getMonth()].toLowerCase()} · {agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <div className="flex gap-2 flex-wrap"><Btn tipo="amarelo" big icon={PlusCircle} onClick={() => K.abrir("atendimento", {})}>NOVO ATENDIMENTO</Btn></div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 !p-5" style={{ borderColor: C.yellow, borderWidth: 2 }}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-display font-extrabold" style={{ color: C.navy }}>🎯 MINHA ESTRATÉGIA DE HOJE</p>
            <div className="flex gap-1.5">{reg?.status === "concluida" ? <Chip cor={C.green}>Concluída ✓</Chip> : reg?.status === "iniciada" ? <Chip cor={C.blue}>Em andamento</Chip> : null}<Selo tipo="sistema" /></div>
          </div>
          {e.descanso ? <p className="font-body text-sm mt-2" style={{ color: C.muted }}>Domingo: dia de descanso. Aproveite para planejar a semana.</p> : (<>
            <div className="grid sm:grid-cols-3 gap-3 mt-3">
              <div><p className="font-body text-[11px] font-bold uppercase" style={{ color: C.muted }}>Público do dia</p><p className="font-body text-sm font-bold" style={{ color: C.ink }}>{e.publico?.emoji} {e.publico?.nome}</p></div>
              <div><p className="font-body text-[11px] font-bold uppercase" style={{ color: C.muted }}>Objetivo · {e.foco}</p><p className="font-body text-sm" style={{ color: C.ink }}>{e.objetivo}</p></div>
              <div><p className="font-body text-[11px] font-bold uppercase" style={{ color: C.muted }}>Serviço a divulgar</p><p className="font-body text-sm" style={{ color: e.servico ? C.ink : C.soft }}>{e.servico || "Cadastre e confirme os serviços na biblioteca"}</p></div>
            </div>
            <p className="font-body text-[11px] font-bold uppercase mt-3" style={{ color: C.muted }}>Três ações práticas</p>
            <ol className="list-decimal ml-5 font-body text-sm space-y-0.5" style={{ color: C.ink }}>{e.acoes.map((a) => <li key={a}>{a}</li>)}</ol>
            <div className="rounded-xl p-3 mt-3" style={{ background: "#EDFBF2" }}><p className="font-body text-[11px] font-bold uppercase mb-1" style={{ color: C.green }}>Mensagem pronta</p><Texto>{e.mensagem}</Texto></div>
            <div className="grid sm:grid-cols-3 gap-3 mt-3 font-body text-sm">
              <p><b>Meta:</b> {e.meta}</p><p><b>Dica:</b> {e.dica}</p><p><b>Próximo passo:</b> {e.proximo}</p>
            </div>
            {e.comemorativa && <div className="mt-3"><Aviso tipo="amarelo">🎉 Hoje: {e.comemorativa}</Aviso></div>}
            {reg?.resultado && <div className="mt-3"><Aviso tipo="ok"><b>Resultado:</b> {reg.resultado}</Aviso></div>}
            <div className="flex gap-2 flex-wrap mt-4">
              <Btn icon={Play} onClick={() => { salvarDia({ status: "iniciada" }); K.avisar("Estratégia iniciada. Bom trabalho!"); }}>Iniciar estratégia</Btn>
              <Copiar texto={e.mensagem} rotulo="Copiar mensagem" small={false} />
              <Btn tipo="claro" icon={Target} onClick={() => K.abrir("prospeccao", { publico: e.publico?.chave, objetivo: e.objetivo, status: "realizada" })}>Registrar ação</Btn>
              <Btn tipo="verde" icon={CheckCircle2} onClick={() => setConcluir(true)}>Concluir tarefa</Btn>
            </div>
          </>)}
        </Card>
        <div className="space-y-4">
          <Card style={{ background: C.yellowTint, borderColor: C.yellow }}>
            <p className="font-body text-[11px] font-bold uppercase flex items-center gap-1" style={{ color: C.yellowInk }}><Lightbulb size={13} /> Dica do dia · {e.dicaCat}</p>
            <p className="font-body text-sm mt-1 font-semibold" style={{ color: C.ink }}>{e.dica}</p>
          </Card>
          <Card>
            <div className="flex items-center justify-between mb-2"><p className="font-display font-bold" style={{ color: C.navy }}>Agenda de hoje</p><Btn small tipo="fantasma" onClick={() => K.irPara("agenda")}>Ver tudo</Btn></div>
            {tarefasHoje.length ? tarefasHoje.slice(0, 5).map((t) => <TarefaLinha key={t.id} t={t} K={K} />) : <p className="font-body text-sm" style={{ color: C.soft }}>Nada pendente para hoje. 🎉</p>}
            <Btn small tipo="claro" className="mt-2" icon={CalendarPlus} onClick={() => K.abrir("tarefa", {})}>Nova tarefa</Btn>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI titulo="Atendimentos hoje" valor={kd.atendimentos} sub={`${km.atendimentos} no mês`} icon={ClipboardList} onClick={() => K.irPara("atendimentos")} />
        <KPI titulo="Novos clientes (mês)" valor={km.novos_clientes} icon={UserPlus} onClick={() => K.irPara("clientes")} />
        <KPI titulo="Prospecções (mês)" valor={km.prospeccoes} icon={Target} onClick={() => K.irPara("prospeccao")} />
        <KPI titulo="Retornos pendentes" valor={kd.retornosPendentes} icon={RotateCcw} cor={kd.retornosPendentes ? C.red : C.navy} destaque={kd.retornosPendentes > 0} onClick={() => K.irPara("agenda")} />
        <KPI titulo="Campanhas ativas" valor={camp.length} icon={Megaphone} onClick={() => K.irPara("campanhas")} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-2"><p className="font-display font-bold" style={{ color: C.navy }}>Minhas metas</p><Btn small tipo="fantasma" onClick={() => K.irPara("metas")}>Ver</Btn></div>
          {minhasMetas.length ? minhasMetas.map((m) => { const r = progressoMeta(m, D, K.eu); return <div key={m.id} className="mb-2.5"><div className="flex justify-between font-body text-xs mb-1"><span>{INDICADORES[m.indicador]} ({{ dia: "hoje", semana: "semana", mes: "mês" }[m.periodo]})</span><b>{r.valor}/{m.alvo}</b></div><Barra pct={r.pct} cor={r.pct >= 100 ? C.green : C.navy} /></div>; }) : <p className="font-body text-sm" style={{ color: C.soft }}>O administrador ainda não definiu metas.</p>}
        </Card>
        <Card>
          <div className="flex items-center justify-between mb-2"><p className="font-display font-bold" style={{ color: C.navy }}>Ranking do mês</p><Btn small tipo="fantasma" onClick={() => K.irPara("metas")}>Ver</Btn></div>
          {rk.length ? rk.map((r, i) => <div key={r.user_id} className="flex items-center gap-2 py-1.5 font-body text-sm"><span className="text-lg">{["🥇", "🥈", "🥉"][i]}</span><b className="flex-1 truncate">{r.nome}</b><span style={{ color: C.muted }}>{r.pctMeta != null ? `${r.pctMeta}% da meta` : `${r.atendimentos} atend.`}</span></div>) : <p className="font-body text-sm" style={{ color: C.soft }}>Sem dados ainda.</p>}
        </Card>
        <Card>
          <p className="font-display font-bold mb-2" style={{ color: C.navy }}>Campanhas ativas</p>
          {camp.length ? camp.slice(0, 4).map((c) => <p key={c.id} className="font-body text-sm py-1 border-b last:border-0" style={{ borderColor: C.line }}>📣 {c.nome} <span style={{ color: C.soft }}>· até {br(c.fim)}</span></p>) : <p className="font-body text-sm" style={{ color: C.soft }}>Nenhuma campanha ativa. Veja sugestões no calendário.</p>}
        </Card>
      </div>

      <div>
        <p className="font-display font-bold mb-3" style={{ color: C.navy }}>Atalhos rápidos</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {atalhos.map(([l, I, f]) => (
            <button key={l} onClick={f} className="rounded-2xl bg-white border p-3 flex flex-col items-center gap-2 text-center hover:shadow-md transition active:scale-95" style={{ borderColor: C.line }}>
              <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: C.navyTint }}><I size={20} color={C.navy} /></span>
              <span className="font-body text-[11.5px] font-bold leading-tight" style={{ color: C.ink }}>{l}</span>
            </button>
          ))}
        </div>
      </div>
      {concluir && <Modal onFechar={() => setConcluir(false)} titulo="Concluir a estratégia de hoje" largura="max-w-md"><ConcluirDia onSalvar={async (r) => { await salvarDia({ status: "concluida", resultado: r }); setConcluir(false); K.avisar("Estratégia concluída! 👏"); }} inicial={reg?.resultado} /></Modal>}
    </div>
  );
}
function ConcluirDia({ onSalvar, inicial }) {
  const [r, setR] = useState(inicial || "");
  return <><Campo label="Resultado do dia"><textarea rows={4} value={r} onChange={(e) => setR(e.target.value)} className={inp} style={inpS} placeholder="Quantos contatos, quem demonstrou interesse, próximos passos..." /></Campo><div className="flex justify-end mt-4"><Btn tipo="verde" icon={CheckCircle2} onClick={() => onSalvar(r)}>Concluir</Btn></div></>;
}

// ============================================================================= ATENDIMENTOS
export function Atendimentos({ K }) {
  const { D } = K;
  const [f, setF] = useState({ busca: "", cat: "", res: "", per: "mes", meus: false });
  const p = f.per === "tudo" ? { de: "0000", ate: "9999" } : periodo(f.per);
  const nomeM = Object.fromEntries(D.membros.map((m) => [m.user_id, m.nome]));
  const lista = D.atendimentos.filter((a) => a.data >= p.de && a.data <= p.ate && (!f.cat || a.categoria === f.cat) && (!f.res || a.resultado === f.res) && (!f.meus || a.atendente === K.eu)
    && (!f.busca || `${a.numero} ${a.cliente_nome || ""} ${a.servico_texto || ""} ${a.descricao || ""}`.toLowerCase().includes(f.busca.toLowerCase())));
  return (
    <div>
      <Titulo eyebrow="Registro" title="Atendimentos" sub="Cada atendimento recebe um número automático. Nada de senhas, tokens ou dados de cartão aqui." direita={<Btn tipo="amarelo" icon={PlusCircle} onClick={() => K.abrir("atendimento", {})}>+ NOVO ATENDIMENTO</Btn>} />
      <div className="flex gap-2 flex-wrap mb-3">
        <div className="relative flex-1 min-w-[180px]"><Search size={15} className="absolute left-3 top-3" color={C.soft} /><input value={f.busca} onChange={(e) => setF({ ...f, busca: e.target.value })} placeholder="Buscar nº, cliente, serviço..." className={inp} style={{ ...inpS, paddingLeft: 34 }} /></div>
        <select value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })} className={inp} style={{ ...inpS, width: "auto" }}><option value="">Categoria</option>{Object.entries(CATEGORIAS_ATEND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select value={f.res} onChange={(e) => setF({ ...f, res: e.target.value })} className={inp} style={{ ...inpS, width: "auto" }}><option value="">Resultado</option>{Object.entries(RESULTADOS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </div>
      <div className="flex gap-1.5 flex-wrap mb-4">{[["dia", "Hoje"], ["semana", "Semana"], ["mes", "Mês"], ["ano", "Ano"], ["tudo", "Tudo"]].map(([k, l]) => <Chip key={k} ativo={f.per === k} onClick={() => setF({ ...f, per: k })}>{l}</Chip>)}<Chip ativo={f.meus} cor={C.yellowInk} onClick={() => setF({ ...f, meus: !f.meus })}>Só os meus</Chip><span className="font-body text-xs self-center" style={{ color: C.soft }}>{lista.length} atendimento(s)</span></div>
      {lista.length ? <div className="space-y-2">{lista.slice(0, 200).map((a) => (
        <Card key={a.id} className="!p-3.5" onClick={() => K.abrir("atendimento", a)}>
          <div className="flex items-start gap-3">
            <span className="font-display font-extrabold text-sm px-2 py-1 rounded-lg" style={{ background: C.navyTint, color: C.navy }}>#{a.numero}</span>
            <div className="flex-1 min-w-0">
              <p className="font-body text-sm font-bold truncate" style={{ color: C.ink }}>{a.cliente_nome || "Cliente não identificado"} <span className="font-normal" style={{ color: C.soft }}>· {CATEGORIAS_ATEND[a.categoria]}</span></p>
              <p className="font-body text-xs truncate" style={{ color: C.muted }}>{a.servico_texto || "—"}{a.descricao ? ` · ${a.descricao}` : ""}</p>
              <p className="font-body text-[11px]" style={{ color: C.soft }}>{br(a.data)} {String(a.hora || "").slice(0, 5)} · {nomeM[a.atendente] || "—"}</p>
            </div>
            <div className="text-right shrink-0"><Chip cor={{ concluido: C.green, orientado: C.blue, encaminhado: C.navy2, aguardando: C.yellowInk, nao_concluido: C.red }[a.resultado]}>{RESULTADOS[a.resultado]}</Chip>{a.status !== "finalizado" && <p className="font-body text-[10px] mt-1" style={{ color: C.soft }}>{STATUS_ATEND[a.status]}</p>}</div>
          </div>
        </Card>))}</div> : <Vazio>Nenhum atendimento neste filtro.</Vazio>}
    </div>
  );
}

export function ModalAtendimento({ K, atendimento, inicial, onFechar }) {
  const { D } = K;
  const agora = new Date();
  const [v, setV] = useState(() => atendimento ? { ...atendimento, hora: String(atendimento.hora || "").slice(0, 5) } : { data: hoje(), hora: `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`, categoria: "pagamentos", resultado: "concluido", status: "finalizado", ...(inicial || {}) });
  const [sal, setSal] = useState(false); const [erro, setErro] = useState("");
  const [busca, setBusca] = useState(v.cliente_nome || "");
  const cli = D.clientes.find((c) => c.id === v.cliente_id);
  const sug = busca && !v.cliente_id ? D.clientes.filter((c) => `${c.nome} ${c.whatsapp || ""}`.toLowerCase().includes(busca.toLowerCase())).slice(0, 5) : [];
  const servs = D.servicos.filter((s) => s.ativo);
  const salvar = async (retorno) => {
    setSal(true); setErro("");
    try {
      const s = servs.find((x) => x.id === v.servico_id);
      const dados = { data: v.data, hora: v.hora || null, cliente_id: v.cliente_id || null, cliente_nome: cli?.nome || busca || null, categoria: v.categoria, servico_id: v.servico_id || null, servico_texto: s?.nome || v.servico_texto || null, descricao: v.descricao || null, resultado: v.resultado, status: v.status, satisfacao: v.satisfacao ? Number(v.satisfacao) : null, observacoes: v.observacoes || null };
      const r = await K.salvar("atendimentos", atendimento?.id, dados);
      if (v.cliente_id && v.resultado === "concluido") await K.salvar("clientes", v.cliente_id, { oportunidade: "atendido" }).catch(() => {});
      if (retorno && v.data_retorno) await K.salvar("tarefas", null, { titulo: `Retorno: ${dados.cliente_nome || `atendimento #${r.numero}`}`, tipo: "retorno", data: v.data_retorno, prioridade: "alta", cliente_id: v.cliente_id || null, observacao: `Atendimento #${r.numero}: ${dados.servico_texto || ""}` });
      K.avisar(atendimento ? "Atendimento atualizado." : `Atendimento #${r.numero} registrado.`); onFechar();
    } catch (e) { setErro(msgErro(e)); } finally { setSal(false); }
  };
  return (
    <Modal onFechar={onFechar} titulo={atendimento ? `Atendimento #${atendimento.numero}` : "Novo atendimento"} largura="max-w-3xl">
      <div className="space-y-3">
        <Campo label="Cliente">
          {cli ? <div className="flex items-center justify-between rounded-xl border px-3 py-2.5" style={{ borderColor: C.line }}><span className="font-body text-sm"><b>{cli.nome}</b> {cli.whatsapp && <span style={{ color: C.soft }}>· {cli.whatsapp}</span>}</span><button className="font-body text-xs font-bold" style={{ color: C.navy2 }} onClick={() => { setV({ ...v, cliente_id: null }); setBusca(""); }}>trocar</button></div>
            : <div className="relative"><input value={busca} onChange={(e) => setBusca(e.target.value)} className={inp} style={inpS} placeholder="Digite o nome (ou deixe sem identificação)" />
              {sug.length > 0 && <div className="absolute z-10 inset-x-0 top-full mt-1 bg-white border rounded-xl shadow-lg overflow-hidden" style={{ borderColor: C.line }}>{sug.map((c) => <button key={c.id} className="w-full text-left px-3 py-2 font-body text-sm hover:bg-gray-50" onClick={() => { setV({ ...v, cliente_id: c.id }); setBusca(c.nome); }}>{c.nome} <span style={{ color: C.soft }}>{c.whatsapp}</span></button>)}</div>}
              {busca && !sug.length && <button className="font-body text-xs font-bold mt-1" style={{ color: C.navy2 }} onClick={() => K.abrir("cliente", { nome: busca, origem: "balcao" })}>+ Cadastrar "{busca}" como cliente</button>}</div>}
        </Campo>
        <Campos v={v} set={setV} campos={[
          { k: "data", l: "Data", t: "date" }, { k: "hora", l: "Horário", t: "time" },
          { k: "categoria", l: "Categoria", t: "select", semVazio: true, op: Object.entries(CATEGORIAS_ATEND) },
          servs.length ? { k: "servico_id", l: "Serviço procurado", t: "select", vazio: "Outro / não listado", op: servs.map((s) => [s.id, s.nome]) } : { k: "servico_texto", l: "Serviço procurado", dica: "Cadastre os serviços autorizados no painel do administrador." },
          !v.servico_id && servs.length ? { k: "servico_texto", l: "Descreva o serviço" } : null,
          { k: "descricao", l: "Descrição", t: "textarea", full: true, ph: "O que o cliente precisava e o que foi feito (sem senhas, tokens ou dados de cartão)" },
          { k: "resultado", l: "Resultado", t: "select", semVazio: true, op: Object.entries(RESULTADOS) },
          { k: "status", l: "Status", t: "select", semVazio: true, op: Object.entries(STATUS_ATEND) },
          { k: "satisfacao", l: "Satisfação do cliente (opcional)", t: "select", op: [["5", "⭐⭐⭐⭐⭐ Excelente"], ["4", "⭐⭐⭐⭐ Boa"], ["3", "⭐⭐⭐ Regular"], ["2", "⭐⭐ Ruim"], ["1", "⭐ Péssima"]] },
          { k: "observacoes", l: "Observações", t: "textarea" },
          !atendimento && ["aguardando", "encaminhado", "orientado"].includes(v.resultado) ? { k: "data_retorno", l: "Agendar retorno para", t: "date", dica: "Cria a tarefa de retorno na agenda." } : null,
        ]} />
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <div className="flex justify-between gap-2 pt-1">
          {atendimento && K.admin ? <Btn small tipo="perigo" icon={Trash2} onClick={async () => { if (!confirm("Excluir este atendimento?")) return; try { await K.apagar("atendimentos", atendimento.id); onFechar(); } catch (e) { setErro(msgErro(e)); } }}>Excluir</Btn> : <span />}
          <Btn tipo="amarelo" big icon={Save} disabled={sal} onClick={() => salvar(true)}>{sal ? "Salvando..." : "Salvar atendimento"}</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================= CLIENTES (CRM)
export function Clientes({ K }) {
  const { D } = K;
  const [f, setF] = useState({ busca: "", publico: "", op: "", lista: "todos" });
  const LISTAS = { todos: ["Todos", () => true], retorno: ["Retorno atrasado", (c) => c.proximo_contato && c.proximo_contato <= hoje() && !c.nao_contatar], interessados: ["Interessados", (c) => c.oportunidade === "interessado"], novos: ["Novos (30 dias)", (c) => dias(c.criado_em) <= 30], nao: ["Não contatar", (c) => c.nao_contatar] };
  const lista = D.clientes.filter((c) => LISTAS[f.lista][1](c) && (!f.publico || c.publico === f.publico) && (!f.op || c.oportunidade === f.op) && (!f.busca || `${c.nome} ${c.whatsapp || ""} ${c.telefone || ""} ${c.email || ""}`.toLowerCase().includes(f.busca.toLowerCase())));
  const pubNome = Object.fromEntries(K.publicos.map((p) => [p.chave, p.nome]));
  return (
    <div>
      <Titulo eyebrow="CRM" title={`Clientes (${D.clientes.length})`} sub="Cadastro com o mínimo necessário. CPF só quando realmente precisar." direita={<Btn icon={UserPlus} onClick={() => K.abrir("cliente", null)}>Cadastrar cliente</Btn>} />
      <div className="flex gap-1.5 flex-wrap mb-3">{Object.entries(LISTAS).map(([k, [l, fn]]) => <Chip key={k} ativo={f.lista === k} onClick={() => setF({ ...f, lista: k })}>{l} ({D.clientes.filter(fn).length})</Chip>)}</div>
      <div className="flex gap-2 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[180px]"><Search size={15} className="absolute left-3 top-3" color={C.soft} /><input value={f.busca} onChange={(e) => setF({ ...f, busca: e.target.value })} placeholder="Buscar nome, telefone, e-mail..." className={inp} style={{ ...inpS, paddingLeft: 34 }} /></div>
        <select value={f.publico} onChange={(e) => setF({ ...f, publico: e.target.value })} className={inp} style={{ ...inpS, width: "auto" }}><option value="">Categoria</option>{K.publicos.map((p) => <option key={p.chave} value={p.chave}>{p.nome}</option>)}</select>
        <select value={f.op} onChange={(e) => setF({ ...f, op: e.target.value })} className={inp} style={{ ...inpS, width: "auto" }}><option value="">Oportunidade</option>{Object.entries(OPORTUNIDADE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </div>
      {lista.length ? <div className="grid md:grid-cols-2 gap-2">{lista.slice(0, 300).map((c) => (
        <Card key={c.id} className="!p-3.5" onClick={() => K.abrir("cliente", c)}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><p className="font-body text-sm font-bold truncate" style={{ color: C.ink }}>{c.nome}</p><p className="font-body text-xs truncate" style={{ color: C.muted }}>{pubNome[c.publico] || "Sem categoria"} · {ORIGENS[c.origem] || "—"}</p>
              <p className="font-body text-[11px]" style={{ color: c.proximo_contato && c.proximo_contato <= hoje() ? C.red : C.soft }}>{c.proximo_contato ? `Próximo contato: ${br(c.proximo_contato)}` : "Sem retorno agendado"}</p></div>
            <div className="flex flex-col items-end gap-1"><Chip cor={{ nova: C.navy2, interessado: C.yellowInk, acompanhamento: C.blue, atendido: C.green, sem_interesse: C.soft }[c.oportunidade]}>{OPORTUNIDADE[c.oportunidade]}</Chip>{c.nao_contatar && <Chip cor={C.red}>não contatar</Chip>}</div>
          </div>
        </Card>))}</div> : <Vazio>Nenhum cliente neste filtro.</Vazio>}
    </div>
  );
}

export function ModalCliente({ K, cliente, inicial, onFechar }) {
  const { D } = K;
  const novo = !cliente;
  const [v, setV] = useState(() => ({ origem: "balcao", oportunidade: "nova", interesses: [], ...(inicial || {}), ...(cliente || {}) }));
  const [aba, setAba] = useState(novo ? "dados" : "resumo");
  const [erro, setErro] = useState(""); const [sal, setSal] = useState(false);
  const dup = useMemo(() => { const z = soDig(v.whatsapp || v.telefone).slice(-11), cpf = soDig(v.cpf); return D.clientes.find((c) => c.id !== cliente?.id && ((z.length >= 10 && c.zap_digitos === z) || (cpf && c.cpf_digitos === cpf))); }, [v.whatsapp, v.telefone, v.cpf]);
  const servs = D.servicos.filter((s) => s.ativo);
  const salvar = async () => {
    if (!v.nome?.trim()) { setErro("Informe o nome."); return; }
    if (dup && !v._mesmo) { setErro("Já existe um cliente com este telefone/CPF. Abra o cadastro existente ou confirme que é outra pessoa."); return; }
    setSal(true); setErro("");
    try {
      const d = {}; for (const [k, x] of Object.entries(v)) if (!["id", "criado_em", "atualizado_em", "cpf_digitos", "zap_digitos"].includes(k) && !k.startsWith("_")) d[k] = x === "" ? null : x;
      const r = await K.salvar("clientes", cliente?.id, d);
      if (v.proximo_contato && v.proximo_contato !== cliente?.proximo_contato && !v.nao_contatar) await K.salvar("tarefas", null, { titulo: `Retorno: ${r.nome}`, tipo: "retorno", data: v.proximo_contato, prioridade: "media", cliente_id: r.id });
      K.avisar(novo ? "Cliente cadastrado." : "Cliente atualizado."); onFechar(r);
    } catch (e) { setErro(msgErro(e)); } finally { setSal(false); }
  };
  const atual = cliente ? D.clientes.find((c) => c.id === cliente.id) || cliente : null;
  const hist = atual ? [
    ...D.atendimentos.filter((a) => a.cliente_id === atual.id).map((a) => ({ d: `${a.data}T${a.hora || "00:00"}`, t: `📋 Atendimento #${a.numero} · ${RESULTADOS[a.resultado]}`, x: [a.servico_texto, a.descricao].filter(Boolean).join(" · ") })),
    ...D.prospeccoes.filter((p) => p.cliente_id === atual.id).map((p) => ({ d: p.data, t: `🎯 Prospecção · ${p.tipo}`, x: [p.objetivo, p.resultado].filter(Boolean).join(" · ") })),
    ...D.tarefas.filter((t) => t.cliente_id === atual.id).map((t) => ({ d: t.data, t: `${t.concluida ? "✅" : "⏳"} ${t.titulo}`, x: t.observacao || "" })),
  ].sort((a, b) => String(b.d).localeCompare(String(a.d))) : [];
  return (
    <Modal onFechar={() => onFechar()} titulo={novo ? "Cadastrar cliente" : atual.nome} largura="max-w-3xl">
      {!novo && <div className="flex gap-1.5 mb-4 flex-wrap">{[["resumo", "Resumo"], ["dados", "Editar"], ["historico", `Histórico (${hist.length})`]].map(([k, l]) => <Chip key={k} ativo={aba === k} onClick={() => setAba(k)}>{l}</Chip>)}</div>}
      {!novo && aba === "resumo" && (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-2 font-body text-sm">
            <p><b>WhatsApp:</b> {atual.whatsapp || "—"}</p><p><b>Telefone:</b> {atual.telefone || "—"}</p><p><b>E-mail:</b> {atual.email || "—"}</p>
            <p><b>Categoria:</b> {K.publicos.find((p) => p.chave === atual.publico)?.nome || "—"}</p><p><b>Oportunidade:</b> {OPORTUNIDADE[atual.oportunidade]}</p>
            <p><b>Próximo contato:</b> {br(atual.proximo_contato)}</p><p><b>Interesses:</b> {(atual.interesses || []).join(", ") || "—"}</p><p><b>Cadastro:</b> {br(atual.criado_em)}</p>
          </div>
          {atual.observacoes && <Aviso>{atual.observacoes}</Aviso>}
          {atual.nao_contatar && <Aviso tipo="erro">Este cliente pediu para não receber contatos de divulgação.</Aviso>}
          <div className="flex gap-2 flex-wrap">
            <Btn small tipo="amarelo" icon={PlusCircle} onClick={() => { onFechar(); K.abrir("atendimento", { cliente_id: atual.id, cliente_nome: atual.nome }); }}>Registrar atendimento</Btn>
            <Btn small tipo="claro" icon={CalendarPlus} onClick={() => { onFechar(); K.abrir("tarefa", { tipo: "retorno", titulo: `Retorno: ${atual.nome}`, cliente_id: atual.id }); }}>Agendar retorno</Btn>
            {!atual.nao_contatar && (atual.whatsapp || atual.telefone) && <Zap numero={atual.whatsapp || atual.telefone} texto={gerarMensagem({ tipo: "retorno", estilo: "amigavel", nome: atual.nome, atendente: K.nome, horario: D.config.horario })} />}
          </div>
        </div>
      )}
      {(novo || aba === "dados") && (
        <div className="space-y-3">
          {dup && <Aviso tipo="amarelo">Já existe: <b>{dup.nome}</b>. <button className="underline font-bold" onClick={() => { onFechar(); setTimeout(() => K.abrir("cliente", dup), 30); }}>Abrir cadastro existente</button>
            <label className="flex items-center gap-1.5 mt-1"><input type="checkbox" checked={!!v._mesmo} onChange={(e) => setV({ ...v, _mesmo: e.target.checked })} /> É outra pessoa (cadastrar mesmo assim)</label></Aviso>}
          <Campos v={v} set={setV} campos={[
            { k: "nome", l: "Nome", req: true, full: true }, { k: "whatsapp", l: "WhatsApp", t: "tel", im: "tel" }, { k: "telefone", l: "Telefone", t: "tel" }, { k: "email", l: "E-mail", t: "email" },
            { k: "cpf", l: "CPF (somente se necessário)", dica: "Não é obrigatório. Use só quando houver necessidade real." }, { k: "endereco", l: "Endereço", full: true },
            { k: "publico", l: "Categoria (público)", t: "select", op: K.publicos.map((p) => [p.chave, `${p.emoji || ""} ${p.nome}`]) }, { k: "origem", l: "Origem do contato", t: "select", op: Object.entries(ORIGENS) },
            { k: "responsavel", l: "Responsável", t: "select", op: D.membros.map((m) => [m.user_id, m.nome]) }, { k: "oportunidade", l: "Classificação da oportunidade", t: "select", semVazio: true, op: Object.entries(OPORTUNIDADE) },
            { k: "interesses", l: "Interesses", t: "multi", full: true, op: servs.length ? servs.map((s) => [s.nome, s.nome]) : [["Pagamentos", "Pagamentos"], ["Orientação", "Orientação"], ["Atendimento rural", "Atendimento rural"], ["Pessoa jurídica", "Pessoa jurídica"]] },
            { k: "proximo_contato", l: "Próximo contato", t: "date", dica: "Cria um retorno na agenda." }, { k: "observacoes", l: "Observações", t: "textarea", full: true },
            { k: "consentimento", l: "Consentimento", t: "checkbox", texto: "Autorizou receber contatos e novidades do correspondente." },
            { k: "nao_contatar", l: "Não contatar", t: "checkbox", texto: "Pediu para não receber contatos de divulgação." },
          ]} />
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <div className="flex justify-between">{!novo && K.admin ? <Btn small tipo="perigo" icon={Trash2} onClick={async () => { if (!confirm("Excluir este cliente? Os atendimentos continuam registrados sem o vínculo.")) return; await K.apagar("clientes", cliente.id); onFechar(); }}>Excluir</Btn> : <span />}<Btn icon={Save} onClick={salvar} disabled={sal}>{sal ? "Salvando..." : "Salvar"}</Btn></div>
        </div>
      )}
      {!novo && aba === "historico" && (hist.length ? <div className="space-y-2">{hist.map((h, i) => <div key={i} className="rounded-xl border px-3 py-2" style={{ borderColor: C.line }}><p className="font-body text-xs font-bold" style={{ color: C.navy2 }}>{br(h.d)} · {h.t}</p>{h.x && <p className="font-body text-sm">{h.x}</p>}</div>)}</div> : <Vazio><History size={16} className="inline" /> Nenhum registro ainda.</Vazio>)}
    </Modal>
  );
}

// ============================================================================= AGENDA E TAREFAS
const TIPOS_TAREFA = { retorno: "Retorno", visita: "Visita", prospeccao: "Prospecção", pendencia: "Pendência", lembrete: "Lembrete", campanha: "Campanha" };
function TarefaLinha({ t, K }) {
  const atras = t.data < hoje();
  return (
    <div className="flex items-center gap-2.5 py-2 border-b last:border-0" style={{ borderColor: C.line }}>
      <button onClick={async () => { await K.salvar("tarefas", t.id, { concluida: !t.concluida, concluida_em: !t.concluida ? new Date().toISOString() : null }); if (!t.concluida) K.avisar("Tarefa concluída ✓"); }} className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: t.concluida ? C.green : C.line, background: t.concluida ? C.green : "#fff" }}>{t.concluida && <CheckCircle2 size={14} color="#fff" />}</button>
      <button className="flex-1 min-w-0 text-left" onClick={() => K.abrir("tarefa", t)}>
        <p className={`font-body text-sm font-semibold truncate ${t.concluida ? "line-through" : ""}`} style={{ color: t.concluida ? C.soft : C.ink }}>{t.titulo}</p>
        <p className="font-body text-[11px]" style={{ color: atras && !t.concluida ? C.red : C.soft }}>{TIPOS_TAREFA[t.tipo]} · {br(t.data)}{t.hora ? ` ${String(t.hora).slice(0, 5)}` : ""}{atras && !t.concluida ? " · atrasada" : ""}</p>
      </button>
      {t.prioridade === "alta" && !t.concluida && <Flag size={14} color={C.red} />}
    </div>
  );
}
export function Agenda({ K }) {
  const { D } = K;
  const [vis, setVis] = useState("dia");
  const [f, setF] = useState({ tipo: "", meus: true, concluidas: false });
  const p = vis === "atrasadas" ? { de: "0000", ate: iso(new Date(Date.now() - 864e5)) } : periodo(vis);
  const lista = D.tarefas.filter((t) => (vis === "atrasadas" ? t.data <= p.ate && !t.concluida : t.data >= p.de && t.data <= p.ate) && (!f.tipo || t.tipo === f.tipo) && (!f.meus || !t.responsavel || t.responsavel === K.eu) && (f.concluidas || !t.concluida))
    .sort((a, b) => a.data.localeCompare(b.data) || String(a.hora || "").localeCompare(String(b.hora || "")) || ({ alta: 0, media: 1, baixa: 2 }[a.prioridade] - { alta: 0, media: 1, baixa: 2 }[b.prioridade]));
  const porDia = lista.reduce((m, t) => { (m[t.data] = m[t.data] || []).push(t); return m; }, {});
  const atrasadas = D.tarefas.filter((t) => !t.concluida && t.data < hoje() && (!f.meus || !t.responsavel || t.responsavel === K.eu)).length;
  return (
    <div>
      <Titulo eyebrow="Organização" title="Agenda e tarefas" sub="Retornos, visitas, prospecções, pendências e lembretes." direita={<Btn icon={CalendarPlus} onClick={() => K.abrir("tarefa", {})}>Nova tarefa</Btn>} />
      <div className="flex gap-1.5 flex-wrap mb-3">{[["dia", "Hoje"], ["semana", "Semana"], ["mes", "Mês"], ["atrasadas", `Atrasadas (${atrasadas})`]].map(([k, l]) => <Chip key={k} ativo={vis === k} cor={k === "atrasadas" ? C.red : C.navy} onClick={() => setVis(k)}>{l}</Chip>)}</div>
      <div className="flex gap-1.5 flex-wrap mb-4">{[["", "Todos os tipos"], ...Object.entries(TIPOS_TAREFA)].map(([k, l]) => <Chip key={k || "x"} ativo={f.tipo === k} cor={C.navy2} onClick={() => setF({ ...f, tipo: k })}>{l}</Chip>)}
        <Chip ativo={f.meus} cor={C.yellowInk} onClick={() => setF({ ...f, meus: !f.meus })}>Só as minhas</Chip><Chip ativo={f.concluidas} cor={C.green} onClick={() => setF({ ...f, concluidas: !f.concluidas })}>Mostrar concluídas</Chip></div>
      {Object.keys(porDia).length ? Object.entries(porDia).map(([d, ts]) => (
        <Card key={d} className="mb-3"><p className="font-display font-bold mb-1" style={{ color: d === hoje() ? C.yellowInk : d < hoje() ? C.red : C.navy }}>{SEMANA[new Date(`${d}T12:00`).getDay()]}, {br(d)}{d === hoje() ? " · hoje" : ""}</p>{ts.map((t) => <TarefaLinha key={t.id} t={t} K={K} />)}</Card>
      )) : <Vazio>Nenhuma tarefa neste período. 🎉</Vazio>}
    </div>
  );
}
export function ModalTarefa({ K, tarefa, inicial, onFechar }) {
  const [v, setV] = useState(tarefa ? { ...tarefa, hora: tarefa.hora ? String(tarefa.hora).slice(0, 5) : "" } : { tipo: "lembrete", prioridade: "media", data: hoje(), responsavel: K.eu, ...(inicial || {}) });
  const [erro, setErro] = useState("");
  const salvar = async () => {
    if (!v.titulo) { setErro("Informe o título."); return; }
    try { const d = {}; for (const [k, x] of Object.entries(v)) if (!["id", "criado_em"].includes(k)) d[k] = x === "" ? null : x; if (d.concluida && !tarefa?.concluida) d.concluida_em = new Date().toISOString(); if (!d.concluida) d.concluida_em = null; await K.salvar("tarefas", tarefa?.id, d); K.avisar("Tarefa salva."); onFechar(); } catch (e) { setErro(msgErro(e)); }
  };
  return (
    <Modal onFechar={onFechar} titulo={tarefa ? "Tarefa" : "Nova tarefa"}>
      <Campos v={v} set={setV} campos={[
        { k: "titulo", l: "Título", req: true, full: true }, { k: "tipo", l: "Tipo", t: "select", semVazio: true, op: Object.entries(TIPOS_TAREFA) }, { k: "prioridade", l: "Prioridade", t: "select", semVazio: true, op: [["alta", "Alta"], ["media", "Média"], ["baixa", "Baixa"]] },
        { k: "data", l: "Data", t: "date" }, { k: "hora", l: "Horário", t: "time" },
        { k: "cliente_id", l: "Cliente", t: "select", op: K.D.clientes.map((c) => [c.id, c.nome]) }, { k: "responsavel", l: "Responsável", t: "select", op: K.D.membros.map((m) => [m.user_id, m.nome]) },
        { k: "observacao", l: "Observação", t: "textarea", full: true }, tarefa ? { k: "concluida", l: "Situação", t: "checkbox", texto: "Concluída" } : null,
      ]} />
      {erro && <div className="mt-3"><Aviso tipo="erro">{erro}</Aviso></div>}
      <div className="flex justify-between mt-4">{tarefa ? <Btn small tipo="perigo" icon={Trash2} onClick={async () => { await K.apagar("tarefas", tarefa.id); onFechar(); }}>Excluir</Btn> : <span />}<Btn icon={Save} onClick={salvar}>Salvar</Btn></div>
    </Modal>
  );
}
