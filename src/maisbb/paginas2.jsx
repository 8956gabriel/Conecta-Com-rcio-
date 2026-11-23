import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Pencil, Save, Send, Trash2, Sparkles, ChevronLeft, ChevronRight, Download, RefreshCw, CheckCircle2, Copy, Image as ImageIcon, Eye, EyeOff, Bot, BookOpen } from "lucide-react";
import { C, Titulo, Btn, Card, Aviso, Chip, Vazio, Selo, Modal, Campos, Campo, Copiar, BtnWhats, Texto, inputCls, inputSty, chamarIA } from "../central/ui.jsx";
import { CATEGORIAS_SERVICO, TIPOS_MSG, ESTILOS, CANAIS, gerarMensagem, PERGUNTAS_ASSISTENTE, respostaBase, MESES_PADRAO, CAMPOS_MES, ROTINA_PADRAO, SEMANA, datasComemorativas } from "./conteudo.js";
import { listaPublicos, planoDoDia, planoSalvoOuGerado, mesConteudo, rotina, hojeISO, dataBR, dataLocal, isoData, msgErro, urlArquivo, indicadores, periodo } from "./base.js";
import { FormModal, limpar } from "./formularios.jsx";
import { TarefaLinha } from "./paginas1.jsx";

const NAVY = "#0B2559", AMARELO = "#FCD535";
const MESES_NOME = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export default function Paginas2({ K, pagina }) {
  if (pagina === "servicos") return <Servicos K={K} />;
  if (pagina === "abordagens") return <Abordagens K={K} />;
  if (pagina === "assistente") return <Assistente K={K} />;
  if (pagina === "calendario") return <Calendario K={K} />;
  if (pagina === "campanhas") return <Campanhas K={K} />;
  return <Agenda K={K} />;
}

// ============================================================================= AGENDA E TAREFAS
function Agenda({ K }) {
  const [vis, setVis] = useState("dia");
  const [ref, setRef] = useState(hojeISO());
  const [tipo, setTipo] = useState("");
  const [verFeitas, setVerFeitas] = useState(false);
  const b = dataLocal(ref);
  let de, ate;
  if (vis === "dia") { de = ate = ref; } else if (vis === "semana") { const i = new Date(b); i.setDate(b.getDate() - ((b.getDay() + 6) % 7)); de = isoData(i); ate = isoData(new Date(i.getTime() + 6 * 864e5)); } else { de = `${ref.slice(0, 7)}-01`; ate = isoData(new Date(b.getFullYear(), b.getMonth() + 1, 0)); }
  const mover = (n) => { const x = new Date(b); if (vis === "dia") x.setDate(x.getDate() + n); else if (vis === "semana") x.setDate(x.getDate() + 7 * n); else x.setMonth(x.getMonth() + n); setRef(isoData(x)); };
  const lista = K.d.tarefas.filter((t) => t.data >= de && t.data <= ate && (!tipo || t.tipo === tipo) && (verFeitas || !t.concluida)).sort((a, c) => (a.data + (a.hora || "")).localeCompare(c.data + (c.hora || "")) || ({ alta: 0, media: 1, baixa: 2 }[a.prioridade] - { alta: 0, media: 1, baixa: 2 }[c.prioridade]));
  const atrasadas = K.d.tarefas.filter((t) => !t.concluida && t.data < hojeISO());
  const porDia = lista.reduce((m, t) => { (m[t.data] = m[t.data] || []).push(t); return m; }, {});
  return (
    <div>
      <Titulo eyebrow="Organização" title="Agenda e tarefas" sub="Retornos, visitas, prospecções, pendências e lembretes. Marque como concluída ao terminar." direita={<Btn tipo="amarelo" icon={Plus} onClick={() => K.abrir("tarefa", { data: ref })}>Nova tarefa</Btn>} />
      {atrasadas.length > 0 && <Card className="mb-4" style={{ borderColor: C.danger }}><p className="font-display font-bold mb-1" style={{ color: C.danger }}>⚠ {atrasadas.length} tarefa(s) atrasada(s)</p>{atrasadas.slice(0, 8).map((t) => <TarefaLinha key={t.id} t={t} K={K} />)}</Card>}
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <div className="flex gap-1.5">{[["dia", "Diária"], ["semana", "Semanal"], ["mes", "Mensal"]].map(([k, l]) => <Chip key={k} cor={NAVY} ativo={vis === k} onClick={() => setVis(k)}>{l}</Chip>)}</div>
        <div className="flex items-center gap-2"><Btn small tipo="claro" icon={ChevronLeft} onClick={() => mover(-1)} /><span className="font-body text-sm font-bold" style={{ color: NAVY }}>{de === ate ? `${SEMANA[b.getDay()]}, ${dataBR(de)}` : `${dataBR(de)} – ${dataBR(ate)}`}</span><Btn small tipo="claro" icon={ChevronRight} onClick={() => mover(1)} /><Btn small tipo="fantasma" onClick={() => setRef(hojeISO())}>Hoje</Btn></div>
      </div>
      <div className="flex gap-1.5 flex-wrap mb-4">
        {[["", "Todas"], ["retorno", "Retornos"], ["visita", "Visitas"], ["prospeccao", "Prospecções"], ["pendencia", "Pendências"], ["lembrete", "Lembretes"]].map(([k, l]) => <Chip key={k} cor={NAVY} ativo={tipo === k} onClick={() => setTipo(k)}>{l}</Chip>)}
        <label className="font-body text-xs flex items-center gap-1 ml-2"><input type="checkbox" checked={verFeitas} onChange={(e) => setVerFeitas(e.target.checked)} /> mostrar concluídas</label>
      </div>
      {Object.keys(porDia).length ? Object.entries(porDia).map(([dia, ts]) => <Card key={dia} className="mb-3"><p className="font-display font-bold mb-1" style={{ color: dia === hojeISO() ? "#B8860B" : NAVY }}>{SEMANA[dataLocal(dia).getDay()]}, {dataBR(dia)}{dia === hojeISO() ? " · hoje" : ""}</p>{ts.map((t) => <TarefaLinha key={t.id} t={t} K={K} />)}</Card>) : <Vazio>Nenhuma tarefa no período.</Vazio>}
    </div>
  );
}

// ============================================================================= BIBLIOTECA DE PRODUTOS E SERVIÇOS
const CAMPOS_SERV = [
  { k: "categoria", l: "Categoria", t: "select", semVazio: true, op: CATEGORIAS_SERVICO.map((c) => [c, c]) }, { k: "nome", l: "Nome", req: true },
  { k: "descricao", l: "Descrição", t: "textarea", full: true }, { k: "publico", l: "Público", t: "textarea" }, { k: "finalidade", l: "Finalidade", t: "textarea" },
  { k: "requisitos", l: "Requisitos", t: "textarea" }, { k: "documentos", l: "Documentos", t: "textarea" }, { k: "condicoes", l: "Condições vigentes (copiar do canal oficial)", t: "textarea", full: true },
  { k: "faq", l: "Perguntas frequentes", t: "textarea", full: true }, { k: "orientacoes", l: "Orientações", t: "textarea", full: true },
  { k: "canal_oficial", l: "Canal oficial de consulta", full: true, ph: "Link ou telefone oficial" }, { k: "fonte", l: "Fonte da informação", ph: "Ex.: comunicado oficial, portal do correspondente" }, { k: "verificado_em", l: "Conferido em", t: "date" },
  { k: "ativo", l: "Situação", t: "checkbox", texto: "Ativo (aparece para as atendentes)" },
];
function Servicos({ K }) {
  const [cat, setCat] = useState(""); const [busca, setBusca] = useState(""); const [abrir, setAbrir] = useState(null); const [ver, setVer] = useState(null);
  const lista = K.d.servicos.filter((s) => (K.admin || s.ativo) && (!cat || s.categoria === cat) && (!busca || `${s.nome} ${s.descricao || ""}`.toLowerCase().includes(busca.toLowerCase())));
  const antigos = K.d.servicos.filter((s) => s.ativo && (!s.verificado_em || (Date.now() - dataLocal(s.verificado_em)) / 864e5 > 90));
  return (
    <div>
      <Titulo eyebrow="Biblioteca" title="Produtos e serviços Banco do Brasil" sub="Somente informações oficiais e autorizadas ao correspondente, cadastradas pelo administrador. O sistema não inventa taxas, limites, prazos, convênios ou critérios." direita={K.admin && <Btn icon={Plus} onClick={() => setAbrir({ categoria: CATEGORIAS_SERVICO[0], ativo: true, verificado_em: hojeISO() })}>Cadastrar serviço</Btn>} />
      {K.admin && antigos.length > 0 && <div className="mb-3"><Aviso tipo="amarelo">{antigos.length} item(ns) sem conferência nos últimos 90 dias. Confira no canal oficial e atualize a data.</Aviso></div>}
      <div className="flex gap-2 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[180px]"><Search size={15} className="absolute left-3 top-3" color={C.soft} /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar serviço..." className={inputCls} style={{ ...inputSty, paddingLeft: 34 }} /></div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={inputCls} style={{ ...inputSty, width: "auto" }}><option value="">Todas as categorias</option>{CATEGORIAS_SERVICO.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      {lista.length ? CATEGORIAS_SERVICO.filter((c) => lista.some((s) => s.categoria === c)).map((c) => (
        <div key={c} className="mb-4"><p className="font-display font-bold mb-2" style={{ color: NAVY }}>{c}</p>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{lista.filter((s) => s.categoria === c).map((s) => (
            <Card key={s.id} onClick={() => setVer(s)}><div className="flex justify-between gap-2"><p className="font-body font-bold" style={{ color: NAVY }}>{s.nome}</p>{!s.ativo && <Chip cor="#94A3B8">inativo</Chip>}</div>
              <p className="font-body text-xs mt-1 line-clamp-2" style={{ color: C.muted }}>{s.descricao || "—"}</p>
              <p className="font-body text-[11px] mt-2" style={{ color: C.soft }}>Conferido em {dataBR(s.verificado_em)}</p></Card>))}</div></div>
      )) : <Vazio>{K.admin ? "Nenhum serviço cadastrado. Cadastre os serviços autorizados ao correspondente, com as informações dos canais oficiais do Banco do Brasil." : "Nenhum serviço cadastrado ainda. Peça ao administrador."}</Vazio>}
      {ver && <Modal aberto onFechar={() => setVer(null)} titulo={ver.nome} largura="max-w-3xl">
        <div className="flex gap-2 mb-3 flex-wrap"><Chip cor={NAVY}>{ver.categoria}</Chip><Selo tipo="oficial" /><span className="font-body text-xs" style={{ color: C.soft }}>Conferido em {dataBR(ver.verificado_em)}{ver.fonte ? ` · fonte: ${ver.fonte}` : ""}</span></div>
        <div className="grid sm:grid-cols-2 gap-3">{CAMPOS_SERV.filter((c) => !["categoria", "nome", "ativo", "fonte", "verificado_em"].includes(c.k)).map((c) => <div key={c.k} className={c.full ? "sm:col-span-2" : ""}><p className="font-body text-[11px] font-bold uppercase" style={{ color: C.muted }}>{c.l.replace(" (copiar do canal oficial)", "")}</p><p className="font-body text-sm whitespace-pre-line" style={{ color: ver[c.k] ? C.ink : C.soft }}>{ver[c.k] || "Não informado — consulte o canal oficial."}</p></div>)}</div>
        <div className="flex gap-2 mt-4 flex-wrap"><Btn small tipo="claro" onClick={() => { K.ir("abordagens", { servico: ver.nome }); setVer(null); }}>Gerar mensagem sobre este serviço</Btn>{K.admin && <Btn small icon={Pencil} onClick={() => { setAbrir(ver); setVer(null); }}>Editar</Btn>}</div>
      </Modal>}
      {abrir && <FormModal titulo={abrir.id ? "Editar serviço" : "Cadastrar serviço"} campos={CAMPOS_SERV} inicial={abrir} largura="max-w-3xl" onFechar={() => setAbrir(null)}
        aviso={<Aviso tipo="amarelo">Copie as informações exatamente dos canais oficiais do Banco do Brasil e registre a fonte e a data de conferência.</Aviso>}
        onSalvar={async (v) => { await K.salvar("servicos", abrir.id, limpar(v)); K.avisar("Serviço salvo."); }} onExcluir={abrir.id ? () => K.apagar("servicos", abrir.id) : null} />}
    </div>
  );
}

// ============================================================================= GERADOR DE ABORDAGENS
function Abordagens({ K }) {
  const [f, setF] = useState({ publico: "", tipo: "primeira", servico: K.param?.servico || "", canal: "whatsapp", estilo: "amigavel", nome: "" });
  const [ia, setIa] = useState({ t: "", c: false, e: "" });
  const base = { ...f, atendente: (K.eu?.nome || "").split(" ")[0] };
  const adaptar = async () => {
    setIa({ t: "", c: true, e: "" });
    try { setIa({ t: await chamarIA({ endpoint: "/api/maisbb-ia", modo: "mensagem", pedido: `Reescreva no estilo ${ESTILOS[f.estilo]} para o canal ${CANAIS[f.canal]}, público ${f.publico || "geral"}, objetivo: ${TIPOS_MSG[f.tipo]}.`, contexto: `Mensagem base:\n${gerarMensagem({ ...base })}\nServiço citado (se houver, só o nome, sem condições): ${f.servico || "nenhum"}` }), c: false, e: "" }); }
    catch (e) { setIa({ t: "", c: false, e: e.message }); }
  };
  return (
    <div>
      <Titulo eyebrow="Comunicação" title="Gerador de abordagens e mensagens" sub="8 tipos de mensagem em 5 estilos. As mensagens não citam taxas nem condições: para isso, use a biblioteca oficial." />
      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <Card className="space-y-3 h-fit">
          <Campos campos={[
            { k: "publico", l: "Público", t: "select", op: listaPublicos(K.d).map((p) => [p.nome, p.nome]) }, { k: "tipo", l: "Objetivo", t: "select", semVazio: true, op: Object.entries(TIPOS_MSG) },
            { k: "servico", l: "Serviço", t: "select", op: K.d.servicos.filter((s) => s.ativo).map((s) => [s.nome, s.nome]) }, { k: "canal", l: "Canal", t: "select", semVazio: true, op: Object.entries(CANAIS) },
            { k: "estilo", l: "Estilo de comunicação", t: "select", semVazio: true, op: Object.entries(ESTILOS) }, { k: "nome", l: "Nome do cliente (opcional)" },
          ]} valores={f} set={setF} />
        </Card>
        <div className="space-y-3">
          <Card style={{ borderColor: AMARELO }}><div className="flex justify-between flex-wrap gap-2 mb-2"><p className="font-display font-bold" style={{ color: NAVY }}>{TIPOS_MSG[f.tipo]} · {ESTILOS[f.estilo]}</p><Selo tipo="sistema" /></div>
            <Texto>{gerarMensagem(base)}</Texto>
            <div className="flex gap-2 mt-3 flex-wrap"><Copiar texto={gerarMensagem(base)} rotulo="COPIAR MENSAGEM" small={false} />{f.canal === "whatsapp" && <BtnWhats texto={gerarMensagem(base)} rotulo="Abrir WhatsApp" small={false} />}<Btn tipo="amarelo" icon={Sparkles} onClick={adaptar} disabled={ia.c}>{ia.c ? "Adaptando..." : "Adaptar com IA"}</Btn></div></Card>
          {ia.e && <Aviso tipo="amarelo">{ia.e}</Aviso>}
          {ia.t && <Card><Selo tipo="ia" /><Texto className="mt-2">{ia.t}</Texto><div className="mt-2"><Copiar texto={ia.t} rotulo="COPIAR MENSAGEM" /></div></Card>}
          <Card><p className="font-display font-bold mb-2" style={{ color: NAVY }}>As 5 versões</p>
            <div className="grid md:grid-cols-2 gap-3">{Object.entries(ESTILOS).map(([k, n]) => { const t = gerarMensagem({ ...base, estilo: k }); return <div key={k} className="rounded-xl p-3" style={{ background: "#F5F7FB" }}><p className="font-body text-xs font-bold mb-1" style={{ color: NAVY }}>{n}</p><p className="font-body text-sm whitespace-pre-line">{t}</p><div className="mt-2"><Copiar texto={t} rotulo="COPIAR MENSAGEM" /></div></div>; })}</div></Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================= ASSISTENTE
function contexto(K) {
  const mes = periodo("mes"); const k = indicadores(K.d, mes);
  const hoje = planoSalvoOuGerado(K.d, hojeISO());
  const pubsTrab = new Set([...K.d.prospeccoes.filter((p) => p.data >= mes.de).map((p) => p.publico), ...K.d.clientes.filter((c) => c.criado_em >= mes.de).map((c) => c.categoria)]);
  return [
    `Unidade: ${K.config.nome_unidade || "Mais BB Correspondente Autorizado — Ivatuba/PR"}. Atendente: ${(K.eu?.nome || "").split(" ")[0]}.`,
    `Estratégia de hoje: público ${hoje.publico}; foco ${hoje.foco}; serviço ${hoje.servico}.`,
    `Mês: ${k.atendimentos} atendimentos, ${k.novos_clientes} novos clientes, ${k.prospeccoes} prospecções (${k.contatos} contatos), ${k.retornos} retornos feitos.`,
    `Retornos pendentes: ${K.d.tarefas.filter((t) => !t.concluida && t.tipo === "retorno" && t.data <= hojeISO()).length}.`,
    `Públicos trabalhados no mês: ${[...pubsTrab].filter(Boolean).join(", ") || "nenhum"}.`,
    `SERVIÇOS DA BIBLIOTECA OFICIAL (únicos que podem ser citados):\n${K.d.servicos.filter((s) => s.ativo).map((s) => `- ${s.nome} (${s.categoria}): ${s.descricao || ""} | Condições: ${s.condicoes || "não cadastradas"} | Canal: ${s.canal_oficial || "—"}`).join("\n") || "nenhum cadastrado"}`,
    `BASE DE CONHECIMENTO DO ADMINISTRADOR:\n${K.d.conhecimento.filter((c) => c.ativo).map((c) => `## ${c.titulo}\n${c.conteudo}`).join("\n\n") || "vazia"}`,
  ].join("\n");
}
function RespostaBase({ r }) {
  const B = ({ t, children }) => <div className="mt-2"><p className="font-body text-[11px] font-bold uppercase" style={{ color: NAVY }}>{t}</p>{children}</div>;
  return (<div className="font-body text-sm">
    <B t="Estratégia"><p>{r.estrategia}</p></B>
    <B t="Passo a passo"><ol className="list-decimal ml-5">{r.passos.map((p) => <li key={p}>{p}</li>)}</ol></B>
    {r.exemplo && <B t="Exemplo de abordagem"><p className="italic">{r.exemplo}</p></B>}
    {r.mensagem && <B t="Mensagem pronta"><p className="rounded-lg p-2 bg-yellow-50 whitespace-pre-line">{r.mensagem}</p><div className="mt-1"><Copiar texto={r.mensagem} rotulo="Copiar mensagem" /></div></B>}
    <B t="Sugestões de ações"><ul className="list-disc ml-5">{r.acoes.map((a) => <li key={a}>{a}</li>)}</ul></B>
    <B t="Próximas etapas"><ul className="list-disc ml-5">{r.proximas.map((a) => <li key={a}>{a}</li>)}</ul></B>
  </div>);
}
function Assistente({ K }) {
  const [msgs, setMsgs] = useState(() => { try { return JSON.parse(sessionStorage.getItem("maisbb-chat") || "[]"); } catch { return []; } });
  const [txt, setTxt] = useState(""); const [c, setC] = useState(false); const fim = useRef(null);
  useEffect(() => { try { sessionStorage.setItem("maisbb-chat", JSON.stringify(msgs.slice(-30))); } catch { /* */ } fim.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs]);
  const enviar = async (q) => {
    const p = (q ?? txt).trim(); if (!p || c) return; setTxt("");
    const nova = [...msgs, { role: "user", content: p }]; setMsgs(nova); setC(true);
    try { const r = await chamarIA({ endpoint: "/api/maisbb-ia", modo: "assistente", messages: nova.filter((m) => !m.base).map(({ role, content }) => ({ role, content })), contexto: contexto(K) }); setMsgs([...nova, { role: "assistant", content: r }]); }
    catch (e) {
      const kb = K.d.conhecimento.filter((x) => x.ativo && `${x.titulo} ${x.tags || ""}`.toLowerCase().split(/\W+/).some((w) => w.length > 3 && p.toLowerCase().includes(w)));
      const rb = respostaBase(p);
      setMsgs([...nova, { role: "assistant", base: true, rb, kb: kb.slice(0, 2), content: rb || kb.length ? "" : `Não encontrei uma resposta pronta para isso na base.${e.semChave ? " A IA ainda não está configurada." : ""} Tente uma das perguntas sugeridas ou peça ao administrador para incluir o tema na base de conhecimento.` }]);
    } finally { setC(false); }
  };
  return (
    <div>
      <Titulo eyebrow="IA" title="Meu assistente Mais BB" sub="Responde com estratégia, passo a passo, exemplos, mensagens prontas, ações e próximas etapas. Usa só a biblioteca oficial e a base de conhecimento cadastrada — não inventa produtos, taxas ou regras." direita={msgs.length > 0 && <Btn small tipo="claro" icon={Trash2} onClick={() => setMsgs([])}>Limpar</Btn>} />
      <Card className="!p-0 overflow-hidden">
        <div className="h-[480px] overflow-y-auto p-4 space-y-3" style={{ background: "#F5F7FB" }}>
          {!msgs.length && <div><p className="font-body text-sm mb-3" style={{ color: C.muted }}>Pergunte ou escolha:</p><div className="flex flex-wrap gap-1.5">{PERGUNTAS_ASSISTENTE.map((p) => <button key={p} onClick={() => enviar(p)} className="font-body text-xs font-semibold px-3 py-1.5 rounded-full bg-white border" style={{ borderColor: "#E2E8F0", color: NAVY }}>{p}</button>)}</div></div>}
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : ""}`}>
              <div className="max-w-[88%] rounded-2xl px-3.5 py-2.5" style={{ background: m.role === "user" ? NAVY : "#fff", color: m.role === "user" ? "#fff" : C.ink, border: m.role === "user" ? 0 : "1px solid #E2E8F0" }}>
                {m.role !== "user" && <div className="mb-1"><Selo tipo={m.base ? "sistema" : "ia"} /></div>}
                {m.rb && <RespostaBase r={m.rb} />}
                {m.kb?.map((x) => <div key={x.id} className="mt-2 rounded-lg p-2" style={{ background: "#EEF2FA" }}><p className="font-body text-xs font-bold flex items-center gap-1" style={{ color: NAVY }}><BookOpen size={12} /> Base de conhecimento: {x.titulo}</p><p className="font-body text-sm whitespace-pre-line">{x.conteudo}</p></div>)}
                {m.content && <p className="font-body text-sm whitespace-pre-line">{m.content}</p>}
                {m.role !== "user" && m.content && <div className="mt-1.5"><Copiar texto={m.content} rotulo="Copiar resposta" /></div>}
              </div>
            </div>))}
          {c && <div className="font-body text-sm" style={{ color: C.muted }}><Bot size={14} className="inline" /> pensando...</div>}
          <div ref={fim} />
        </div>
        <form className="flex gap-2 p-3 border-t" style={{ borderColor: "#E2E8F0" }} onSubmit={(e) => { e.preventDefault(); enviar(); }}>
          <input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Ex.: Como abordar um aposentado?" className={inputCls} style={inputSty} />
          <Btn type="submit" icon={Send} disabled={c || !txt.trim()}>Enviar</Btn>
        </form>
      </Card>
    </div>
  );
}

// ============================================================================= CALENDÁRIO COMERCIAL
function Calendario({ K }) {
  const [aba, setAba] = useState("anual");
  return (
    <div>
      <Titulo eyebrow="Planejamento" title="Calendário comercial" sub="12 meses estratégicos, planejamento semanal e plano de prospecção de 30 dias." />
      <div className="flex gap-1.5 mb-4 flex-wrap">{[["anual", "12 meses"], ["semana", "Planejamento semanal"], ["plano", "Plano de 30 dias"], ["datas", "Datas comemorativas"]].map(([k, l]) => <Chip key={k} cor={NAVY} ativo={aba === k} onClick={() => setAba(k)}>{l}</Chip>)}</div>
      {aba === "anual" && <Anual K={K} />}{aba === "semana" && <Semana K={K} />}{aba === "plano" && <Plano30 K={K} />}{aba === "datas" && <Datas K={K} />}
    </div>
  );
}
function Anual({ K }) {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ed, setEd] = useState(false);
  const c = mesConteudo(K.d, mes);
  const txt = (v) => (Array.isArray(v) ? v.join("\n") : v || "");
  return (
    <div>
      <div className="flex gap-1 overflow-x-auto no-scrollbar mb-4">{MESES_NOME.map((n, i) => <button key={n} onClick={() => setMes(i + 1)} className="shrink-0 px-3 py-2 rounded-xl font-body text-xs font-bold" style={{ background: mes === i + 1 ? NAVY : "#fff", color: mes === i + 1 ? AMARELO : NAVY, border: "1px solid #E2E8F0" }}>{n.slice(0, 3)}</button>)}</div>
      <Card style={{ borderColor: AMARELO }}>
        <div className="flex justify-between gap-2 flex-wrap"><div><p className="font-body text-[11px] font-bold uppercase" style={{ color: "#B8860B" }}>{MESES_NOME[mes - 1]}</p><p className="font-display font-extrabold text-xl" style={{ color: NAVY }}>{c.tema}</p></div>
          <div className="flex gap-2">{K.admin && <Btn small tipo="claro" icon={Pencil} onClick={() => setEd(true)}>Editar mês</Btn>}<Btn small tipo="amarelo" icon={Plus} onClick={async () => { try { const y = new Date().getFullYear() + (mes < new Date().getMonth() + 1 ? 1 : 0); await K.salvar("campanhas", null, { nome: `${c.principal} ${y}`, tipo: "comercial", publico: c.publico, objetivo: c.objetivo, mensagens: c.mensagem, descricao: txt(c.estrategias), inicio: `${y}-${String(mes).padStart(2, "0")}-01`, fim: isoData(new Date(y, mes, 0)), status: "planejada" }); K.avisar("Campanha criada em Campanhas."); } catch (e) { K.avisar(msgErro(e), "erro"); } }}>Criar campanha do mês</Btn></div></div>
        <div className="grid md:grid-cols-2 gap-3 mt-4">{CAMPOS_MES.filter(([k]) => k !== "tema").map(([k, l]) => <div key={k} className={k === "mensagem" ? "md:col-span-2" : ""}><p className="font-body text-[11px] font-bold uppercase" style={{ color: C.muted }}>{l}</p>{Array.isArray(c[k]) ? <ul className="list-disc ml-5 font-body text-sm">{c[k].map((x) => <li key={x}>{x}</li>)}{!c[k].length && <li style={{ color: C.soft }}>—</li>}</ul> : <p className="font-body text-sm whitespace-pre-line">{c[k] || "—"}</p>}{k === "mensagem" && c[k] && <div className="mt-1"><Copiar texto={c[k]} /></div>}</div>)}</div>
      </Card>
      {ed && <FormModal titulo={`Editar ${MESES_NOME[mes - 1]}`} largura="max-w-3xl" campos={CAMPOS_MES.map(([k, l]) => ({ k, l, t: "textarea", full: true, rows: 2 }))} inicial={Object.fromEntries(CAMPOS_MES.map(([k]) => [k, txt(c[k])]))} onFechar={() => setEd(false)}
        aviso={<p className="font-body text-xs" style={{ color: C.muted }}>Em listas, um item por linha.</p>}
        onSalvar={async (v) => { const listas = ["secundarias", "servicos", "estrategias", "datas", "presenciais", "digitais", "artes", "indicadores"]; const conteudo = Object.fromEntries(CAMPOS_MES.map(([k]) => [k, listas.includes(k) ? String(v[k] || "").split("\n").map((x) => x.trim()).filter(Boolean) : v[k]])); await K.salvar("calendario", mes, { mes, conteudo }); K.avisar("Mês atualizado."); }} />}
    </div>
  );
}
function Semana({ K }) {
  const r = rotina(K.d); const [ed, setEd] = useState(false); const hoje = new Date().getDay();
  return (
    <div>
      <div className="flex justify-end mb-3">{K.admin && <Btn small tipo="claro" icon={Pencil} onClick={() => setEd(true)}>Alterar dias conforme o expediente</Btn>}</div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{[1, 2, 3, 4, 5, 6].map((d) => (
        <Card key={d} style={{ borderColor: d === hoje ? AMARELO : undefined, background: d === hoje ? "#FFFBEA" : undefined }}>
          <p className="font-body text-[11px] font-bold uppercase" style={{ color: C.muted }}>{SEMANA[d]}{d === hoje ? " · hoje" : ""}</p>
          <p className="font-display font-extrabold text-lg" style={{ color: NAVY }}>{r[d]?.titulo}</p>
          <ul className="mt-1 font-body text-sm list-disc ml-5">{(r[d]?.itens || []).map((x) => <li key={x}>{x}</li>)}</ul>
        </Card>))}</div>
      {ed && <FormModal titulo="Planejamento semanal" largura="max-w-3xl" campos={[1, 2, 3, 4, 5, 6].flatMap((d) => [{ k: `t${d}`, l: `${SEMANA[d]} · tema` }, { k: `i${d}`, l: `${SEMANA[d]} · atividades (uma por linha)`, t: "textarea", rows: 3 }])} inicial={Object.fromEntries([1, 2, 3, 4, 5, 6].flatMap((d) => [[`t${d}`, r[d]?.titulo || ""], [`i${d}`, (r[d]?.itens || []).join("\n")]]))} onFechar={() => setEd(false)}
        onSalvar={async (v) => { const rot = Object.fromEntries([1, 2, 3, 4, 5, 6].map((d) => [d, { titulo: v[`t${d}`], itens: String(v[`i${d}`] || "").split("\n").map((x) => x.trim()).filter(Boolean) }])); await K.salvar("config", 1, { rotina: rot }); K.avisar("Planejamento semanal atualizado."); }} />}
    </div>
  );
}
function Plano30({ K }) {
  const [ini, setIni] = useState(hojeISO()); const [gerando, setGerando] = useState(false); const [res, setRes] = useState(null);
  const dias = Array.from({ length: 30 }, (_, i) => isoData(new Date(dataLocal(ini).getTime() + i * 864e5)));
  const gerarNovo = async () => {
    if (!window.confirm("Gerar um novo plano para estes 30 dias? Os públicos e ações serão sorteados de novo (resultados já registrados são mantidos).")) return;
    setGerando(true); const semente = Math.floor(Math.random() * 100000) + 1;
    try { for (const d of dias) { const atual = K.d.plano.find((p) => p.data === d); const novo = planoDoDia(K.d, d, semente); await K.salvar("plano", d, { data: d, conteudo: { semente, publico: novo.publico, publicoChave: novo.publicoChave, objetivo: novo.objetivo, estrategia: novo.estrategia, servico: novo.servico, acoes: novo.acoes, acao: novo.acao, mensagem: novo.mensagem, meta: novo.meta }, resultado: atual?.resultado || null, concluido: atual?.concluido || false }); } K.avisar("Novo plano gerado."); }
    catch (e) { K.avisar(msgErro(e), "erro"); } finally { setGerando(false); }
  };
  return (
    <div>
      <div className="flex gap-2 items-end flex-wrap mb-4"><Campo label="Começar em"><input type="date" value={ini} onChange={(e) => setIni(e.target.value)} className={inputCls} style={inputSty} /></Campo><Btn tipo="amarelo" icon={RefreshCw} onClick={gerarNovo} disabled={gerando}>{gerando ? "Gerando..." : "Gerar novo plano mensal"}</Btn></div>
      <div className="space-y-2">{dias.map((d) => { const p = planoSalvoOuGerado(K.d, d); const s = p._salvo; const dom = dataLocal(d).getDay() === 0; return (
        <Card key={d} className="!p-3" style={{ opacity: dom ? 0.6 : 1, borderColor: d === hojeISO() ? AMARELO : undefined }}>
          <div className="flex justify-between gap-2 flex-wrap"><p className="font-body text-sm font-bold" style={{ color: NAVY }}>{p.dia}, {dataBR(d)} · {p.foco}</p>{s?.concluido ? <Chip cor="#16A34A">concluído</Chip> : <Chip cor="#94A3B8">pendente</Chip>}</div>
          {!dom && <><p className="font-body text-xs mt-1"><b>Público:</b> {p.publico} · <b>Objetivo:</b> {p.objetivo}</p><p className="font-body text-xs"><b>Estratégia:</b> {p.estrategia}</p><p className="font-body text-xs"><b>Ação prática:</b> {p.acao} · <b>Meta:</b> {p.meta}</p>
            <details className="mt-1"><summary className="font-body text-xs font-bold cursor-pointer" style={{ color: C.blueHex }}>Mensagem e resultado</summary><p className="font-body text-xs whitespace-pre-line mt-1 rounded-lg p-2" style={{ background: "#F5F7FB" }}>{p.mensagem}</p><div className="mt-1"><Copiar texto={p.mensagem} /></div>
              <div className="flex gap-2 mt-2 items-end flex-wrap"><input defaultValue={s?.resultado || ""} placeholder="Resultado do dia" className={inputCls} style={{ ...inputSty, flex: 1, minWidth: 180 }} onBlur={async (e) => { if (e.target.value !== (s?.resultado || "")) { try { await K.salvar("plano", d, { data: d, conteudo: s?.conteudo || {}, resultado: e.target.value, concluido: s?.concluido || false }); } catch (er) { K.avisar(msgErro(er), "erro"); } } }} />
                <Btn small tipo={s?.concluido ? "claro" : "verde"} icon={CheckCircle2} onClick={async () => { try { await K.salvar("plano", d, { data: d, conteudo: s?.conteudo || {}, resultado: s?.resultado || null, concluido: !s?.concluido }); } catch (er) { K.avisar(msgErro(er), "erro"); } }}>{s?.concluido ? "Reabrir" : "Concluir"}</Btn></div></details></>}
        </Card>); })}</div>
    </div>
  );
}
function Datas({ K }) {
  const ano = new Date().getFullYear();
  const [nova, setNova] = useState(false);
  const lista = [...datasComemorativas(ano).map((x) => ({ ...x, sistema: true })), ...K.d.datas.map((x) => ({ data: x.repete ? `${ano}-${x.data.slice(5)}` : x.data, titulo: x.titulo, descricao: x.descricao, id: x.id }))].sort((a, b) => a.data.localeCompare(b.data));
  return (
    <div>
      <div className="flex justify-end mb-3">{K.admin && <Btn small icon={Plus} onClick={() => setNova(true)}>Nova data</Btn>}</div>
      <div className="grid sm:grid-cols-2 gap-2">{lista.map((x) => <Card key={x.data + x.titulo} className="!p-3 flex items-center justify-between gap-2"><span className="font-body text-sm"><b style={{ color: NAVY }}>{dataBR(x.data).slice(0, 5)}</b> · {x.titulo}{x.descricao ? <span className="block text-xs" style={{ color: C.soft }}>{x.descricao}</span> : ""}</span>
        <div className="flex gap-1"><Btn small tipo="fantasma" onClick={async () => { try { await K.salvar("campanhas", null, { nome: `${x.titulo} ${x.data.slice(0, 4)}`, tipo: "comercial", inicio: isoData(new Date(dataLocal(x.data).getTime() - 15 * 864e5)), fim: x.data, objetivo: `Ação de relacionamento: ${x.titulo}`, status: "planejada" }); K.avisar("Campanha criada."); } catch (e) { K.avisar(msgErro(e), "erro"); } }}>Campanha</Btn>{x.id && K.admin && <Btn small tipo="perigo" icon={Trash2} onClick={() => K.apagar("datas", x.id)} />}</div></Card>)}</div>
      {nova && <FormModal titulo="Nova data" campos={[{ k: "data", l: "Data", t: "date", req: true }, { k: "titulo", l: "Título", req: true }, { k: "descricao", l: "Descrição", full: true }, { k: "repete", l: "Repetição", t: "checkbox", texto: "Repete todo ano" }]} inicial={{ repete: true }} onFechar={() => setNova(false)} onSalvar={async (v) => { await K.salvar("datas", null, limpar(v)); }} />}
    </div>
  );
}

// ============================================================================= CAMPANHAS E MARKETING
function Campanhas({ K }) {
  const [aba, setAba] = useState("campanhas");
  const [abrir, setAbrir] = useState(null);
  return (
    <div>
      <Titulo eyebrow="Campanhas" title="Campanhas e marketing" sub="Campanhas comerciais, estúdio de artes (posts, stories, status, banners) e calendário de publicações. Use apenas a identidade visual autorizada do Mais BB." />
      <div className="flex gap-1.5 mb-4 flex-wrap">{[["campanhas", "Campanhas"], ["estudio", "Estúdio de artes"], ["publicacoes", "Calendário de publicações"], ["modelos", "Modelos"]].map(([k, l]) => <Chip key={k} cor={NAVY} ativo={aba === k} onClick={() => setAba(k)}>{l}</Chip>)}</div>
      {aba === "campanhas" && <>
        <div className="flex justify-end mb-3"><Btn icon={Plus} onClick={() => setAbrir({ tipo: "comercial", status: "planejada", inicio: hojeISO() })}>Nova campanha</Btn></div>
        {K.d.campanhas.length ? <div className="grid md:grid-cols-2 gap-3">{K.d.campanhas.map((c) => { const at = K.d.atendimentos.filter((a) => a.campanha_id === c.id).length; const pr = K.d.prospeccoes.filter((p) => p.campanha_id === c.id); return (
          <Card key={c.id} onClick={() => setAbrir(c)}><div className="flex justify-between gap-2"><p className="font-display font-bold" style={{ color: NAVY }}>{c.nome}</p><Chip cor={{ planejada: "#64748B", ativa: "#16A34A", concluida: "#94A3B8" }[c.status]}>{c.status}</Chip></div>
            <p className="font-body text-xs mt-1" style={{ color: C.muted }}>{dataBR(c.inicio)} a {dataBR(c.fim)} · {c.publico || "todos os públicos"}{c.servico ? ` · ${c.servico}` : ""}</p>
            <p className="font-body text-xs mt-2">{pr.length} prospecção(ões) · {pr.reduce((s, x) => s + (x.contatos || 0), 0)}{c.meta ? `/${c.meta}` : ""} contatos · {at} atendimento(s)</p></Card>); })}</div> : <Vazio>Nenhuma campanha. Crie uma ou use "Criar campanha do mês" no Calendário.</Vazio>}
      </>}
      {aba === "estudio" && <Estudio K={K} />}
      {aba === "publicacoes" && <Publicacoes K={K} />}
      {aba === "modelos" && <Modelos K={K} />}
      {abrir && <FormModal titulo={abrir.id ? abrir.nome : "Nova campanha"} largura="max-w-3xl" inicial={abrir} onFechar={() => setAbrir(null)}
        campos={[{ k: "nome", l: "Nome", req: true, full: true }, { k: "tipo", l: "Tipo", t: "select", semVazio: true, op: [["comercial", "Comercial"], ["divulgacao", "Divulgação"]] }, { k: "status", l: "Situação", t: "select", semVazio: true, op: [["planejada", "Planejada"], ["ativa", "Ativa"], ["concluida", "Concluída"]] },
          { k: "publico", l: "Público", t: "select", op: listaPublicos(K.d).map((p) => [p.nome, p.nome]) }, { k: "servico", l: "Serviço", t: "select", op: K.d.servicos.filter((s) => s.ativo).map((s) => [s.nome, s.nome]) },
          { k: "inicio", l: "Início", t: "date" }, { k: "fim", l: "Fim", t: "date" }, { k: "meta", l: "Meta de contatos", t: "number" },
          { k: "objetivo", l: "Objetivo", t: "textarea", full: true }, { k: "descricao", l: "Estratégia e ações", t: "textarea", full: true }, { k: "mensagens", l: "Mensagens", t: "textarea", full: true }]}
        onSalvar={async (v) => { await K.salvar("campanhas", abrir.id, limpar(v, ["meta"])); K.avisar("Campanha salva."); }} onExcluir={abrir.id ? () => K.apagar("campanhas", abrir.id) : null} />}
    </div>
  );
}

const FORMATOS = { post: [1080, 1080, "Post (1080×1080)"], story: [1080, 1920, "Story / Status (1080×1920)"], status: [1080, 1920, "WhatsApp Status"], banner: [1500, 500, "Banner (1500×500)"], comunicado: [1080, 1350, "Comunicado (1080×1350)"] };
function quebrar(ctx, texto, larg) { const out = []; for (const par of String(texto || "").split("\n")) { let l = ""; for (const w of par.split(" ")) { const t = l ? `${l} ${w}` : w; if (ctx.measureText(t).width > larg && l) { out.push(l); l = w; } else l = t; } out.push(l); } return out; }
function Estudio({ K, inicial }) {
  const cv = useRef(null);
  const [v, setV] = useState({ formato: "post", tema: "azul", titulo: "Atendimento pertinho de você", texto: "Venha conhecer o Mais BB Correspondente Autorizado de Ivatuba.", rodape: [K.config.endereco, K.config.whatsapp && `WhatsApp ${K.config.whatsapp}`, K.config.horario].filter(Boolean).join(" · ") || "Mais BB Correspondente Autorizado · Ivatuba-PR", ...(inicial || {}) });
  const [logo, setLogo] = useState(null);
  useEffect(() => { if (!K.config.logo_path) return; const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => setLogo(im); im.src = urlArquivo(K.config.logo_path); }, [K.config.logo_path]);
  useEffect(() => {
    const [w, h] = FORMATOS[v.formato]; const c = cv.current; c.width = w; c.height = h; const x = c.getContext("2d");
    const azul = v.tema === "azul"; const fundo = azul ? NAVY : AMARELO, cor = azul ? "#fff" : NAVY, destaque = azul ? AMARELO : NAVY;
    x.fillStyle = fundo; x.fillRect(0, 0, w, h);
    x.fillStyle = azul ? "rgba(252,213,53,0.16)" : "rgba(11,37,89,0.10)"; x.beginPath(); x.arc(w * 0.92, h * 0.08, Math.min(w, h) * 0.45, 0, Math.PI * 2); x.fill();
    x.fillStyle = destaque; x.fillRect(0, h - Math.max(18, h * 0.012), w, Math.max(18, h * 0.012));
    const pad = Math.round(w * 0.08); let y = pad;
    if (logo) { const lh = Math.round(Math.min(w, h) * 0.12); const lw = lh * (logo.width / logo.height); x.fillStyle = "#fff"; x.fillRect(pad - 12, y - 12, lw + 24, lh + 24); x.drawImage(logo, pad, y, lw, lh); y += lh + 50; }
    else { x.fillStyle = destaque; x.font = `900 ${Math.round(w * 0.05)}px Inter, Arial`; x.fillText("MAIS BB", pad, y + w * 0.05); y += w * 0.1; }
    const banner = v.formato === "banner";
    const tf = Math.round((banner ? h * 0.16 : w * 0.085)); x.fillStyle = cor; x.font = `800 ${tf}px Inter, Arial`;
    for (const l of quebrar(x, v.titulo, w - pad * 2)) { y += tf * 1.1; x.fillText(l, pad, y); }
    x.fillStyle = destaque; x.fillRect(pad, y + tf * 0.4, w * 0.18, Math.max(8, tf * 0.12)); y += tf * 0.9;
    const bf = Math.round(banner ? h * 0.08 : w * 0.042); x.fillStyle = cor; x.font = `500 ${bf}px Inter, Arial`;
    for (const l of quebrar(x, v.texto, w - pad * 2)) { y += bf * 1.4; x.fillText(l, pad, y); }
    const rf = Math.round(banner ? h * 0.055 : w * 0.028); x.font = `600 ${rf}px Inter, Arial`; x.fillStyle = azul ? "rgba(255,255,255,0.85)" : NAVY;
    const rod = quebrar(x, v.rodape, w - pad * 2); let ry = h - pad - (rod.length - 1) * rf * 1.35; for (const l of rod) { x.fillText(l, pad, ry); ry += rf * 1.35; }
  }, [v, logo]);
  const baixar = () => { const a = document.createElement("a"); a.download = `maisbb-${v.formato}-${hojeISO()}.png`; a.href = cv.current.toDataURL("image/png"); a.click(); };
  const salvar = async (modelo) => { try { await K.salvar("publicacoes", null, { titulo: v.titulo, formato: v.formato, texto: v.texto, legenda: v.rodape, data: modelo ? null : hojeISO(), modelo }); K.avisar(modelo ? "Modelo salvo." : "Publicação salva no calendário."); } catch (e) { K.avisar(msgErro(e), "erro"); } };
  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-4">
      <Card className="space-y-3 h-fit">
        <Campos campos={[{ k: "formato", l: "Formato", t: "select", semVazio: true, op: Object.entries(FORMATOS).map(([k, f]) => [k, f[2]]) }, { k: "tema", l: "Cores", t: "select", semVazio: true, op: [["azul", "Azul-marinho e amarelo"], ["amarelo", "Amarelo e azul-marinho"]] }, { k: "titulo", l: "Título", full: true }, { k: "texto", l: "Texto", t: "textarea", full: true }, { k: "rodape", l: "Rodapé (endereço, WhatsApp, horário)", t: "textarea", full: true }]} valores={v} set={setV} />
        {!K.config.logo_path && <Aviso tipo="amarelo">Envie a logo oficial do Mais BB em Administração › Configurações para ela aparecer nas artes.</Aviso>}
        <div className="flex gap-2 flex-wrap"><Btn icon={Download} onClick={baixar}>Baixar imagem</Btn><Btn tipo="claro" onClick={() => salvar(false)}>Salvar publicação</Btn><Btn tipo="fantasma" onClick={() => salvar(true)}>Salvar como modelo</Btn></div>
        <p className="font-body text-[11px]" style={{ color: C.soft }}>Não use marcas de forma que sugira que este é um aplicativo oficial do Banco do Brasil.</p>
      </Card>
      <div className="rounded-2xl border bg-white p-3 flex items-center justify-center" style={{ borderColor: "#E2E8F0" }}><canvas ref={cv} style={{ maxWidth: "100%", maxHeight: 640, borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,.15)" }} /></div>
    </div>
  );
}
function Publicacoes({ K }) {
  const [abrir, setAbrir] = useState(null);
  const lista = K.d.publicacoes.filter((p) => !p.modelo).sort((a, b) => String(a.data || "").localeCompare(String(b.data || "")));
  return (
    <div>
      <div className="flex justify-end mb-3"><Btn icon={Plus} onClick={() => setAbrir({ formato: "post", data: hojeISO() })}>Nova publicação</Btn></div>
      {lista.length ? <div className="space-y-2">{lista.map((p) => <Card key={p.id} className="!p-3 flex items-center gap-3" onClick={() => setAbrir(p)}>
        <span className="font-display font-extrabold w-16 shrink-0" style={{ color: NAVY }}>{dataBR(p.data).slice(0, 5)}</span>
        <div className="flex-1"><p className="font-body text-sm font-bold">{p.titulo}</p><p className="font-body text-xs" style={{ color: C.soft }}>{FORMATOS[p.formato]?.[2]}{p.campanha_id ? ` · ${K.d.campanhas.find((c) => c.id === p.campanha_id)?.nome || ""}` : ""}</p></div>
        <Chip cor={p.publicado ? "#16A34A" : "#D97706"}>{p.publicado ? "publicado" : "a publicar"}</Chip></Card>)}</div> : <Vazio>Nenhuma publicação planejada.</Vazio>}
      {abrir && <FormModal titulo="Publicação" inicial={abrir} onFechar={() => setAbrir(null)} campos={[{ k: "titulo", l: "Título", req: true, full: true }, { k: "formato", l: "Formato", t: "select", semVazio: true, op: Object.entries(FORMATOS).map(([k, f]) => [k, f[2]]) }, { k: "data", l: "Data", t: "date" }, { k: "campanha_id", l: "Campanha", t: "select", op: K.d.campanhas.map((c) => [c.id, c.nome]) }, { k: "texto", l: "Texto da arte", t: "textarea", full: true }, { k: "legenda", l: "Legenda/rodapé", t: "textarea", full: true }, { k: "publicado", l: "Status", t: "checkbox", texto: "Já publicado" }]}
        onSalvar={async (v) => { await K.salvar("publicacoes", abrir.id, limpar(v)); }} onExcluir={abrir.id ? () => K.apagar("publicacoes", abrir.id) : null} />}
    </div>
  );
}
function Modelos({ K }) {
  const [usar, setUsar] = useState(null);
  const sistema = Object.entries(MESES_PADRAO).map(([m, c]) => ({ id: `s${m}`, titulo: c.principal, texto: c.mensagem, formato: "post", sistema: true, mes: Number(m) }));
  const meus = K.d.publicacoes.filter((p) => p.modelo);
  if (usar) return <div><Btn small tipo="claro" icon={ChevronLeft} onClick={() => setUsar(null)}>Voltar aos modelos</Btn><div className="mt-3"><Estudio K={K} inicial={{ titulo: usar.titulo, texto: usar.texto, formato: usar.formato }} /></div></div>;
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
      {[...meus, ...sistema].map((m) => <Card key={m.id}><div className="flex justify-between gap-2"><p className="font-body text-sm font-bold" style={{ color: NAVY }}>{m.titulo}</p><Chip cor={m.sistema ? "#64748B" : "#16A34A"}>{m.sistema ? MESES_NOME[m.mes - 1] : "meu modelo"}</Chip></div><p className="font-body text-xs mt-1 line-clamp-3" style={{ color: C.muted }}>{m.texto}</p>
        <div className="flex gap-1.5 mt-2"><Btn small icon={ImageIcon} onClick={() => setUsar(m)}>Usar no estúdio</Btn><Copiar texto={m.texto || ""} />{!m.sistema && <Btn small tipo="perigo" icon={Trash2} onClick={() => K.apagar("publicacoes", m.id)} />}</div></Card>)}
    </div>
  );
}
