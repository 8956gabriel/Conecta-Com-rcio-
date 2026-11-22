import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, History, FileSpreadsheet, FileDown, Send, Bot, Trash2, Save, Trophy, Flame, Pencil } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { supabase, supabaseConfigurado } from "../supabaseClient";
import { C, Titulo, Btn, Card, KPI, Aviso, Chip, Vazio, Selo, Modal, Campos, Campo, inputCls, inputSty, Texto, chamarIA } from "./ui.jsx";
import { msgErro, SITUACAO_PROPOSTA } from "./acoes.jsx";
import { STATUS_CLIENTE, ORIGENS, ATIVIDADES, CATEGORIAS, ROTINA_PADRAO } from "./dados.js";
import { indicadores, serieMensal, radar, gerarDia, hojeISO, dataBR, moeda, diasEntre, isoData, agrupar, MES_NOME, SEMANA, metaRealizado, INDICADORES_META, exportarExcel, exportarPDF, dataLocal } from "./motor.js";

const COR_SIT = { novo: "#5C7186", em_contato: "#0A5AA8", documentacao: "#D97706", em_analise: "#9333EA", concedido: "#1E8E5A", negado: "#B4462F", excluido: "#8896A6" };

// ============================================================================= GESTÃO DE PROPOSTAS
export function AbaPropostasCentral({ K }) {
  const [f, setF] = useState({ busca: "", st: "abertas", linha: "" });
  const [hist, setHist] = useState(null);
  const lista = (K.propostas || []).filter((p) => p.status !== "excluido"
    && (f.st === "todas" || (f.st === "abertas" ? !["concedido", "negado"].includes(p.status) : p.status === f.st))
    && (!f.linha || p.linha_id === f.linha)
    && (!f.busca || `${p.nome} ${p.numero || ""}`.toLowerCase().includes(f.busca.toLowerCase())))
    .sort((a, b) => String(b.atualizado_em || b.criado_em).localeCompare(String(a.atualizado_em || a.criado_em)));
  const cliPorId = Object.fromEntries(K.d.clientes.map((c) => [c.id, c]));
  return (
    <div>
      <Titulo eyebrow="Operações reais" title="Gestão de propostas" sub="Mesma base do painel do Fomento (inclusive as importadas do FomentoNet). Aqui você completa orçamentos, fornecedores, documentação, pendências, encaminhamento, contratação e liberação."
        direita={<Btn icon={Plus} onClick={() => K.abrir("proposta", { cliente: {} })}>Nova proposta</Btn>} />
      <div className="flex gap-2 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[180px]"><Search size={15} className="absolute left-3 top-3" color={C.soft} /><input value={f.busca} onChange={(e) => setF({ ...f, busca: e.target.value })} placeholder="Buscar nome ou número..." className={inputCls} style={{ ...inputSty, paddingLeft: 34 }} /></div>
        <select value={f.linha} onChange={(e) => setF({ ...f, linha: e.target.value })} className={inputCls} style={{ ...inputSty, width: "auto" }}><option value="">Todas as linhas</option>{(K.linhas || []).map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}</select>
      </div>
      <div className="flex gap-1.5 flex-wrap mb-4">{[["abertas", "Em andamento"], ["todas", "Todas"], ...Object.entries(SITUACAO_PROPOSTA).filter(([k]) => k !== "excluido")].map(([k, l]) => <Chip key={k} ativo={f.st === k} onClick={() => setF({ ...f, st: k })}>{l}</Chip>)}</div>
      {lista.length ? <div className="rounded-2xl border overflow-hidden bg-white" style={{ borderColor: C.line }}><div className="overflow-x-auto"><table className="w-full font-body text-sm">
        <thead><tr className="text-left text-[11px] uppercase" style={{ background: C.blueTint2, color: C.muted }}><th className="px-3 py-2">Proposta</th><th className="px-3 py-2">Linha</th><th className="px-3 py-2">Solicitado</th><th className="px-3 py-2">Situação</th><th className="px-3 py-2">Pendências</th><th className="px-3 py-2">Atualizada</th><th className="px-3 py-2"></th></tr></thead>
        <tbody>{lista.map((p) => { const parada = !["concedido", "negado"].includes(p.status) && diasEntre(p.atualizado_em || p.criado_em) >= 15; return (
          <tr key={p.id} className="border-t hover:bg-blue-50/40 cursor-pointer" style={{ borderColor: C.line }} onClick={() => K.abrir("proposta", p)}>
            <td className="px-3 py-2"><b>{p.nome}</b><div className="text-xs" style={{ color: C.soft }}>{p.numero}{p.cliente_id ? " · na carteira" : ""}{cliPorId[p.cliente_id]?.atividade ? ` · ${cliPorId[p.cliente_id].atividade}` : ""}</div></td>
            <td className="px-3 py-2 text-xs">{K.nomeLinha(p.linha_id, p.linha_fomentonet)}</td>
            <td className="px-3 py-2 whitespace-nowrap">{moeda(p.valor_solicitado)}</td>
            <td className="px-3 py-2"><Chip cor={COR_SIT[p.status]}>{SITUACAO_PROPOSTA[p.status]}</Chip>{p.data_contratacao && <Chip cor={C.green}>contratada</Chip>}{p.data_liberacao && <Chip cor="#166534">liberada</Chip>}</td>
            <td className="px-3 py-2 text-xs max-w-[200px] truncate" style={{ color: p.pendencias ? C.danger : C.soft }}>{p.pendencias || "—"}</td>
            <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: parada ? C.danger : C.muted }}>{diasEntre(p.atualizado_em || p.criado_em)}d atrás</td>
            <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}><Btn small tipo="fantasma" icon={History} title="Histórico" onClick={() => setHist(p)} /></td>
          </tr>); })}</tbody></table></div></div> : <Vazio>Nenhuma proposta neste filtro.</Vazio>}
      {hist && <ModalHistorico proposta={hist} onFechar={() => setHist(null)} />}
    </div>
  );
}
function ModalHistorico({ proposta, onFechar }) {
  const [itens, setItens] = useState(null);
  useEffect(() => { if (!supabaseConfigurado) { setItens([]); return; } supabase.from("fomento_historico").select("*").eq("proposta_id", proposta.id).order("criado_em", { ascending: false }).then(({ data }) => setItens(data || [])); }, [proposta.id]);
  return (
    <Modal aberto onFechar={onFechar} titulo={`Histórico · ${proposta.numero || proposta.nome}`}>
      {!itens ? <p className="font-body text-sm">Carregando...</p> : itens.length ? itens.map((h) => (
        <div key={h.id} className="border-l-2 pl-3 pb-3" style={{ borderColor: C.blueHex }}>
          <p className="font-body text-xs font-bold" style={{ color: C.blueHex }}>{new Date(h.criado_em).toLocaleString("pt-BR")}</p>
          <p className="font-body text-sm">{h.acao === "status" ? `${SITUACAO_PROPOSTA[h.de_status] || h.de_status} → ${SITUACAO_PROPOSTA[h.para_status] || h.para_status}` : h.detalhe || h.acao}{h.acao === "status" && h.detalhe ? ` · ${h.detalhe}` : ""}</p>
        </div>)) : <Vazio>Sem histórico registrado.</Vazio>}
    </Modal>
  );
}

// ============================================================================= CONCESSÕES
export function AbaConcessoes({ K }) {
  const pv = (K.propostas || []).filter((p) => p.status === "concedido");
  const aguardContr = pv.filter((p) => !p.data_contratacao);
  const aguardLib = pv.filter((p) => p.data_contratacao && !p.data_liberacao);
  const liberadas = pv.filter((p) => p.data_liberacao).sort((a, b) => b.data_liberacao.localeCompare(a.data_liberacao));
  const ano = new Date().getFullYear();
  const serie = serieMensal({ ...K.d, propostas: K.propostas || [], interesses: [] }, ano);
  const Col = ({ titulo, lista, cor, acao, valor }) => (
    <div className="rounded-2xl p-3" style={{ background: `${cor}10` }}>
      <p className="font-display font-bold text-sm" style={{ color: cor }}>{titulo} ({lista.length})</p>
      <p className="font-body text-xs mb-2" style={{ color: C.muted }}>{moeda(lista.reduce((s, p) => s + Number(valor(p) || 0), 0))}</p>
      <div className="space-y-2">{lista.slice(0, 30).map((p) => (
        <Card key={p.id} className="!p-3" onClick={() => K.abrir("proposta", p)}>
          <p className="font-body text-sm font-bold" style={{ color: C.ink }}>{p.nome}</p>
          <p className="font-body text-xs" style={{ color: C.muted }}>{K.nomeLinha(p.linha_id, p.linha_fomentonet)} · {moeda(valor(p))}</p>
          <p className="font-body text-[11px]" style={{ color: C.soft }}>{p.data_liberacao ? `Liberado em ${dataBR(p.data_liberacao)}` : p.data_contratacao ? `Contratado em ${dataBR(p.data_contratacao)} · há ${diasEntre(p.data_contratacao)}d` : `Aprovado ${p.data_decisao ? `em ${dataBR(p.data_decisao)}` : ""}`}</p>
          {acao && <p className="font-body text-[11px] font-bold mt-1" style={{ color: C.blueHex }}>{acao} ›</p>}
        </Card>))}{!lista.length && <p className="font-body text-xs" style={{ color: C.soft }}>Nenhuma.</p>}</div>
    </div>
  );
  return (
    <div>
      <Titulo eyebrow="Do aprovado ao dinheiro na mão" title="Acompanhamento de concessões" sub="Aprovação → contrato assinado → crédito efetivamente liberado. Clique para registrar datas e valores." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPI titulo="Aprovadas" valor={pv.length} cor={C.green} />
        <KPI titulo="Aguardando contrato" valor={aguardContr.length} cor={C.yellowInk} />
        <KPI titulo="Aguardando liberação" valor={aguardLib.length} cor={C.yellowInk} />
        <KPI titulo={`Liberado em ${ano}`} valor={moeda(liberadas.filter((p) => p.data_liberacao.startsWith(String(ano))).reduce((s, p) => s + Number(p.valor_liberado || 0), 0))} cor={C.green} destaque />
      </div>
      <div className="grid md:grid-cols-3 gap-3 mb-5">
        <Col titulo="Aprovadas · aguardando contrato" lista={aguardContr} cor="#D97706" acao="Registrar contratação" valor={(p) => p.valor_aprovado ?? p.valor_concedido ?? p.valor_solicitado} />
        <Col titulo="Contratadas · aguardando liberação" lista={aguardLib} cor="#0A5AA8" acao="Registrar liberação" valor={(p) => p.valor_contratado} />
        <Col titulo="Crédito liberado" lista={liberadas} cor="#1E8E5A" valor={(p) => p.valor_liberado} />
      </div>
      <Card><p className="font-display font-bold mb-3" style={{ color: C.ink }}>Valor liberado por mês · {ano}</p>
        <ResponsiveContainer width="100%" height={220}><BarChart data={serie}><CartesianGrid strokeDasharray="3 3" stroke="#EEF3F8" /><XAxis dataKey="mes" fontSize={11} /><YAxis fontSize={11} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} /><Tooltip formatter={(v) => moeda(v)} /><Bar dataKey="valorLiberado" name="Liberado" fill="#1E8E5A" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Card>
    </div>
  );
}

// ============================================================================= METAS E DESAFIOS
export function AbaMetas({ K }) {
  const dados = { ...K.d, propostas: K.propostas || [], interesses: K.interesses || [] };
  const [nova, setNova] = useState(null);
  const [rotinaEd, setRotinaEd] = useState(false);
  const rotina = K.cfgCentral.rotina || ROTINA_PADRAO;
  const metas = K.d.metas.filter((m) => m.ativo);
  // sequência de dias úteis com ação concluída
  let seq = 0; for (let i = 0; i < 60; i++) { const d = isoData(new Date(Date.now() - i * 864e5)); const dw = dataLocal(d).getDay(); if (dw === 0 || dw === 6) continue; if (K.d.dias.find((x) => x.data === d)?.status === "concluida") seq++; else if (i > 0) break; }
  const semanas = Array.from({ length: 8 }, (_, i) => { const fim = new Date(); fim.setDate(fim.getDate() - 7 * (7 - i)); const ini = new Date(fim); ini.setDate(fim.getDate() - 6); const k = indicadores(dados, { de: isoData(ini), ate: isoData(fim) }); return { sem: `${String(ini.getDate()).padStart(2, "0")}/${String(ini.getMonth() + 1).padStart(2, "0")}`, atendimentos: k.atendimentos, propostas: k.propostasIniciadas, novos: k.novosPeriodo }; });
  const hojeDw = new Date().getDay();
  return (
    <div>
      <Titulo eyebrow="Desempenho" title="Metas e desafios do agente" direita={<Btn icon={Plus} onClick={() => setNova({ periodo: "semana", indicador: "visitas", alvo: 5 })}>Nova meta</Btn>} />
      <div className="grid md:grid-cols-3 gap-3 mb-5">
        <Card style={{ borderColor: C.yellow, background: C.yellowTint }}><p className="font-body text-[11px] font-bold uppercase" style={{ color: C.yellowInk }}>Desafio de hoje · {SEMANA[hojeDw]}</p><p className="font-display font-extrabold text-lg mt-1" style={{ color: C.ink }}>{rotina[hojeDw]?.foco}</p><p className="font-body text-sm" style={{ color: C.muted }}>{rotina[hojeDw]?.meta}</p></Card>
        <Card><p className="font-body text-[11px] font-bold uppercase" style={{ color: C.muted }}>Sequência</p><p className="font-display font-extrabold text-2xl mt-1 flex items-center gap-1.5" style={{ color: C.ink }}><Flame color="#F97316" /> {seq} dia(s)</p><p className="font-body text-xs" style={{ color: C.soft }}>dias úteis seguidos com ação do calendário concluída</p></Card>
        <Card><p className="font-body text-[11px] font-bold uppercase" style={{ color: C.muted }}>Metas batidas agora</p><p className="font-display font-extrabold text-2xl mt-1 flex items-center gap-1.5" style={{ color: C.ink }}><Trophy color={C.yellow} /> {metas.filter((m) => metaRealizado(m, dados).pct >= 100).length}/{metas.length}</p></Card>
      </div>
      {["dia", "semana", "mes"].map((per) => { const ms = metas.filter((m) => m.periodo === per); if (!ms.length) return null; return (
        <div key={per} className="mb-4"><p className="font-display font-bold mb-2" style={{ color: C.ink }}>{{ dia: "Metas de hoje", semana: "Metas da semana", mes: "Metas do mês" }[per]}</p>
          <div className="grid md:grid-cols-2 gap-2">{ms.map((m) => { const r = metaRealizado(m, dados); const cor = r.pct >= 100 ? C.green : r.pct >= 50 ? C.blueHex : C.yellowInk; return (
            <Card key={m.id} className="!p-3"><div className="flex justify-between items-center"><p className="font-body text-sm font-bold" style={{ color: C.ink }}>{INDICADORES_META[m.indicador]}</p><div className="flex items-center gap-2"><span className="font-body text-sm font-bold" style={{ color: cor }}>{m.indicador === "valor_liberado" ? `${moeda(r.realizado)} / ${moeda(m.alvo)}` : `${r.realizado} / ${Number(m.alvo)}`}</span><button onClick={() => setNova(m)}><Pencil size={13} color={C.soft} /></button></div></div>
              <div className="h-2.5 rounded-full mt-2 overflow-hidden" style={{ background: C.blueTint }}><div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: cor }} /></div></Card>); })}</div></div>); })}
      {!metas.length && <Vazio>Nenhuma meta ativa.</Vazio>}
      <div className="grid lg:grid-cols-2 gap-4 mt-5">
        <Card><div className="flex justify-between items-center mb-2"><p className="font-display font-bold" style={{ color: C.ink }}>Rotina semanal</p><Btn small tipo="claro" icon={Pencil} onClick={() => setRotinaEd(true)}>Editar</Btn></div>
          {[1, 2, 3, 4, 5, 6].map((d) => <div key={d} className="flex gap-2 py-1.5 border-b last:border-0 font-body text-sm" style={{ borderColor: C.line, background: d === hojeDw ? C.yellowTint : undefined }}><b className="w-16 shrink-0">{SEMANA[d]}</b><span>{rotina[d]?.foco}<span className="block text-xs" style={{ color: C.soft }}>{rotina[d]?.meta}</span></span></div>)}</Card>
        <Card><p className="font-display font-bold mb-3" style={{ color: C.ink }}>Evolução das últimas 8 semanas</p>
          <ResponsiveContainer width="100%" height={230}><BarChart data={semanas}><CartesianGrid strokeDasharray="3 3" stroke="#EEF3F8" /><XAxis dataKey="sem" fontSize={10} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="novos" name="Novos clientes" fill="#0A5AA8" /><Bar dataKey="atendimentos" name="Atendimentos" fill="#8896A6" /><Bar dataKey="propostas" name="Propostas" fill="#F5B700" /></BarChart></ResponsiveContainer></Card>
      </div>
      {nova && <ModalMeta K={K} meta={nova} onFechar={() => setNova(null)} />}
      {rotinaEd && <ModalRotina K={K} rotina={rotina} onFechar={() => setRotinaEd(false)} />}
    </div>
  );
}
function ModalMeta({ K, meta, onFechar }) {
  const [v, setV] = useState(meta);
  const salvar = async () => { try { await K.salvar("metas", meta.id, { periodo: v.periodo, indicador: v.indicador, alvo: Number(v.alvo) || 1, ativo: v.ativo !== false }); onFechar(); } catch (e) { K.avisar(/duplicate/i.test(e.message) ? "Já existe meta para este indicador neste período." : msgErro(e), "erro"); } };
  return (
    <Modal aberto onFechar={onFechar} titulo={meta.id ? "Editar meta" : "Nova meta"} largura="max-w-md">
      <Campos campos={[{ k: "periodo", l: "Período", t: "select", semVazio: true, op: [["dia", "Diária"], ["semana", "Semanal"], ["mes", "Mensal"]] }, { k: "indicador", l: "Indicador", t: "select", semVazio: true, op: Object.entries(INDICADORES_META) }, { k: "alvo", l: "Alvo", t: "number" }]} valores={v} set={setV} />
      <div className="flex justify-between mt-4">{meta.id ? <Btn small tipo="perigo" icon={Trash2} onClick={async () => { await K.apagar("metas", meta.id); onFechar(); }}>Excluir</Btn> : <span />}<Btn icon={Save} onClick={salvar}>Salvar</Btn></div>
    </Modal>
  );
}
function ModalRotina({ K, rotina, onFechar }) {
  const [v, setV] = useState(Object.fromEntries([1, 2, 3, 4, 5, 6].flatMap((d) => [[`f${d}`, rotina[d]?.foco || ""], [`m${d}`, rotina[d]?.meta || ""]])));
  const salvar = async () => {
    const r = { ...ROTINA_PADRAO }; for (const d of [1, 2, 3, 4, 5, 6]) r[d] = { foco: v[`f${d}`], meta: v[`m${d}`] };
    const cc = { ...(K.config?.central_config || {}), rotina: r };
    if (supabaseConfigurado) { const { error } = await supabase.from("fomento_modulo_config").update({ central_config: cc }).eq("id", 1); if (error) { K.avisar(K.podeGerir ? msgErro(error) : "Só o gestor do módulo pode alterar a rotina.", "erro"); return; } }
    K.setConfig((c) => ({ ...c, central_config: cc })); K.avisar("Rotina atualizada."); onFechar();
  };
  return <Modal aberto onFechar={onFechar} titulo="Rotina semanal (configurável)"><Campos campos={[1, 2, 3, 4, 5, 6].flatMap((d) => [{ k: `f${d}`, l: `${SEMANA[d]} · foco` }, { k: `m${d}`, l: `${SEMANA[d]} · meta do dia` }])} valores={v} set={setV} /><div className="flex justify-end mt-4"><Btn icon={Save} onClick={salvar}>Salvar</Btn></div></Modal>;
}

// ============================================================================= RELATÓRIOS
const REL = [
  ["diaria", "Prospecção diária"], ["mensal", "Prospecção mensal"], ["segmento", "Clientes por segmento"], ["origem", "Clientes por origem"],
  ["campanha", "Resultados por campanha"], ["linha", "Resultados por linha de crédito"], ["conv_at", "Conversão de atendimento em proposta"],
  ["conv_ap", "Conversão de proposta em aprovação"], ["contratadas", "Operações contratadas"], ["liberadas", "Operações efetivamente liberadas"],
  ["valor", "Valor liberado mensal e anual"], ["desistencia", "Motivos de desistência"], ["reprovacao", "Motivos de reprovação"],
];
function montarRelatorio(id, K, de, ate) {
  const dentro = (d) => d && String(d).slice(0, 10) >= de && String(d).slice(0, 10) <= ate;
  const props = (K.propostas || []).filter((p) => p.status !== "excluido");
  const cli = K.d.clientes, ats = K.d.atendimentos;
  const nl = (p) => K.nomeLinha(p.linha_id, p.linha_fomentonet);
  switch (id) {
    case "diaria": { const dias = []; for (let d = dataLocal(de); d <= dataLocal(ate) && dias.length < 400; d = new Date(d.getTime() + 864e5)) dias.push(isoData(d));
      return { cab: ["Data", "Dia", "Atendimentos", "Visitas/diagnósticos", "Novos clientes", "Propostas", "Ação do calendário"], linhas: dias.map((d) => [dataBR(d), SEMANA[dataLocal(d).getDay()], ats.filter((a) => isoData(a.data) === d).length, ats.filter((a) => isoData(a.data) === d && ["visita", "presencial", "diagnostico"].includes(a.tipo)).length, cli.filter((c) => isoData(c.criado_em) === d).length, props.filter((p) => String(p.data_proposta || p.criado_em).slice(0, 10) === d).length, K.d.dias.find((x) => x.data === d)?.status || "pendente"]).filter((l) => l.slice(2, 6).some((x) => x) || l[6] !== "pendente") }; }
    case "mensal": { const meses = []; for (let d = new Date(dataLocal(de).getFullYear(), dataLocal(de).getMonth(), 1); d <= dataLocal(ate); d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) meses.push(d);
      return { cab: ["Mês", "Novos clientes", "Atendimentos", "Visitas", "Propostas", "Aprovadas", "Contratos", "Liberados", "Valor liberado"], linhas: meses.map((m) => { const a = isoData(m), b = isoData(new Date(m.getFullYear(), m.getMonth() + 1, 0)); const k = indicadores({ ...K.d, propostas: props, interesses: [] }, { de: a, ate: b }); return [`${MES_NOME[m.getMonth()]}/${m.getFullYear()}`, k.novosPeriodo, k.atendimentos, k.visitas, k.propostasIniciadas, k.aprovadas, k.contratos, k.liberados, moeda(k.valorLiberado)]; }) }; }
    case "segmento": { const g = {}; for (const c of cli) { const k = c.atividade || "Não informado"; g[k] = g[k] || [0, 0, 0, 0]; g[k][0]++; if (c.visitado) g[k][1]++; if (props.some((p) => p.cliente_id === c.id)) g[k][2]++; if (["aprovado", "contratado", "liberado"].includes(c.status)) g[k][3]++; }
      return { cab: ["Segmento", "Clientes", "Visitados", "Com proposta", "Aprovados"], linhas: Object.entries(g).sort((a, b) => b[1][0] - a[1][0]).map(([k, v]) => [k, ...v]) }; }
    case "origem": return { cab: ["Origem", "Clientes", "No período"], linhas: agrupar(cli, (c) => ORIGENS[c.origem] || "Não informado").map((x) => [x.nome, x.total, cli.filter((c) => (ORIGENS[c.origem] || "Não informado") === x.nome && dentro(c.criado_em)).length]) };
    case "campanha": return { cab: ["Campanha", "Período", "Clientes", "Atendimentos", "Propostas", "Aprovadas", "Valor liberado"], linhas: K.d.campanhas.map((c) => { const ps = props.filter((p) => p.campanha_id === c.id); return [c.nome, `${dataBR(c.inicio)} a ${dataBR(c.fim)}`, cli.filter((x) => x.campanha_id === c.id).length, ats.filter((a) => a.campanha_id === c.id).length, ps.length, ps.filter((p) => p.status === "concedido").length, moeda(ps.reduce((s, p) => s + Number(p.valor_liberado || 0), 0))]; }) };
    case "linha": { const g = {}; for (const p of props.filter((x) => dentro(x.data_proposta || x.criado_em))) { const k = nl(p); g[k] = g[k] || [0, 0, 0, 0, 0]; g[k][0]++; g[k][1] += Number(p.valor_solicitado || 0); if (p.status === "concedido") g[k][2]++; if (p.status === "negado") g[k][3]++; g[k][4] += Number(p.valor_liberado || 0); }
      return { cab: ["Linha", "Propostas", "Valor solicitado", "Aprovadas", "Reprovadas", "Valor liberado"], linhas: Object.entries(g).map(([k, v]) => [k, v[0], moeda(v[1]), v[2], v[3], moeda(v[4])]) }; }
    case "conv_at": { const comAt = new Set(ats.filter((a) => dentro(a.data)).map((a) => a.cliente_id)); const comProp = [...comAt].filter((id) => props.some((p) => p.cliente_id === id)); const pct = comAt.size ? Math.round((100 * comProp.length) / comAt.size) : 0;
      return { cab: ["Clientes atendidos no período", "Viraram proposta", "Conversão"], linhas: [[comAt.size, comProp.length, `${pct}%`]], extra: { cab: ["Segmento", "Atendidos", "Com proposta", "Conversão"], linhas: Object.entries([...comAt].reduce((m, id) => { const c = cli.find((x) => x.id === id); const k = c?.atividade || "Não informado"; m[k] = m[k] || [0, 0]; m[k][0]++; if (comProp.includes(id)) m[k][1]++; return m; }, {})).map(([k, v]) => [k, v[0], v[1], `${Math.round((100 * v[1]) / v[0])}%`]) } }; }
    case "conv_ap": { const dec = props.filter((p) => ["concedido", "negado"].includes(p.status) && dentro(p.data_decisao || p.atualizado_em)); const ap = dec.filter((p) => p.status === "concedido").length;
      return { cab: ["Decididas no período", "Aprovadas", "Reprovadas", "Taxa de aprovação"], linhas: [[dec.length, ap, dec.length - ap, `${dec.length ? Math.round((100 * ap) / dec.length) : 0}%`]] }; }
    case "contratadas": return { cab: ["Número", "Cliente", "Linha", "Valor contratado", "Data da contratação"], linhas: props.filter((p) => p.data_contratacao && dentro(p.data_contratacao)).map((p) => [p.numero || "", p.nome, nl(p), moeda(p.valor_contratado), dataBR(p.data_contratacao)]) };
    case "liberadas": return { cab: ["Número", "Cliente", "Linha", "Valor liberado", "Data da liberação"], linhas: props.filter((p) => p.data_liberacao && dentro(p.data_liberacao)).map((p) => [p.numero || "", p.nome, nl(p), moeda(p.valor_liberado), dataBR(p.data_liberacao)]) };
    case "valor": { const anos = [...new Set(props.filter((p) => p.data_liberacao).map((p) => p.data_liberacao.slice(0, 4)))].sort(); const linhas = [];
      for (const a of anos) { let tot = 0; for (let m = 1; m <= 12; m++) { const pre = `${a}-${String(m).padStart(2, "0")}`; const v = props.filter((p) => p.data_liberacao?.startsWith(pre)).reduce((s, p) => s + Number(p.valor_liberado || 0), 0); tot += v; if (v) linhas.push([`${MES_NOME[m - 1]}/${a}`, moeda(v)]); } linhas.push([`TOTAL ${a}`, moeda(tot)]); }
      return { cab: ["Período", "Valor liberado"], linhas }; }
    case "desistencia": return { cab: ["Motivo", "Quantidade"], linhas: [...agrupar(cli.filter((c) => c.status === "perdido"), "motivo_perda"), ...agrupar(props.filter((p) => p.motivo_desistencia), "motivo_desistencia").map((x) => ({ ...x, nome: `${x.nome} (proposta)` }))].map((x) => [x.nome, x.total]) };
    case "reprovacao": return { cab: ["Motivo da reprovação", "Quantidade"], linhas: agrupar(props.filter((p) => p.status === "negado" && dentro(p.data_decisao || p.atualizado_em)), (p) => p.motivo_recusa || "Não informado").map((x) => [x.nome, x.total]) };
    default: return { cab: [], linhas: [] };
  }
}
export function AbaRelatorios({ K }) {
  const y = new Date().getFullYear();
  const [p, setP] = useState({ de: `${y}-01-01`, ate: hojeISO() });
  const [sel, setSel] = useState("mensal");
  const [gerando, setGerando] = useState(false);
  const r = montarRelatorio(sel, K, p.de, p.ate);
  const nome = REL.find((x) => x[0] === sel)[1];
  const exp = async (tipo, todos) => {
    setGerando(true);
    try {
      const lista = (todos ? REL : REL.filter((x) => x[0] === sel)).map(([id, n]) => { const x = montarRelatorio(id, K, p.de, p.ate); return [{ nome: n, cabecalho: x.cab, linhas: x.linhas }, ...(x.extra ? [{ nome: `${n} (segmentos)`, cabecalho: x.extra.cab, linhas: x.extra.linhas }] : [])]; }).flat();
      const arq = `relatorio-fomento-${todos ? "completo" : sel}-${p.de}-a-${p.ate}`;
      if (tipo === "xlsx") await exportarExcel(arq, lista);
      else await exportarPDF(arq, todos ? "Relatório comercial completo" : nome, lista.map((l) => ({ titulo: l.nome, cabecalho: l.cabecalho, linhas: l.linhas.length ? l.linhas : [["Sem dados no período"]] })), `Período: ${dataBR(p.de)} a ${dataBR(p.ate)} · dados reais do sistema · CPF/CNPJ não incluídos (LGPD)`);
      if (supabaseConfigurado) supabase.from("fomento_acessos").insert({ acao: "exportou_relatorio_central", referencia: `${todos ? "completo" : sel} ${tipo}` }).then(() => {});
    } catch (e) { K.avisar(`Não foi possível exportar: ${e.message}`, "erro"); } finally { setGerando(false); }
  };
  return (
    <div>
      <Titulo eyebrow="Análises" title="Relatórios comerciais" sub="13 relatórios com dados reais. Exportação em PDF e Excel (sem CPF/CNPJ)."
        direita={<><Btn tipo="claro" icon={FileSpreadsheet} disabled={gerando} onClick={() => exp("xlsx", true)}>Excel completo</Btn><Btn tipo="claro" icon={FileDown} disabled={gerando} onClick={() => exp("pdf", true)}>PDF completo</Btn></>} />
      <div className="flex gap-2 flex-wrap items-end mb-4">
        <Campo label="De"><input type="date" value={p.de} onChange={(e) => setP({ ...p, de: e.target.value })} className={inputCls} style={inputSty} /></Campo>
        <Campo label="Até"><input type="date" value={p.ate} onChange={(e) => setP({ ...p, ate: e.target.value })} className={inputCls} style={inputSty} /></Campo>
        {[["Mês", `${hojeISO().slice(0, 7)}-01`, hojeISO()], ["Ano", `${y}-01-01`, `${y}-12-31`], ["Ciclo Fomento", new Date().getMonth() >= 10 ? `${y}-11-01` : `${y - 1}-11-01`, new Date().getMonth() >= 10 ? `${y + 1}-10-31` : `${y}-10-31`]].map(([l, a, b]) => <Chip key={l} onClick={() => setP({ de: a, ate: b })}>{l}</Chip>)}
      </div>
      <div className="grid lg:grid-cols-[260px_1fr] gap-4">
        <Card className="!p-2 h-fit">{REL.map(([id, n]) => <button key={id} onClick={() => setSel(id)} className="w-full text-left px-3 py-2 rounded-xl font-body text-sm font-semibold" style={{ background: sel === id ? C.blueTint : "transparent", color: sel === id ? C.blueHex : "#425A70" }}>{n}</button>)}</Card>
        <Card>
          <div className="flex justify-between items-center gap-2 flex-wrap mb-3"><p className="font-display font-bold" style={{ color: C.ink }}>{nome}</p><div className="flex gap-2"><Btn small tipo="claro" icon={FileSpreadsheet} disabled={gerando} onClick={() => exp("xlsx")}>Excel</Btn><Btn small tipo="claro" icon={FileDown} disabled={gerando} onClick={() => exp("pdf")}>PDF</Btn></div></div>
          {[{ cab: r.cab, linhas: r.linhas }, ...(r.extra ? [r.extra] : [])].map((t, i) => t.linhas.length ? (
            <div key={i} className="overflow-x-auto mb-3"><table className="w-full font-body text-sm"><thead><tr className="text-left text-[11px] uppercase" style={{ background: C.blueTint2, color: C.muted }}>{t.cab.map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
              <tbody>{t.linhas.map((l, j) => <tr key={j} className="border-t" style={{ borderColor: C.line }}>{l.map((x, k) => <td key={k} className="px-3 py-1.5" style={{ fontWeight: String(l[0]).startsWith("TOTAL") ? 700 : 400 }}>{x}</td>)}</tr>)}</tbody></table></div>
          ) : <Vazio key={i}>Sem dados no período.</Vazio>)}
        </Card>
      </div>
    </div>
  );
}

// ============================================================================= ASSISTENTE INTELIGENTE
const PERGUNTAS = ["O que devo fazer hoje para conseguir novos clientes?", "Quais segmentos ainda não visitei?", "Como encontrar MEIs em Ivatuba?", "Como abordar um comerciante?", "Como conseguir mais propostas?", "Qual linha pode atender este empreendedor?", "Como identificar uma necessidade de investimento?", "Como recuperar uma proposta parada?", "Como melhorar minha conversão?", "Como aumentar o valor de crédito efetivamente liberado?", "Crie uma campanha para o próximo mês.", "Monte meu roteiro de visitas.", "Analise minha carteira e sugira oportunidades."];
function contextoSistema(K) {
  const dados = { ...K.d, propostas: K.propostas || [], interesses: K.interesses || [] };
  const mes = indicadores(dados, { de: `${hojeISO().slice(0, 7)}-01`, ate: hojeISO() });
  const tudo = indicadores(dados, {});
  const dia = gerarDia(hojeISO(), { linhas: K.linhas, agente: K.agente, datasLocais: K.d.datas, ajustes: K.d.dias.find((x) => x.data === hojeISO())?.ajustes });
  const rad = radar({ clientes: K.d.clientes, propostas: K.propostas, interesses: K.interesses, visitas: K.d.visitas }).slice(0, 25);
  const visitados = new Set(K.d.clientes.filter((c) => c.visitado).map((c) => c.atividade));
  const naCarteira = new Set(K.d.clientes.map((c) => c.atividade));
  const nunca = ATIVIDADES.filter((a) => !visitados.has(a.a)).map((a) => `${a.a}${naCarteira.has(a.a) ? " (tem clientes, sem visita)" : ""}`);
  const porStatus = Object.entries(STATUS_CLIENTE).map(([k, s]) => `${s.nome}: ${K.d.clientes.filter((c) => c.status === k).length}`).join("; ");
  const prox = K.d.visitas.filter((v) => v.status === "agendada" && new Date(v.data_hora) >= new Date()).slice(0, 10).map((v) => `${new Date(v.data_hora).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} ${String(v.nome || "").split(" ")[0]} (${v.segmento || "—"}${v.endereco ? `, ${v.endereco}` : ""})`);
  const semVisita = K.d.clientes.filter((c) => !c.visitado && c.status !== "perdido").slice(0, 20).map((c) => `${c.nome.split(" ")[0]} · ${c.atividade || "—"} · ${c.bairro || c.endereco || "sem endereço"}`);
  const linhas = (K.linhas || []).filter((l) => l.ativo !== false).map((l) => `${l.nome}: público ${l.publico_alvo || "—"}; finalidade ${l.finalidade || "—"}; valores ${l.valores || "não cadastrado"}; prazos ${l.prazos || "não cadastrado"}; carência ${l.carencia || "não cadastrado"}; taxas ${l.taxas || "não cadastrado"}`);
  const metas = K.d.metas.filter((m) => m.ativo).map((m) => { const r = metaRealizado(m, dados); return `${INDICADORES_META[m.indicador]} (${m.periodo}): ${r.realizado}/${m.alvo}`; });
  return [
    `Agente: ${K.agente}. Hoje: ${SEMANA[new Date().getDay()]}.`,
    `AÇÃO DO CALENDÁRIO HOJE: ${dia.tema} | segmento ${dia.segmento} | onde: ${dia.onde} | meta: ${dia.meta}`,
    `INDICADORES DO MÊS: novos clientes ${mes.novosPeriodo}, atendimentos ${mes.atendimentos}, visitas ${mes.visitas}, propostas ${mes.propostasIniciadas}, aprovadas ${mes.aprovadas}, contratos ${mes.contratos}, liberado ${moeda(mes.valorLiberado)}.`,
    `TOTAL: ${tudo.totalClientes} clientes na carteira; ${porStatus}. Propostas totais ${tudo.propostasIniciadas}; aprovadas ${tudo.aprovadas}; liberadas ${tudo.liberados} (${moeda(tudo.valorLiberado)}).`,
    `RADAR (prioridades): \n${rad.map((r) => `- [${r.prioridade}] ${r.nome.split(" ")[0]} (${r.sub || r.tipo}): ${r.motivo}`).join("\n") || "vazio"}`,
    `SEGMENTOS SEM NENHUMA VISITA: ${nunca.join(", ")}`,
    `CLIENTES AINDA NÃO VISITADOS: ${semVisita.join(" | ") || "nenhum"}`,
    `PRÓXIMAS VISITAS: ${prox.join(" | ") || "nenhuma"}`,
    `CAMPANHAS: ${K.d.campanhas.map((c) => `${c.nome} (${c.status}, ${dataBR(c.inicio)}–${dataBR(c.fim)})`).join("; ") || "nenhuma"}`,
    `METAS: ${metas.join("; ") || "nenhuma"}`,
    `LINHAS CADASTRADAS (condições oficiais informadas pelo agente):\n${linhas.join("\n")}`,
  ].join("\n");
}
function respostaAutomatica(q, K) {
  const t = q.toLowerCase();
  const dia = gerarDia(hojeISO(), { linhas: K.linhas, agente: K.agente, datasLocais: K.d.datas, ajustes: K.d.dias.find((x) => x.data === hojeISO())?.ajustes });
  const rad = radar({ clientes: K.d.clientes, propostas: K.propostas, interesses: K.interesses, visitas: K.d.visitas });
  if (/hoje|novos clientes|o que devo fazer/.test(t)) return `Plano de hoje (${SEMANA[new Date().getDay()]}):\n1. ${dia.foco}: ${dia.tema}.\n2. Onde encontrar: ${dia.onde}\n3. Meta: ${dia.meta}\n\nPrioridades do radar:\n${rad.slice(0, 5).map((r, i) => `${i + 1}. ${r.nome} — ${r.motivo} ➜ ${r.acao}`).join("\n") || "Nenhuma pendência no radar."}`;
  if (/segmento.*(n[aã]o visitei|ainda)/.test(t)) { const vis = new Set(K.d.clientes.filter((c) => c.visitado).map((c) => c.atividade)); return `Segmentos sem nenhuma visita registrada:\n${ATIVIDADES.filter((a) => !vis.has(a.a)).map((a) => `• ${a.a}`).join("\n")}`; }
  if (/roteiro|rota/.test(t)) { const sv = K.d.clientes.filter((c) => !c.visitado && c.status !== "perdido").slice(0, 8); return sv.length ? `Sugestão de roteiro (clientes ainda não visitados):\n${sv.map((c, i) => `${i + 1}. ${c.nome} — ${c.atividade || "—"} — ${c.endereco || "sem endereço"}`).join("\n")}\n\nNo Mapa de prospecção você monta a rota otimizada e agenda as visitas.` : "Não há clientes sem visita na carteira. Cadastre novos estabelecimentos no Mapa."; }
  if (/parad/.test(t)) { const p = rad.filter((r) => r.grupo === "paradas"); return `${p.length} proposta(s) parada(s):\n${p.slice(0, 8).map((r) => `• ${r.nome}: ${r.motivo}`).join("\n")}\n\nPara recuperar: ligue, confirme o que falta, envie a lista de pendências por escrito e combine uma data.`; }
  return null;
}
export function AbaAssistente({ K }) {
  const [msgs, setMsgs] = useState(() => { try { return JSON.parse(sessionStorage.getItem("central-chat") || "[]"); } catch { return []; } });
  const [txt, setTxt] = useState("");
  const [c, setC] = useState(false);
  const fim = useRef(null);
  useEffect(() => { try { sessionStorage.setItem("central-chat", JSON.stringify(msgs.slice(-30))); } catch { /* */ } fim.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs]);
  const enviar = async (q) => {
    const pergunta = (q ?? txt).trim(); if (!pergunta || c) return;
    setTxt(""); const nova = [...msgs, { role: "user", content: pergunta }]; setMsgs(nova); setC(true);
    try {
      const r = await chamarIA({ modo: "consultor", messages: nova.filter((m) => !m.auto).map(({ role, content }) => ({ role, content })), contexto: contextoSistema(K) });
      setMsgs([...nova, { role: "assistant", content: r }]);
    } catch (e) {
      const auto = respostaAutomatica(pergunta, K);
      setMsgs([...nova, { role: "assistant", auto: true, content: auto ? `${auto}\n\n(Resposta automática do sistema${e.semChave ? " — a IA ainda não está configurada" : ""}.)` : `${e.message}${e.semChave ? "\n\nEnquanto isso, use: Ideias diárias, Radar, Segmentos e Simulador — eles funcionam sem a IA." : ""}` }]);
    } finally { setC(false); }
  };
  return (
    <div>
      <Titulo eyebrow="IA" title="Consultor inteligente do agente de crédito" sub="Considera os dados autorizados do sistema (carteira, radar, metas, calendário, linhas cadastradas). Não vê CPF/CNPJ. Respostas são sugestões." direita={msgs.length > 0 && <Btn small tipo="claro" icon={Trash2} onClick={() => setMsgs([])}>Limpar conversa</Btn>} />
      <Card className="!p-0 overflow-hidden">
        <div className="h-[440px] overflow-y-auto p-4 space-y-3" style={{ background: C.blueTint2 }}>
          {!msgs.length && <div><p className="font-body text-sm mb-3" style={{ color: C.muted }}>Pergunte qualquer coisa ou escolha uma sugestão:</p><div className="flex flex-wrap gap-1.5">{PERGUNTAS.map((p) => <button key={p} onClick={() => enviar(p)} className="font-body text-xs font-semibold px-3 py-1.5 rounded-full border bg-white text-left" style={{ borderColor: C.line, color: C.blueHex }}>{p}</button>)}</div></div>}
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5" style={{ background: m.role === "user" ? C.blueHex : "#fff", color: m.role === "user" ? "#fff" : C.ink, border: m.role === "user" ? "none" : `1px solid ${C.line}` }}>
                {m.role !== "user" && <div className="mb-1"><Selo tipo={m.auto ? "sistema" : "ia"} /></div>}
                <p className="font-body text-sm whitespace-pre-line leading-relaxed">{m.content}</p>
              </div>
            </div>))}
          {c && <div className="flex"><div className="rounded-2xl px-3.5 py-2.5 bg-white border font-body text-sm" style={{ borderColor: C.line, color: C.muted }}><Bot size={14} className="inline mr-1" />pensando...</div></div>}
          <div ref={fim} />
        </div>
        <form className="flex gap-2 p-3 border-t" style={{ borderColor: C.line }} onSubmit={(e) => { e.preventDefault(); enviar(); }}>
          <input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Ex.: Qual linha pode atender uma costureira que quer uma overloque?" className={inputCls} style={inputSty} />
          <Btn type="submit" icon={Send} disabled={c || !txt.trim()}>Enviar</Btn>
        </form>
      </Card>
      {msgs.length > 0 && <div className="flex flex-wrap gap-1.5 mt-3">{PERGUNTAS.slice(0, 6).map((p) => <Chip key={p} onClick={() => enviar(p)}>{p}</Chip>)}</div>}
    </div>
  );
}
