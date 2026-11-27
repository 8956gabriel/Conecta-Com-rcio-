// =============================================================================
// LAYOUT ADMINISTRATIVO (padrão Conecta Gestão 360)
// Barra lateral azul-marinho em altura total + cabeçalho com título da página,
// busca, notificações, perfil e Sair + breadcrumb com "Voltar" + rodapé.
// Componente só de apresentação: quem usa decide o que cada item abre.
//
// props:
//   sistema        { nome, destaque, sub, logo }   — marca no topo da barra
//   area           "Painel Administrativo"          — 1ª parte do título/breadcrumb
//   grupos         [{ titulo, itens: [{ id, label, icon, badge, href }] }]
//   atual, onSelecionar(id)
//   usuario        { nome, papel }
//   notificacoes   { total, onAbrir }               (opcional)
//   onModulos      () => void                       (opcional) botão "Módulos"
//   onSair         () => void
//   chave          nome para lembrar se o menu está recolhido
//   cor            { nav, nav2, destaque }          (opcional) para Sala/Fomento
// =============================================================================
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bell, ChevronRight, LayoutGrid, LogOut, Menu, PanelLeft, Search, X } from "lucide-react";

const T = {
  nav: "#123B5D", nav2: "#0E3150", bg: "#F4F7FA", card: "#FFFFFF", ink: "#243447", ink2: "#66768A",
  line: "#E1E8EF", sky: "#EAF3FA", blue: "var(--cor-principal, #165D99)", destaque: "#9EE0B8",
};

const iniciais = (nome = "") => nome.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("") || "?";
const semAcento = (s = "") => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function AdminShell({
  sistema = { nome: "Conecta", destaque: "Comércio", sub: "Painel administrativo" },
  area = "Painel Administrativo", grupos = [], atual, onSelecionar, usuario = {},
  notificacoes, onModulos, onSair, chave = "admin", cor = {}, rodape, children,
}) {
  const nav = cor.nav || T.nav, nav2 = cor.nav2 || T.nav2, destaque = cor.destaque || T.destaque;
  const chaveRec = `admin-shell-recolhido-${chave}`;
  const [recolhido, setRecolhido] = useState(() => { try { return localStorage.getItem(chaveRec) === "1"; } catch { return false; } });
  const [gaveta, setGaveta] = useState(false);
  const [busca, setBusca] = useState("");
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [perfilAberto, setPerfilAberto] = useState(false);
  const [historico, setHistorico] = useState([]);
  const anterior = useRef(atual);
  const voltando = useRef(false);
  const refBusca = useRef(null);

  useEffect(() => { try { localStorage.setItem(chaveRec, recolhido ? "1" : "0"); } catch { /* sem armazenamento */ } }, [recolhido, chaveRec]);
  // Guarda o caminho percorrido entre as abas para o botão "Voltar".
  useEffect(() => {
    const ant = anterior.current; // lido agora: a função do setState roda depois
    if (ant && ant !== atual && !voltando.current) setHistorico((h) => [...h.slice(-20), ant]);
    voltando.current = false;
    anterior.current = atual;
  }, [atual]);
  useEffect(() => {
    const tecla = (e) => {
      if (e.key === "Escape") { setGaveta(false); setPerfilAberto(false); setBuscaAberta(false); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); refBusca.current?.focus(); setBuscaAberta(true); }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  const todos = useMemo(() => grupos.flatMap((g) => g.itens.map((i) => ({ ...i, grupo: g.titulo }))), [grupos]);
  const item = todos.find((i) => i.id === atual);
  const resultados = busca.trim() ? todos.filter((i) => semAcento(`${i.label} ${i.grupo}`).includes(semAcento(busca.trim()))).slice(0, 8) : [];

  const abrir = (i) => {
    if (!i) return;
    if (i.href) window.location.hash = i.href; else onSelecionar?.(i.id);
    setGaveta(false); setBusca(""); setBuscaAberta(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const voltar = () => {
    const ant = historico[historico.length - 1];
    if (!ant) return;
    voltando.current = true;
    setHistorico((h) => h.slice(0, -1));
    onSelecionar?.(ant);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const Barra = ({ compacto }) => (
    <div className="flex flex-col h-full" style={{ background: nav, color: "#D5E2EE" }}>
      <div className={`flex items-center gap-2.5 h-16 shrink-0 border-b ${compacto ? "justify-center px-2" : "px-5"}`} style={{ borderColor: "rgba(255,255,255,.1)" }}>
        {sistema.logo
          ? <img src={sistema.logo} alt="" className="w-9 h-9 rounded-xl object-contain bg-white p-1 shrink-0" />
          : <span className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-extrabold text-[13px] shrink-0 border" style={{ borderColor: "rgba(255,255,255,.25)", color: "#fff" }}>{iniciais(`${sistema.nome} ${sistema.destaque || ""}`)}</span>}
        {!compacto && (
          <span className="min-w-0 leading-tight">
            <span className="block font-display font-bold text-[15px] text-white truncate">{sistema.nome} <span style={{ color: destaque }}>{sistema.destaque}</span></span>
            <span className="block font-body text-[10px] font-semibold uppercase tracking-[0.16em] truncate" style={{ color: "#8FAAC2" }}>{sistema.sub}</span>
          </span>
        )}
      </div>
      <nav aria-label="Menu do painel" className={`flex-1 overflow-y-auto no-scrollbar py-3 ${compacto ? "px-2" : "px-3"}`}>
        {grupos.map((g) => (
          <div key={g.titulo} className="mb-2">
            {compacto ? <div className="mx-2 my-2 border-t" style={{ borderColor: "rgba(255,255,255,.1)" }} />
              : <p className="font-body text-[10px] font-bold uppercase tracking-[0.15em] px-3 pt-3 pb-1.5" style={{ color: "#7E9AB5" }}>{g.titulo}</p>}
            {g.itens.map((i) => {
              const ativo = i.id === atual;
              const I = i.icon;
              return (
                <button key={i.id} onClick={() => abrir(i)} title={compacto ? i.label : undefined} aria-current={ativo ? "page" : undefined}
                  className={`relative w-full flex items-center gap-2.5 rounded-lg font-body text-[13px] transition-colors mb-0.5 ${compacto ? "justify-center h-10" : "px-3 h-9"}`}
                  style={ativo ? { background: "rgba(255,255,255,.13)", color: "#fff", fontWeight: 600 } : { color: "#C9D8E6" }}
                  onMouseEnter={(e) => { if (!ativo) e.currentTarget.style.background = "rgba(255,255,255,.07)"; }}
                  onMouseLeave={(e) => { if (!ativo) e.currentTarget.style.background = "transparent"; }}>
                  {ativo && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r" style={{ background: destaque }} />}
                  {I && <I size={17} className="shrink-0" />}
                  {!compacto && <span className="flex-1 text-left truncate">{i.label}</span>}
                  {i.badge > 0 && (compacto
                    ? <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: "#F59E0B" }} />
                    : <span className="font-body text-[10px] font-bold px-1.5 rounded-full" style={{ background: "#F59E0B", color: "#1F2937" }}>{i.badge}</span>)}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      {rodape && !compacto && <div className="border-t px-4 py-3 shrink-0" style={{ borderColor: "rgba(255,255,255,.1)" }}>{rodape}</div>}
    </div>
  );

  return (
    <div className="min-h-screen flex font-body" style={{ background: T.bg, color: T.ink }}>
      {/* Barra lateral (computador) */}
      <aside className={`hidden lg:block sticky top-0 h-screen shrink-0 transition-[width] duration-200 ${recolhido ? "w-[72px]" : "w-[264px]"}`}>
        <Barra compacto={recolhido} />
      </aside>

      {/* Barra lateral (celular e tablet): gaveta */}
      {gaveta && (
        <div className="lg:hidden fixed inset-0 z-[70]">
          <div className="absolute inset-0" style={{ background: "rgba(10,30,48,.5)" }} onClick={() => setGaveta(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] max-w-[86vw] shadow-2xl">
            <Barra />
            <button onClick={() => setGaveta(false)} aria-label="Fechar menu" className="absolute top-3.5 right-3 w-9 h-9 rounded-lg flex items-center justify-center text-white" style={{ background: "rgba(255,255,255,.1)" }}><X size={18} /></button>
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Cabeçalho */}
        <header className="sticky top-0 z-50 h-16 flex items-center gap-2 sm:gap-3 px-3 sm:px-6 text-white" style={{ background: nav2, boxShadow: "0 1px 0 rgba(255,255,255,.06)" }}>
          <button onClick={() => (window.innerWidth >= 1024 ? setRecolhido((v) => !v) : setGaveta(true))}
            aria-label={window.innerWidth >= 1024 ? (recolhido ? "Expandir menu" : "Recolher menu") : "Abrir menu"}
            title="Menu" className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 hover:bg-white/10">
            <span className="hidden lg:inline"><PanelLeft size={19} /></span><span className="lg:hidden"><Menu size={20} /></span>
          </button>
          <div className="min-w-0 leading-tight mr-auto">
            <p className="font-body text-[11px] truncate" style={{ color: "#9FB6CC" }}>{area}</p>
            <p className="font-display font-bold text-[15px] truncate">{item?.label || ""}</p>
          </div>

          {/* Busca nas abas */}
          {todos.length > 5 && <div className="relative hidden md:block w-[min(380px,28vw)] lg:w-[min(380px,24vw)] xl:w-[min(380px,28vw)]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#8FAAC2" }} />
            <input ref={refBusca} value={busca} onChange={(e) => { setBusca(e.target.value); setBuscaAberta(true); }} onFocus={() => setBuscaAberta(true)}
              onBlur={() => setTimeout(() => setBuscaAberta(false), 150)}
              onKeyDown={(e) => { if (e.key === "Enter") abrir(resultados[0]); }}
              placeholder="Buscar em tudo... (Ctrl+K)" aria-label="Buscar uma área do painel"
              className="w-full h-10 pl-9 pr-3 rounded-lg font-body text-[13px] text-white placeholder:text-[#8FAAC2] outline-none border"
              style={{ background: "rgba(255,255,255,.07)", borderColor: "rgba(255,255,255,.14)" }} />
            {buscaAberta && busca.trim() && (
              <div className="absolute left-0 right-0 mt-2 rounded-xl border bg-white shadow-xl overflow-hidden z-50" style={{ borderColor: T.line }}>
                {resultados.length ? resultados.map((r) => {
                  const I = r.icon;
                  return (
                    <button key={r.id} onMouseDown={(e) => e.preventDefault()} onClick={() => abrir(r)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-[#F4F7FA]">
                      {I && <I size={15} style={{ color: T.ink2 }} />}
                      <span className="flex-1 min-w-0"><span className="block font-body text-[13px] font-semibold truncate" style={{ color: T.ink }}>{r.label}</span><span className="block font-body text-[11px]" style={{ color: T.ink2 }}>{r.grupo}</span></span>
                    </button>
                  );
                }) : <p className="px-3.5 py-3 font-body text-[13px]" style={{ color: T.ink2 }}>Nenhuma área com esse nome.</p>}
              </div>
            )}
          </div>}

          {notificacoes && (
            <button onClick={notificacoes.onAbrir} aria-label={`Notificações${notificacoes.total ? `: ${notificacoes.total} pendentes` : ""}`} title="Notificações"
              className="relative w-10 h-10 rounded-lg flex items-center justify-center shrink-0 hover:bg-white/10">
              <Bell size={19} />
              {notificacoes.total > 0 && <span className="absolute top-1.5 right-1 min-w-[17px] h-[17px] px-1 rounded-full font-body text-[10px] font-bold flex items-center justify-center" style={{ background: "#F59E0B", color: "#1F2937" }}>{notificacoes.total > 99 ? "99+" : notificacoes.total}</span>}
            </button>
          )}

          {/* Perfil */}
          <div className="relative shrink-0">
            <button onClick={() => setPerfilAberto((v) => !v)} aria-haspopup="menu" aria-expanded={perfilAberto}
              className="flex items-center gap-2.5 h-10 pl-1 pr-2 rounded-lg hover:bg-white/10">
              <span className="w-8 h-8 rounded-full flex items-center justify-center font-body text-[12px] font-bold" style={{ background: "#2B5F8E" }}>{iniciais(usuario.nome)}</span>
              <span className="hidden xl:block text-left leading-tight max-w-[160px]">
                <span className="block font-body text-[12.5px] font-semibold truncate">{usuario.nome || "Usuário"}</span>
                <span className="block font-body text-[11px] truncate" style={{ color: "#9FB6CC" }}>{usuario.papel}</span>
              </span>
            </button>
            {perfilAberto && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPerfilAberto(false)} />
                <div role="menu" className="absolute right-0 mt-2 w-60 rounded-xl border bg-white shadow-xl overflow-hidden z-50" style={{ borderColor: T.line }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: T.line }}>
                    <p className="font-body text-[13px] font-semibold truncate" style={{ color: T.ink }}>{usuario.nome || "Usuário"}</p>
                    <p className="font-body text-[11.5px]" style={{ color: T.ink2 }}>{usuario.papel}</p>
                  </div>
                  <a role="menuitem" href="#/conta" className="block px-4 py-2.5 font-body text-[13px] hover:bg-[#F4F7FA]" style={{ color: T.ink }}>Minha conta</a>
                  <a role="menuitem" href="#/portal" className="block px-4 py-2.5 font-body text-[13px] hover:bg-[#F4F7FA]" style={{ color: T.ink }}>Minhas áreas</a>
                  <a role="menuitem" href="#/" className="block px-4 py-2.5 font-body text-[13px] hover:bg-[#F4F7FA]" style={{ color: T.ink }}>Ir para o site</a>
                  <button role="menuitem" onClick={onSair} className="w-full flex items-center gap-2 px-4 py-2.5 border-t font-body text-[13px] font-semibold text-left hover:bg-[#FCE9E9]" style={{ color: "#C93C3C", borderColor: T.line }}><LogOut size={15} /> Sair</button>
                </div>
              </>
            )}
          </div>

          {onModulos && (
            <button onClick={onModulos} className="hidden xl:flex items-center gap-1.5 h-10 px-3.5 rounded-lg border font-body text-[13px] font-semibold shrink-0 hover:bg-white/10" style={{ borderColor: "rgba(255,255,255,.22)" }}>
              <LayoutGrid size={15} /> Módulos
            </button>
          )}
          <button onClick={onSair} className="hidden sm:flex items-center gap-1.5 h-10 px-3.5 rounded-lg border font-body text-[13px] font-semibold shrink-0 hover:bg-white/10" style={{ borderColor: "rgba(255,255,255,.22)" }}>
            <LogOut size={15} /> Sair
          </button>
        </header>

        {/* Localização: Voltar + breadcrumb */}
        <div className="w-full max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <button onClick={voltar} disabled={!historico.length}
            className="inline-flex items-center gap-1.5 h-[34px] pl-2 pr-3 rounded-lg border font-body text-[13px] font-semibold disabled:opacity-45 disabled:cursor-default"
            style={{ background: T.sky, borderColor: "#CFE0EF", color: T.nav }}>
            <ArrowLeft size={15} /> Voltar
          </button>
          <ol className="flex flex-wrap items-center gap-1 font-body text-[13px] min-w-0" style={{ color: T.ink2 }} aria-label="Você está em">
            <li>{area}</li>
            {item?.grupo && <><li aria-hidden><ChevronRight size={13} /></li><li>{item.grupo}</li></>}
            {item && <><li aria-hidden><ChevronRight size={13} /></li><li className="font-semibold" style={{ color: T.ink }} aria-current="page">{item.label}</li></>}
          </ol>
          {/* Busca no celular */}
          {todos.length > 5 && <div className="relative md:hidden w-full">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: T.ink2 }} />
            <input value={busca} onChange={(e) => { setBusca(e.target.value); setBuscaAberta(true); }} onKeyDown={(e) => { if (e.key === "Enter") abrir(resultados[0]); }}
              placeholder="Buscar uma área do painel..." aria-label="Buscar uma área do painel"
              className="w-full h-11 pl-9 pr-3 rounded-lg border bg-white font-body text-[14px] outline-none" style={{ borderColor: T.line }} />
            {busca.trim() && (
              <div className="absolute left-0 right-0 mt-1.5 rounded-xl border bg-white shadow-xl overflow-hidden z-40" style={{ borderColor: T.line }}>
                {resultados.length ? resultados.map((r) => (
                  <button key={r.id} onClick={() => abrir(r)} className="w-full px-3.5 py-3 text-left font-body text-[14px] border-b last:border-b-0" style={{ color: T.ink, borderColor: T.line }}>
                    {r.label} <span className="text-[11px]" style={{ color: T.ink2 }}>· {r.grupo}</span>
                  </button>
                )) : <p className="px-3.5 py-3 font-body text-[13px]" style={{ color: T.ink2 }}>Nenhuma área com esse nome.</p>}
              </div>
            )}
          </div>}
        </div>

        <main className="cg-shell-main flex-1 w-full max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <style>{`
            .cg-shell-main .rounded-2xl.border:not([class*="bg-"]), .cg-shell-main .rounded-xl.border:not([class*="bg-"]) { background-color: #fff; }
            .cg-shell-main table thead tr { background-color: #F4F7FA; }
            .cg-shell-main .glow-card { transition: box-shadow .18s ease, transform .18s ease; }
            .cg-shell-main .glow-card:hover { box-shadow: 0 6px 18px rgba(18,59,93,.08); transform: translateY(-1px); }
          `}</style>
          {children}
        </main>

        <footer className="border-t bg-white px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-2 font-body text-[12.5px]" style={{ borderColor: T.line, color: T.ink2 }}>
          <span><b style={{ color: T.nav }}>{sistema.nome} {sistema.destaque}</b> · {area} © {new Date().getFullYear()} — uso restrito a pessoas autorizadas</span>
        </footer>
      </div>
    </div>
  );
}
