// =============================================================================
// MENU LATERAL dos painéis (Projeto Master · seção 5)
// Fixo à esquerda no computador (recolhível para só ícones) e em gaveta no
// celular. As cores vêm do ambiente (Conecta, Sala ou Fomento) por props.
// =============================================================================
import React, { useEffect, useState } from "react";
import { ChevronsLeft, ChevronsRight, Menu, X } from "lucide-react";

const ler = (k, padrao) => { try { const v = localStorage.getItem(k); return v === null ? padrao : v === "1"; } catch { return padrao; } };

export function MenuLateral({ grupos, atual, onSelecionar, cores, chave = "menu", rotuloAtual }) {
  const [recolhido, setRecolhido] = useState(() => ler(`${chave}-recolhido`, false));
  const [aberto, setAberto] = useState(false);
  useEffect(() => { try { localStorage.setItem(`${chave}-recolhido`, recolhido ? "1" : "0"); } catch { /* */ } }, [recolhido, chave]);
  useEffect(() => {
    if (!aberto) return;
    const esc = (e) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto]);

  const escolher = (id) => { onSelecionar(id); setAberto(false); };

  const lista = (compacto) => (
    <nav aria-label="Menu do painel" className="flex flex-col gap-0.5">
      {grupos.filter((g) => g.itens.length).map((g) => (
        <div key={g.titulo} className="mb-2">
          {!compacto && <p className="font-body text-[10px] font-bold uppercase tracking-[0.12em] px-3 pt-2 pb-1" style={{ color: cores.textoSuave }}>{g.titulo}</p>}
          {g.itens.map((i) => {
            const ativo = i.id === atual;
            const Icone = i.icon;
            return (
              <button key={i.id} type="button" onClick={() => escolher(i.id)} title={compacto ? i.label : undefined} aria-current={ativo ? "page" : undefined}
                className={`w-full flex items-center gap-2.5 rounded-xl text-sm font-body font-semibold text-left transition-colors ${compacto ? "justify-center px-0 py-2.5" : "px-3 py-2"}`}
                style={ativo ? { background: cores.ativoFundo, color: cores.ativoTexto } : { color: cores.texto }}>
                <Icone size={17} className="shrink-0" />
                {!compacto && <span className="truncate">{i.label}</span>}
                {!compacto && i.badge > 0 && <span className="ml-auto text-[10px] font-extrabold px-1.5 rounded-full" style={{ background: cores.badgeFundo, color: cores.badgeTexto }}>{i.badge}</span>}
                {compacto && i.badge > 0 && <span className="sr-only">({i.badge})</span>}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Celular: botão que abre a gaveta */}
      <button type="button" onClick={() => setAberto(true)} className="md:hidden w-full flex items-center gap-2 rounded-xl border px-3 py-2.5 font-body text-sm font-bold"
        style={{ borderColor: cores.borda, background: "#fff", color: cores.marca }}>
        <Menu size={17} /> <span className="truncate">{rotuloAtual || "Menu"}</span>
      </button>
      {aberto && (
        <div className="md:hidden fixed inset-0 z-[80]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAberto(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] p-3 overflow-y-auto shadow-xl" style={{ background: cores.fundo }}>
            <div className="flex justify-end"><button type="button" onClick={() => setAberto(false)} aria-label="Fechar menu" className="p-2 rounded-lg" style={{ color: cores.texto }}><X size={18} /></button></div>
            {lista(false)}
          </div>
        </div>
      )}
      {/* Computador: menu fixo */}
      <aside className={`hidden md:block shrink-0 self-start sticky top-4 rounded-2xl p-2 max-h-[calc(100vh-2rem)] overflow-y-auto transition-[width] ${recolhido ? "w-[68px]" : "w-60"}`}
        style={{ background: cores.fundo, border: `1px solid ${cores.borda}` }}>
        <div className={`flex ${recolhido ? "justify-center" : "justify-end"} mb-1`}>
          <button type="button" onClick={() => setRecolhido((r) => !r)} aria-label={recolhido ? "Expandir menu" : "Recolher menu"} title={recolhido ? "Expandir menu" : "Recolher menu"}
            className="p-1.5 rounded-lg" style={{ color: cores.textoSuave }}>
            {recolhido ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </button>
        </div>
        {lista(recolhido)}
      </aside>
    </>
  );
}
