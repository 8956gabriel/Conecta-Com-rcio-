// =============================================================================
// SITE PRÓPRIO DO FOMENTO PARANÁ · IVATUBA
// Mesma base de dados e mesmo login do Conecta Comércio, mas sem o menu e a
// marca do Conecta. Gerado com VITE_SITE=fomento (projeto fomento-ivatuba).
//   /         → página pública
//   /agente   → área do agente de crédito (Central de Prospecção)
//   /admin    → administração do módulo
//   /entrar   → login
// =============================================================================
import React, { useEffect, useState } from "react";
import { Landmark, LogIn, LogOut, Radar, ShieldCheck, Home, Eye, EyeOff } from "lucide-react";
import { supabase, supabaseConfigurado } from "./supabaseClient";
import { FomentoPublico, FomentoAdmin } from "./FomentoParana.jsx";

const AZUL = "#0A5AA8", AZUL_ESC = "#052A4D", AMARELO = "#F5B700", LINHA = "#DCE7F2", MUTED = "#5C7186", INK = "#0E2233";
const ROTAS = { "/": "publico", "/agente": "agente", "/admin": "admin", "/entrar": "entrar" };
const rotaAtual = () => ROTAS[window.location.pathname.replace(/\/+$/, "") || "/"] || "publico";

export default function FomentoSite() {
  const [rota, setRota] = useState(rotaAtual);
  const [sessao, setSessao] = useState(undefined);
  const [perfil, setPerfil] = useState(null);
  const [recuperando, setRecuperando] = useState(false);
  const [destino, setDestino] = useState(null);

  const ir = (r) => {
    const path = Object.entries(ROTAS).find(([, v]) => v === r)?.[0] || "/";
    if (window.location.pathname !== path) window.history.pushState(null, "", path);
    setRota(r); window.scrollTo(0, 0);
  };

  useEffect(() => {
    document.title = "Fomento Paraná · Ivatuba";
    const pop = () => setRota(rotaAtual());
    window.addEventListener("popstate", pop);
    // links internos (<a href="/agente">) sem recarregar a página
    const clique = (e) => {
      const a = e.target.closest?.("a[href]");
      if (!a || a.target || e.metaKey || e.ctrlKey) return;
      const href = a.getAttribute("href");
      if (href && ROTAS[href]) { e.preventDefault(); ir(ROTAS[href]); }
      else if (href === "#/entrar") { e.preventDefault(); ir("entrar"); }
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
    if (sessao === null && (rota === "agente" || rota === "admin")) { setDestino(rota); ir("entrar"); }
  }, [sessao, rota]);

  const sair = async () => { await supabase.auth.signOut(); ir("publico"); };
  const nome = perfil?.nome ? perfil.nome.split(" ")[0] : sessao?.user?.email?.split("@")[0];
  const NavBtn = ({ r, icon: I, children }) => (
    <button onClick={() => ir(r)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-body text-sm font-bold whitespace-nowrap"
      style={{ background: rota === r ? "#fff" : "transparent", color: rota === r ? AZUL : "#fff" }}><I size={15} /> {children}</button>
  );

  return (
    <div className="min-h-screen" style={{ background: "#F7FAFD" }}>
      <header className="sticky top-0 z-50 shadow-md" style={{ background: `linear-gradient(110deg, ${AZUL_ESC}, ${AZUL})` }}>
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <button onClick={() => ir("publico")} className="flex items-center gap-2 mr-auto">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: AMARELO }}><Landmark size={19} color={AZUL_ESC} /></span>
            <span className="text-left leading-tight"><span className="block font-display font-extrabold text-white text-[15px]">Fomento Paraná</span><span className="block font-body text-[11px] font-semibold" style={{ color: AMARELO }}>Agente de Crédito · Ivatuba-PR</span></span>
          </button>
          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <NavBtn r="publico" icon={Home}>Início</NavBtn>
            {sessao && <NavBtn r="agente" icon={Radar}>Área do agente</NavBtn>}
            {sessao && <NavBtn r="admin" icon={ShieldCheck}>Administração</NavBtn>}
            {sessao ? <button onClick={sair} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-body text-sm font-bold text-white/85 whitespace-nowrap" title={sessao.user.email}><LogOut size={15} /> Sair{nome ? ` (${nome})` : ""}</button>
              : <NavBtn r="entrar" icon={LogIn}>Entrar</NavBtn>}
          </nav>
        </div>
      </header>

      <main>
        {rota === "publico" && <FomentoPublico siteConfig={null} />}
        {rota === "agente" && (sessao ? <FomentoAdmin key="agente" area="agente" sessao={sessao} perfil={perfil} /> : <Carregando />)}
        {rota === "admin" && (sessao ? <FomentoAdmin key="admin" area="admin" sessao={sessao} perfil={perfil} /> : <Carregando />)}
        {rota === "entrar" && <Entrar sessao={sessao} recuperando={recuperando} onRecuperado={() => setRecuperando(false)} onEntrou={() => { const d = destino || "agente"; setDestino(null); ir(d); }} />}
      </main>

      <footer className="border-t mt-10" style={{ borderColor: LINHA }}>
        <div className="max-w-6xl mx-auto px-4 py-6 font-body text-xs flex flex-wrap gap-x-4 gap-y-1 justify-between" style={{ color: MUTED }}>
          <span>Atendimento do Agente de Crédito da Fomento Paraná em Ivatuba-PR.</span>
          <a href="https://www.fomento.pr.gov.br" target="_blank" rel="noopener" className="underline">Site oficial da Fomento Paraná</a>
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
      <button onClick={onEntrou} className="mt-5 font-body text-sm font-bold px-5 py-2.5 rounded-xl text-white" style={{ background: AZUL }}>Abrir área do agente</button>
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
        <span className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: AMARELO }}><Landmark size={22} color={AZUL_ESC} /></span>
        <p className="font-display font-extrabold text-xl" style={{ color: INK }}>{recuperando ? "Criar nova senha" : "Entrar"}</p>
        <p className="font-body text-sm mt-1 mb-5" style={{ color: MUTED }}>{recuperando ? "Digite a nova senha da sua conta." : "Acesso da equipe do Fomento Paraná. Use a mesma conta do Conecta Comércio."}</p>
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
