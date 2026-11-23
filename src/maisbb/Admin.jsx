import React, { useEffect, useState } from "react";
import { Users, Settings, Package, Layers, Target, CalendarDays, CalendarRange, Coins, Gift, Bot, Lightbulb, GraduationCap, FileBarChart, History, Plus, Save, Trash2, Upload, ShieldCheck, Dices, FileDown, CheckCircle2 } from "lucide-react";
import { supabase, supabaseConfigurado } from "../supabaseClient";
import { C, Titulo, Btn, Card, Aviso, Chip, Vazio, Modal, Campos, Campo, inp, inpS, Texto, msgErro } from "./base.jsx";
import { CAT_SERVICOS, SUGESTOES_SERVICOS, GRUPOS, MESES, SEMANA_PADRAO, INDICADORES } from "./dados.js";
import { MES_NOME, SEMANA, br, hoje, mesInfo } from "./motor.js";
import { Relatorios, pdfSorteio } from "./telas5.jsx";
import { AnepsAdm } from "./aneps.jsx";
import { ModelosFormAdm } from "./formulario-pdf.jsx";
import { SorteiosMensais } from "./sorteios-mensais.jsx";

const ABAS = [["equipe", "Equipe e acessos", Users], ["config", "Correspondente e logo", Settings], ["servicos", "Serviços", Package], ["publicos", "Públicos", Layers], ["metas", "Metas", Target], ["calendario", "Calendário", CalendarDays], ["rotina", "Rotina semanal", CalendarRange], ["pontuacao", "Pontuação", Coins], ["desafios", "Desafios e sorteios", Gift], ["conhecimento", "Conteúdo do assistente", Bot], ["dicas", "Dicas", Lightbulb], ["treinamentos", "Treinamentos", GraduationCap], ["aneps", "Treinamento ANEPS", GraduationCap], ["formularios", "Modelos de formulário", FileDown], ["sorteiosmensais", "Sorteios mensais", Gift], ["relatorios", "Relatórios", FileBarChart], ["log", "Registro de alterações", History]];
const limpa = (v, num = []) => { const d = {}; for (const [k, x] of Object.entries(v)) if (!["id", "criado_em", "atualizado_em"].includes(k) && !k.startsWith("_")) d[k] = x === "" ? null : num.includes(k) && x != null ? Number(x) : x; return d; };

export default function Admin({ K }) {
  const [aba, setAbaE] = useState(() => { try { return sessionStorage.getItem("maisbb-admin-aba") || "equipe"; } catch { return "equipe"; } });
  const setAba = (a) => { setAbaE(a); try { sessionStorage.setItem("maisbb-admin-aba", a); } catch { /* */ } };
  return (
    <div className="grid lg:grid-cols-[230px_1fr] gap-5">
      <aside className="rounded-2xl bg-white border p-2 h-fit flex lg:flex-col gap-1 overflow-x-auto" style={{ borderColor: C.line }}>
        {ABAS.map(([k, l, I]) => <button key={k} onClick={() => setAba(k)} className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl font-body text-sm font-semibold text-left whitespace-nowrap" style={{ background: aba === k ? C.yellow : "transparent", color: aba === k ? C.navy : C.muted }}><I size={15} /> {l}</button>)}
      </aside>
      <div className="min-w-0">
        {aba === "equipe" && <Equipe K={K} />}
        {aba === "config" && <Config K={K} />}
        {aba === "servicos" && <Servicos K={K} />}
        {aba === "publicos" && <Publicos K={K} />}
        {aba === "metas" && <Metas K={K} />}
        {aba === "calendario" && <CalendarioAdm K={K} />}
        {aba === "rotina" && <Rotina K={K} />}
        {aba === "pontuacao" && <Pontuacao K={K} />}
        {aba === "desafios" && <DesafiosAdm K={K} />}
        {aba === "conhecimento" && <ListaSimples K={K} tab="conhecimento" titulo="Conteúdo do assistente" sub="Base de conhecimento que o assistente usa nas respostas. Coloque somente informações oficiais e atualizadas (horários, procedimentos internos, serviços autorizados, canais oficiais)." campos={[{ k: "titulo", l: "Título", req: true, full: true }, { k: "conteudo", l: "Conteúdo", t: "textarea", rows: 8, full: true, req: true }, { k: "ativo", l: "Situação", t: "checkbox", texto: "Ativo" }]} novo={{ ativo: true }} rotulo={(x) => x.titulo} />}
        {aba === "dicas" && <ListaSimples K={K} tab="dicas" titulo="Dicas do dia" sub="Dicas próprias que entram no rodízio junto com as do sistema." campos={[{ k: "categoria", l: "Categoria", t: "select", semVazio: true, op: ["Atendimento", "Comunicação", "Vendas responsáveis", "Prospecção", "Relacionamento", "Segurança bancária", "Organização", "Produtividade"].map((x) => [x, x]) }, { k: "texto", l: "Dica", t: "textarea", full: true, req: true }, { k: "ativo", l: "Situação", t: "checkbox", texto: "Ativa" }]} novo={{ categoria: "Atendimento", ativo: true }} rotulo={(x) => `${x.categoria}: ${x.texto}`} />}
        {aba === "treinamentos" && <TreinamentosAdm K={K} />}
        {aba === "aneps" && <AnepsAdm K={K} />}
        {aba === "formularios" && <ModelosFormAdm K={K} />}
        {aba === "sorteiosmensais" && <SorteiosMensais K={K} modoAdmin />}
        {aba === "relatorios" && <Relatorios K={K} />}
        {aba === "log" && <Log K={K} />}
      </div>
    </div>
  );
}

function Equipe({ K }) {
  const { D } = K;
  const [convites, setConvites] = useState([]);
  const [v, setV] = useState({ papel: "atendente" });
  const carregar = async () => { if (!supabaseConfigurado) return; const { data } = await supabase.from("maisbb_convites").select("*").order("criado_em", { ascending: false }); setConvites(data || []); };
  useEffect(() => { carregar(); }, []);
  const convidar = async () => {
    if (!v.email) return K.avisar("Informe o e-mail.", "erro");
    const { error } = await supabase.from("maisbb_convites").upsert({ email: v.email.trim().toLowerCase(), nome: v.nome || null, papel: v.papel });
    if (error) return K.avisar(msgErro(error), "erro");
    setV({ papel: "atendente" }); carregar(); K.avisar("Acesso liberado. A pessoa entra com esse e-mail (criando a conta, se ainda não tiver).");
  };
  return (
    <div>
      <Titulo eyebrow="Acesso" title="Equipe e acessos" sub="Libere o acesso pelo e-mail. A pessoa entra em /entrar (ou cria a conta) e já cai no perfil definido." />
      <Card className="mb-4"><p className="font-display font-bold mb-3" style={{ color: C.navy }}>Liberar novo acesso</p>
        <Campos v={v} set={setV} campos={[{ k: "email", l: "E-mail", t: "email", req: true }, { k: "nome", l: "Nome" }, { k: "papel", l: "Perfil", t: "select", semVazio: true, op: [["atendente", "Atendente"], ["admin", "Administrador"]] }]} />
        <div className="flex justify-end mt-3"><Btn icon={Plus} onClick={convidar}>Liberar acesso</Btn></div>
        {convites.length > 0 && <div className="mt-4"><p className="font-body text-[11px] font-bold uppercase mb-1" style={{ color: C.muted }}>Aguardando primeiro acesso</p>{convites.map((c) => <div key={c.email} className="flex justify-between items-center py-1.5 border-b font-body text-sm" style={{ borderColor: C.line }}><span>{c.nome || "—"} · {c.email} · {c.papel}</span><button onClick={async () => { await supabase.from("maisbb_convites").delete().eq("email", c.email); carregar(); }}><Trash2 size={14} color={C.red} /></button></div>)}</div>}
      </Card>
      <div className="space-y-2">{D.membros.map((m) => (
        <Card key={m.user_id} className="!p-3.5"><div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[160px]"><p className="font-body text-sm font-bold">{m.nome}{m.user_id === K.eu ? " (você)" : ""}</p><p className="font-body text-xs" style={{ color: C.soft }}>{m.email} · desde {br(m.criado_em)}</p></div>
          <select value={m.papel} disabled={m.user_id === K.eu} onChange={async (e) => { try { await K.salvar("membros", m.user_id, { papel: e.target.value }); } catch (er) { K.avisar(msgErro(er), "erro"); } }} className={inp} style={{ ...inpS, width: "auto" }}><option value="atendente">Atendente</option><option value="admin">Administrador</option></select>
          <Btn small tipo={m.ativo ? "claro" : "verde"} disabled={m.user_id === K.eu} onClick={async () => { try { await K.salvar("membros", m.user_id, { ativo: !m.ativo }); } catch (er) { K.avisar(msgErro(er), "erro"); } }}>{m.ativo ? "Desativar" : "Reativar"}</Btn>
        </div></Card>))}</div>
    </div>
  );
}

function Config({ K }) {
  const { D } = K;
  const [v, setV] = useState(D.config);
  const [env, setEnv] = useState(false);
  const salvar = async () => { try { await K.salvar("config", 1, { nome_correspondente: v.nome_correspondente, cidade: v.cidade, endereco: v.endereco, horario: v.horario, whatsapp: v.whatsapp, logo_url: v.logo_url }); K.avisar("Dados salvos."); } catch (e) { K.avisar(msgErro(e), "erro"); } };
  const logo = async (f) => { if (!f) return; setEnv(true); try { const url = await K.enviarArquivo(f, "logo"); setV({ ...v, logo_url: url }); await K.salvar("config", 1, { logo_url: url }); K.avisar("Logo atualizada."); } catch (e) { K.avisar(msgErro(e), "erro"); } finally { setEnv(false); } };
  return (
    <div>
      <Titulo eyebrow="Identidade" title="Correspondente e logo" sub="Use a logo oficial do Mais BB Correspondente Autorizado fornecida a você. Não use marcas de forma que sugira que este é um aplicativo oficial do Banco do Brasil." />
      <Card>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-24 h-24 rounded-2xl border flex items-center justify-center overflow-hidden bg-white" style={{ borderColor: C.line }}>{v.logo_url ? <img src={v.logo_url} alt="Logo" className="w-full h-full object-contain" /> : <span className="font-body text-xs" style={{ color: C.soft }}>Sem logo</span>}</div>
          <label className="cursor-pointer"><span className="inline-flex items-center gap-1.5 font-body text-sm font-bold px-3.5 py-2.5 rounded-xl" style={{ background: C.yellow, color: C.navy }}><Upload size={15} /> {env ? "Enviando..." : "Enviar logo"}</span><input type="file" accept="image/*" className="hidden" onChange={(e) => logo(e.target.files?.[0])} /></label>
          {v.logo_url && <Btn small tipo="perigo" onClick={async () => { setV({ ...v, logo_url: null }); await K.salvar("config", 1, { logo_url: null }); }}>Remover</Btn>}
        </div>
        <Campos v={v} set={setV} campos={[{ k: "nome_correspondente", l: "Nome do correspondente", full: true }, { k: "cidade", l: "Cidade" }, { k: "whatsapp", l: "WhatsApp do correspondente" }, { k: "endereco", l: "Endereço", full: true }, { k: "horario", l: "Horário de atendimento", full: true, ph: "Ex.: Seg a sex, 8h às 18h · Sáb, 8h às 12h" }]} />
        <div className="flex justify-end mt-4"><Btn icon={Save} onClick={salvar}>Salvar</Btn></div>
      </Card>
    </div>
  );
}

function Servicos({ K }) {
  const { D } = K;
  const [ed, setEd] = useState(null);
  const faltam = SUGESTOES_SERVICOS.filter(([, n]) => !D.servicos.some((s) => s.nome.toLowerCase() === n.toLowerCase()));
  return (
    <div>
      <Titulo eyebrow="Biblioteca" title="Produtos e serviços" sub="Cadastre somente o que é oficialmente autorizado ao seu correspondente. Marque como confirmado depois de conferir no contrato/portal oficial. Não informe taxas, limites ou prazos que não sejam os oficiais vigentes." direita={<Btn tipo="amarelo" icon={Plus} onClick={() => setEd({ categoria: CAT_SERVICOS[0], ativo: true, confirmado: false })}>Novo serviço</Btn>} />
      {faltam.length > 0 && <Card className="mb-4"><p className="font-body text-sm font-bold mb-1" style={{ color: C.navy }}>Sugestões para conferir</p><p className="font-body text-xs mb-2" style={{ color: C.muted }}>Nomes comuns de serviços de correspondentes. Só adicione se o seu contrato autorizar — entram como "a confirmar".</p>
        <div className="flex flex-wrap gap-1.5">{faltam.map(([c, n]) => <Chip key={n} onClick={() => setEd({ categoria: c, nome: n, ativo: true, confirmado: false })}>+ {n}</Chip>)}</div></Card>}
      {D.servicos.length ? <div className="space-y-2">{D.servicos.map((s) => (
        <Card key={s.id} className="!p-3.5" onClick={() => setEd(s)}><div className="flex justify-between gap-2"><div><p className="font-body text-sm font-bold">{s.nome}</p><p className="font-body text-xs" style={{ color: C.muted }}>{s.categoria} · atualizado {br(s.atualizado_em)}</p></div><div className="flex gap-1.5 items-start">{s.confirmado ? <Chip cor={C.green}>confirmado</Chip> : <Chip cor={C.red}>a confirmar</Chip>}{!s.ativo && <Chip cor={C.soft}>desativado</Chip>}</div></div></Card>))}</div> : <Vazio>Nenhum serviço cadastrado.</Vazio>}
      {ed && <Modal onFechar={() => setEd(null)} titulo={ed.id ? ed.nome : "Novo serviço"} largura="max-w-3xl"><FormServico K={K} s={ed} onFechar={() => setEd(null)} /></Modal>}
    </div>
  );
}
function FormServico({ K, s, onFechar }) {
  const [v, setV] = useState(s);
  const salvar = async () => { if (!v.nome) return K.avisar("Informe o nome.", "erro"); try { await K.salvar("servicos", s.id, limpa(v)); K.avisar("Serviço salvo."); onFechar(); } catch (e) { K.avisar(msgErro(e), "erro"); } };
  return (<>
    <Campos v={v} set={setV} campos={[{ k: "nome", l: "Nome", req: true, full: true }, { k: "categoria", l: "Categoria", t: "select", semVazio: true, op: CAT_SERVICOS.map((c) => [c, c]) }, { k: "publico", l: "Público" },
      { k: "descricao", l: "Descrição", t: "textarea", full: true }, { k: "finalidade", l: "Finalidade", t: "textarea" }, { k: "requisitos", l: "Requisitos", t: "textarea" }, { k: "documentos", l: "Documentos", t: "textarea" },
      { k: "condicoes", l: "Condições vigentes (oficiais)", t: "textarea", dica: "Somente o que constar na fonte oficial; deixe vazio se não tiver." }, { k: "faq", l: "Perguntas frequentes", t: "textarea", full: true }, { k: "orientacoes", l: "Orientações", t: "textarea", full: true },
      { k: "canal_oficial", l: "Canal oficial de consulta" }, { k: "fonte_url", l: "Link da fonte oficial", t: "url" },
      { k: "confirmado", l: "Confirmação", t: "checkbox", texto: "Conferi que este serviço é autorizado ao correspondente e as informações são oficiais" }, { k: "ativo", l: "Situação", t: "checkbox", texto: "Ativo (aparece para as atendentes)" }]} />
    <div className="flex justify-between mt-4">{s.id ? <Btn small tipo="perigo" icon={Trash2} onClick={async () => { if (confirm("Excluir este serviço?")) { await K.apagar("servicos", s.id); onFechar(); } }}>Excluir</Btn> : <span />}<Btn icon={Save} onClick={salvar}>Salvar</Btn></div>
  </>);
}

function Publicos({ K }) {
  const { D } = K;
  const [ed, setEd] = useState(null);
  const abrir = (p) => setEd({ chave: p.chave, grupo: p.grupo, nome: p.nome, perfil: p.perfil || "", necessidades: (p.necessidades || []).join("\n"), onde: (p.onde || []).join("\n"), conversa: p.conversa || "", perguntas: (p.perguntas || []).join("\n"), apresentacao: p.apresentacao || "", faq: (p.faq || []).join("\n"), acompanhamento: p.acompanhamento || "", campanhas: (p.campanhas || []).join("\n"), meta: p.meta || 10, ativo: p.ativo !== false, _existe: true });
  const salvar = async () => {
    if (!ed.nome) return K.avisar("Informe o nome.", "erro");
    const lin = (x) => String(x || "").split("\n").map((s) => s.trim()).filter(Boolean);
    const chave = ed.chave || `custom.${ed.nome.toLowerCase().normalize("NFD").replace(/[^\w]+/g, "-")}-${Date.now().toString(36)}`;
    const dados = { chave, grupo: ed.grupo || "custom", nome: ed.nome, ativo: ed.ativo !== false, conteudo: { perfil: ed.perfil, necessidades: lin(ed.necessidades), onde: lin(ed.onde), conversa: ed.conversa, perguntas: lin(ed.perguntas), apresentacao: ed.apresentacao, faq: lin(ed.faq), acompanhamento: ed.acompanhamento, campanhas: lin(ed.campanhas), meta: Number(ed.meta) || 10, emoji: ed.emoji || GRUPOS[ed.grupo]?.emoji || "👥" } };
    try { const { error } = await supabase.from("maisbb_publicos").upsert(dados); if (error) throw error; await K.carregar(); K.avisar("Público salvo."); setEd(null); } catch (e) { K.avisar(msgErro(e), "erro"); }
  };
  return (
    <div>
      <Titulo eyebrow="Radar" title="Públicos e estratégias" sub="Edite o conteúdo dos públicos padrão ou crie novas categorias." direita={<Btn tipo="amarelo" icon={Plus} onClick={() => setEd({ grupo: "outros", meta: 10, ativo: true })}>Nova categoria</Btn>} />
      <div className="grid md:grid-cols-2 gap-2">{[...K.publicos, ...D.publicos.filter((p) => !p.ativo).map((p) => ({ ...p, ...(p.conteudo || {}), ativo: false }))].map((p) => <Card key={p.chave} className="!p-3" onClick={() => abrir(p)}><p className="font-body text-sm font-bold">{p.emoji} {p.nome} {p.personalizado && <Chip cor={C.yellowInk}>ajustado</Chip>} {p.ativo === false && <Chip cor={C.soft}>inativo</Chip>}</p><p className="font-body text-xs" style={{ color: C.muted }}>{GRUPOS[p.grupo]?.nome || "Categoria própria"} · meta {p.meta || 10}/mês</p></Card>)}</div>
      {ed && <Modal onFechar={() => setEd(null)} titulo={ed.nome || "Nova categoria"} largura="max-w-3xl">
        <Campos v={ed} set={setEd} campos={[{ k: "nome", l: "Nome", req: true }, { k: "grupo", l: "Grupo", t: "select", semVazio: true, op: [...Object.entries(GRUPOS).map(([k, g]) => [k, g.nome]), ["custom", "Categoria própria"]] }, { k: "perfil", l: "1. Perfil", t: "textarea", full: true }, { k: "necessidades", l: "2. Necessidades (uma por linha)", t: "textarea", full: true }, { k: "onde", l: "3. Onde encontrar (uma por linha)", t: "textarea", full: true }, { k: "conversa", l: "4. Como iniciar a conversa", t: "textarea", full: true }, { k: "perguntas", l: "5. Perguntas (uma por linha)", t: "textarea", full: true }, { k: "apresentacao", l: "7. Como apresentar o serviço", t: "textarea", full: true }, { k: "faq", l: "8. Dúvidas frequentes (uma por linha)", t: "textarea", full: true }, { k: "acompanhamento", l: "10. Estratégia de acompanhamento", t: "textarea", full: true }, { k: "campanhas", l: "11. Campanhas recomendadas (uma por linha)", t: "textarea" }, { k: "meta", l: "12. Meta de prospecção/mês", t: "number" }, { k: "ativo", l: "Situação", t: "checkbox", texto: "Ativo" }]} />
        <p className="font-body text-[11px] mt-2" style={{ color: C.soft }}>Serviços (6) e mensagens (9) são montados automaticamente a partir da biblioteca e do gerador.</p>
        <div className="flex justify-between mt-4">{ed._existe && D.publicos.some((p) => p.chave === ed.chave) ? <Btn small tipo="perigo" onClick={async () => { await supabase.from("maisbb_publicos").delete().eq("chave", ed.chave); await K.carregar(); setEd(null); }}>Voltar ao padrão / excluir</Btn> : <span />}<Btn icon={Save} onClick={salvar}>Salvar</Btn></div>
      </Modal>}
    </div>
  );
}

function Metas({ K }) {
  const { D } = K;
  const [v, setV] = useState({ indicador: "atendimentos", periodo: "mes", alvo: 50, ativo: true });
  const add = async () => { try { await K.salvar("metas", null, limpa({ ...v, atendente: v.atendente || null }, ["alvo"])); K.avisar("Meta criada."); } catch (e) { K.avisar(msgErro(e), "erro"); } };
  const nm = Object.fromEntries(D.membros.map((m) => [m.user_id, m.nome]));
  return (
    <div>
      <Titulo eyebrow="Metas" title="Metas configuráveis" sub="Sem atendente definido, a meta vale para cada atendente." />
      <Card className="mb-4"><Campos v={v} set={setV} campos={[{ k: "indicador", l: "Indicador", t: "select", semVazio: true, op: Object.entries(INDICADORES) }, { k: "periodo", l: "Período", t: "select", semVazio: true, op: [["dia", "Diária"], ["semana", "Semanal"], ["mes", "Mensal"]] }, { k: "alvo", l: "Meta", t: "number" }, { k: "atendente", l: "Atendente", t: "select", vazio: "Cada atendente", op: D.membros.map((m) => [m.user_id, m.nome]) }]} /><div className="flex justify-end mt-3"><Btn icon={Plus} onClick={add}>Adicionar meta</Btn></div></Card>
      <div className="space-y-2">{D.metas.map((m) => <Card key={m.id} className="!p-3"><div className="flex items-center gap-3 flex-wrap"><p className="flex-1 font-body text-sm"><b>{INDICADORES[m.indicador]}</b> · {{ dia: "diária", semana: "semanal", mes: "mensal" }[m.periodo]} · {nm[m.atendente] || "cada atendente"}</p>
        <input type="number" defaultValue={m.alvo} onBlur={async (e) => { const a = Number(e.target.value); if (a > 0 && a !== m.alvo) await K.salvar("metas", m.id, { alvo: a }); }} className={inp} style={{ ...inpS, width: 90 }} />
        <Btn small tipo={m.ativo ? "claro" : "verde"} onClick={() => K.salvar("metas", m.id, { ativo: !m.ativo })}>{m.ativo ? "Desativar" : "Ativar"}</Btn><button onClick={() => K.apagar("metas", m.id)}><Trash2 size={15} color={C.red} /></button></div></Card>)}{!D.metas.length && <Vazio>Nenhuma meta.</Vazio>}</div>
    </div>
  );
}

function CalendarioAdm({ K }) {
  const { D } = K;
  const cal = D.config.calendario || {};
  const [m, setM] = useState(new Date().getMonth());
  const info = mesInfo(m, cal);
  const [v, setV] = useState(null);
  useEffect(() => { setV({ tema: info.tema, publico: info.publico, objetivo: info.objetivo, principal: info.principal, secundarias: (info.secundarias || []).join("\n"), datas: (info.datas || []).map(([d, t]) => `${d} ${t}`).join("\n") }); }, [m]);
  const [ex, setEx] = useState({ data: "", titulo: "" });
  const salvarMes = async () => {
    const meses = [...(cal.meses || Array(12).fill(null))]; while (meses.length < 12) meses.push(null);
    meses[m] = { tema: v.tema, publico: v.publico, objetivo: v.objetivo, principal: v.principal, secundarias: v.secundarias.split("\n").map((s) => s.trim()).filter(Boolean), datas: v.datas.split("\n").map((s) => s.trim()).filter(Boolean).map((l) => { const [d, ...t] = l.split(" "); return [d, t.join(" ")]; }) };
    try { await K.salvar("config", 1, { calendario: { ...cal, meses } }); K.avisar("Mês atualizado."); } catch (e) { K.avisar(msgErro(e), "erro"); }
  };
  const addExtra = async () => { if (!ex.data || !ex.titulo) return; try { await K.salvar("config", 1, { calendario: { ...cal, extras: [...(cal.extras || []), ex] } }); setEx({ data: "", titulo: "" }); } catch (e) { K.avisar(msgErro(e), "erro"); } };
  if (!v) return null;
  return (
    <div>
      <Titulo eyebrow="Estratégia" title="Calendário comercial" sub="Ajuste o tema, o público e as datas de cada mês. Datas no formato MM-DD (ex.: 03-08). Use 'maes' e 'pais' para as datas móveis." />
      <div className="grid grid-cols-6 lg:grid-cols-12 gap-1.5 mb-4">{MES_NOME.map((n, i) => <button key={n} onClick={() => setM(i)} className="rounded-xl py-2 font-body text-xs font-bold" style={{ background: m === i ? C.navy : "#fff", color: m === i ? "#fff" : C.ink, border: `1px solid ${C.line}` }}>{n.slice(0, 3)}</button>)}</div>
      <Card><Campos v={v} set={setV} campos={[{ k: "tema", l: "Tema", full: true }, { k: "publico", l: "Público prioritário", t: "select", semVazio: true, op: Object.entries(GRUPOS).map(([k, g]) => [k, g.nome]) }, { k: "principal", l: "Campanha principal" }, { k: "objetivo", l: "Objetivo", full: true }, { k: "secundarias", l: "Campanhas secundárias (uma por linha)", t: "textarea" }, { k: "datas", l: "Datas (MM-DD Nome, uma por linha)", t: "textarea" }]} />
        <div className="flex justify-between mt-3">{cal.meses?.[m] ? <Btn small tipo="perigo" onClick={async () => { const meses = [...cal.meses]; meses[m] = null; await K.salvar("config", 1, { calendario: { ...cal, meses } }); setM((x) => x); setV({ ...v, tema: MESES[m].tema }); }}>Voltar ao padrão</Btn> : <span />}<Btn icon={Save} onClick={salvarMes}>Salvar {MES_NOME[m]}</Btn></div></Card>
      <Card className="mt-4"><p className="font-display font-bold mb-2" style={{ color: C.navy }}>Datas locais (aniversário da cidade, feiras, eventos)</p>
        <div className="flex gap-2 flex-wrap items-end"><Campo label="Data"><input type="date" value={ex.data} onChange={(e) => setEx({ ...ex, data: e.target.value })} className={inp} style={inpS} /></Campo><Campo label="Título" className="flex-1"><input value={ex.titulo} onChange={(e) => setEx({ ...ex, titulo: e.target.value })} className={inp} style={inpS} /></Campo><Btn icon={Plus} onClick={addExtra}>Adicionar</Btn></div>
        {(cal.extras || []).map((x, i) => <div key={i} className="flex justify-between py-1.5 border-b font-body text-sm" style={{ borderColor: C.line }}><span>{br(x.data).slice(0, 5)} · {x.titulo} (todo ano)</span><button onClick={() => K.salvar("config", 1, { calendario: { ...cal, extras: cal.extras.filter((_, j) => j !== i) } })}><Trash2 size={14} color={C.red} /></button></div>)}</Card>
    </div>
  );
}

function Rotina({ K }) {
  const r = K.D.config.rotina || SEMANA_PADRAO;
  const [v, setV] = useState(Object.fromEntries([1, 2, 3, 4, 5, 6].flatMap((d) => [[`f${d}`, r[d]?.foco || ""], [`a${d}`, (r[d]?.acoes || []).join("\n")]])));
  const salvar = async () => { const n = { 0: SEMANA_PADRAO[0] }; for (const d of [1, 2, 3, 4, 5, 6]) n[d] = { foco: v[`f${d}`], acoes: v[`a${d}`].split("\n").map((s) => s.trim()).filter(Boolean) }; try { await K.salvar("config", 1, { rotina: n }); K.avisar("Rotina salva."); } catch (e) { K.avisar(msgErro(e), "erro"); } };
  return (<div><Titulo eyebrow="Rotina" title="Planejamento semanal" sub="Altere o foco e as ações de cada dia conforme o expediente." /><Card><Campos v={v} set={setV} campos={[1, 2, 3, 4, 5, 6].flatMap((d) => [{ k: `f${d}`, l: `${SEMANA[d]} · foco` }, { k: `a${d}`, l: `${SEMANA[d]} · ações (uma por linha)`, t: "textarea" }])} /><div className="flex justify-end mt-4"><Btn icon={Save} onClick={salvar}>Salvar</Btn></div></Card></div>);
}

const PESOS = [["atendimento", "Atendimento registrado"], ["atendimento_concluido", "Atendimento concluído"], ["novo_cliente", "Novo cliente"], ["prospeccao", "Prospecção realizada"], ["visita", "Visita a local do radar"], ["retorno", "Retorno feito"]];
function Pontuacao({ K }) {
  const [v, setV] = useState({ ...(K.D.config.pontuacao || {}) });
  const salvar = async () => { const p = {}; for (const [k] of PESOS) p[k] = Number(v[k]) || 0; try { await K.salvar("config", 1, { pontuacao: p }); K.avisar("Pontuação padrão salva."); } catch (e) { K.avisar(msgErro(e), "erro"); } };
  return (<div><Titulo eyebrow="Incentivo" title="Pontuação padrão" sub="Usada como ponto de partida nos novos desafios (cada desafio pode ter a sua)." /><Card><Campos v={v} set={setV} campos={PESOS.map(([k, l]) => ({ k, l: `${l} (pontos)`, t: "number" }))} /><div className="flex justify-end mt-4"><Btn icon={Save} onClick={salvar}>Salvar</Btn></div></Card></div>);
}

function DesafiosAdm({ K }) {
  const { D } = K;
  const [ed, setEd] = useState(null);
  const [c, setC] = useState(false);
  const abrir = (d) => setEd(d ? { ...d, ...Object.fromEntries(PESOS.map(([k]) => [`p_${k}`, d.pontuacao?.[k] ?? 0])) } : { status: "ativo", modo: "pontos", pontos_minimos: 1, inicio: hoje(), ...Object.fromEntries(PESOS.map(([k]) => [`p_${k}`, D.config.pontuacao?.[k] ?? 0])) });
  const salvar = async () => {
    if (!ed.nome || !ed.inicio || !ed.fim) return K.avisar("Preencha nome, início e fim.", "erro");
    const pont = Object.fromEntries(PESOS.map(([k]) => [k, Number(ed[`p_${k}`]) || 0]));
    const d = limpa(Object.fromEntries(Object.entries(ed).filter(([k]) => !k.startsWith("p_"))), ["pontos_minimos"]);
    try { await K.salvar("desafios", ed.id, { ...d, pontuacao: pont }); K.avisar("Desafio salvo."); setEd(null); } catch (e) { K.avisar(msgErro(e), "erro"); }
  };
  const img = async (f) => { if (!f) return; try { const u = await K.enviarArquivo(f, "premios"); setEd((x) => ({ ...x, imagem_url: u })); } catch (e) { K.avisar(msgErro(e), "erro"); } };
  const sortear = async (d) => {
    if (!confirm(`Realizar o sorteio de "${d.nome}"? A lista será congelada e o resultado é definitivo.`)) return;
    setC(true);
    try { const { data, error } = await supabase.rpc("maisbb_sortear", { p_desafio: d.id }); if (error) throw error; await K.carregar(); K.avisar(`Ganhador(a): ${data.ganhador_nome} · protocolo ${data.protocolo}`); } catch (e) { K.avisar(msgErro(e), "erro"); } finally { setC(false); }
  };
  return (
    <div>
      <Titulo eyebrow="Incentivo" title="Desafios e sorteios" sub="Configure regras claras e valide a conformidade legal antes de qualquer sorteio ou promoção." direita={<Btn tipo="amarelo" icon={Plus} onClick={() => abrir(null)}>Novo desafio</Btn>} />
      <div className="space-y-2">{D.desafios.map((d) => { const s = D.sorteios.find((x) => x.desafio_id === d.id); return (
        <Card key={d.id} className="!p-3.5"><div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]"><p className="font-body text-sm font-bold">{d.nome} <Chip cor={{ ativo: C.green, encerrado: C.soft, sorteado: C.yellowInk, rascunho: C.soft }[d.status]}>{d.status}</Chip></p><p className="font-body text-xs" style={{ color: C.muted }}>{br(d.inicio)} a {br(d.fim)} · 🎁 {d.premio || "—"} · {d.conformidade_confirmada ? "conformidade confirmada ✓" : "conformidade pendente"}</p>{s && <p className="font-body text-xs" style={{ color: C.yellowInk }}>🏆 {s.ganhador_nome} · {s.protocolo}</p>}</div>
          <Btn small tipo="claro" onClick={() => abrir(d)}>Editar</Btn>
          {s ? <Btn small tipo="claro" icon={FileDown} onClick={() => pdfSorteio(s, d, D.config)}>PDF</Btn> : <Btn small tipo="amarelo" icon={Dices} disabled={c || !d.conformidade_confirmada} title={d.conformidade_confirmada ? "" : "Confirme a conformidade legal antes"} onClick={() => sortear(d)}>Sortear</Btn>}
        </div></Card>); })}{!D.desafios.length && <Vazio>Nenhum desafio.</Vazio>}</div>
      {D.sorteios.length > 0 && <Card className="mt-4"><p className="font-display font-bold mb-2" style={{ color: C.navy }}>Histórico de sorteios</p>{D.sorteios.map((s) => <p key={s.id} className="font-body text-sm py-1 border-b" style={{ borderColor: C.line }}>{new Date(s.realizado_em).toLocaleString("pt-BR")} · <b>{s.ganhador_nome}</b> · {s.protocolo} · {s.total_bilhetes} números</p>)}</Card>}
      {ed && <Modal onFechar={() => setEd(null)} titulo={ed.id ? ed.nome : "Novo desafio"} largura="max-w-3xl">
        <Campos v={ed} set={setEd} campos={[{ k: "nome", l: "Nome da campanha", req: true, full: true }, { k: "premio", l: "Prêmio" }, { k: "status", l: "Situação", t: "select", semVazio: true, op: [["rascunho", "Rascunho"], ["ativo", "Ativo"], ["encerrado", "Encerrado"]] }, { k: "inicio", l: "Início", t: "date", req: true }, { k: "fim", l: "Fim", t: "date", req: true }, { k: "data_sorteio", l: "Data do sorteio", t: "date" }, { k: "pontos_minimos", l: "Pontuação mínima para participar", t: "number" }, { k: "modo", l: "Participação", t: "select", semVazio: true, op: [["pontos", "Cada ponto vale um número"], ["igual", "Um número por participante"]] }, { k: "regras", l: "Regras", t: "textarea", full: true, rows: 5 }, ...PESOS.map(([k, l]) => ({ k: `p_${k}`, l: `${l} (pontos)`, t: "number" })), { k: "conformidade_confirmada", l: "Conformidade", t: "checkbox", texto: "Confirmo que as regras são claras e que validei a conformidade legal desta promoção/sorteio", full: true }]} />
        <div className="flex items-center gap-3 mt-3">{ed.imagem_url && <img src={ed.imagem_url} alt="" className="h-16 rounded-lg" />}<label className="cursor-pointer font-body text-sm font-bold" style={{ color: C.navy2 }}><Upload size={14} className="inline" /> Imagem do prêmio<input type="file" accept="image/*" className="hidden" onChange={(e) => img(e.target.files?.[0])} /></label></div>
        <div className="flex justify-between mt-4">{ed.id && !D.sorteios.some((s) => s.desafio_id === ed.id) ? <Btn small tipo="perigo" icon={Trash2} onClick={async () => { await K.apagar("desafios", ed.id); setEd(null); }}>Excluir</Btn> : <span />}<Btn icon={Save} onClick={salvar}>Salvar</Btn></div>
      </Modal>}
    </div>
  );
}

function ListaSimples({ K, tab, titulo, sub, campos, novo, rotulo }) {
  const [ed, setEd] = useState(null);
  const lista = K.D[tab];
  const salvar = async () => { try { await K.salvar(tab, ed.id, limpa(ed)); K.avisar("Salvo."); setEd(null); } catch (e) { K.avisar(msgErro(e), "erro"); } };
  return (
    <div>
      <Titulo eyebrow="Conteúdo" title={titulo} sub={sub} direita={<Btn tipo="amarelo" icon={Plus} onClick={() => setEd({ ...novo })}>Adicionar</Btn>} />
      <div className="space-y-2">{lista.map((x) => <Card key={x.id} className="!p-3" onClick={() => setEd(x)}><p className="font-body text-sm truncate">{rotulo(x)} {x.ativo === false && <Chip cor={C.soft}>inativo</Chip>}</p></Card>)}{!lista.length && <Vazio>Nada cadastrado ainda.</Vazio>}</div>
      {ed && <Modal onFechar={() => setEd(null)} titulo={ed.id ? "Editar" : "Adicionar"}><Campos v={ed} set={setEd} campos={campos} /><div className="flex justify-between mt-4">{ed.id ? <Btn small tipo="perigo" icon={Trash2} onClick={async () => { await K.apagar(tab, ed.id); setEd(null); }}>Excluir</Btn> : <span />}<Btn icon={Save} onClick={salvar}>Salvar</Btn></div></Modal>}
    </div>
  );
}

function TreinamentosAdm({ K }) {
  const [ed, setEd] = useState(null);
  const abrir = (t) => setEd(t ? { ...t, quizTxt: (t.quiz || []).map((q) => [q.p, ...q.ops, String(q.c + 1)].join(" | ")).join("\n") } : { ativo: true, quizTxt: "" });
  const salvar = async () => {
    if (!ed.titulo || !ed.modulo) return K.avisar("Informe módulo e título.", "erro");
    const quiz = String(ed.quizTxt || "").split("\n").map((l) => l.split("|").map((s) => s.trim())).filter((p) => p.length >= 4).map((p) => ({ p: p[0], ops: p.slice(1, -1), c: Math.max(0, Math.min(p.length - 3, Number(p[p.length - 1]) - 1)) }));
    const { quizTxt, ...r } = ed;
    try { await K.salvar("treinamentos", ed.id, { ...limpa(r, ["ordem"]), quiz }); K.avisar("Treinamento salvo."); setEd(null); } catch (e) { K.avisar(msgErro(e), "erro"); }
  };
  const prog = K.D.progresso; const nm = Object.fromEntries(K.D.membros.map((m) => [m.user_id, m.nome]));
  return (
    <div>
      <Titulo eyebrow="Capacitação" title="Treinamentos" sub="Os 9 módulos padrão já aparecem para as atendentes. Aqui você cria conteúdos extras e acompanha o aprendizado." direita={<Btn tipo="amarelo" icon={Plus} onClick={() => abrir(null)}>Novo treinamento</Btn>} />
      <div className="space-y-2 mb-5">{K.D.treinamentos.map((t) => <Card key={t.id} className="!p-3" onClick={() => abrir(t)}><p className="font-body text-sm"><b>{t.modulo}</b> · {t.titulo} · {(t.quiz || []).length} pergunta(s)</p></Card>)}{!K.D.treinamentos.length && <Vazio>Nenhum treinamento extra.</Vazio>}</div>
      <Card><p className="font-display font-bold mb-2" style={{ color: C.navy }}>Acompanhamento do aprendizado</p>{prog.length ? prog.map((p) => <p key={p.user_id + p.chave} className="font-body text-sm py-1 border-b" style={{ borderColor: C.line }}>{nm[p.user_id] || "—"} · {p.chave} · {p.acertos}/{p.total} · {br(p.concluido_em)}</p>) : <p className="font-body text-sm" style={{ color: C.soft }}>Nenhum módulo concluído ainda.</p>}</Card>
      {ed && <Modal onFechar={() => setEd(null)} titulo={ed.id ? ed.titulo : "Novo treinamento"} largura="max-w-3xl"><Campos v={ed} set={setEd} campos={[{ k: "modulo", l: "Módulo", req: true }, { k: "titulo", l: "Título", req: true }, { k: "conteudo", l: "Conteúdo", t: "textarea", rows: 8, full: true }, { k: "quizTxt", l: "Questionário (uma pergunta por linha: pergunta | opção 1 | opção 2 | opção 3 | número da correta)", t: "textarea", rows: 5, full: true }, { k: "ordem", l: "Ordem", t: "number" }, { k: "ativo", l: "Situação", t: "checkbox", texto: "Ativo" }]} />
        <div className="flex justify-between mt-4">{ed.id ? <Btn small tipo="perigo" icon={Trash2} onClick={async () => { await K.apagar("treinamentos", ed.id); setEd(null); }}>Excluir</Btn> : <span />}<Btn icon={Save} onClick={salvar}>Salvar</Btn></div></Modal>}
    </div>
  );
}

function Log({ K }) {
  const [itens, setItens] = useState(null);
  useEffect(() => { if (!supabaseConfigurado) { setItens([]); return; } supabase.from("maisbb_log").select("id, tabela, registro, acao, usuario, quando").order("quando", { ascending: false }).limit(300).then(({ data }) => setItens(data || [])); }, []);
  const nm = Object.fromEntries(K.D.membros.map((m) => [m.user_id, m.nome]));
  const T = { maisbb_clientes: "Cliente", maisbb_atendimentos: "Atendimento", maisbb_prospeccoes: "Prospecção", maisbb_locais: "Local", maisbb_servicos: "Serviço", maisbb_membros: "Equipe", maisbb_config: "Configuração", maisbb_metas: "Meta", maisbb_desafios: "Desafio", maisbb_campanhas: "Campanha", maisbb_publicos: "Público", maisbb_conhecimento: "Conhecimento" };
  return (
    <div><Titulo eyebrow="Segurança" title="Registro de alterações" sub="Últimas 300 ações (quem, quando, o quê). CPF não é gravado no registro." />
      {!itens ? <p className="font-body text-sm">Carregando...</p> : itens.length ? <Card className="!p-0 overflow-hidden"><table className="w-full font-body text-sm"><thead><tr className="text-left text-[11px] uppercase" style={{ background: C.gray, color: C.muted }}><th className="px-3 py-2">Quando</th><th className="px-3 py-2">Quem</th><th className="px-3 py-2">Ação</th><th className="px-3 py-2">Item</th></tr></thead><tbody>{itens.map((i) => <tr key={i.id} className="border-t" style={{ borderColor: C.line }}><td className="px-3 py-1.5 whitespace-nowrap">{new Date(i.quando).toLocaleString("pt-BR")}</td><td className="px-3 py-1.5">{nm[i.usuario] || "—"}</td><td className="px-3 py-1.5">{{ insert: "criou", update: "alterou", delete: "excluiu" }[i.acao]}</td><td className="px-3 py-1.5">{T[i.tabela] || i.tabela}</td></tr>)}</tbody></table></Card> : <Vazio>Sem registros.</Vazio>}
    </div>
  );
}
