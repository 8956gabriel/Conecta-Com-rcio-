// =============================================================================
// MAIS BB DIGITAL — Inteligência Comercial e Atendimento
// Site próprio (VITE_SITE=maisbb). Rotas:  /  (atendente)   /admin   /entrar
// =============================================================================
import React, { useEffect, useMemo, useState } from "react";
import {
  Home, PlusCircle, Users, Radar, Target, MapPin, CalendarDays, CalendarRange, Megaphone, Package, MessageSquareText, Bot, Trophy,
  Gift, GraduationCap, Lightbulb, BrainCircuit, FileBarChart, ShieldCheck, LogOut, Menu, X, ClipboardList, ListChecks, Eye, EyeOff, Landmark,
  Award, FileText, PartyPopper,
} from "lucide-react";
import { supabase, supabaseConfigurado } from "../supabaseClient";
import { C, useDados, Aviso, Btn, msgErro } from "./base.jsx";
import { publicosCompletos, AVISO_INDEPENDENTE } from "./dados.js";
import { Inicio, Atendimentos, Clientes, Agenda, ModalAtendimento, ModalCliente, ModalTarefa } from "./telas1.jsx";
import { RadarClientes, Prospeccao, RadarIvatuba, ModalProspeccao } from "./telas2.jsx";
import { Calendario, PlanoSemanal, Plano30, Campanhas } from "./telas3.jsx";
import { Produtos, Mensagens, Assistente, Dicas, Treinamento } from "./telas4.jsx";
import { MetasRanking, Desafios, Analise, Relatorios } from "./telas5.jsx";
import Admin from "./Admin.jsx";
import { TreinamentoANEPS } from "./aneps.jsx";
import { GeradorFormularios } from "./formulario-pdf.jsx";
import { SorteiosMensais } from "./sorteios-mensais.jsx";

export const MENU = [
  { g: "Dia a dia", itens: [
    { id: "inicio", l: "Início", i: Home }, { id: "atendimentos", l: "Atendimentos", i: ClipboardList }, { id: "clientes", l: "Clientes (CRM)", i: Users }, { id: "agenda", l: "Agenda e tarefas", i: ListChecks },
  ] },
  { g: "Ferramentas", itens: [
    { id: "aneps", l: "Treinamento ANEPS", i: Award, e: "🎓" }, { id: "formularios", l: "Gerador de Formulários", i: FileText, e: "📄" }, { id: "sorteios", l: "Sorteios Mensais", i: PartyPopper, e: "🎁" },
  ] },
  { g: "Prospecção", itens: [
    { id: "radar", l: "Radar de clientes", i: Radar }, { id: "prospeccao", l: "Prospecção", i: Target }, { id: "ivatuba", l: "Radar de Ivatuba", i: MapPin },
  ] },
  { g: "Estratégia", itens: [
    { id: "calendario", l: "Calendário comercial", i: CalendarDays }, { id: "semana", l: "Planejamento semanal", i: CalendarRange }, { id: "plano30", l: "Plano de 30 dias", i: CalendarRange }, { id: "campanhas", l: "Campanhas e marketing", i: Megaphone },
  ] },
  { g: "Apoio", itens: [
    { id: "assistente", l: "Meu assistente Mais BB", i: Bot }, { id: "mensagens", l: "Gerador de mensagens", i: MessageSquareText }, { id: "produtos", l: "Produtos e serviços", i: Package }, { id: "dicas", l: "Dicas do dia", i: Lightbulb }, { id: "treinamento", l: "Treinamento", i: GraduationCap },
  ] },
  { g: "Resultados", itens: [
    { id: "metas", l: "Metas e ranking", i: Trophy }, { id: "desafios", l: "Desafio do mês", i: Gift }, { id: "analise", l: "Inteligência comercial", i: BrainCircuit }, { id: "relatorios", l: "Relatórios", i: FileBarChart },
  ] },
];
const TODAS = MENU.flatMap((g) => g.itens);
const rotaAtual = () => { const p = window.location.pathname.replace(/\/+$/, ""); return p === "/admin" ? "admin" : p === "/entrar" ? "entrar" : "app"; };

export default function MaisBBSite() {
  const [rota, setRota] = useState(rotaAtual);
  const [sessao, setSessao] = useState(undefined);
  const [acesso, setAcesso] = useState(null);       // retorno de maisbb_entrar
  const ir = (r) => { const p = r === "admin" ? "/admin" : r === "entrar" ? "/entrar" : "/"; if (location.pathname !== p) history.pushState(null, "", p); setRota(r); window.scrollTo(0, 0); };

  useEffect(() => {
    document.title = "Mais BB Digital · Inteligência Comercial e Atendimento";
    const pop = () => setRota(rotaAtual()); window.addEventListener("popstate", pop);
    if (!supabaseConfigurado) { setSessao({ user: { id: "demo", email: "demo@local" } }); setAcesso({ ok: true, papel: "admin", nome: "Demonstração" }); return () => window.removeEventListener("popstate", pop); }
    supabase.auth.getSession().then(({ data }) => setSessao(data.session || null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s || null));
    return () => { window.removeEventListener("popstate", pop); data.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    if (!sessao) { setAcesso(null); return; }
    supabase.rpc("maisbb_entrar").then(({ data, error }) => setAcesso(error ? { ok: false, motivo: "erro", erro: msgErro(error) } : data));
  }, [sessao?.user?.id]);

  if (sessao === undefined || (sessao && !acesso)) return <Carregando />;
  if (!sessao || rota === "entrar") return <Entrar onEntrou={() => ir(rota === "admin" ? "admin" : "app")} />;
  if (!acesso.ok) return <SemAcesso acesso={acesso} email={sessao.user.email} />;
  return <App sessao={sessao} acesso={acesso} rota={rota} ir={ir} />;
}

function App({ sessao, acesso, rota, ir }) {
  const { D, salvar, apagar, enviarArquivo, carregar, erro, setD } = useDados(true);
  const [aba, setAbaE] = useState(() => { try { return sessionStorage.getItem("maisbb-aba") || "inicio"; } catch { return "inicio"; } });
  const [param, setParam] = useState(null);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [menuMobile, setMenuMobile] = useState(false);
  const setAba = (a, p = null) => { setAbaE(a); setParam(p); setMenuMobile(false); try { sessionStorage.setItem("maisbb-aba", a); } catch { /* */ } window.scrollTo({ top: 0, behavior: "smooth" }); };
  const avisar = (m, t = "ok") => { setToast({ m, t }); setTimeout(() => setToast(null), 3200); };
  const admin = acesso.papel === "admin";
  const eu = sessao.user.id;
  const membro = D?.membros?.find((m) => m.user_id === eu);
  const nome = membro?.nome || acesso.nome || sessao.user.email.split("@")[0];
  const publicos = useMemo(() => (D ? publicosCompletos(D.publicos) : []), [D?.publicos]);
  const K = D && { D, salvar, apagar, enviarArquivo, carregar, setD, avisar, eu, nome, admin, publicos, irPara: setAba, param, abrir: (tipo, dados) => setModal({ tipo, dados }), sair: async () => { await supabase.auth.signOut(); ir("entrar"); } };

  if (!D) return <Carregando />;
  if (rota === "admin") {
    if (!admin) return <div className="min-h-screen flex items-center justify-center p-6" style={{ background: C.gray }}><div className="max-w-sm text-center"><ShieldCheck size={36} color={C.red} className="mx-auto" /><p className="font-display font-bold text-lg mt-3">Área exclusiva do administrador</p><p className="font-body text-sm mt-1" style={{ color: C.muted }}>Sua conta é de atendente.</p><Btn className="mt-5" onClick={() => ir("app")}>Ir para o Mais BB Digital</Btn></div></div>;
    return <Moldura K={K} admin titulo="Painel do administrador" ir={ir} toast={toast}><Admin K={K} />{erro && <Aviso tipo="erro">{msgErro({ message: erro })}</Aviso>}</Moldura>;
  }
  const atual = TODAS.find((x) => x.id === aba) || TODAS[0];
  const P = { K };
  return (
    <Moldura K={K} ir={ir} toast={toast} aba={aba} setAba={setAba} menuMobile={menuMobile} setMenuMobile={setMenuMobile} titulo={atual.l}>
      {erro && <div className="mb-4"><Aviso tipo="erro">{msgErro({ message: erro })}</Aviso></div>}
      {aba === "inicio" && <Inicio {...P} />}
      {aba === "atendimentos" && <Atendimentos {...P} />}
      {aba === "clientes" && <Clientes {...P} />}
      {aba === "agenda" && <Agenda {...P} />}
      {aba === "radar" && <RadarClientes {...P} />}
      {aba === "prospeccao" && <Prospeccao {...P} />}
      {aba === "ivatuba" && <RadarIvatuba {...P} />}
      {aba === "calendario" && <Calendario {...P} />}
      {aba === "semana" && <PlanoSemanal {...P} />}
      {aba === "plano30" && <Plano30 {...P} />}
      {aba === "campanhas" && <Campanhas {...P} />}
      {aba === "assistente" && <Assistente {...P} />}
      {aba === "mensagens" && <Mensagens {...P} />}
      {aba === "produtos" && <Produtos {...P} />}
      {aba === "dicas" && <Dicas {...P} />}
      {aba === "treinamento" && <Treinamento {...P} />}
      {aba === "metas" && <MetasRanking {...P} />}
      {aba === "desafios" && <Desafios {...P} />}
      {aba === "analise" && <Analise {...P} />}
      {aba === "relatorios" && <Relatorios {...P} />}
      {aba === "aneps" && <TreinamentoANEPS {...P} />}
      {aba === "formularios" && <GeradorFormularios {...P} />}
      {aba === "sorteios" && <SorteiosMensais {...P} />}
      {modal?.tipo === "atendimento" && <ModalAtendimento K={K} atendimento={modal.dados?.id ? modal.dados : null} inicial={modal.dados?.id ? null : modal.dados} onFechar={() => setModal(null)} />}
      {modal?.tipo === "cliente" && <ModalCliente K={K} cliente={modal.dados?.id ? modal.dados : null} inicial={modal.dados?.id ? null : modal.dados} onFechar={(r) => { const dep = modal.dados?.depois; setModal(null); if (r && dep) dep(r); }} />}
      {modal?.tipo === "tarefa" && <ModalTarefa K={K} tarefa={modal.dados?.id ? modal.dados : null} inicial={modal.dados?.id ? null : modal.dados} onFechar={() => setModal(null)} />}
      {modal?.tipo === "prospeccao" && <ModalProspeccao K={K} item={modal.dados?.id ? modal.dados : null} inicial={modal.dados?.id ? null : modal.dados} onFechar={() => setModal(null)} />}
    </Moldura>
  );
}

function Logo({ K, claro }) {
  const url = K?.D?.config?.logo_url;
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      {url ? <img src={url} alt="Logo do correspondente" className="h-10 w-10 rounded-xl object-contain bg-white p-0.5" />
        : <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: C.yellow }}><Landmark size={20} color={C.navy} /></span>}
      <span className="leading-tight min-w-0"><span className="block font-display font-extrabold text-[15px] truncate" style={{ color: claro ? "#fff" : C.navy }}>MAIS BB DIGITAL</span><span className="block font-body text-[10.5px] font-semibold truncate" style={{ color: claro ? C.yellow : C.yellowInk }}>Inteligência Comercial e Atendimento</span></span>
    </div>
  );
}

function Moldura({ K, children, admin, titulo, ir, toast, aba, setAba, menuMobile, setMenuMobile }) {
  const Nav = ({ onClick }) => (
    <nav className="space-y-4">
      {MENU.map((g) => (
        <div key={g.g}>
          <p className="font-body text-[10px] font-bold uppercase tracking-widest px-3 mb-1" style={{ color: "rgba(255,255,255,0.45)" }}>{g.g}</p>
          {g.itens.map((it) => { const on = aba === it.id; const I = it.i; return (
            <button key={it.id} onClick={() => { setAba(it.id); onClick?.(); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-body text-sm font-semibold text-left transition"
              style={{ background: on ? C.yellow : "transparent", color: on ? C.navy : "rgba(255,255,255,0.86)" }}>{it.e ? <span className="w-4 text-center text-[15px] leading-none">{it.e}</span> : <I size={16} />} {it.l}</button>); })}
        </div>
      ))}
    </nav>
  );
  return (
    <div className="min-h-screen" style={{ background: C.gray }}>
      {!admin && (
        <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col p-4 overflow-y-auto" style={{ background: C.navy }}>
          <div className="mb-5"><Logo K={K} claro /></div>
          <button onClick={() => K.abrir("atendimento", {})} className="w-full flex items-center justify-center gap-2 font-body font-extrabold text-sm py-3 rounded-xl mb-5 shadow-lg" style={{ background: C.yellow, color: C.navy }}><PlusCircle size={18} /> NOVO ATENDIMENTO</button>
          <Nav />
          <div className="mt-auto pt-6 space-y-1">
            {K.admin && <button onClick={() => ir("admin")} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-body text-sm font-semibold text-white/85"><ShieldCheck size={16} /> Painel do administrador</button>}
            <button onClick={K.sair} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-body text-sm font-semibold text-white/70"><LogOut size={16} /> Sair</button>
          </div>
        </aside>
      )}
      <div className={admin ? "" : "lg:pl-64"}>
        <header className="sticky top-0 z-40 border-b backdrop-blur" style={{ background: admin ? C.navy : "rgba(255,255,255,0.92)", borderColor: C.line }}>
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            <div className={admin ? "" : "lg:hidden"}><Logo K={K} claro={admin} /></div>
            {!admin && <p className="hidden lg:block font-display font-extrabold text-lg" style={{ color: C.navy }}>{titulo}</p>}
            {admin && <p className="hidden sm:block font-body text-sm font-bold ml-3 px-2.5 py-1 rounded-full" style={{ background: C.yellow, color: C.navy }}>{titulo}</p>}
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden sm:block font-body text-xs text-right leading-tight" style={{ color: admin ? "rgba(255,255,255,0.8)" : C.muted }}>{K.nome}<br /><b>{K.admin ? "Administrador" : "Atendente"}</b></span>
              {admin ? <><Btn small tipo="amarelo" onClick={() => ir("app")}>Abrir app da atendente</Btn><Btn small tipo="claro" icon={LogOut} onClick={K.sair} /></>
                : <button className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.navyTint }} onClick={() => setMenuMobile(true)} aria-label="Menu"><Menu size={20} color={C.navy} /></button>}
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-5 pb-28 lg:pb-10">{children}</main>
        <footer className="max-w-6xl mx-auto px-4 pb-28 lg:pb-8 font-body text-[11px]" style={{ color: C.soft }}>{AVISO_INDEPENDENTE}</footer>
      </div>
      {!admin && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t grid grid-cols-5 pb-[env(safe-area-inset-bottom)]" style={{ borderColor: C.line }}>
          {[["inicio", Home, "Início"], ["clientes", Users, "Clientes"], ["novo", PlusCircle, "Atender"], ["agenda", ListChecks, "Agenda"], ["menu", Menu, "Mais"]].map(([id, I, l]) => (
            <button key={id} onClick={() => (id === "novo" ? K.abrir("atendimento", {}) : id === "menu" ? setMenuMobile(true) : setAba(id))} className="flex flex-col items-center gap-0.5 py-2 font-body text-[10.5px] font-bold" style={{ color: aba === id ? C.navy : C.soft }}>
              {id === "novo" ? <span className="w-12 h-12 -mt-6 rounded-full flex items-center justify-center shadow-lg" style={{ background: C.yellow }}><I size={24} color={C.navy} /></span> : <I size={20} />}{l}
            </button>
          ))}
        </nav>
      )}
      {menuMobile && (
        <div className="lg:hidden fixed inset-0 z-[90]" style={{ background: "rgba(11,31,68,0.5)" }} onClick={() => setMenuMobile(false)}>
          <div className="absolute inset-y-0 left-0 w-[82%] max-w-xs p-4 overflow-y-auto" style={{ background: C.navy }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><Logo K={K} claro /><button onClick={() => setMenuMobile(false)}><X color="#fff" /></button></div>
            <Nav onClick={() => setMenuMobile(false)} />
            <div className="pt-6 space-y-1">
              {K.admin && <button onClick={() => ir("admin")} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-body text-sm font-semibold text-white/85"><ShieldCheck size={16} /> Painel do administrador</button>}
              <button onClick={K.sair} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-body text-sm font-semibold text-white/70"><LogOut size={16} /> Sair</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-[130] px-4 py-2.5 rounded-xl shadow-xl font-body text-sm font-semibold text-white" style={{ background: toast.t === "erro" ? C.red : C.navy }}>{toast.m}</div>}
    </div>
  );
}

function Carregando() {
  return <div className="min-h-screen flex items-center justify-center" style={{ background: C.navy }}><div className="text-center"><span className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin inline-block" style={{ borderColor: C.yellow, borderTopColor: "transparent" }} /><p className="font-display font-extrabold text-white mt-4">MAIS BB DIGITAL</p></div></div>;
}

function SemAcesso({ acesso, email }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: C.gray }}>
      <div className="max-w-sm bg-white rounded-3xl p-6 text-center border" style={{ borderColor: C.line }}>
        <ShieldCheck size={36} color={C.yellowDeep} className="mx-auto" />
        <p className="font-display font-extrabold text-lg mt-3" style={{ color: C.navy }}>{acesso.motivo === "inativo" ? "Acesso desativado" : "Acesso ainda não liberado"}</p>
        <p className="font-body text-sm mt-2" style={{ color: C.muted }}>{acesso.erro || (acesso.motivo === "inativo" ? "Seu acesso foi desativado pelo administrador." : `A conta ${email} ainda não foi convidada. Peça ao administrador para cadastrar este e-mail na equipe e entre de novo.`)}</p>
        <Btn className="mt-5" tipo="claro" onClick={async () => { await supabase.auth.signOut(); location.href = "/entrar"; }}>Entrar com outra conta</Btn>
      </div>
    </div>
  );
}

function Entrar({ onEntrou }) {
  const [modo, setModo] = useState("entrar");
  const [v, setV] = useState({ nome: "", email: "", senha: "" });
  const [ver, setVer] = useState(false);
  const [msg, setMsg] = useState(null);
  const [c, setC] = useState(false);
  const inp = "font-body text-sm border rounded-xl px-3.5 py-3 outline-none bg-white w-full focus:ring-2 focus:ring-yellow-300";
  useEffect(() => { const { data } = supabase.auth.onAuthStateChange((e) => { if (e === "PASSWORD_RECOVERY") setModo("nova"); }); return () => data.subscription.unsubscribe(); }, []);
  const enviar = async (e) => {
    e.preventDefault(); setC(true); setMsg(null);
    try {
      if (modo === "entrar") { const { error } = await supabase.auth.signInWithPassword({ email: v.email.trim(), password: v.senha }); if (error) throw error; onEntrou(); }
      else if (modo === "criar") { const { data, error } = await supabase.auth.signUp({ email: v.email.trim(), password: v.senha, options: { data: { nome: v.nome } } }); if (error) throw error; if (data.session) onEntrou(); else setMsg({ t: "ok", m: "Conta criada! Confirme pelo link enviado ao seu e-mail e depois entre." }); }
      else if (modo === "esqueci") { const { error } = await supabase.auth.resetPasswordForEmail(v.email.trim(), { redirectTo: `${location.origin}/entrar` }); if (error) throw error; setMsg({ t: "ok", m: "Enviamos um link para o seu e-mail." }); }
      else { const { error } = await supabase.auth.updateUser({ password: v.senha }); if (error) throw error; onEntrou(); }
    } catch (err) { setMsg({ t: "erro", m: /invalid login/i.test(err.message) ? "E-mail ou senha incorretos." : /registered/i.test(err.message) ? "Este e-mail já tem conta. Use Entrar." : err.message }); } finally { setC(false); }
  };
  return (
    <div className="min-h-screen grid lg:grid-cols-2" style={{ background: C.gray }}>
      <div className="hidden lg:flex flex-col justify-between p-10 relative overflow-hidden" style={{ background: `linear-gradient(140deg, ${C.navy}, ${C.navy2})` }}>
        <span className="absolute -right-20 -top-20 w-72 h-72 rounded-full" style={{ background: "rgba(249,209,11,0.18)" }} />
        <div className="flex items-center gap-3"><span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: C.yellow }}><Landmark size={24} color={C.navy} /></span><span className="font-display font-extrabold text-white text-xl">MAIS BB DIGITAL</span></div>
        <div><p className="font-display font-extrabold text-white text-4xl leading-tight">Inteligência comercial<br />e atendimento.</p><p className="font-body mt-3" style={{ color: "rgba(255,255,255,0.75)" }}>Quem prospectar hoje, como abordar, o que divulgar e quem precisa de retorno — em um só lugar.</p></div>
        <p className="font-body text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{AVISO_INDEPENDENTE}</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={enviar} className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-sm border space-y-3" style={{ borderColor: C.line }}>
          <div className="lg:hidden flex items-center gap-2.5 mb-2"><span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.yellow }}><Landmark size={20} color={C.navy} /></span><span className="font-display font-extrabold" style={{ color: C.navy }}>MAIS BB DIGITAL</span></div>
          <p className="font-display font-extrabold text-xl" style={{ color: C.navy }}>{{ entrar: "Entrar", criar: "Criar conta", esqueci: "Recuperar senha", nova: "Nova senha" }[modo]}</p>
          <p className="font-body text-xs" style={{ color: C.muted }}>{modo === "criar" ? "Depois de criar a conta, o administrador precisa liberar seu acesso (o primeiro cadastro vira administrador)." : "Acesso da equipe do correspondente."}</p>
          {modo === "criar" && <input required value={v.nome} onChange={(e) => setV({ ...v, nome: e.target.value })} placeholder="Seu nome" className={inp} style={{ borderColor: C.line }} />}
          {modo !== "nova" && <input type="email" required autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} placeholder="E-mail" className={inp} style={{ borderColor: C.line }} />}
          {modo !== "esqueci" && <div className="relative"><input type={ver ? "text" : "password"} required minLength={6} autoComplete={modo === "entrar" ? "current-password" : "new-password"} value={v.senha} onChange={(e) => setV({ ...v, senha: e.target.value })} placeholder={modo === "entrar" ? "Senha" : "Senha (mínimo 6 caracteres)"} className={inp} style={{ borderColor: C.line, paddingRight: 44 }} /><button type="button" onClick={() => setVer(!ver)} className="absolute right-3 top-3">{ver ? <EyeOff size={17} color={C.muted} /> : <Eye size={17} color={C.muted} />}</button></div>}
          {msg && <Aviso tipo={msg.t === "erro" ? "erro" : "ok"}>{msg.m}</Aviso>}
          <Btn type="submit" big className="w-full" disabled={c}>{c ? "Aguarde..." : { entrar: "Entrar", criar: "Criar conta", esqueci: "Enviar link", nova: "Salvar nova senha" }[modo]}</Btn>
          <div className="flex justify-between font-body text-xs font-semibold" style={{ color: C.navy2 }}>
            {modo === "entrar" ? <><button type="button" onClick={() => setModo("criar")}>Criar conta</button><button type="button" onClick={() => setModo("esqueci")}>Esqueci minha senha</button></> : <button type="button" onClick={() => setModo("entrar")}>Voltar para entrar</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
