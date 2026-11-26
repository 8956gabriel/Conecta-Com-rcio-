// =============================================================================
// MENU LATERAL (padrão "app") compartilhado pelos ambientes da plataforma.
// Projeto Master · Fase 5 — cada ambiente passa sua própria logo, cor e itens;
// o componente só organiza a navegação:
//   • computador: barra lateral fixa à esquerda, recolhível (só ícones)
//   • celular: botão "Menu" que abre a barra como gaveta
//   • categorias com título e submenus agrupados
// Não muda rotas nem links: quem decide o que cada item abre continua sendo
// o painel que usa o componente (via onSelecionar).
// =============================================================================
import React, { useEffect, useState } from "react";
import { ChevronsLeft, ChevronsRight, Menu, X } from "lucide-react";

export default function PainelLateral({
  logo,           // url da logomarca do ambiente
  logoAlt = "",
  ambiente,       // ex.: "Área do atendente"
  cor = "#0A5AA8",
  corProfunda = "#052A4D",
  destaque = "#F5B700",
  grupos = [],    // [{ titulo, itens: [{ id, label, icon, badge }] }]
  atual,
  onSelecionar,
  chave = "painel", // nome usado para lembrar se o menu está recolhido
  rodape = null,  // conteúdo extra no fim do menu (links, sair...)
  children,
}) {
  const chaveRecolhido = `menu-recolhido-${chave}`;
  const [recolhido, setRecolhido] = useState(() => { try { return localStorage.getItem(chaveRecolhido) === "1"; } catch { return false; } });
  const [aberto, setAberto] = useState(false); // gaveta no celular

  useEffect(() => { try { localStorage.setItem(chaveRecolhido, recolhido ? "1" : "0"); } catch { /* sem armazenamento */ } }, [recolhido, chaveRecolhido]);
  useEffect(() => {
    if (!aberto) return;
    const esc = (e) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto]);

  const todos = grupos.flatMap((g) => g.itens);
  const itemAtual = todos.find((i) => i.id === atual);
  const escolher = (id) => { onSelecionar?.(id); setAberto(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const Lista = ({ compacto }) => (
    <nav className="flex-1 overflow-y-auto no-scrollbar px-2.5 py-3">
      {grupos.map((g) => (
        <div key={g.titulo} className="mb-3">
          {!compacto && <p className="font-body text-[10px] font-extrabold uppercase tracking-[0.14em] px-2.5 mb-1.5" style={{ color: "#8A9BAE" }}>{g.titulo}</p>}
          {compacto && <div className="mx-3 mb-1.5 border-t" style={{ borderColor: "#E3EBF4" }} />}
          {g.itens.map((i) => {
            const ativo = i.id === atual;
            return (
              <button key={i.id} onClick={() => escolher(i.id)} title={compacto ? i.label : undefined}
                className={`w-full flex items-center gap-2.5 rounded-xl font-body text-[13px] font-bold transition-colors mb-0.5 ${compacto ? "justify-center px-0 py-2.5" : "px-2.5 py-2"}`}
                style={ativo ? { background: cor, color: "#fff" } : { color: "#425A70" }}
                onMouseEnter={(e) => { if (!ativo) e.currentTarget.style.background = "#EEF4FB"; }}
                onMouseLeave={(e) => { if (!ativo) e.currentTarget.style.background = "transparent"; }}>
                <span className="relative flex-shrink-0">
                  {i.icon && <i.icon size={17} />}
                  {compacto && i.badge > 0 && <span className="absolute -top-1.5 -right-2 text-[9px] font-extrabold px-1 rounded-full" style={{ background: destaque, color: corProfunda }}>{i.badge}</span>}
                </span>
                {!compacto && <span className="flex-1 text-left truncate">{i.label}</span>}
                {!compacto && i.badge > 0 && <span className="text-[10px] font-extrabold px-1.5 rounded-full" style={{ background: destaque, color: corProfunda }}>{i.badge}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const Cabeca = ({ compacto }) => (
    <div className={`border-b ${compacto ? "px-2 py-3" : "px-4 py-4"}`} style={{ borderColor: "#E3EBF4" }}>
      {logo && <img src={logo} alt={logoAlt} className={compacto ? "h-7 w-full object-contain" : "h-10 w-auto object-contain"} />}
      {!compacto && ambiente && (
        <span className="inline-block mt-2 font-body text-[10px] font-extrabold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full" style={{ background: `${cor}14`, color: cor }}>{ambiente}</span>
      )}
    </div>
  );

  return (
    <div className="flex items-start min-h-[70vh]">
      {/* Computador: barra fixa */}
      <aside className={`hidden lg:flex flex-col sticky top-16 self-start h-[calc(100vh-5rem)] bg-white border rounded-2xl my-4 ml-4 shadow-sm transition-[width] duration-200 ${recolhido ? "w-[68px]" : "w-60"}`} style={{ borderColor: "#E3EBF4" }}>
        <Cabeca compacto={recolhido} />
        <Lista compacto={recolhido} />
        {!recolhido && rodape && <div className="border-t px-3 py-3" style={{ borderColor: "#E3EBF4" }}>{rodape}</div>}
        <button onClick={() => setRecolhido((v) => !v)} className="border-t flex items-center justify-center gap-1.5 py-2.5 font-body text-[11px] font-bold" style={{ borderColor: "#E3EBF4", color: "#8A9BAE" }} title={recolhido ? "Expandir menu" : "Recolher menu"}>
          {recolhido ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> Recolher</>}
        </button>
      </aside>

      {/* Celular: gaveta */}
      {aberto && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAberto(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white flex flex-col shadow-2xl">
            <div className="flex items-start justify-between pr-2"><div className="flex-1"><Cabeca /></div>
              <button onClick={() => setAberto(false)} className="p-2 mt-3 rounded-lg" aria-label="Fechar menu" style={{ color: "#425A70" }}><X size={20} /></button></div>
            <Lista />
            {rodape && <div className="border-t px-3 py-3" style={{ borderColor: "#E3EBF4" }}>{rodape}</div>}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="lg:hidden sticky top-14 z-40 px-4 pt-3">
          <button onClick={() => setAberto(true)} className="w-full flex items-center gap-2 bg-white border rounded-xl px-3 py-2.5 shadow-sm font-body text-sm font-bold" style={{ borderColor: "#E3EBF4", color: corProfunda }}>
            <Menu size={18} color={cor} /> <span className="flex-1 text-left truncate">{itemAtual?.label || "Menu"}</span>
            <span className="font-body text-[11px] font-semibold" style={{ color: "#8A9BAE" }}>Menu</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
