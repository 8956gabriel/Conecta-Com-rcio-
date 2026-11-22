import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Play, CheckCircle2, CalendarPlus, UserPlus, MessageSquarePlus, MessageCircle, FilePlus2, Clock, Pencil, Star, Plus, Sparkles, Save, Trash2, Megaphone, CalendarDays, Search, Wand2 } from "lucide-react";
import { C, Titulo, Btn, Card, Aviso, Chip, Vazio, Selo, Modal, Campos, Campo, inputCls, inputSty, Copiar, BtnWhats, Texto, chamarIA } from "./ui.jsx";
import { msgErro } from "./acoes.jsx";
import { MESES, ATIVIDADES, IDEIAS, CATEGORIAS, atividadePorChave, datasComemorativas, montarMensagem } from "./dados.js";
import { gerarDia, diasDoMes, hojeISO, dataBR, MES_NOME, SEMANA, dataLocal, isoData, campanhaModelo, diasEntre, moeda, linhasSugeridas } from "./motor.js";

const COR_STATUS = { pendente: null, executando: "#0A5AA8", concluida: "#1E8E5A", adiada: "#F5B700" };
const NOME_STATUS = { pendente: "Pendente", executando: "Em execução", concluida: "Concluída", adiada: "Adiada" };

function useDia(K, iso) {
  const reg = K.d.dias.find((x) => x.data === iso);
  const dia = gerarDia(iso, { linhas: K.linhas, agente: K.agente, datasLocais: K.d.datas, ajustes: reg?.ajustes, rotina: K.cfgCentral.rotina || undefined });
  const adiadasPara = K.d.dias.filter((x) => x.adiada_para === iso);
  return { reg, dia, adiadasPara };
}

// ============================================================================= DETALHE DO DIA (usado no calendário e em "Ideias diárias")
export function DetalheDia({ K, iso, compacto }) {
  const { reg, dia, adiadasPara } = useDia(K, iso);
  const [editar, setEditar] = useState(false);
  const [concluir, setConcluir] = useState(false);
  const [adiar, setAdiar] = useState(false);
  const [msgIA, setMsgIA] = useState({ txt: "", c: false, e: "" });
  const status = reg?.status || "pendente";
  const salvarDia = async (dados) => { try { await K.salvar("dias", iso, { data: iso, ajustes: reg?.ajustes || {}, ...dados }); } catch (e) { K.avisar(msgErro(e), "erro"); } };
  const linhaId = dia.linhaIds?.[0];
  const gerarIA = async () => {
    setMsgIA({ txt: "", c: true, e: "" });
    try { setMsgIA({ txt: await chamarIA({ modo: "abordagem", pedido: `Crie uma mensagem de WhatsApp curta para prospectar ${dia.segmento} em Ivatuba, tema: ${dia.tema}. Agente: ${K.agente}.`, contexto: `Segmento: ${dia.segmento}\nPerfil: ${dia.perfil}\nNecessidades: ${dia.necessidades}\nLinha potencial: ${dia.linha}` }), c: false, e: "" }); }
    catch (e) { setMsgIA({ txt: "", c: false, e: e.message }); }
  };
  const Bloco = ({ t, children }) => <div><p className="font-body text-[11px] font-bold uppercase tracking-wide mb-0.5" style={{ color: C.muted }}>{t}</p><div className="font-body text-sm" style={{ color: C.ink }}>{children}</div></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="font-body text-xs font-bold" style={{ color: C.yellowInk }}>{SEMANA[dataLocal(iso).getDay()]}, {dataBR(iso)} · {dia.mesTema} · Semana: {dia.campanha}</p>
          <p className="font-display font-extrabold text-lg mt-0.5" style={{ color: C.ink }}>{dia.tema}</p>
          <div className="flex gap-1.5 flex-wrap mt-1">
            <Chip cor={COR_STATUS[status] || C.muted}>{NOME_STATUS[status]}{reg?.adiada_para ? ` → ${dataBR(reg.adiada_para)}` : ""}</Chip>
            {dia.comemorativa && <Chip cor="#DB2777">🎉 {dia.comemorativa}</Chip>}
            {dia.locais.map((l) => <Chip key={l} cor="#7C3AED">📍 {l}</Chip>)}
            {dia.editado && <Chip cor={C.muted}>✏️ personalizado</Chip>}
            <Selo tipo="sistema" />
          </div>
        </div>
      </div>
      {dia.preparacao && <Aviso tipo="amarelo">⏳ {dia.preparacao}</Aviso>}
      {adiadasPara.length > 0 && <Aviso>Ações adiadas para este dia: {adiadasPara.map((a) => dataBR(a.data)).join(", ")}.</Aviso>}
      {dia.descanso ? <Aviso>Domingo sem campanha: dia de descanso. Use para planejar a semana.</Aviso> : (
        <div className="grid md:grid-cols-2 gap-4">
          <Bloco t="Segmento para prospectar">{dia.segmento} <span style={{ color: C.soft }}>({CATEGORIAS[dia.categoria]?.nome})</span></Bloco>
          <Bloco t="Foco da rotina">{dia.foco}</Bloco>
          <Bloco t="Perfil do cliente ideal">{dia.perfil}</Bloco>
          <Bloco t="Onde encontrar o cliente">{dia.onde}</Bloco>
          <Bloco t="Necessidades a investigar">{dia.necessidades}</Bloco>
          <Bloco t="Possíveis investimentos financiáveis"><ul className="list-disc ml-4">{dia.investimentos.map((i) => <li key={i}>{i}</li>)}</ul></Bloco>
          <Bloco t="Linha potencialmente adequada">{dia.linha} <span className="text-xs" style={{ color: C.soft }}>— confirmar critérios oficiais</span></Bloco>
          <Bloco t="Estratégia de abordagem">{dia.estrategia}</Bloco>
          {!compacto && <Bloco t="Roteiro de conversa"><ol className="list-decimal ml-4 space-y-0.5">{dia.roteiro.map((r, i) => <li key={i}>{r}</li>)}</ol></Bloco>}
          <Bloco t="Perguntas para diagnóstico"><ul className="list-disc ml-4">{dia.perguntas.map((q) => <li key={q}>{q}</li>)}</ul></Bloco>
          <Bloco t="Meta diária"><b>{dia.meta}</b></Bloco>
          <Bloco t="Próxima ação recomendada">{dia.proximaAcao}</Bloco>
          <div className="md:col-span-2 rounded-xl p-3" style={{ background: "#ECFDF3" }}>
            <p className="font-body text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: "#166534" }}>Mensagem para WhatsApp</p>
            <Texto>{dia.mensagem}</Texto>
            <div className="flex gap-2 mt-2 flex-wrap"><Copiar texto={dia.mensagem} /><BtnWhats texto={dia.mensagem} rotulo="Abrir no WhatsApp" /><Btn small tipo="amarelo" icon={Sparkles} onClick={gerarIA} disabled={msgIA.c}>{msgIA.c ? "Gerando..." : "Gerar variação com IA"}</Btn></div>
            {msgIA.e && <div className="mt-2"><Aviso tipo="amarelo">{msgIA.e}</Aviso></div>}
            {msgIA.txt && <div className="mt-2 rounded-lg bg-white p-2"><Selo tipo="ia" /><Texto className="mt-1">{msgIA.txt}</Texto><div className="mt-1"><Copiar texto={msgIA.txt} /></div></div>}
          </div>
        </div>
      )}
      {reg?.resultado && <Aviso tipo="ok"><b>Resultado registrado:</b> {reg.resultado} · {reg.contatos} contato(s), {reg.visitas} visita(s), {reg.novos_clientes} novo(s) cliente(s), {reg.propostas} proposta(s).</Aviso>}
      <div className="flex gap-2 flex-wrap pt-1">
        <Btn small icon={Play} tipo={status === "executando" ? "verde" : "prim"} onClick={() => salvarDia({ status: "executando" })}>Executar ação</Btn>
        <Btn small icon={CheckCircle2} tipo="verde" onClick={() => setConcluir(true)}>Concluir ação</Btn>
        <Btn small icon={CalendarPlus} tipo="amarelo" onClick={() => K.abrir("visita", { data: iso >= hojeISO() ? iso : hojeISO(), segmento: dia.segmento, linha_id: linhaId, objetivo: dia.tema })}>Agendar visita</Btn>
        <Btn small icon={UserPlus} tipo="claro" onClick={() => K.abrir("cliente", { atividade: dia.segmento, categoria: dia.categoria, linha_id: linhaId, origem: "visita", necessidade: dia.investimentos[0] })}>Cadastrar novo cliente</Btn>
        <Btn small icon={MessageSquarePlus} tipo="claro" onClick={() => K.abrir("atendimento", { linha_id: linhaId })}>Registrar atendimento</Btn>
        <Btn small icon={FilePlus2} tipo="claro" onClick={() => K.abrir("proposta", { cliente: { linha_id: linhaId, necessidade: dia.investimentos[0] } })}>Criar proposta</Btn>
        <Btn small icon={Clock} tipo="claro" onClick={() => setAdiar(true)}>Adiar atividade</Btn>
        <Btn small icon={Pencil} tipo="fantasma" onClick={() => setEditar(true)}>Personalizar dia</Btn>
      </div>
      {concluir && <ModalConcluir reg={reg} onFechar={() => setConcluir(false)} onSalvar={async (v) => { await salvarDia({ status: "concluida", ...v }); setConcluir(false); K.avisar("Ação concluída. 👏"); }} />}
      {adiar && <ModalAdiar onFechar={() => setAdiar(false)} onSalvar={async (para) => { await salvarDia({ status: "adiada", adiada_para: para }); setAdiar(false); K.avisar(`Adiada para ${dataBR(para)}.`); }} />}
      {editar && <ModalEditarDia dia={dia} onFechar={() => setEditar(false)} onSalvar={async (aj) => { await salvarDia({ ajustes: aj }); setEditar(false); K.avisar("Dia personalizado."); }} />}
    </div>
  );
}

function ModalConcluir({ reg, onFechar, onSalvar }) {
  const [v, setV] = useState({ resultado: reg?.resultado || "", contatos: reg?.contatos || 0, visitas: reg?.visitas || 0, novos_clientes: reg?.novos_clientes || 0, propostas: reg?.propostas || 0 });
  return (
    <Modal aberto onFechar={onFechar} titulo="Concluir ação e registrar resultado">
      <Campos campos={[{ k: "resultado", l: "Resultado", t: "textarea", full: true, ph: "O que aconteceu, aprendizados, próximos passos" }, { k: "contatos", l: "Contatos feitos", t: "number" }, { k: "visitas", l: "Visitas", t: "number" }, { k: "novos_clientes", l: "Novos clientes", t: "number" }, { k: "propostas", l: "Propostas", t: "number" }]} valores={v} set={setV} />
      <p className="font-body text-xs mt-2" style={{ color: C.soft }}>Os indicadores oficiais do dashboard vêm da carteira e das propostas; estes números são o seu registro do dia.</p>
      <div className="flex justify-end mt-4"><Btn icon={CheckCircle2} tipo="verde" onClick={() => onSalvar({ ...v, contatos: +v.contatos || 0, visitas: +v.visitas || 0, novos_clientes: +v.novos_clientes || 0, propostas: +v.propostas || 0 })}>Concluir</Btn></div>
    </Modal>
  );
}
function ModalAdiar({ onFechar, onSalvar }) {
  const [d, setD] = useState(isoData(new Date(Date.now() + 864e5)));
  return (<Modal aberto onFechar={onFechar} titulo="Adiar atividade" largura="max-w-sm"><Campo label="Nova data"><input type="date" value={d} min={hojeISO()} onChange={(e) => setD(e.target.value)} className={inputCls} style={inputSty} /></Campo><div className="flex justify-end mt-4"><Btn icon={Clock} onClick={() => onSalvar(d)}>Adiar</Btn></div></Modal>);
}
function ModalEditarDia({ dia, onFechar, onSalvar }) {
  const ks = [["tema", "Tema da ação"], ["segmento", "Segmento"], ["perfil", "Perfil do cliente ideal"], ["onde", "Onde encontrar"], ["necessidades", "Necessidades a investigar"], ["linha", "Linha de crédito"], ["estrategia", "Estratégia"], ["mensagem", "Mensagem para WhatsApp"], ["meta", "Meta diária"], ["proximaAcao", "Próxima ação"]];
  const [v, setV] = useState(Object.fromEntries(ks.map(([k]) => [k, dia[k]])));
  return (
    <Modal aberto onFechar={onFechar} titulo="Personalizar o dia">
      <Campos campos={ks.map(([k, l]) => ({ k, l, t: ["tema", "segmento", "linha", "meta"].includes(k) ? "text" : "textarea", full: true }))} valores={v} set={setV} />
      <div className="flex justify-between mt-4"><Btn tipo="perigo" small onClick={() => onSalvar({})}>Voltar ao padrão</Btn><Btn icon={Save} onClick={() => { const aj = {}; for (const [k] of ks) if (v[k] !== dia[k] || dia.editado) aj[k] = v[k]; onSalvar(aj); }}>Salvar</Btn></div>
    </Modal>
  );
}

// ============================================================================= CALENDÁRIO ANUAL
export function AbaCalendario({ K }) {
  const ini = typeof K.param === "string" ? K.param : hojeISO();
  const [ref, setRef] = useState({ ano: Number(ini.slice(0, 4)), mes: Number(ini.slice(5, 7)) });
  const [aberto, setAberto] = useState(typeof K.param === "string" ? K.param : null);
  const [datasAbertas, setDatasAbertas] = useState(false);
  const mes = MESES[ref.mes - 1];
  const dias = diasDoMes(ref.ano, ref.mes);
  const offset = dataLocal(dias[0]).getDay();
  const mudar = (n) => { let m = ref.mes + n, a = ref.ano; if (m < 1) { m = 12; a--; } if (m > 12) { m = 1; a++; } setRef({ ano: a, mes: m }); };
  const regMes = K.d.dias.filter((x) => x.data.startsWith(`${ref.ano}-${String(ref.mes).padStart(2, "0")}`));
  const criarCampanhaSemana = async (i) => {
    const [tema, ativs] = mes.semanas[i];
    const inicio = `${ref.ano}-${String(ref.mes).padStart(2, "0")}-${String(1 + 7 * i).padStart(2, "0")}`;
    const at = atividadePorChave[ativs[0]];
    const linha = linhasSugeridas(K.linhas, at.l)[0];
    try { await K.salvar("campanhas", null, { ...campanhaModelo({ tema, ativ: ativs[0], linha, inicio, agente: K.agente }), segmento: ativs.map((k) => atividadePorChave[k].a).join(", "), origem: "modelo", fim: isoData(new Date(dataLocal(inicio).getTime() + 6 * 864e5)) }); K.avisar("Campanha criada em Campanhas comerciais."); }
    catch (e) { K.avisar(msgErro(e), "erro"); }
  };
  return (
    <div>
      <Titulo eyebrow="365 dias" title="Calendário anual de prospecção" sub="Cada dia traz tema, segmento, onde encontrar, perguntas, mensagem e meta. Personalize os dias, inclua datas locais e registre resultados."
        direita={<Btn tipo="claro" icon={CalendarDays} onClick={() => setDatasAbertas(true)}>Datas locais ({K.d.datas.length})</Btn>} />
      <div className="flex items-center justify-between gap-2 mb-3">
        <Btn tipo="claro" small icon={ChevronLeft} onClick={() => mudar(-1)} />
        <div className="text-center"><p className="font-display font-extrabold text-lg" style={{ color: C.ink }}>{MES_NOME[ref.mes - 1]} {ref.ano}</p><p className="font-body text-xs font-bold" style={{ color: C.yellowInk }}>{mes.tema}</p></div>
        <Btn tipo="claro" small icon={ChevronRight} onClick={() => mudar(1)} />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        {mes.semanas.map(([t, ativs], i) => (
          <Card key={i} className="!p-3">
            <p className="font-body text-[10px] font-bold uppercase" style={{ color: C.soft }}>Semana {i + 1}</p>
            <p className="font-display font-bold text-sm" style={{ color: C.ink }}>{t}</p>
            <p className="font-body text-[11px] mt-0.5" style={{ color: C.muted }}>{ativs.map((k) => atividadePorChave[k].a).join(" · ")}</p>
            <button className="font-body text-[11px] font-bold mt-1.5" style={{ color: C.blueHex }} onClick={() => criarCampanhaSemana(i)}>+ Criar campanha desta semana</button>
          </Card>
        ))}
      </div>
      <div className="flex gap-3 flex-wrap mb-2 font-body text-[11px]" style={{ color: C.muted }}>
        {Object.entries(NOME_STATUS).map(([k, n]) => <span key={k} className="flex items-center gap-1"><i className="w-3 h-3 rounded inline-block" style={{ background: COR_STATUS[k] || "#E5EDF5" }} />{n}</span>)}
        <span>· Concluídas no mês: <b>{regMes.filter((x) => x.status === "concluida").length}</b></span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {SEMANA.map((s) => <p key={s} className="font-body text-[10px] font-bold uppercase text-center py-1" style={{ color: C.soft }}>{s.slice(0, 3)}</p>)}
        {Array.from({ length: offset }).map((_, i) => <span key={`v${i}`} />)}
        {dias.map((iso) => {
          const reg = K.d.dias.find((x) => x.data === iso);
          const dia = gerarDia(iso, { linhas: K.linhas, datasLocais: K.d.datas, ajustes: reg?.ajustes });
          const cor = COR_STATUS[reg?.status];
          const hoje = iso === hojeISO();
          return (
            <button key={iso} onClick={() => setAberto(iso)} className="rounded-xl border p-1.5 text-left min-h-[74px] sm:min-h-[92px] transition hover:shadow-md"
              style={{ borderColor: hoje ? C.yellow : C.line, borderWidth: hoje ? 2 : 1, background: dia.descanso ? "#F8FAFC" : cor ? `${cor}14` : "#fff" }}>
              <div className="flex items-center justify-between"><span className="font-display font-bold text-xs" style={{ color: hoje ? C.yellowInk : C.ink }}>{Number(iso.slice(8))}</span>{cor && <i className="w-2 h-2 rounded-full" style={{ background: cor }} />}</div>
              {dia.comemorativa && <p className="font-body text-[9px] font-bold leading-tight" style={{ color: "#DB2777" }}>🎉 {dia.comemorativa}</p>}
              {dia.locais.length > 0 && <p className="font-body text-[9px] font-bold leading-tight" style={{ color: "#7C3AED" }}>📍 {dia.locais[0]}</p>}
              {!dia.descanso && <p className="font-body text-[9.5px] leading-tight mt-0.5 hidden sm:block" style={{ color: C.muted }}>{CATEGORIAS[dia.categoria]?.emoji} {dia.segmento}</p>}
            </button>
          );
        })}
      </div>
      {aberto && <Modal aberto onFechar={() => setAberto(null)} titulo="Ação comercial do dia" largura="max-w-4xl">
        <div className="flex justify-between mb-3"><Btn small tipo="claro" icon={ChevronLeft} onClick={() => setAberto(isoData(new Date(dataLocal(aberto).getTime() - 864e5)))}>Dia anterior</Btn><Btn small tipo="claro" onClick={() => setAberto(isoData(new Date(dataLocal(aberto).getTime() + 864e5)))}>Próximo dia <ChevronRight size={13} /></Btn></div>
        <DetalheDia K={K} iso={aberto} />
      </Modal>}
      {datasAbertas && <ModalDatasLocais K={K} onFechar={() => setDatasAbertas(false)} />}
    </div>
  );
}

function ModalDatasLocais({ K, onFechar }) {
  const [v, setV] = useState({ data: "", titulo: "", descricao: "", repete_todo_ano: true });
  const add = async () => {
    if (!v.data || !v.titulo) { K.avisar("Informe data e título.", "erro"); return; }
    try { await K.salvar("datas", null, { ...v, descricao: v.descricao || null }); setV({ data: "", titulo: "", descricao: "", repete_todo_ano: true }); } catch (e) { K.avisar(msgErro(e), "erro"); }
  };
  return (
    <Modal aberto onFechar={onFechar} titulo="Datas locais e eventos">
      <Aviso>Cadastre o aniversário de Ivatuba, feiras, festas e eventos municipais com a data oficial. Elas entram no calendário como dias de ação comercial.</Aviso>
      <div className="mt-3"><Campos campos={[{ k: "data", l: "Data", t: "date", req: true }, { k: "titulo", l: "Título", req: true, ph: "Ex.: Aniversário de Ivatuba" }, { k: "descricao", l: "Descrição", full: true }, { k: "repete_todo_ano", l: "Repetição", t: "checkbox", texto: "Repete todo ano" }]} valores={v} set={setV} /></div>
      <div className="flex justify-end mt-3"><Btn icon={Plus} onClick={add}>Adicionar</Btn></div>
      <div className="mt-4 space-y-1.5">
        {K.d.datas.map((x) => <div key={x.id} className="flex items-center justify-between rounded-xl border px-3 py-2 font-body text-sm" style={{ borderColor: C.line }}><span><b>{x.repete_todo_ano ? x.data.slice(8) + "/" + x.data.slice(5, 7) : dataBR(x.data)}</b> · {x.titulo}{x.repete_todo_ano && <span style={{ color: C.soft }}> (todo ano)</span>}</span><button onClick={() => K.apagar("datas", x.id)}><Trash2 size={14} color={C.danger} /></button></div>)}
      </div>
    </Modal>
  );
}

// ============================================================================= IDEIAS DIÁRIAS
export function AbaIdeiasDiarias({ K }) {
  const [iso, setIso] = useState(hojeISO());
  const proximos = Array.from({ length: 7 }, (_, i) => isoData(new Date(Date.now() + i * 864e5)));
  return (
    <div>
      <Titulo eyebrow="Hoje" title="Ideias diárias" sub="O que fazer hoje para encontrar clientes: tema, roteiro, perguntas, mensagem e meta." />
      <div className="flex gap-1.5 flex-wrap mb-4">
        {proximos.map((d) => { const reg = K.d.dias.find((x) => x.data === d); return <Chip key={d} ativo={iso === d} cor={COR_STATUS[reg?.status] || C.blueHex} onClick={() => setIso(d)}>{d === hojeISO() ? "Hoje" : `${SEMANA[dataLocal(d).getDay()].slice(0, 3)} ${d.slice(8)}/${d.slice(5, 7)}`}{reg?.status === "concluida" ? " ✓" : ""}</Chip>; })}
      </div>
      <Card><DetalheDia K={K} iso={iso} /></Card>
    </div>
  );
}

// ============================================================================= BANCO DE IDEIAS
export function AbaBancoIdeias({ K }) {
  const [f, setF] = useState({ cat: "", ativ: "", busca: "", fav: false });
  const [aplicar, setAplicar] = useState(null);
  const [nova, setNova] = useState(false);
  const uso = Object.fromEntries(K.d.ideiasUso.map((u) => [u.chave, u]));
  const proprias = K.d.ideias.map((i) => ({ chave: `p-${i.id}`, propria: i, atividade: i.atividade, categoria: i.categoria, investimento: i.titulo, titulo: i.titulo, onde: "", perfil: "", necessidades: i.oportunidades || "", perguntas: (i.perguntas || "").split("\n").filter(Boolean), estrategia: i.estrategia || "", linhas: [] }));
  const todas = [...proprias, ...IDEIAS];
  const lista = todas.filter((i) => (!f.cat || i.categoria === f.cat) && (!f.ativ || i.atividade === f.ativ) && (!f.fav || uso[i.chave]?.favorita || i.propria?.favorita) && (!f.busca || `${i.titulo} ${i.atividade}`.toLowerCase().includes(f.busca.toLowerCase())));
  const fav = async (i) => {
    try { if (i.propria) await K.salvar("ideias", i.propria.id, { favorita: !i.propria.favorita }); else await K.salvar("ideiasUso", i.chave, { chave: i.chave, favorita: !uso[i.chave]?.favorita, vezes: uso[i.chave]?.vezes || 0, usada_em: uso[i.chave]?.usada_em || null }); } catch (e) { K.avisar(msgErro(e), "erro"); }
  };
  return (
    <div>
      <Titulo eyebrow={`${IDEIAS.length + proprias.length} ideias`} title="Banco de ideias de prospecção" sub="43 atividades com 9 oportunidades de investimento cada, perguntas de diagnóstico e estratégia. Adicione as suas ideias também."
        direita={<Btn icon={Plus} onClick={() => setNova(true)}>Nova ideia</Btn>} />
      <div className="flex gap-2 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[180px]"><Search size={15} className="absolute left-3 top-3" color={C.soft} /><input value={f.busca} onChange={(e) => setF({ ...f, busca: e.target.value })} placeholder="Buscar ideia..." className={inputCls} style={{ ...inputSty, paddingLeft: 34 }} /></div>
        <select value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value, ativ: "" })} className={inputCls} style={{ ...inputSty, width: "auto" }}><option value="">Todas as categorias</option>{Object.entries(CATEGORIAS).filter(([k]) => k !== "outro").map(([k, c]) => <option key={k} value={k}>{c.emoji} {c.nome}</option>)}</select>
        <select value={f.ativ} onChange={(e) => setF({ ...f, ativ: e.target.value })} className={inputCls} style={{ ...inputSty, width: "auto" }}><option value="">Todas as atividades</option>{ATIVIDADES.filter((a) => !f.cat || a.c === f.cat).map((a) => <option key={a.k} value={a.a}>{a.a}</option>)}</select>
        <Chip ativo={f.fav} cor={C.yellowInk} onClick={() => setF({ ...f, fav: !f.fav })}>★ Favoritas</Chip>
      </div>
      <p className="font-body text-xs mb-2" style={{ color: C.soft }}>{lista.length} ideia(s)</p>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {lista.slice(0, 120).map((i) => { const fv = i.propria ? i.propria.favorita : uso[i.chave]?.favorita; return (
          <Card key={i.chave}>
            <div className="flex items-start justify-between gap-2">
              <div><Chip cor={CATEGORIAS[i.categoria]?.cor}>{CATEGORIAS[i.categoria]?.emoji} {i.atividade}</Chip>{i.propria && <Chip cor={C.green}>Minha ideia</Chip>}</div>
              <button onClick={() => fav(i)} title="Favoritar"><Star size={17} fill={fv ? C.yellow : "none"} color={fv ? C.yellow : C.soft} /></button>
            </div>
            <p className="font-display font-bold mt-2" style={{ color: C.ink }}>{i.investimento}</p>
            {i.onde && <p className="font-body text-xs mt-1" style={{ color: C.muted }}><b>Onde:</b> {i.onde}</p>}
            {i.perguntas?.length > 0 && <p className="font-body text-xs mt-1" style={{ color: C.muted }}><b>Pergunte:</b> {i.perguntas.slice(0, 2).join(" · ")}</p>}
            {i.estrategia && <p className="font-body text-xs mt-1" style={{ color: C.muted }}><b>Estratégia:</b> {i.estrategia}</p>}
            {i.linhas?.length > 0 && <p className="font-body text-xs mt-1" style={{ color: C.blueHex }}><b>Linhas para avaliar:</b> {linhasSugeridas(K.linhas, i.linhas).map((l) => l.nome).join(", ") || "—"}</p>}
            {uso[i.chave]?.vezes > 0 && <p className="font-body text-[11px] mt-1" style={{ color: C.soft }}>Usada {uso[i.chave].vezes}x · última em {dataBR(uso[i.chave].usada_em)}</p>}
            <div className="flex gap-1.5 mt-3 flex-wrap">
              <Btn small onClick={() => setAplicar(i)} icon={CalendarDays}>Usar no calendário</Btn>
              <Btn small tipo="claro" icon={UserPlus} onClick={() => K.abrir("cliente", { atividade: i.atividade, categoria: i.categoria, necessidade: i.investimento, origem: "visita" })}>Cliente</Btn>
              {i.propria && <Btn small tipo="perigo" icon={Trash2} onClick={() => K.apagar("ideias", i.propria.id)} />}
            </div>
          </Card>); })}
      </div>
      {lista.length > 120 && <p className="font-body text-xs mt-3 text-center" style={{ color: C.soft }}>Mostrando 120 de {lista.length}. Use os filtros para refinar.</p>}
      {aplicar && <ModalAplicarIdeia K={K} ideia={aplicar} uso={uso[aplicar.chave]} onFechar={() => setAplicar(null)} />}
      {nova && <ModalNovaIdeia K={K} onFechar={() => setNova(false)} />}
    </div>
  );
}
function ModalAplicarIdeia({ K, ideia, uso, onFechar }) {
  const [d, setD] = useState(hojeISO());
  const ok = async () => {
    const reg = K.d.dias.find((x) => x.data === d);
    const at = ATIVIDADES.find((a) => a.a === ideia.atividade);
    const aj = { ...(reg?.ajustes || {}), tema: `${ideia.investimento} — ${ideia.atividade}`, segmento: ideia.atividade, ...(ideia.onde ? { onde: ideia.onde } : {}), ...(ideia.perfil ? { perfil: ideia.perfil } : {}), ...(ideia.necessidades ? { necessidades: ideia.necessidades } : {}), ...(ideia.estrategia ? { estrategia: ideia.estrategia } : {}), ...(ideia.perguntas?.length ? { perguntas: ideia.perguntas } : {}), mensagem: montarMensagem("whatsapp", { categoria: ideia.categoria, atividade: ideia.atividade, investimento: ideia.investimento, agente: K.agente }), ...(at ? { ativ: at.k, categoria: at.c } : {}) };
    try {
      await K.salvar("dias", d, { data: d, ajustes: aj, status: reg?.status || "pendente" });
      if (!ideia.propria) await K.salvar("ideiasUso", ideia.chave, { chave: ideia.chave, favorita: !!uso?.favorita, vezes: (uso?.vezes || 0) + 1, usada_em: d });
      K.avisar(`Ideia aplicada em ${dataBR(d)}.`); onFechar();
    } catch (e) { K.avisar(msgErro(e), "erro"); }
  };
  return (<Modal aberto onFechar={onFechar} titulo="Usar ideia no calendário" largura="max-w-sm"><p className="font-body text-sm mb-3">{ideia.titulo}</p><Campo label="Data"><input type="date" value={d} onChange={(e) => setD(e.target.value)} className={inputCls} style={inputSty} /></Campo><div className="flex justify-end mt-4"><Btn onClick={ok}>Aplicar</Btn></div></Modal>);
}
function ModalNovaIdeia({ K, onFechar }) {
  const [v, setV] = useState({ categoria: "comercio" });
  const ok = async () => { if (!v.titulo || !v.atividade) { K.avisar("Informe atividade e título.", "erro"); return; } try { await K.salvar("ideias", null, { ...v, linha_id: v.linha_id || null }); onFechar(); } catch (e) { K.avisar(msgErro(e), "erro"); } };
  return (
    <Modal aberto onFechar={onFechar} titulo="Nova ideia de prospecção">
      <Campos campos={[{ k: "categoria", l: "Categoria", t: "select", semVazio: true, op: Object.entries(CATEGORIAS).map(([k, c]) => [k, c.nome]) }, { k: "atividade", l: "Atividade", req: true }, { k: "titulo", l: "Ideia / oportunidade", req: true, full: true }, { k: "oportunidades", l: "Oportunidades de investimento", t: "textarea", full: true }, { k: "perguntas", l: "Perguntas de diagnóstico (uma por linha)", t: "textarea", full: true }, { k: "estrategia", l: "Estratégia comercial", t: "textarea", full: true }, { k: "linha_id", l: "Linha relacionada", t: "select", op: (K.linhas || []).map((l) => [l.id, l.nome]) }]} valores={v} set={setV} />
      <div className="flex justify-end mt-4"><Btn icon={Save} onClick={ok}>Salvar ideia</Btn></div>
    </Modal>
  );
}

// ============================================================================= CAMPANHAS
const CAMPOS_CAMPANHA = (K) => [
  { k: "nome", l: "Nome da campanha", req: true, full: true },
  { k: "objetivo", l: "Objetivo comercial", t: "textarea", full: true },
  { k: "publico", l: "Público-alvo", t: "textarea" },
  { k: "segmento", l: "Segmento(s)" },
  { k: "linha_id", l: "Linha de crédito relacionada", t: "select", op: (K.linhas || []).map((l) => [l.id, l.nome]) },
  { k: "status", l: "Situação", t: "select", semVazio: true, op: [["planejada", "Planejada"], ["ativa", "Ativa"], ["concluida", "Concluída"], ["arquivada", "Arquivada"]] },
  { k: "inicio", l: "Início", t: "date" }, { k: "fim", l: "Fim", t: "date" },
  { k: "estrategia", l: "Estratégia de prospecção", t: "textarea", full: true, rows: 4 },
  { k: "plano_visitas", l: "Plano de visitas", t: "textarea", full: true, rows: 4 },
  { k: "roteiro", l: "Roteiro de abordagem", t: "textarea", full: true, rows: 4 },
  { k: "mensagens_whatsapp", l: "Mensagens para WhatsApp", t: "textarea", full: true, rows: 5 },
  { k: "textos_redes", l: "Textos para Instagram e Facebook", t: "textarea", full: true, rows: 4 },
  { k: "ideias_artes", l: "Ideias de artes", t: "textarea", full: true },
  { k: "calendario", l: "Calendário de divulgação", t: "textarea", full: true },
  { k: "metas", l: "Metas e indicadores", t: "textarea", full: true },
  { k: "meta_clientes", l: "Meta de novos clientes", t: "number" }, { k: "meta_propostas", l: "Meta de propostas", t: "number" },
];
export function ModalCampanha({ K, campanha, inicial, onFechar }) {
  const [v, setV] = useState(campanha || { status: "planejada", origem: "manual", ...(inicial || {}) });
  const [sal, setSal] = useState(false);
  const salvar = async () => {
    if (!v.nome) { K.avisar("Informe o nome.", "erro"); return; }
    setSal(true);
    const d = {}; for (const [k, x] of Object.entries(v)) if (!["id", "criado_em", "atualizado_em", "criado_por"].includes(k)) d[k] = x === "" ? null : ["meta_clientes", "meta_propostas"].includes(k) && x != null ? Number(x) : x;
    try { await K.salvar("campanhas", campanha?.id, d); K.avisar("Campanha salva."); onFechar(); } catch (e) { K.avisar(msgErro(e), "erro"); } finally { setSal(false); }
  };
  const cli = campanha ? K.d.clientes.filter((c) => c.campanha_id === campanha.id) : [];
  const props = campanha ? (K.propostas || []).filter((p) => p.campanha_id === campanha.id) : [];
  const ats = campanha ? K.d.atendimentos.filter((a) => a.campanha_id === campanha.id) : [];
  return (
    <Modal aberto onFechar={onFechar} titulo={campanha ? campanha.nome : "Nova campanha"} largura="max-w-4xl">
      {campanha && <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {[["Clientes", cli.length, campanha.meta_clientes], ["Atendimentos", ats.length], ["Propostas", props.length, campanha.meta_propostas], ["Aprovadas", props.filter((p) => p.status === "concedido").length]].map(([n, x, m]) => <div key={n} className="rounded-xl p-3" style={{ background: C.blueTint2 }}><p className="font-body text-[11px] font-bold uppercase" style={{ color: C.muted }}>{n}</p><p className="font-display font-extrabold text-xl" style={{ color: C.ink }}>{x}{m ? <span className="text-sm font-bold" style={{ color: C.soft }}> / {m}</span> : ""}</p></div>)}
      </div>}
      {v.origem === "ia" && <div className="mb-3"><Selo tipo="ia" /></div>}
      {v.origem === "modelo" && <div className="mb-3"><Selo tipo="sistema" /></div>}
      <Campos campos={CAMPOS_CAMPANHA(K)} valores={v} set={setV} />
      <div className="flex justify-between mt-4 flex-wrap gap-2">
        {campanha ? <Btn tipo="perigo" small icon={Trash2} onClick={async () => { if (!window.confirm("Excluir esta campanha? Clientes e propostas continuam, só perdem o vínculo.")) return; await K.apagar("campanhas", campanha.id); onFechar(); }}>Excluir</Btn> : <span />}
        <div className="flex gap-2">{v.mensagens_whatsapp && <Copiar texto={v.mensagens_whatsapp} rotulo="Copiar mensagens" small={false} />}<Btn icon={Save} onClick={salvar} disabled={sal}>{sal ? "Salvando..." : "Salvar campanha"}</Btn></div>
      </div>
    </Modal>
  );
}

export function AbaCampanhas({ K }) {
  const [aberta, setAberta] = useState(null);
  const [aba, setAba] = useState("minhas");
  const ano = new Date().getFullYear();
  const comem = [...datasComemorativas(ano), ...datasComemorativas(ano + 1)].filter((c) => diasEntre(c.data) <= 0).slice(0, 13);
  const locais = K.d.datas.map((x) => ({ data: x.repete_todo_ano ? `${x.data.slice(5) >= hojeISO().slice(5) ? ano : ano + 1}-${x.data.slice(5)}` : x.data, titulo: x.titulo, ideia: x.descricao || "Ação comercial no evento local", seg: ["autonomos", "artesanal", "lanchonetes"] })).filter((c) => diasEntre(c.data) <= 0);
  const modeloDe = (c) => { const at = atividadePorChave[c.seg[0]]; const inicio = isoData(new Date(dataLocal(c.data).getTime() - 45 * 864e5)); return { ...campanhaModelo({ tema: `${c.titulo} ${c.data.slice(0, 4)}`, ativ: c.seg[0], linha: linhasSugeridas(K.linhas, at.l)[0], inicio: inicio < hojeISO() ? hojeISO() : inicio, agente: K.agente }), fim: c.data, segmento: c.seg.map((k) => atividadePorChave[k].a).join(", "), objetivo: `${c.ideia}`, origem: "modelo" }; };
  const lista = [...K.d.campanhas].sort((a, b) => (b.inicio || "").localeCompare(a.inicio || ""));
  return (
    <div>
      <Titulo eyebrow="Campanhas" title="Campanhas comerciais" sub="Suas campanhas, o planejamento mensal (4 campanhas por mês) e as datas comemorativas com sugestão pronta."
        direita={<><Btn tipo="amarelo" icon={Sparkles} onClick={() => K.irPara("gerador")}>Gerar com IA</Btn><Btn icon={Plus} onClick={() => setAberta({})}>Nova campanha</Btn></>} />
      <div className="flex gap-1.5 mb-4">{[["minhas", `Minhas campanhas (${lista.length})`], ["mensal", "Planejamento mensal"], ["datas", "Datas comemorativas"]].map(([k, l]) => <Chip key={k} ativo={aba === k} onClick={() => setAba(k)}>{l}</Chip>)}</div>
      {aba === "minhas" && (lista.length ? <div className="grid md:grid-cols-2 gap-3">{lista.map((c) => { const np = (K.propostas || []).filter((p) => p.campanha_id === c.id).length; const nc = K.d.clientes.filter((x) => x.campanha_id === c.id).length; return (
        <Card key={c.id} onClick={() => setAberta(c)}>
          <div className="flex justify-between gap-2"><p className="font-display font-bold" style={{ color: C.ink }}>{c.nome}</p><Chip cor={{ planejada: C.muted, ativa: C.blueHex, concluida: C.green, arquivada: C.soft }[c.status]}>{c.status}</Chip></div>
          <p className="font-body text-xs mt-1" style={{ color: C.muted }}>{dataBR(c.inicio)} a {dataBR(c.fim)} · {c.segmento || "—"} · {K.nomeLinha(c.linha_id, "sem linha")}</p>
          <div className="flex gap-3 mt-2 font-body text-xs" style={{ color: C.ink }}><span>👥 {nc}{c.meta_clientes ? `/${c.meta_clientes}` : ""} clientes</span><span>📝 {np}{c.meta_propostas ? `/${c.meta_propostas}` : ""} propostas</span>{c.origem === "ia" && <Selo tipo="ia" />}</div>
        </Card>); })}</div> : <Vazio>Nenhuma campanha ainda. Crie uma do planejamento mensal, de uma data comemorativa ou gere com IA.</Vazio>)}
      {aba === "mensal" && <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{MESES.map((m) => (
        <Card key={m.m}><p className="font-body text-[11px] font-bold uppercase" style={{ color: C.yellowInk }}>{MES_NOME[m.m - 1]}</p><p className="font-display font-bold" style={{ color: C.ink }}>{m.tema}</p>
          <ol className="mt-2 space-y-1">{m.semanas.map(([t, at], i) => <li key={i} className="font-body text-xs flex items-start justify-between gap-2" style={{ color: C.muted }}><span><b>S{i + 1}:</b> {t} <span style={{ color: C.soft }}>({at.map((k) => atividadePorChave[k].a).join(", ")})</span></span>
            <button className="font-bold shrink-0" style={{ color: C.blueHex }} onClick={() => { const yy = m.m < new Date().getMonth() + 1 ? ano + 1 : ano; const ini = `${yy}-${String(m.m).padStart(2, "0")}-${String(1 + 7 * i).padStart(2, "0")}`; const atv = atividadePorChave[at[0]]; setAberta({ _novo: { ...campanhaModelo({ tema: t, ativ: at[0], linha: linhasSugeridas(K.linhas, atv.l)[0], inicio: ini, agente: K.agente }), segmento: at.map((k) => atividadePorChave[k].a).join(", "), fim: isoData(new Date(dataLocal(ini).getTime() + 6 * 864e5)), origem: "modelo" } }); }}>+ criar</button></li>)}</ol>
        </Card>))}</div>}
      {aba === "datas" && <div className="grid md:grid-cols-2 gap-3">{[...comem, ...locais].sort((a, b) => a.data.localeCompare(b.data)).map((c) => (
        <Card key={c.data + c.titulo}><div className="flex justify-between gap-2"><p className="font-display font-bold" style={{ color: C.ink }}>🎉 {c.titulo}</p><Chip>{dataBR(c.data)} · em {-diasEntre(c.data)} dias</Chip></div>
          <p className="font-body text-xs mt-1" style={{ color: C.muted }}>{c.ideia}</p><p className="font-body text-xs mt-1" style={{ color: C.soft }}>Segmentos: {c.seg.map((k) => atividadePorChave[k]?.a).join(", ")} · ideal começar 45 dias antes.</p>
          <Btn small className="mt-2" icon={Megaphone} onClick={() => setAberta({ _novo: modeloDe(c) })}>Criar campanha</Btn></Card>))}
        {!locais.length && <Aviso>Para o Aniversário de Ivatuba e eventos municipais, cadastre a data oficial em Calendário › Datas locais.</Aviso>}</div>}
      {aberta && <ModalCampanha K={K} campanha={aberta.id ? aberta : null} inicial={aberta._novo} onFechar={() => setAberta(null)} />}
    </div>
  );
}

// ============================================================================= GERADOR DE CAMPANHAS COM IA
export function AbaGeradorCampanha({ K }) {
  const [f, setF] = useState({ tema: "", ativ: "saloes", linha_id: "", inicio: hojeISO(), extra: "" });
  const [res, setRes] = useState(null);
  const [st, setSt] = useState({ c: false, e: "" });
  const gerar = async () => {
    setSt({ c: true, e: "" }); setRes(null);
    const at = atividadePorChave[f.ativ];
    const linha = (K.linhas || []).find((l) => l.id === f.linha_id) || linhasSugeridas(K.linhas, at.l)[0];
    const base = campanhaModelo({ tema: f.tema, ativ: f.ativ, linha, inicio: f.inicio, agente: K.agente });
    try {
      const ctx = [
        `Agente: ${K.agente} · Cidade: Ivatuba-PR e região`,
        `Segmento: ${at.a} · Perfil: ${at.p} · Onde encontrar: ${at.o}`,
        `Oportunidades: ${at.i.join("; ")}`,
        `Linha de crédito: ${linha ? `${linha.nome}. Condições oficiais cadastradas: valores: ${linha.valores || "não cadastrado"}; prazos: ${linha.prazos || "não cadastrado"}; carência: ${linha.carencia || "não cadastrado"}; público: ${linha.publico_alvo || "—"}` : "a definir"}`,
        `Início: ${dataBR(f.inicio)} · duração 4 semanas`,
        `Carteira atual no segmento: ${K.d.clientes.filter((c) => c.atividade === at.a).length} clientes`,
      ].join("\n");
      const txt = await chamarIA({ modo: "campanha", pedido: `Crie a campanha${f.tema ? ` "${f.tema}"` : ""} para ${at.a}. ${f.extra}`, contexto: ctx });
      const json = JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1));
      setRes({ ...base, ...json, linha_id: base.linha_id, inicio: base.inicio, fim: base.fim, origem: "ia" });
      setSt({ c: false, e: "" });
    } catch (e) {
      setRes({ ...base, origem: "modelo" });
      setSt({ c: false, e: e.semChave ? "A IA ainda não está configurada no servidor — montei a campanha com o modelo automático do sistema. Você pode editar tudo antes de salvar." : `A IA não respondeu (${e.message}). Montei com o modelo automático.` });
    }
  };
  return (
    <div>
      <Titulo eyebrow="IA" title="Gerador de campanhas" sub="Monta nome, objetivo, público, linha, estratégia, plano de visitas, roteiro, mensagens, textos para redes, ideias de artes, calendário de divulgação e metas." />
      <Card>
        <div className="grid sm:grid-cols-2 gap-3">
          <Campo label="Tema ou objetivo (opcional)"><input value={f.tema} onChange={(e) => setF({ ...f, tema: e.target.value })} className={inputCls} style={inputSty} placeholder="Ex.: Beleza que cresce em dezembro" /></Campo>
          <Campo label="Segmento"><select value={f.ativ} onChange={(e) => setF({ ...f, ativ: e.target.value })} className={inputCls} style={inputSty}>{Object.entries(CATEGORIAS).filter(([k]) => k !== "outro").map(([k, c]) => <optgroup key={k} label={c.nome}>{ATIVIDADES.filter((a) => a.c === k).map((a) => <option key={a.k} value={a.k}>{a.a}</option>)}</optgroup>)}</select></Campo>
          <Campo label="Linha de crédito"><select value={f.linha_id} onChange={(e) => setF({ ...f, linha_id: e.target.value })} className={inputCls} style={inputSty}><option value="">Sugerir automaticamente</option>{(K.linhas || []).map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}</select></Campo>
          <Campo label="Início"><input type="date" value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} className={inputCls} style={inputSty} /></Campo>
          <Campo label="Instruções extras para a IA" className="sm:col-span-2"><input value={f.extra} onChange={(e) => setF({ ...f, extra: e.target.value })} className={inputCls} style={inputSty} placeholder="Ex.: foco em mulheres, linguagem bem simples, incluir feira da praça" /></Campo>
        </div>
        <div className="flex justify-end mt-4"><Btn tipo="amarelo" icon={Wand2} onClick={gerar} disabled={st.c}>{st.c ? "Gerando campanha..." : "GERAR CAMPANHA"}</Btn></div>
      </Card>
      {st.e && <div className="mt-3"><Aviso tipo="amarelo">{st.e}</Aviso></div>}
      {res && <div className="mt-4"><ModalCampanhaInline K={K} inicial={res} onSalvo={() => { setRes(null); K.irPara("campanhas"); }} /></div>}
    </div>
  );
}
function ModalCampanhaInline({ K, inicial, onSalvo }) {
  const [v, setV] = useState(inicial);
  const salvar = async () => { const d = {}; for (const [k, x] of Object.entries(v)) d[k] = x === "" ? null : ["meta_clientes", "meta_propostas"].includes(k) && x != null ? Number(x) || null : x; try { await K.salvar("campanhas", null, d); K.avisar("Campanha salva."); onSalvo(); } catch (e) { K.avisar(msgErro(e), "erro"); } };
  return (
    <Card style={{ borderColor: C.yellow }}>
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2"><Selo tipo={v.origem === "ia" ? "ia" : "sistema"} /><Btn icon={Save} onClick={salvar}>Salvar campanha</Btn></div>
      <Campos campos={CAMPOS_CAMPANHA(K)} valores={v} set={setV} />
      <div className="flex justify-end mt-4"><Btn icon={Save} onClick={salvar}>Salvar campanha</Btn></div>
    </Card>
  );
}
