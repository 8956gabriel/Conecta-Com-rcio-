import React, { useEffect, useRef, useState } from "react";
import { Search, Send, Trash2, Bot, Sparkles, CheckCircle2, ExternalLink, GraduationCap, Lightbulb, ShieldCheck, Package } from "lucide-react";
import { C, Titulo, Btn, Card, Aviso, Chip, Vazio, Selo, Modal, Campo, inp, inpS, Copiar, Zap, Texto, Barra, msgErro, chamarIA } from "./base.jsx";
import { CAT_SERVICOS, TIPOS_MSG, ESTILOS, CANAIS, gerarMensagem, DICAS, TREINAMENTOS, GRUPOS, SEMANA_PADRAO } from "./dados.js";
import { hoje, br, estrategiaDoDia, indicadores, periodo, analise } from "./motor.js";

// ============================================================================= PRODUTOS E SERVIÇOS
export function Produtos({ K }) {
  const { D } = K;
  const [f, setF] = useState({ busca: "", cat: "" });
  const [sel, setSel] = useState(null);
  const lista = D.servicos.filter((s) => s.ativo && (!f.cat || s.categoria === f.cat) && (!f.busca || `${s.nome} ${s.descricao || ""}`.toLowerCase().includes(f.busca.toLowerCase())));
  return (
    <div>
      <Titulo eyebrow="Biblioteca" title="Produtos e serviços" sub="Somente os serviços cadastrados pelo administrador como autorizados ao correspondente. Condições vigentes sempre nos canais oficiais do Banco do Brasil." />
      <div className="flex gap-2 flex-wrap mb-3"><div className="relative flex-1 min-w-[180px]"><Search size={15} className="absolute left-3 top-3" color={C.soft} /><input value={f.busca} onChange={(e) => setF({ ...f, busca: e.target.value })} placeholder="Buscar serviço..." className={inp} style={{ ...inpS, paddingLeft: 34 }} /></div></div>
      <div className="flex gap-1.5 flex-wrap mb-4"><Chip ativo={!f.cat} onClick={() => setF({ ...f, cat: "" })}>Todos</Chip>{CAT_SERVICOS.filter((c) => D.servicos.some((s) => s.ativo && s.categoria === c)).map((c) => <Chip key={c} ativo={f.cat === c} onClick={() => setF({ ...f, cat: c })}>{c}</Chip>)}</div>
      {lista.length ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">{lista.map((s) => (
        <Card key={s.id} onClick={() => setSel(s)}><div className="flex justify-between gap-2"><p className="font-body text-[11px] font-bold uppercase" style={{ color: C.yellowInk }}>{s.categoria}</p>{s.confirmado ? <ShieldCheck size={15} color={C.green} /> : <Chip cor={C.red}>a confirmar</Chip>}</div>
          <p className="font-display font-bold mt-1" style={{ color: C.navy }}>{s.nome}</p><p className="font-body text-xs mt-1 line-clamp-2" style={{ color: C.muted }}>{s.descricao || "—"}</p><p className="font-body text-[11px] mt-2" style={{ color: C.soft }}>Atualizado em {br(s.atualizado_em)}</p></Card>))}</div>
        : <Vazio><Package className="mx-auto mb-2" />{D.servicos.length ? "Nenhum serviço neste filtro." : "A biblioteca ainda está vazia. O administrador cadastra os serviços autorizados ao correspondente no Painel do administrador › Serviços."}</Vazio>}
      {sel && <Modal onFechar={() => setSel(null)} titulo={sel.nome} largura="max-w-3xl">
        <div className="flex gap-2 mb-3">{sel.confirmado ? <Selo tipo="oficial" /> : <Aviso tipo="erro">Ainda não confirmado pelo administrador nos canais oficiais. Não divulgue até a confirmação.</Aviso>}</div>
        <div className="grid sm:grid-cols-2 gap-3">{[["Descrição", sel.descricao], ["Público", sel.publico], ["Finalidade", sel.finalidade], ["Requisitos", sel.requisitos], ["Documentos", sel.documentos], ["Condições vigentes", sel.condicoes], ["Perguntas frequentes", sel.faq], ["Orientações", sel.orientacoes], ["Canal oficial de consulta", sel.canal_oficial]].map(([t, x]) => <div key={t} className={t === "Descrição" || t === "Perguntas frequentes" ? "sm:col-span-2" : ""}><p className="font-body text-[11px] font-bold uppercase" style={{ color: C.muted }}>{t}</p><p className="font-body text-sm whitespace-pre-line" style={{ color: x ? C.ink : C.soft }}>{x || "Não informado"}</p></div>)}</div>
        {sel.fonte_url && <a href={sel.fonte_url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 mt-3 font-body text-sm font-bold" style={{ color: C.navy2 }}><ExternalLink size={14} /> Fonte oficial</a>}
        <div className="mt-4 flex gap-2"><Btn small tipo="amarelo" onClick={() => { setSel(null); K.irPara("mensagens", { servico: sel.nome }); }}>Gerar mensagem sobre este serviço</Btn></div>
      </Modal>}
    </div>
  );
}

// ============================================================================= GERADOR DE MENSAGENS
export function Mensagens({ K }) {
  const { D } = K;
  const [f, setF] = useState({ publico: "", tipo: "primeira", servico: K.param?.servico || "", canal: "whatsapp", estilo: "amigavel", nome: "" });
  const [ia, setIa] = useState({ t: "", c: false, e: "" });
  const pub = K.publicos.find((p) => p.chave === f.publico);
  const base = { tipo: f.tipo, publico: pub?.nome, servico: f.servico, canal: f.canal, nome: f.nome, atendente: K.nome, correspondente: "Mais BB", horario: D.config.horario };
  const principal = gerarMensagem({ ...base, estilo: f.estilo });
  const adaptar = async () => { setIa({ t: "", c: true, e: "" }); try { setIa({ t: await chamarIA({ modo: "mensagem", pedido: `Reescreva no estilo ${ESTILOS[f.estilo]} para ${CANAIS[f.canal]}, objetivo "${TIPOS_MSG[f.tipo]}", público ${pub?.nome || "geral"}.`, contexto: `Mensagem base:\n${principal}` }), c: false, e: "" }); } catch (e) { setIa({ t: "", c: false, e: e.message }); } };
  const sel = (k, l, op) => <Campo label={l}><select value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={inp} style={inpS}>{op.map(([a, b]) => <option key={a} value={a}>{b}</option>)}</select></Campo>;
  return (
    <div>
      <Titulo eyebrow="Comunicação" title="Gerador de abordagens e mensagens" sub="Escolha público, objetivo, serviço, canal e estilo. Copie e personalize." />
      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <Card className="space-y-3 h-fit">
          {sel("publico", "Público", [["", "Geral"], ...K.publicos.map((p) => [p.chave, p.nome])])}
          {sel("tipo", "Objetivo", Object.entries(TIPOS_MSG))}
          {sel("servico", "Serviço", [["", "Serviços em geral"], ...D.servicos.filter((s) => s.ativo && s.confirmado).map((s) => [s.nome, s.nome])])}
          {sel("canal", "Canal", Object.entries(CANAIS))}
          {sel("estilo", "Estilo de comunicação", Object.entries(ESTILOS))}
          <Campo label="Nome do cliente (opcional)"><input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} className={inp} style={inpS} /></Campo>
        </Card>
        <div className="space-y-3">
          <Card style={{ borderColor: C.yellow, borderWidth: 2 }}><div className="flex justify-between items-center mb-2"><p className="font-display font-bold" style={{ color: C.navy }}>{ESTILOS[f.estilo]}</p><Selo tipo="sistema" /></div><Texto>{principal}</Texto>
            <div className="flex gap-2 mt-3 flex-wrap"><Copiar texto={principal} rotulo="COPIAR MENSAGEM" small={false} tipo="amarelo" />{f.canal === "whatsapp" && <Zap texto={principal} rotulo="Abrir no WhatsApp" small={false} />}<Btn tipo="claro" icon={Sparkles} onClick={adaptar} disabled={ia.c}>{ia.c ? "Adaptando..." : "Adaptar com IA"}</Btn></div></Card>
          {ia.e && <Aviso tipo="amarelo">{ia.e}</Aviso>}
          {ia.t && <Card style={{ borderColor: C.yellow }}><Selo tipo="ia" /><Texto className="mt-2">{ia.t}</Texto><div className="mt-2"><Copiar texto={ia.t} rotulo="COPIAR MENSAGEM" /></div></Card>}
          <p className="font-display font-bold" style={{ color: C.navy }}>Outras versões</p>
          <div className="grid md:grid-cols-2 gap-2">{Object.entries(ESTILOS).filter(([k]) => k !== f.estilo).map(([k, l]) => { const t = gerarMensagem({ ...base, estilo: k }); return <Card key={k} className="!p-3"><p className="font-body text-xs font-bold mb-1" style={{ color: C.navy2 }}>{l}</p><Texto>{t}</Texto><div className="mt-2"><Copiar texto={t} rotulo="Copiar" /></div></Card>; })}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================= ASSISTENTE
const PERGUNTAS = ["Como encontrar novos clientes?", "Como abordar um aposentado?", "Como conversar com professores?", "Como prospectar funcionários públicos?", "Como conquistar comerciantes?", "Como divulgar os serviços do correspondente?", "Como responder a um cliente indeciso?", "Como organizar minha semana?", "Como melhorar meu atendimento?", "Como criar uma campanha?", "Como apresentar um produto?", "Como fazer acompanhamento?", "Como aumentar o fluxo de clientes?"];
function contexto(K) {
  const { D } = K;
  const km = indicadores(D, periodo("mes"), K.eu);
  const e = estrategiaDoDia(hoje(), { publicos: K.publicos, servicos: D.servicos, config: D.config, atendente: K.nome });
  return [
    `Atendente: ${K.nome}. Correspondente: ${D.config.nome_correspondente || "Mais BB"} · ${D.config.cidade || "Ivatuba-PR"}. Horário: ${D.config.horario || "não cadastrado"}.`,
    `SERVIÇOS AUTORIZADOS CADASTRADOS (únicos que podem ser citados): ${D.servicos.filter((s) => s.ativo && s.confirmado).map((s) => `${s.nome}${s.condicoes ? ` (condições: ${s.condicoes})` : ""}`).join("; ") || "nenhum cadastrado"}`,
    `BASE DE CONHECIMENTO DO ADMINISTRADOR:\n${D.conhecimento.filter((c) => c.ativo).map((c) => `# ${c.titulo}\n${c.conteudo}`).join("\n\n") || "vazia"}`,
    `PÚBLICOS: ${K.publicos.map((p) => p.nome).join(", ")}`,
    `ESTRATÉGIA DE HOJE: público ${e.publico?.nome}, foco ${e.foco}, objetivo ${e.objetivo}.`,
    `INDICADORES DO MÊS (atendente): atendimentos ${km.atendimentos}, novos clientes ${km.novos_clientes}, prospecções ${km.prospeccoes}, visitas ${km.visitas}, retornos pendentes ${km.retornosPendentes}.`,
    `ANÁLISE DO SISTEMA: ${analise(D, K.publicos, K.eu).map((a) => `${a.t}: ${a.d}`).join(" | ")}`,
  ].join("\n");
}
function respostaLocal(q, K) {
  const t = q.toLowerCase();
  const pub = K.publicos.find((p) => t.includes(p.nome.toLowerCase().split(" ")[0].slice(0, 6))) || Object.entries(GRUPOS).map(([g, x]) => ({ ...x, grupo: g })).find((x) => t.includes(x.nome.toLowerCase().split(" ")[0].slice(0, 6)));
  if (pub) return `Estratégia — ${pub.nome}\n\nPerfil: ${pub.perfil}\n\nPasso a passo:\n1. Onde encontrar: ${(pub.onde || []).join("; ")}\n2. Como iniciar: "${pub.conversa}"\n3. Perguntas: ${(pub.perguntas || []).join(" / ")}\n4. Como apresentar: ${pub.apresentacao}\n5. Acompanhamento: ${pub.acompanhamento}\n\nLembre: não presuma direito a crédito ou condição especial; condições sempre nos canais oficiais.`;
  if (/semana|organizar/.test(t)) return `Sugestão de semana:\n${[1, 2, 3, 4, 5, 6].map((d) => `• ${["", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][d]}: ${(K.D.config.rotina || SEMANA_PADRAO)[d].foco} — ${(K.D.config.rotina || SEMANA_PADRAO)[d].acoes.join(", ")}`).join("\n")}`;
  if (/novos clientes|fluxo|encontrar/.test(t)) { const a = analise(K.D, K.publicos, K.eu); return `Ações práticas:\n1. Siga a estratégia de hoje (Início).\n2. Visite 3 locais do Radar de Ivatuba.\n3. Peça indicações a clientes satisfeitos.\n4. Publique no WhatsApp Status o tema do mês.\n\nO que o sistema identificou:\n${a.map((x) => `• ${x.t}: ${x.d}`).join("\n")}`; }
  return null;
}
export function Assistente({ K }) {
  const [msgs, setMsgs] = useState(() => { try { return JSON.parse(sessionStorage.getItem("maisbb-chat") || "[]"); } catch { return []; } });
  const [txt, setTxt] = useState(""); const [c, setC] = useState(false); const fim = useRef(null);
  useEffect(() => { try { sessionStorage.setItem("maisbb-chat", JSON.stringify(msgs.slice(-30))); } catch { /* */ } fim.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs]);
  const enviar = async (q) => {
    const p = (q ?? txt).trim(); if (!p || c) return; setTxt("");
    const nova = [...msgs, { role: "user", content: p }]; setMsgs(nova); setC(true);
    try { const r = await chamarIA({ modo: "assistente", messages: nova.filter((m) => !m.auto).map(({ role, content }) => ({ role, content })), contexto: contexto(K) }); setMsgs([...nova, { role: "assistant", content: r }]); }
    catch (e) { const l = respostaLocal(p, K); setMsgs([...nova, { role: "assistant", auto: true, content: l ? `${l}\n\n(Resposta do sistema${e.semChave ? " — a IA ainda não foi configurada" : ""}.)` : e.message }]); }
    finally { setC(false); }
  };
  return (
    <div>
      <Titulo eyebrow="IA" title="Meu assistente inteligente Mais BB" sub="Estratégias, passo a passo, exemplos e mensagens prontas. Usa a base de conhecimento do administrador e não inventa produtos, taxas ou regras." direita={msgs.length > 0 && <Btn small tipo="claro" icon={Trash2} onClick={() => setMsgs([])}>Nova conversa</Btn>} />
      <Card className="!p-0 overflow-hidden">
        <div className="h-[460px] overflow-y-auto p-4 space-y-3" style={{ background: C.gray }}>
          {!msgs.length && <div><p className="font-body text-sm mb-3" style={{ color: C.muted }}>Pergunte o que quiser ou escolha:</p><div className="flex flex-wrap gap-1.5">{PERGUNTAS.map((p) => <button key={p} onClick={() => enviar(p)} className="font-body text-xs font-semibold px-3 py-1.5 rounded-full bg-white border" style={{ borderColor: C.line, color: C.navy }}>{p}</button>)}</div></div>}
          {msgs.map((m, i) => <div key={i} className={`flex ${m.role === "user" ? "justify-end" : ""}`}><div className="max-w-[88%] rounded-2xl px-3.5 py-2.5" style={{ background: m.role === "user" ? C.navy : "#fff", color: m.role === "user" ? "#fff" : C.ink, border: m.role === "user" ? "none" : `1px solid ${C.line}` }}>
            {m.role !== "user" && <div className="mb-1"><Selo tipo={m.auto ? "sistema" : "ia"} /></div>}<p className="font-body text-sm whitespace-pre-line leading-relaxed">{m.content}</p>{m.role !== "user" && <div className="mt-2"><Copiar texto={m.content} rotulo="Copiar resposta" /></div>}</div></div>)}
          {c && <div className="rounded-2xl px-3.5 py-2.5 bg-white border inline-block font-body text-sm" style={{ borderColor: C.line, color: C.muted }}><Bot size={14} className="inline" /> pensando...</div>}
          <div ref={fim} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); enviar(); }} className="flex gap-2 p-3 border-t" style={{ borderColor: C.line }}><input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Ex.: Como abordar um comerciante que diz que não tem tempo?" className={inp} style={inpS} /><Btn type="submit" tipo="amarelo" icon={Send} disabled={c || !txt.trim()}>Enviar</Btn></form>
      </Card>
    </div>
  );
}

// ============================================================================= DICAS
export function Dicas({ K }) {
  const todas = [...K.D.dicas.filter((d) => d.ativo).map((d) => [d.categoria, d.texto, true]), ...DICAS];
  const n = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
  const hojeD = todas[n % todas.length];
  const ant = Array.from({ length: 14 }, (_, i) => todas[(n - i - 1 + todas.length * 10) % todas.length]);
  const [cat, setCat] = useState("");
  const cats = [...new Set(todas.map((d) => d[0]))];
  return (
    <div>
      <Titulo eyebrow="Aprender" title="Dicas do dia" />
      <Card style={{ background: C.yellowTint, borderColor: C.yellow }} className="mb-4"><p className="font-body text-[11px] font-bold uppercase flex items-center gap-1" style={{ color: C.yellowInk }}><Lightbulb size={13} /> Hoje · {hojeD[0]}</p><p className="font-display font-bold text-lg mt-1" style={{ color: C.navy }}>{hojeD[1]}</p></Card>
      <p className="font-display font-bold mb-2" style={{ color: C.navy }}>Dicas anteriores</p>
      <div className="grid md:grid-cols-2 gap-2 mb-5">{ant.map((d, i) => <Card key={i} className="!p-3"><p className="font-body text-[11px] font-bold" style={{ color: C.yellowInk }}>{d[0]}</p><p className="font-body text-sm">{d[1]}</p></Card>)}</div>
      <p className="font-display font-bold mb-2" style={{ color: C.navy }}>Biblioteca de dicas</p>
      <div className="flex gap-1.5 flex-wrap mb-3"><Chip ativo={!cat} onClick={() => setCat("")}>Todas</Chip>{cats.map((c) => <Chip key={c} ativo={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}</div>
      <div className="grid md:grid-cols-2 gap-2">{todas.filter((d) => !cat || d[0] === cat).map((d, i) => <Card key={i} className="!p-3"><p className="font-body text-sm">{d[1]}</p></Card>)}</div>
    </div>
  );
}

// ============================================================================= TREINAMENTO
export function Treinamento({ K }) {
  const { D } = K;
  const lista = [...TREINAMENTOS, ...D.treinamentos.filter((t) => t.ativo).map((t) => ({ chave: t.id, modulo: t.modulo, titulo: t.titulo, conteudo: t.conteudo, quiz: t.quiz || [] }))];
  const prog = Object.fromEntries(D.progresso.filter((p) => p.user_id === K.eu).map((p) => [p.chave, p]));
  const [sel, setSel] = useState(null);
  const feitos = lista.filter((t) => prog[t.chave]).length;
  return (
    <div>
      <Titulo eyebrow="Capacitação" title="Treinamento da atendente" sub="Conteúdos curtos e questionários. Seu progresso fica salvo." />
      <Card className="mb-4"><div className="flex items-center gap-3"><GraduationCap color={C.navy} /><div className="flex-1"><p className="font-body text-sm font-bold">{feitos} de {lista.length} módulos concluídos</p><Barra pct={(100 * feitos) / lista.length} cor={C.green} /></div></div></Card>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">{lista.map((t) => { const p = prog[t.chave]; return (
        <Card key={t.chave} onClick={() => setSel(t)}><p className="font-body text-[11px] font-bold uppercase" style={{ color: C.yellowInk }}>{t.modulo}</p><p className="font-display font-bold mt-1" style={{ color: C.navy }}>{t.titulo}</p>
          {p ? <p className="font-body text-xs mt-2" style={{ color: C.green }}><CheckCircle2 size={13} className="inline" /> Concluído · {p.acertos}/{p.total} acertos</p> : <p className="font-body text-xs mt-2" style={{ color: C.soft }}>{t.quiz?.length || 0} pergunta(s)</p>}</Card>); })}</div>
      {sel && <ModalTreino K={K} t={sel} onFechar={() => setSel(null)} />}
    </div>
  );
}
function ModalTreino({ K, t, onFechar }) {
  const [resp, setResp] = useState({}); const [enviado, setEnviado] = useState(false);
  const acertos = (t.quiz || []).filter((q, i) => resp[i] === q.c).length;
  const concluir = async () => { setEnviado(true); try { await K.salvar("progresso", null, { user_id: K.eu, chave: t.chave, acertos, total: (t.quiz || []).length, concluido_em: new Date().toISOString() }); } catch (e) { K.avisar(msgErro(e), "erro"); } };
  return (
    <Modal onFechar={onFechar} titulo={t.titulo}>
      <Texto>{t.conteudo}</Texto>
      {(t.quiz || []).length > 0 && <div className="mt-5 space-y-4"><p className="font-display font-bold" style={{ color: C.navy }}>Questionário</p>{t.quiz.map((q, i) => (
        <div key={i}><p className="font-body text-sm font-bold mb-1.5">{i + 1}. {q.p}</p><div className="space-y-1.5">{q.ops.map((o, j) => { const cor = enviado ? (j === q.c ? C.green : resp[i] === j ? C.red : C.line) : resp[i] === j ? C.navy : C.line; return (
          <button key={j} disabled={enviado} onClick={() => setResp({ ...resp, [i]: j })} className="w-full text-left rounded-xl border-2 px-3 py-2 font-body text-sm" style={{ borderColor: cor, background: enviado && j === q.c ? C.greenTint : "#fff" }}>{o}</button>); })}</div></div>))}
        {!enviado ? <Btn tipo="amarelo" disabled={Object.keys(resp).length < t.quiz.length} onClick={concluir}>Conferir respostas</Btn> : <Aviso tipo={acertos === t.quiz.length ? "ok" : "amarelo"}>Você acertou {acertos} de {t.quiz.length}. {acertos === t.quiz.length ? "Parabéns! 🎉" : "Revise o conteúdo e tente de novo quando quiser."}</Aviso>}
      </div>}
      {!(t.quiz || []).length && <Btn className="mt-4" tipo="verde" onClick={concluir}>Marcar como concluído</Btn>}
    </Modal>
  );
}
