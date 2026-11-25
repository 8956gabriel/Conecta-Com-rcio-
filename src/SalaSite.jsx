// =============================================================================
// SITE PRÓPRIO DA SALA DO EMPREENDEDOR · IVATUBA
// Mesma base de dados e mesmo login do Conecta Comércio, mas sem o menu e a
// marca do Conecta. Gerado com VITE_SITE=sala (projeto sala-ivatuba na Vercel).
//   /          → tela de acesso com as 3 opções
//   /publico   → página pública
//   /agente    → área do atendente
//   /admin     → administração
//   /entrar    → login
// =============================================================================
import React, { useEffect, useState } from "react";
import { Globe, LogIn, LogOut, ShieldCheck, Users, Eye, EyeOff, Home } from "lucide-react";
import { supabase, supabaseConfigurado } from "./supabaseClient";
import { SalaPublico, SalaPainel, LOGO_SALA } from "./SalaEmpreendedor.jsx";
import { PortalAcesso } from "./SalaGestao.jsx";

const AZUL = "#0A5AA8", AZUL_ESC = "#0B2470", LARANJA = "#F19F74", LINHA = "#DCE7F2", MUTED = "#5C7186", INK = "#0E2233";
const ROTAS = {
  "/": "inicio", "/acesso": "inicio", "/publico": "publico", "/agente": "agente", "/atendente": "agente", "/admin": "admin", "/entrar": "entrar",
  "/sala": "publico", "/sala/publico": "publico", "/sala/agente": "agente", "/sala/admin": "admin", "/sala/acesso": "inicio",
};
// Links internos que os módulos usam dentro do Conecta Comércio (#/sala...) → rotas deste site
const HASH_ROTA = { "#/sala": "publico", "#/sala-agente": "agente", "#/sala-admin": "admin", "#/acesso": "inicio", "#/entrar": "entrar", "#/": "inicio" };
const CAMINHO = { inicio: "/", publico: "/publico", agente: "/agente", admin: "/admin", entrar: "/entrar" };
const rotaAtual = () => ROTAS[window.location.pathname.replace(/\/+$/, "").toLowerCase() || "/"] || "inicio";

export default function SalaSite() {
  const [rota, setRota] = useState(rotaAtual);
  const [sessao, setSessao] = useState(undefined);
  const [perfil, setPerfil] = useState(null);
  const [recuperando, setRecuperando] = useState(false);
  const [destino, setDestino] = useState(null);

  const ir = (r) => {
    const path = CAMINHO[r] || "/";
    if (window.location.pathname !== path || window.location.hash) window.history.pushState(null, "", path);
    setRota(r); window.scrollTo(0, 0);
  };

  useEffect(() => {
    document.title = "Sala do Empreendedor · Ivatuba";
    // link antigo com # (ex.: /#/sala-agente) → rota certa
    if (window.location.hash && HASH_ROTA[window.location.hash.toLowerCase()]) ir(HASH_ROTA[window.location.hash.toLowerCase()]);
    const pop = () => setRota(rotaAtual());
    window.addEventListener("popstate", pop);
    const clique = (e) => {
      const a = e.target.closest?.("a[href]");
      if (!a || a.target || e.metaKey || e.ctrlKey) return;
      const href = a.getAttribute("href");
      if (HASH_ROTA[href]) { e.preventDefault(); ir(HASH_ROTA[href]); }
      else if (ROTAS[href]) { e.preventDefault(); ir(ROTAS[href]); }
      else if (href === "#/fomento") { e.preventDefault(); window.open("https://fomento-ivatuba.vercel.app", "_blank"); }
    };
    document.addEventListener("click", clique);
    return () => { window.removeEventListener("popstate", pop); document.removeEventListener("click", clique); };
  }, []);

  useEffect(() => {
    if (!supabaseConfigurado) { setSessao(null); return; }
    supabase.auth.getSession().then(({ data }) => setSessao(data.session || null));
    const { data } = supabase.auth.onAuthStateChange((ev, s) => { setSessao(s || null); if (ev === "PASSWORD_RECOVERY") { setRecuperando(true); ir("entrar"); } });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sessao?.user?.id) { setPerfil(null); return; }
    supabase.from("perfis").select("id, nome, tipo").eq("id", sessao.user.id).maybeSingle().then(({ data }) => setPerfil(data || null));
  }, [sessao?.user?.id]);

  // áreas restritas sem login → tela de entrar e volta depois
  useEffect(() => {
    if (supabaseConfigurado && sessao === null && (rota === "agente" || rota === "admin")) { setDestino(rota); ir("entrar"); }
  }, [sessao, rota]);

  const sair = async () => { await supabase.auth.signOut(); ir("inicio"); };
  const nome = perfil?.nome ? perfil.nome.split(" ")[0] : sessao?.user?.email?.split("@")[0];
  const NavBtn = ({ r, icon: I, children }) => (
    <button onClick={() => ir(r)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-body text-sm font-bold whitespace-nowrap"
      style={{ background: rota === r ? AZUL : "transparent", color: rota === r ? "#fff" : AZUL_ESC }}><I size={15} /> {children}</button>
  );

  return (
    <div className="min-h-screen" style={{ background: "#F7FAFD" }}>
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b" style={{ borderColor: LINHA }}>
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3 flex-wrap">
          <button onClick={() => ir("inicio")} className="mr-auto flex items-center gap-2">
            <img src={LOGO_SALA} alt="Sala do Empreendedor" className="h-9 md:h-11 w-auto" />
            <span className="hidden sm:block font-body text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${LARANJA}33`, color: "#B4602F" }}>Ivatuba-PR</span>
          </button>
          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <NavBtn r="inicio" icon={Home}>Início</NavBtn>
            <NavBtn r="publico" icon={Globe}>Área pública</NavBtn>
            {sessao && <NavBtn r="agente" icon={Users}>Atendente</NavBtn>}
            {sessao && <NavBtn r="admin" icon={ShieldCheck}>Administração</NavBtn>}
            {sessao ? <button onClick={sair} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-body text-sm font-bold whitespace-nowrap" style={{ color: MUTED }} title={sessao.user.email}><LogOut size={15} /> Sair{nome ? ` (${nome})` : ""}</button>
              : <NavBtn r="entrar" icon={LogIn}>Entrar</NavBtn>}
          </nav>
        </div>
      </header>

      <main>
        {rota === "inicio" && <PortalAcesso />}
        {rota === "publico" && <SalaPublico />}
        {rota === "agente" && (sessao !== undefined ? <SalaPainel key="agente" area="agente" sessao={sessao} perfil={perfil} /> : <Carregando />)}
        {rota === "admin" && (sessao !== undefined ? <SalaPainel key="admin" area="admin" sessao={sessao} perfil={perfil} /> : <Carregando />)}
        {rota === "entrar" && <Entrar sessao={sessao} recuperando={recuperando} onRecuperado={() => setRecuperando(false)} onEntrou={() => { const d = destino || "agente"; setDestino(null); ir(d); }} />}
      </main>

      <footer className="border-t mt-10" style={{ borderColor: LINHA }}>
        <div className="max-w-6xl mx-auto px-4 py-6 font-body text-xs flex flex-wrap gap-x-4 gap-y-1 justify-between" style={{ color: MUTED }}>
          <span>Sala do Empreendedor de Ivatuba-PR · atendimento gratuito ao empreendedor.</span>
          <a href="https://conectacomercio.app.br" target="_blank" rel="noopener" className="underline">Conecta Comércio</a>
        </div>
      </footer>
    </div>
  );
}

function Carregando() {
  return <div className="py-24 text-center font-body text-sm" style={{ color: MUTED }}>Carregando...</div>;
}

function Entrar({ sessao, recuperando, onRecuperado, onEntrou }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [ver, setVer] = useState(false);
  const [msg, setMsg] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const input = "font-body text-sm border rounded-xl px-3.5 py-3 outline-none bg-white w-full focus:ring-2 focus:ring-blue-200";

  if (sessao && !recuperando) return (
    <div className="max-w-sm mx-auto px-4 py-20 text-center">
      <p className="font-display font-bold text-lg" style={{ color: INK }}>Você já está conectado</p>
      <p className="font-body text-sm mt-1" style={{ color: MUTED }}>{sessao.user.email}</p>
      <button onClick={onEntrou} className="mt-5 font-body text-sm font-bold px-5 py-2.5 rounded-xl text-white" style={{ background: AZUL }}>Abrir área do atendente</button>
    </div>
  );

  const entrar = async (e) => {
    e.preventDefault(); setCarregando(true); setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setCarregando(false);
    if (error) setMsg({ t: "erro", m: /invalid/i.test(error.message) ? "E-mail ou senha incorretos." : error.message });
    else onEntrou();
  };
  const esqueci = async () => {
    if (!email.trim()) { setMsg({ t: "erro", m: "Digite seu e-mail acima para receber o link." }); return; }
    setCarregando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/entrar` });
    setCarregando(false);
    setMsg(error ? { t: "erro", m: error.message } : { t: "ok", m: "Enviamos um link para o seu e-mail para criar uma nova senha." });
  };
  const novaSenha = async (e) => {
    e.preventDefault();
    if (senha.length < 6) { setMsg({ t: "erro", m: "A senha precisa ter pelo menos 6 caracteres." }); return; }
    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setCarregando(false);
    if (error) setMsg({ t: "erro", m: error.message }); else { onRecuperado(); onEntrou(); }
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-14">
      <div className="rounded-3xl border bg-white p-6 shadow-sm" style={{ borderColor: LINHA }}>
        <img src={LOGO_SALA} alt="Sala do Empreendedor" className="h-12 w-auto mb-4" />
        <p className="font-display font-extrabold text-xl" style={{ color: INK }}>{recuperando ? "Criar nova senha" : "Entrar"}</p>
        <p className="font-body text-sm mt-1 mb-5" style={{ color: MUTED }}>{recuperando ? "Digite a nova senha da sua conta." : "Acesso da equipe da Sala do Empreendedor. Use a mesma conta do Conecta Comércio."}</p>
        <form onSubmit={recuperando ? novaSenha : entrar} className="space-y-3">
          {!recuperando && <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu e-mail" className={input} style={{ borderColor: LINHA }} />}
          <div className="relative">
            <input type={ver ? "text" : "password"} autoComplete={recuperando ? "new-password" : "current-password"} required value={senha} onChange={(e) => setSenha(e.target.value)} placeholder={recuperando ? "Nova senha" : "Senha"} className={input} style={{ borderColor: LINHA, paddingRight: 44 }} />
            <button type="button" onClick={() => setVer(!ver)} className="absolute right-3 top-3" aria-label="Mostrar senha">{ver ? <EyeOff size={17} color={MUTED} /> : <Eye size={17} color={MUTED} />}</button>
          </div>
          {msg && <div className="rounded-xl px-3 py-2 font-body text-xs" style={{ background: msg.t === "erro" ? "#FBEAE5" : "#E7F6EE", color: msg.t === "erro" ? "#B4462F" : "#1E8E5A" }}>{msg.m}</div>}
          <button type="submit" disabled={carregando} className="w-full font-body text-sm font-bold py-3 rounded-xl text-white disabled:opacity-60" style={{ background: AZUL }}>{carregando ? "Aguarde..." : recuperando ? "Salvar nova senha" : "Entrar"}</button>
        </form>
        {!recuperando && <button onClick={esqueci} className="mt-3 font-body text-xs font-semibold underline" style={{ color: AZUL }}>Esqueci minha senha</button>}
      </div>
    </div>
  );
}
