import React, { useState } from "react";
import { ChevronLeft, Target, UserPlus, Plus, Save, Trash2, Search, MapPin, CalendarPlus, CheckCircle2, Users, Sparkles } from "lucide-react";
import { C, Titulo, Btn, Card, KPI, Aviso, Chip, Vazio, Selo, Modal, Campos, inp, inpS, Copiar, Zap, Texto, Barra, msgErro, chamarIA } from "./base.jsx";
import { GRUPOS, TIPOS_PROSP, STATUS_PROSP, CAT_LOCAIS, STATUS_LOCAL, gerarMensagem, TIPOS_MSG } from "./dados.js";
import { hoje, br, periodo, dias } from "./motor.js";

// ============================================================================= RADAR DE CLIENTES (públicos + estratégias)
export function RadarClientes({ K }) {
  const { D } = K;
  const [sel, setSel] = useState(typeof K.param === "string" ? K.param : null);
  const [ia, setIa] = useState({ t: "", c: false, e: "" });
  const p = K.publicos.find((x) => x.chave === sel);
  const qtd = (ch) => D.clientes.filter((c) => c.publico === ch).length;
  const prosp = (ch) => D.prospeccoes.filter((x) => x.publico === ch && x.data >= periodo("mes").de).length;
  if (!p) return (
    <div>
      <Titulo eyebrow="Públicos" title="Radar de clientes" sub="Escolha um público para ver perfil, onde encontrar, como abordar, perguntas, mensagens e meta. Ninguém tem direito a crédito ou condição especial só pela profissão, idade ou vínculo: sempre consulte as regras oficiais." direita={K.admin && <Btn tipo="claro" icon={Plus} onClick={() => { try { sessionStorage.setItem("maisbb-admin-aba", "publicos"); } catch { /* */ } window.location.href = "/admin"; }}>Criar categoria</Btn>} />
      {Object.entries(GRUPOS).map(([g, info]) => { const subs = K.publicos.filter((x) => x.grupo === g); if (!subs.length) return null; return (
        <div key={g} className="mb-5">
          <p className="font-display font-bold mb-2 flex items-center gap-2" style={{ color: C.navy }}><span className="text-xl">{info.emoji}</span>{info.nome}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">{subs.map((x) => (
            <Card key={x.chave} className="!p-3" onClick={() => setSel(x.chave)}>
              <p className="font-body text-sm font-bold" style={{ color: C.ink }}>{x.nome}{x.personalizado && <span className="ml-1 text-[10px]" style={{ color: C.yellowInk }}>●</span>}</p>
              <p className="font-body text-[11px] mt-1" style={{ color: C.muted }}>{qtd(x.chave)} cliente(s) · {prosp(x.chave)} prospecção(ões) no mês</p>
              <div className="mt-2"><Barra pct={(100 * prosp(x.chave)) / (x.meta || 10)} cor={info.cor} /></div>
            </Card>))}</div>
        </div>); })}
      {K.publicos.filter((x) => !GRUPOS[x.grupo]).length > 0 && <div><p className="font-display font-bold mb-2" style={{ color: C.navy }}>Categorias criadas</p><div className="grid grid-cols-2 md:grid-cols-4 gap-2">{K.publicos.filter((x) => !GRUPOS[x.grupo]).map((x) => <Card key={x.chave} className="!p-3" onClick={() => setSel(x.chave)}><p className="font-body text-sm font-bold">{x.nome}</p></Card>)}</div></div>}
    </div>
  );
  const msgs = ["primeira", "apresentacao", "convite", "retorno"].map((t) => [TIPOS_MSG[t], gerarMensagem({ tipo: t, estilo: "amigavel", publico: p.nome, atendente: K.nome, horario: D.config.horario })]);
  const servs = D.servicos.filter((s) => s.ativo && s.confirmado);
  const meta = p.meta || 10; const feitas = prosp(p.chave);
  const B = ({ n, t, children }) => <Card><p className="font-body text-[11px] font-bold uppercase mb-1.5" style={{ color: C.yellowInk }}>{n}. {t}</p><div className="font-body text-sm" style={{ color: C.ink }}>{children}</div></Card>;
  const lista = (arr) => <ul className="list-disc ml-5 space-y-0.5">{(arr || []).map((x) => <li key={x}>{x}</li>)}</ul>;
  const pedirIA = async () => {
    setIa({ t: "", c: true, e: "" });
    try { setIa({ t: await chamarIA({ modo: "consultor", pedido: `Monte um plano de abordagem de 1 semana para o público "${p.nome}" no Mais BB de Ivatuba, com passo a passo e 3 mensagens prontas.`, contexto: `Perfil: ${p.perfil}\nOnde encontrar: ${(p.onde || []).join("; ")}\nServiços cadastrados e confirmados: ${servs.map((s) => s.nome).join(", ") || "nenhum"}` }), c: false, e: "" }); }
    catch (e) { setIa({ t: "", c: false, e: e.message }); }
  };
  return (
    <div>
      <Btn small tipo="claro" icon={ChevronLeft} onClick={() => setSel(null)}>Todos os públicos</Btn>
      <div className="mt-3"><Titulo eyebrow={GRUPOS[p.grupo]?.nome || "Categoria"} title={`${p.emoji || ""} ${p.nome}`} direita={<><Btn tipo="amarelo" icon={Target} onClick={() => K.abrir("prospeccao", { publico: p.chave })}>Prospectar este público</Btn><Btn tipo="claro" icon={UserPlus} onClick={() => K.abrir("cliente", { publico: p.chave, origem: "visita" })}>Cadastrar cliente</Btn></>} /></div>
      <Aviso tipo="amarelo">Sugestões de relacionamento. Não presuma que a pessoa tem direito a crédito ou condição especial por sua profissão, idade ou vínculo: as condições são sempre as oficiais do Banco do Brasil.</Aviso>
      <div className="grid md:grid-cols-2 gap-3 mt-4">
        <B n={1} t="Perfil do público">{p.perfil}</B>
        <B n={2} t="Necessidades que podem ser identificadas">{lista(p.necessidades)}</B>
        <B n={3} t="Onde encontrar esse público">{lista(p.onde)}</B>
        <B n={4} t="Como iniciar uma conversa"><Texto>{p.conversa}</Texto><div className="mt-2"><Copiar texto={p.conversa} /></div></B>
        <B n={5} t="Perguntas para entender necessidades">{lista(p.perguntas)}</B>
        <B n={6} t="Serviços autorizados potencialmente relevantes">{servs.length ? lista(servs.map((s) => s.nome)) : <span style={{ color: C.soft }}>Nenhum serviço confirmado na biblioteca ainda. O administrador cadastra os serviços autorizados ao correspondente.</span>}</B>
        <B n={7} t="Como apresentar o serviço">{p.apresentacao}</B>
        <B n={8} t="Dúvidas frequentes">{lista(p.faq)}</B>
        <Card className="md:col-span-2"><p className="font-body text-[11px] font-bold uppercase mb-2" style={{ color: C.yellowInk }}>9. Mensagens prontas</p><div className="grid md:grid-cols-2 gap-2">{msgs.map(([t, m]) => <div key={t} className="rounded-xl p-3" style={{ background: C.gray }}><p className="font-body text-xs font-bold mb-1" style={{ color: C.navy2 }}>{t}</p><Texto>{m}</Texto><div className="mt-2 flex gap-1.5"><Copiar texto={m} rotulo="Copiar mensagem" /><Zap texto={m} rotulo="Abrir" /></div></div>)}</div></Card>
        <B n={10} t="Estratégia de acompanhamento">{p.acompanhamento}</B>
        <B n={11} t="Campanhas recomendadas">{lista(p.campanhas)}</B>
        <Card className="md:col-span-2"><p className="font-body text-[11px] font-bold uppercase mb-1.5" style={{ color: C.yellowInk }}>12. Meta de prospecção do mês</p><div className="flex items-center gap-3"><div className="flex-1"><Barra pct={(100 * feitas) / meta} cor={feitas >= meta ? C.green : C.navy} /></div><b className="font-body text-sm">{feitas}/{meta}</b></div><p className="font-body text-xs mt-1" style={{ color: C.soft }}>{qtd(p.chave)} cliente(s) desta categoria no CRM.</p></Card>
      </div>
      <div className="mt-4"><Btn tipo="amarelo" icon={Sparkles} onClick={pedirIA} disabled={ia.c}>{ia.c ? "Montando plano..." : "Plano da semana com IA"}</Btn></div>
      {ia.e && <div className="mt-2"><Aviso tipo="amarelo">{ia.e}</Aviso></div>}
      {ia.t && <Card className="mt-3" style={{ borderColor: C.yellow }}><Selo tipo="ia" /><Texto className="mt-2">{ia.t}</Texto><div className="mt-2"><Copiar texto={ia.t} /></div></Card>}
    </div>
  );
}

// ============================================================================= PROSPECÇÃO
export function Prospeccao({ K }) {
  const { D } = K;
  const [f, setF] = useState({ st: "", tipo: "", meus: false });
  const pubNome = Object.fromEntries(K.publicos.map((p) => [p.chave, p.nome]));
  const lista = D.prospeccoes.filter((p) => (!f.st || p.status === f.st) && (!f.tipo || p.tipo === f.tipo) && (!f.meus || p.responsavel === K.eu));
  const pm = periodo("mes");
  const mes = D.prospeccoes.filter((p) => p.data >= pm.de && p.data <= pm.ate);
  const oport = [
    ...D.clientes.filter((c) => c.oportunidade === "interessado" && !c.nao_contatar).map((c) => ({ id: c.id, nome: c.nome, motivo: "Cliente interessado", cli: c })),
    ...D.clientes.filter((c) => c.oportunidade === "nova" && !c.nao_contatar && dias(c.criado_em) >= 3).map((c) => ({ id: c.id, nome: c.nome, motivo: `Cadastrado há ${dias(c.criado_em)} dias, sem acompanhamento`, cli: c })),
    ...D.prospeccoes.filter((p) => p.status === "retorno" && p.retorno_em && p.retorno_em <= hoje()).map((p) => ({ id: p.id, nome: p.contato_nome || pubNome[p.publico] || "Contato", motivo: `Retorno combinado para ${br(p.retorno_em)}`, prosp: p })),
  ];
  return (
    <div>
      <Titulo eyebrow="Ação" title="Prospecção inteligente" sub="Planeje, registre contatos, acompanhe retornos e resultados." direita={<Btn tipo="amarelo" icon={Plus} onClick={() => K.abrir("prospeccao", {})}>Nova prospecção</Btn>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPI titulo="Prospecções no mês" valor={mes.length} icon={Target} />
        <KPI titulo="Contatos feitos" valor={mes.reduce((s, p) => s + (p.contatos_feitos || 0), 0)} icon={Users} />
        <KPI titulo="Aguardando retorno" valor={D.prospeccoes.filter((p) => p.status === "retorno").length} />
        <KPI titulo="Viraram atendimento" valor={mes.filter((p) => p.status === "convertida").length} cor={C.green} destaque />
      </div>
      <Card className="mb-4"><p className="font-display font-bold mb-2" style={{ color: C.navy }}>Lista de oportunidades ({oport.length})</p>
        {oport.length ? oport.slice(0, 12).map((o) => <div key={o.id + o.motivo} className="flex items-center justify-between gap-2 py-2 border-b last:border-0" style={{ borderColor: C.line }}><span className="font-body text-sm"><b>{o.nome}</b> <span style={{ color: C.soft }}>· {o.motivo}</span></span>
          <div className="flex gap-1.5">{o.cli?.whatsapp && <Zap numero={o.cli.whatsapp} rotulo="" texto={gerarMensagem({ tipo: "retorno", estilo: "amigavel", nome: o.cli.nome, atendente: K.nome })} />}<Btn small tipo="claro" onClick={() => (o.cli ? K.abrir("cliente", o.cli) : K.abrir("prospeccao", o.prosp))}>Abrir</Btn></div></div>)
          : <p className="font-body text-sm" style={{ color: C.soft }}>Nenhuma oportunidade pendente.</p>}
      </Card>
      <div className="flex gap-1.5 flex-wrap mb-3">{[["", "Todas"], ...Object.entries(STATUS_PROSP)].map(([k, l]) => <Chip key={k || "t"} ativo={f.st === k} onClick={() => setF({ ...f, st: k })}>{l}</Chip>)}<Chip ativo={f.meus} cor={C.yellowInk} onClick={() => setF({ ...f, meus: !f.meus })}>Só as minhas</Chip></div>
      {lista.length ? <div className="space-y-2">{lista.map((p) => (
        <Card key={p.id} className="!p-3.5" onClick={() => K.abrir("prospeccao", p)}>
          <div className="flex justify-between gap-2"><div className="min-w-0"><p className="font-body text-sm font-bold truncate">{pubNome[p.publico] || "Público não definido"} · {TIPOS_PROSP[p.tipo]}</p><p className="font-body text-xs truncate" style={{ color: C.muted }}>{[p.objetivo, p.local, p.contato_nome].filter(Boolean).join(" · ") || "—"}</p><p className="font-body text-[11px]" style={{ color: C.soft }}>{br(p.data)}{p.meta ? ` · meta ${p.meta}` : ""}{p.contatos_feitos ? ` · ${p.contatos_feitos} contato(s)` : ""}{p.proximo_passo ? ` · ➜ ${p.proximo_passo}` : ""}</p></div>
            <Chip cor={{ planejada: C.soft, realizada: C.blue, retorno: C.yellowInk, convertida: C.green, sem_interesse: C.red }[p.status]}>{STATUS_PROSP[p.status]}</Chip></div>
        </Card>))}</div> : <Vazio>Nenhuma prospecção ainda. Comece pela estratégia de hoje ou pelo Radar de clientes.</Vazio>}
    </div>
  );
}
export function ModalProspeccao({ K, item, inicial, onFechar }) {
  const { D } = K;
  const [v, setV] = useState(item || { data: hoje(), tipo: "presencial", status: "planejada", responsavel: K.eu, contatos_feitos: 0, ...(inicial || {}) });
  const [erro, setErro] = useState("");
  const salvar = async () => {
    try {
      const d = {}; for (const [k, x] of Object.entries(v)) if (!["id", "criado_em"].includes(k)) d[k] = x === "" ? null : ["meta", "contatos_feitos"].includes(k) && x != null ? Number(x) : x;
      d.contatos_feitos = d.contatos_feitos || 0;
      await K.salvar("prospeccoes", item?.id, d);
      if (v.retorno_em && v.retorno_em !== item?.retorno_em) await K.salvar("tarefas", null, { titulo: `Retorno de prospecção: ${v.contato_nome || K.publicos.find((p) => p.chave === v.publico)?.nome || ""}`, tipo: "retorno", data: v.retorno_em, prioridade: "media", cliente_id: v.cliente_id || null });
      K.avisar("Prospecção salva."); onFechar();
    } catch (e) { setErro(msgErro(e)); }
  };
  const servs = D.servicos.filter((s) => s.ativo);
  return (
    <Modal onFechar={onFechar} titulo={item ? "Prospecção" : "Nova prospecção"} largura="max-w-3xl">
      <Campos v={v} set={setV} campos={[
        { k: "publico", l: "Público", t: "select", op: K.publicos.map((p) => [p.chave, p.nome]) }, { k: "tipo", l: "Tipo de prospecção", t: "select", semVazio: true, op: Object.entries(TIPOS_PROSP) },
        { k: "objetivo", l: "Objetivo", full: true }, { k: "servico_id", l: "Serviço que deseja divulgar", t: "select", op: servs.map((s) => [s.id, s.nome]) }, { k: "local", l: "Local ou segmento" },
        { k: "data", l: "Data", t: "date" }, { k: "responsavel", l: "Responsável", t: "select", op: D.membros.map((m) => [m.user_id, m.nome]) },
        { k: "meta", l: "Meta (contatos)", t: "number" }, { k: "contatos_feitos", l: "Contatos feitos", t: "number" },
        { k: "cliente_id", l: "Cliente (se for um só)", t: "select", op: D.clientes.filter((c) => !c.nao_contatar).map((c) => [c.id, c.nome]) }, { k: "contato_nome", l: "Contato / organização" },
        { k: "campanha_id", l: "Campanha", t: "select", op: D.campanhas.map((c) => [c.id, c.nome]) }, { k: "status", l: "Situação", t: "select", semVazio: true, op: Object.entries(STATUS_PROSP) },
        { k: "resultado", l: "Resultado", t: "textarea", full: true }, { k: "proximo_passo", l: "Próximo passo", full: true }, { k: "retorno_em", l: "Retorno em", t: "date", dica: "Cria um retorno na agenda." },
      ]} />
      <p className="font-body text-[11px] mt-2" style={{ color: C.soft }}>Registre apenas contatos autorizados. Respeite quem pediu para não ser contatado.</p>
      {erro && <div className="mt-3"><Aviso tipo="erro">{erro}</Aviso></div>}
      <div className="flex justify-between mt-4">{item ? <Btn small tipo="perigo" icon={Trash2} onClick={async () => { await K.apagar("prospeccoes", item.id); onFechar(); }}>Excluir</Btn> : <span />}<Btn icon={Save} onClick={salvar}>Salvar</Btn></div>
    </Modal>
  );
}

// ============================================================================= RADAR DE OPORTUNIDADES DE IVATUBA
export function RadarIvatuba({ K }) {
  const { D } = K;
  const [f, setF] = useState({ cat: "", st: "", busca: "" });
  const [ed, setEd] = useState(null);
  const lista = D.locais.filter((l) => (!f.cat || l.categoria === f.cat) && (!f.st || l.status === f.st) && (!f.busca || `${l.nome} ${l.endereco || ""}`.toLowerCase().includes(f.busca.toLowerCase())));
  const agenda = D.locais.filter((l) => l.proxima_data && l.status !== "sem_interesse").sort((a, b) => a.proxima_data.localeCompare(b.proxima_data));
  return (
    <div>
      <Titulo eyebrow="Ivatuba" title="Radar de oportunidades de Ivatuba" sub="Planeje visitas e ações em comércios, empresas, escolas, associações e eventos. Registre organizações e contatos comerciais, sem dados pessoais de terceiros sem autorização." direita={<Btn tipo="amarelo" icon={Plus} onClick={() => setEd({})}>Novo local</Btn>} />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">{Object.entries(CAT_LOCAIS).map(([k, l]) => { const n = D.locais.filter((x) => x.categoria === k).length; return <button key={k} onClick={() => setF({ ...f, cat: f.cat === k ? "" : k })} className="rounded-xl border bg-white px-3 py-2 text-left" style={{ borderColor: f.cat === k ? C.navy : C.line }}><p className="font-body text-xs font-bold" style={{ color: C.ink }}>{l}</p><p className="font-body text-[11px]" style={{ color: C.soft }}>{n} cadastrado(s)</p></button>; })}</div>
      {agenda.length > 0 && <Card className="mb-4"><p className="font-display font-bold mb-2" style={{ color: C.navy }}>Agenda de visitas e acompanhamento</p>{agenda.slice(0, 8).map((l) => <button key={l.id} onClick={() => setEd(l)} className="w-full text-left flex justify-between py-1.5 border-b last:border-0 font-body text-sm" style={{ borderColor: C.line }}><span><b style={{ color: l.proxima_data < hoje() ? C.red : C.navy }}>{br(l.proxima_data)}</b> · {l.nome}</span><span style={{ color: C.soft }}>{l.proxima_acao || ""}</span></button>)}</Card>}
      <div className="flex gap-2 flex-wrap mb-3"><div className="relative flex-1 min-w-[180px]"><Search size={15} className="absolute left-3 top-3" color={C.soft} /><input value={f.busca} onChange={(e) => setF({ ...f, busca: e.target.value })} placeholder="Buscar..." className={inp} style={{ ...inpS, paddingLeft: 34 }} /></div></div>
      <div className="flex gap-1.5 flex-wrap mb-4">{[["", "Todos"], ...Object.entries(STATUS_LOCAL)].map(([k, l]) => <Chip key={k || "t"} ativo={f.st === k} onClick={() => setF({ ...f, st: k })}>{l}</Chip>)}</div>
      {lista.length ? <div className="grid md:grid-cols-2 gap-2">{lista.map((l) => (
        <Card key={l.id} className="!p-3.5" onClick={() => setEd(l)}>
          <div className="flex justify-between gap-2"><div className="min-w-0"><p className="font-body text-sm font-bold truncate">{l.nome}</p><p className="font-body text-xs truncate" style={{ color: C.muted }}><MapPin size={11} className="inline" /> {CAT_LOCAIS[l.categoria]}{l.endereco ? ` · ${l.endereco}` : ""}</p><p className="font-body text-[11px]" style={{ color: C.soft }}>{l.data_visita ? `Visitado em ${br(l.data_visita)}` : "Ainda não visitado"}{l.proxima_acao ? ` · ➜ ${l.proxima_acao}` : ""}</p></div>
            <Chip cor={{ a_visitar: C.yellowInk, visitado: C.blue, acompanhamento: C.navy2, parceria: C.green, sem_interesse: C.soft }[l.status]}>{STATUS_LOCAL[l.status]}</Chip></div>
        </Card>))}</div> : <Vazio>Nenhum local cadastrado. Comece pelos comércios e escolas próximos.</Vazio>}
      {ed && <ModalLocal K={K} local={ed.id ? ed : null} onFechar={() => setEd(null)} />}
    </div>
  );
}
function ModalLocal({ K, local, onFechar }) {
  const [v, setV] = useState(local || { categoria: "comercio", status: "a_visitar", responsavel: K.eu });
  const [erro, setErro] = useState("");
  const salvar = async () => {
    if (!v.nome) { setErro("Informe o nome."); return; }
    try {
      const d = {}; for (const [k, x] of Object.entries(v)) if (!["id", "criado_em"].includes(k)) d[k] = x === "" ? null : x;
      if (d.data_visita && d.status === "a_visitar") d.status = "visitado";
      await K.salvar("locais", local?.id, d);
      if (d.proxima_data && d.proxima_data !== local?.proxima_data) await K.salvar("tarefas", null, { titulo: `Visita: ${d.nome}`, tipo: "visita", data: d.proxima_data, prioridade: "media", observacao: d.proxima_acao || d.objetivo });
      K.avisar("Local salvo."); onFechar();
    } catch (e) { setErro(msgErro(e)); }
  };
  return (
    <Modal onFechar={onFechar} titulo={local ? local.nome : "Novo local"}>
      <Campos v={v} set={setV} campos={[
        { k: "nome", l: "Nome do estabelecimento ou organização", req: true, full: true }, { k: "categoria", l: "Categoria", t: "select", semVazio: true, op: Object.entries(CAT_LOCAIS) },
        { k: "status", l: "Situação", t: "select", semVazio: true, op: Object.entries(STATUS_LOCAL) }, { k: "endereco", l: "Endereço comercial", full: true },
        { k: "contato", l: "Responsável pelo contato", dica: "Contato comercial (com autorização)." }, { k: "data_visita", l: "Data da visita", t: "date" },
        { k: "objetivo", l: "Objetivo", full: true }, { k: "resultado", l: "Resultado", t: "textarea", full: true },
        { k: "proxima_acao", l: "Próxima ação", full: true }, { k: "proxima_data", l: "Data da próxima ação", t: "date", dica: "Cria a visita na agenda." },
      ]} />
      {erro && <div className="mt-3"><Aviso tipo="erro">{erro}</Aviso></div>}
      <div className="flex justify-between mt-4">{local ? <Btn small tipo="perigo" icon={Trash2} onClick={async () => { await K.apagar("locais", local.id); onFechar(); }}>Excluir</Btn> : <span />}<Btn icon={Save} onClick={salvar}>Salvar</Btn></div>
    </Modal>
  );
}
