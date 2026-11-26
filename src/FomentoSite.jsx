// =============================================================================
// SITE PRÓPRIO DO FOMENTO PARANÁ · IVATUBA
// Mesma base de dados e mesmo login do Conecta Comércio, mas sem o menu e a
// marca do Conecta. Gerado com VITE_SITE=fomento (projeto fomento-ivatuba).
//   /         → tela de entrada com as 3 opções (como a Sala)
//   /publico  → página pública
//   /agente   → área do agente de crédito (Central de Prospecção)
//   /admin    → administração do módulo
//   /entrar   → login
//   /demo     → demonstração somente leitura (pede nome e cidade; dados mascarados)
// =============================================================================
import React, { useEffect, useRef, useState } from "react";
import { registrar as registrarVisita, instalarRastreioCliques, ignorarRastreio } from "./shared/rastreio.js";
import { Landmark, LogIn, LogOut, Radar, ShieldCheck, Home, Eye, EyeOff, MonitorPlay, Lock, Globe } from "lucide-react";
import PortalEntrada from "./shared/PortalEntrada.jsx";
import { supabase, supabaseReal, supabaseConfigurado, usarClienteDemonstracao } from "./supabaseClient";
import { criarClienteDemonstracao, lerPasse, salvarPasse, apagarPasse, marcarPagina } from "./fomentoDemo";
import { FomentoPublico, FomentoAdmin } from "./FomentoParana.jsx";

const AZUL = "#0A5AA8", AZUL_ESC = "#052A4D", AMARELO = "#F5B700", LINHA = "#DCE7F2", MUTED = "#5C7186", INK = "#0E2233";
const ROTAS = { "/": "inicio", "/acesso": "inicio", "/publico": "publico", "/agente": "agente", "/admin": "admin", "/entrar": "entrar" };
// Login único (seção 15): o botão leva ao Conecta, que devolve um código de uso único
const CONECTA_URL = "https://conectacomercio.app.br";
const rotaAtual = () => ROTAS[window.location.pathname.replace(/\/+$/, "") || "/"] || "publico";

export default function FomentoSite() {
  const ehDemo = window.location.pathname.replace(/\/+$/, "").toLowerCase() === "/demo";
  return ehDemo ? <FomentoDemo /> : <FomentoSiteNormal />;
}

function FomentoSiteNormal() {
  const [rota, setRota] = useState(rotaAtual);
  const [sessao, setSessao] = useState(undefined);
  const [perfil, setPerfil] = useState(null);
  const [recuperando, setRecuperando] = useState(false);
  const [destino, setDestino] = useState(null);
  const [ssoMsg, setSsoMsg] = useState(null);

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

  // Volta do Conecta com o código de uso único: troca por um login próprio da Fomento
  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const codigo = h.get("sso");
    if (!codigo || !supabaseConfigurado) return;
    const volta = h.get("volta") === "admin" ? "admin" : "agente";
    window.history.replaceState(null, "", window.location.pathname); // tira o código da barra de endereço
    setSsoMsg({ t: "ok", m: "Entrando com a sua conta do Conecta..." });
    supabase.auth.verifyOtp({ token_hash: codigo, type: h.get("tipo") || "magiclink" }).then(({ error }) => {
      if (error) setSsoMsg({ t: "erro", m: "O acesso pelo Conecta expirou ou já foi usado. Tente de novo ou entre com e-mail e senha." });
      else { setSsoMsg(null); ir(volta); }
    });
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

  // Visitas e cliques (o que é mais visto e procurado) — a equipe não conta
  const rastreioPronto = sessao !== undefined && (!sessao || !!perfil);
  const entradaRegistrada = useRef(false);
  const rotaRef = useRef(rota);
  rotaRef.current = rota;
  useEffect(() => {
    if (!rastreioPronto) return;
    ignorarRastreio(["admin", "editor", "visualizador"].includes(perfil?.tipo) || !!sessao);
    if (!entradaRegistrada.current) { entradaRegistrada.current = true; registrarVisita({ tipo: "entrada", ambiente: "fomento", pagina: rota }); }
    registrarVisita({ tipo: "pagina", ambiente: "fomento", pagina: rota });
  }, [rota, rastreioPronto]);
  useEffect(() => instalarRastreioCliques(() => ({ ambiente: "fomento", pagina: rotaRef.current })), []);

  const sair = async () => { await supabase.auth.signOut(); ir("inicio"); };
  const nome = perfil?.nome ? perfil.nome.split(" ")[0] : sessao?.user?.email?.split("@")[0];
  const NavBtn = ({ r, icon: I, children }) => (
    <button onClick={() => ir(r)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-body text-sm font-bold whitespace-nowrap"
      style={{ background: rota === r ? "#fff" : "transparent", color: rota === r ? AZUL : "#fff" }}><I size={15} /> {children}</button>
  );

  return (
    <div className="min-h-screen" style={{ background: "#F7FAFD" }}>
      <header className="sticky top-0 z-50 shadow-md" style={{ background: `linear-gradient(110deg, ${AZUL_ESC}, ${AZUL})` }}>
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <button onClick={() => ir("inicio")} className="flex items-center gap-2 mr-auto">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: AMARELO }}><Landmark size={19} color={AZUL_ESC} /></span>
            <span className="text-left leading-tight"><span className="block font-display font-extrabold text-white text-[15px]">Fomento Paraná</span><span className="block font-body text-[11px] font-semibold" style={{ color: AMARELO }}>Agente de Crédito · Ivatuba-PR</span></span>
          </button>
          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <NavBtn r="inicio" icon={Home}>Início</NavBtn>
            <NavBtn r="publico" icon={Globe}>Área pública</NavBtn>
            {sessao && <NavBtn r="agente" icon={Radar}>Área do agente</NavBtn>}
            {sessao && <NavBtn r="admin" icon={ShieldCheck}>Administração</NavBtn>}
            {sessao ? <button onClick={sair} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-body text-sm font-bold text-white/85 whitespace-nowrap" title={sessao.user.email}><LogOut size={15} /> Sair{nome ? ` (${nome})` : ""}</button>
              : <NavBtn r="entrar" icon={LogIn}>Entrar</NavBtn>}
          </nav>
        </div>
      </header>

      <main>
        {rota === "inicio" && (
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-10">
            <PortalEntrada
              marca={<span className="flex items-center gap-3"><span className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: AMARELO }}><Landmark size={28} color={AZUL_ESC} /></span><span className="text-left leading-tight"><span className="block font-display font-extrabold text-2xl" style={{ color: AZUL_ESC }}>Fomento Paraná</span><span className="block font-body text-xs font-bold" style={{ color: "#B98900" }}>Agente de Crédito · Ivatuba-PR</span></span></span>}
              opcoes={[
                { chave: "publico", icon: Globe, titulo: "Área pública", texto: "Linhas de crédito, quem pode pedir, documentos e o contato do agente. Sem login.", cor: AZUL, onClick: () => ir("publico") },
                { chave: "agente", icon: Radar, titulo: "Área do agente", texto: "Central de Prospecção, propostas, contratos, lembretes e pontuação. Com login.", cor: "#1E8E5A", onClick: () => ir("agente") },
                { chave: "admin", icon: ShieldCheck, titulo: "Área do administrador", texto: "Linhas de crédito, materiais, configurações e relatórios da Fomento.", cor: "#7E5BEF", onClick: () => ir("admin") },
              ]} />
          </div>
        )}
        {rota === "publico" && <FomentoPublico siteConfig={null} />}
        {rota === "agente" && (sessao ? <FomentoAdmin key="agente" area="agente" sessao={sessao} perfil={perfil} /> : <Carregando />)}
        {rota === "admin" && (sessao ? <FomentoAdmin key="admin" area="admin" sessao={sessao} perfil={perfil} /> : <Carregando />)}
        {rota === "entrar" && <Entrar sessao={sessao} destino={destino} ssoMsg={ssoMsg} recuperando={recuperando} onRecuperado={() => setRecuperando(false)} onEntrou={() => { const d = destino || "agente"; setDestino(null); ir(d); }} />}
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

function Entrar({ sessao, destino, ssoMsg, recuperando, onRecuperado, onEntrou }) {
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
        {ssoMsg && <div className="rounded-xl px-3 py-2 mt-2 font-body text-xs" style={{ background: ssoMsg.t === "erro" ? "#FBEAE5" : "#EAF2FB", color: ssoMsg.t === "erro" ? "#B4462F" : AZUL }}>{ssoMsg.m}</div>}
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
        {!recuperando && (
          <>
            <div className="flex items-center gap-3 my-4"><span className="flex-1 h-px" style={{ background: LINHA }} /><span className="font-body text-[11px] font-semibold" style={{ color: MUTED }}>ou</span><span className="flex-1 h-px" style={{ background: LINHA }} /></div>
            <a href={`${CONECTA_URL}/#/sso-fomento?volta=${destino === "admin" ? "admin" : "agente"}`}
              className="w-full flex items-center justify-center gap-2 font-body text-sm font-bold py-3 rounded-xl border" style={{ borderColor: AZUL, color: AZUL }}>
              <LogIn size={16} /> Entrar com a conta do Conecta Comércio
            </a>
            <p className="font-body text-[11px] mt-2 text-center" style={{ color: MUTED }}>Se você já está conectado no Conecta, entra sem digitar a senha.</p>
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// DEMONSTRAÇÃO — /demo
// =============================================================================
const PERFIL_DEMO = { id: "demo", nome: "Visitante", tipo: "admin" };
const ROTULO_AREA = { publico: "Início", agente: "Área do agente", admin: "Administração" };

function FomentoDemo() {
  const [passe, setPasse] = useState(() => lerPasse());
  const [area, setArea] = useState("publico");
  const [pronto, setPronto] = useState(false);

  useEffect(() => { document.title = "Demonstração · Fomento Paraná Ivatuba"; }, []);
  useEffect(() => {
    if (!passe) return;
    usarClienteDemonstracao(criarClienteDemonstracao(passe.token));
    setPronto(true);
    const expirou = () => { apagarPasse(); window.location.reload(); };
    window.addEventListener("fomento-demo-expirou", expirou);
    return () => window.removeEventListener("fomento-demo-expirou", expirou);
  }, [passe?.token]);
  useEffect(() => { if (pronto) marcarPagina(passe.token, ROTULO_AREA[area]); }, [pronto, area]);

  if (!passe) return <PortaDemo onEntrou={(p) => { salvarPasse(p); setPasse(p); }} />;
  if (!pronto) return <Carregando />;

  const sessaoDemo = { user: { id: "demo", email: "demonstracao" } };
  const Aba = ({ r, icon: I }) => (
    <button onClick={() => { setArea(r); window.scrollTo(0, 0); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-body text-sm font-bold whitespace-nowrap"
      style={{ background: area === r ? "#fff" : "transparent", color: area === r ? AZUL : "#fff" }}><I size={15} /> {ROTULO_AREA[r]}</button>
  );
  return (
    <div className="min-h-screen" style={{ background: "#F7FAFD" }}>
      <div className="text-center font-body text-xs font-bold py-1.5 px-3" style={{ background: AMARELO, color: AZUL_ESC }}>
        <Lock size={12} className="inline -mt-0.5 mr-1" /> DEMONSTRAÇÃO · somente visualização · nomes só com a inicial, sem documentos nem contatos
      </div>
      <header className="sticky top-0 z-50 shadow-md" style={{ background: `linear-gradient(110deg, ${AZUL_ESC}, ${AZUL})` }}>
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 mr-auto">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: AMARELO }}><Landmark size={19} color={AZUL_ESC} /></span>
            <span className="text-left leading-tight"><span className="block font-display font-extrabold text-white text-[15px]">Fomento Paraná</span><span className="block font-body text-[11px] font-semibold" style={{ color: AMARELO }}>Olá, {passe.nome.split(" ")[0]} · {passe.cidade}</span></span>
          </div>
          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <Aba r="publico" icon={Home} />
            <Aba r="agente" icon={Radar} />
            <Aba r="admin" icon={ShieldCheck} />
          </nav>
        </div>
      </header>
      <main>
        {area === "publico" && <FomentoPublico siteConfig={null} />}
        {area === "agente" && <FomentoAdmin key="demo-agente" area="agente" sessao={sessaoDemo} perfil={PERFIL_DEMO} aoTrocarAba={(a) => marcarPagina(passe.token, `Agente: ${a}`)} />}
        {area === "admin" && <FomentoAdmin key="demo-admin" area="admin" sessao={sessaoDemo} perfil={PERFIL_DEMO} aoTrocarAba={(a) => marcarPagina(passe.token, `Admin: ${a}`)} />}
      </main>
      <footer className="border-t mt-10" style={{ borderColor: LINHA }}>
        <div className="max-w-6xl mx-auto px-4 py-6 font-body text-xs" style={{ color: MUTED }}>
          Demonstração do sistema do Agente de Crédito da Fomento Paraná em Ivatuba-PR. Os dados pessoais dos empreendedores não são exibidos.
        </div>
      </footer>
    </div>
  );
}

function PortaDemo({ onEntrou }) {
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [msg, setMsg] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const input = "font-body text-sm border rounded-xl px-3.5 py-3 outline-none bg-white w-full focus:ring-2 focus:ring-blue-200";
  const entrar = async (e) => {
    e.preventDefault();
    if (nome.trim().length < 2 || cidade.trim().length < 2) { setMsg("Informe seu nome e sua cidade."); return; }
    if (!supabaseConfigurado) { setMsg("Demonstração indisponível no momento."); return; }
    setCarregando(true); setMsg(null);
    const { data, error } = await supabaseReal.rpc("fomento_demo_registrar", { p_nome: nome.trim(), p_cidade: cidade.trim(), p_navegador: navigator.userAgent });
    setCarregando(false);
    if (error || !data) { setMsg(error?.message || "Não foi possível abrir a demonstração."); return; }
    if (data === "pendente") { setMsg({ ok: true, texto: "Pedido enviado! Aguarde o agente de crédito liberar seu acesso. Depois, volte aqui e clique de novo em Ver demonstração com o mesmo nome e cidade." }); return; }
    if (data === "bloqueado") { setMsg("Seu acesso à demonstração não foi autorizado."); return; }
    onEntrou({ token: data, nome: nome.trim(), cidade: cidade.trim() });
  };
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: `linear-gradient(140deg, ${AZUL_ESC}, ${AZUL})` }}>
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <span className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: AMARELO }}><MonitorPlay size={22} color={AZUL_ESC} /></span>
        <p className="font-body text-[11px] font-bold uppercase tracking-wider" style={{ color: AZUL }}>Fomento Paraná · Ivatuba-PR</p>
        <p className="font-display font-extrabold text-xl mt-0.5" style={{ color: INK }}>Demonstração do sistema</p>
        <p className="font-body text-sm mt-1 mb-5" style={{ color: MUTED }}>Veja o Início, a Área do agente e a Administração. Para entrar, diga quem é você.</p>
        <form onSubmit={entrar} className="space-y-3">
          <input required maxLength={80} autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" className={input} style={{ borderColor: LINHA }} />
          <input required maxLength={80} value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Sua cidade" className={input} style={{ borderColor: LINHA }} />
          {msg && (msg.ok
            ? <div className="rounded-xl px-3 py-2 font-body text-xs" style={{ background: "#E7F5EC", color: "#1E7A44" }}>{msg.texto}</div>
            : <div className="rounded-xl px-3 py-2 font-body text-xs" style={{ background: "#FBEAE5", color: "#B4462F" }}>{msg}</div>)}
          <button type="submit" disabled={carregando} className="w-full font-body text-sm font-bold py-3 rounded-xl text-white disabled:opacity-60" style={{ background: AZUL }}>{carregando ? "Abrindo..." : "Ver demonstração"}</button>
        </form>
        <div className="mt-4 rounded-xl px-3 py-2.5 font-body text-[11px] leading-relaxed" style={{ background: "#F1F6FB", color: MUTED }}>
          <Lock size={11} className="inline -mt-0.5 mr-1" />Somente visualização. Nomes de clientes aparecem só com a inicial; documentos, telefones e endereços ficam ocultos. Seu nome, cidade, data e horário de acesso ficam registrados. O acesso é liberado pelo agente de crédito.
        </div>
      </div>
    </div>
  );
}
