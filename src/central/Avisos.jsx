// =============================================================================
// CENTRAL DE AVISOS (Projeto Master · seção 19)
// Junta, num lugar só, o que está esperando o administrador nos três ambientes:
// cadastros para aprovar, pedidos novos, promoções vencendo, ouvidoria etc.
// Tudo é contado direto nas tabelas que já existem (nada fictício) e cada aviso
// leva para a tela onde se resolve. Quem não tem permissão para uma tabela
// simplesmente não recebe aquele aviso (regras do banco).
// Preparado para, no futuro, mandar por e-mail/WhatsApp por meios oficiais.
// =============================================================================
import React, { useCallback, useEffect, useState } from "react";
import {
  Bell, Store, Wrench, PartyPopper, Repeat, Users, Quote, MessageCircle, Tag, Briefcase,
  Inbox, CalendarDays, Landmark, RefreshCw, ArrowRight, CheckCircle2,
} from "lucide-react";
import { supabase, supabaseConfigurado } from "../supabaseClient";

const AZUL = "var(--cor-principal, #0A5AA8)";
const INK = "#0E2233", MUTED = "#5C7186", LINHA = "#DCE7F2";
const COR_SALA = "#F19F74", COR_FOMENTO = "#1E8E5A";

const hojeISO = () => new Date().toLocaleDateString("sv-SE");
const emDias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv-SE"); };

// Cada regra: tabela + filtro → quantos itens; texto; onde resolver.
const REGRAS = [
  { id: "empresas", setor: "Comércio", icon: Store, cor: AZUL, tabela: "empresas", filtro: (q) => q.eq("status", "pendente"), texto: (n) => `${n} comerciante${n > 1 ? "s" : ""} aguardando aprovação`, aba: "empresas" },
  { id: "prestadores", setor: "Comércio", icon: Wrench, cor: AZUL, tabela: "prestadores", filtro: (q) => q.eq("status", "pendente"), texto: (n) => `${n} prestador${n > 1 ? "es" : ""} de serviço aguardando aprovação`, aba: "prestadores" },
  { id: "feirantes", setor: "Comércio", icon: PartyPopper, cor: AZUL, tabela: "feirantes", filtro: (q) => q.eq("status", "pendente"), texto: (n) => `${n} feirante${n > 1 ? "s" : ""} aguardando aprovação`, aba: "feira" },
  { id: "promocoes", setor: "Comércio", icon: Tag, cor: AZUL, tabela: "promocoes", filtro: (q) => q.gte("valida_ate", hojeISO()).lte("valida_ate", emDias(7)), texto: (n) => `${n} promoç${n > 1 ? "ões vencem" : "ão vence"} nos próximos 7 dias`, aba: "promocoes", tipo: "info" },
  { id: "vagas", setor: "Comércio", icon: Briefcase, cor: AZUL, tabela: "vagas", filtro: (q) => q.eq("status", "aberta").lt("criado_em", emDias(-30)), texto: (n) => `${n} vaga${n > 1 ? "s abertas" : " aberta"} há mais de 30 dias: confira se ainda vale${n > 1 ? "m" : ""}`, aba: "vagas", tipo: "info" },
  { id: "classificados", setor: "Comunidade", icon: Repeat, cor: AZUL, tabela: "classificados", filtro: (q) => q.eq("status", "pendente"), texto: (n) => `${n} classificado${n > 1 ? "s" : ""} para moderar`, aba: "classificados" },
  { id: "mural", setor: "Comunidade", icon: Users, cor: AZUL, tabela: "mural_comunidade", filtro: (q) => q.eq("status", "pendente"), texto: (n) => `${n} recado${n > 1 ? "s" : ""} do mural para moderar`, aba: "mural" },
  { id: "depoimentos", setor: "Comunidade", icon: Quote, cor: AZUL, tabela: "depoimentos", filtro: (q) => q.eq("status", "pendente"), texto: (n) => `${n} depoimento${n > 1 ? "s" : ""} para aprovar`, aba: "depoimentos" },
  { id: "ouvidoria", setor: "Comunidade", icon: MessageCircle, cor: AZUL, tabela: "ouvidoria_denuncias", filtro: (q) => q.eq("status", "recebido"), texto: (n) => `${n} manifestaç${n > 1 ? "ões" : "ão"} da ouvidoria sem resposta`, aba: "ouvidoria" },
  { id: "sala-pedidos", setor: "Sala do Empreendedor", icon: Inbox, cor: COR_SALA, tabela: "sala_pedidos", filtro: (q) => q.eq("status", "novo"), texto: (n) => `${n} pedido${n > 1 ? "s" : ""} de atendimento novo${n > 1 ? "s" : ""} pelo site`, link: "#/sala-agente" },
  { id: "sala-hoje", setor: "Sala do Empreendedor", icon: CalendarDays, cor: COR_SALA, tabela: "sala_pedidos", filtro: (q) => q.eq("status", "agendado").eq("data_agendada", hojeISO()), texto: (n) => `${n} atendimento${n > 1 ? "s" : ""} agendado${n > 1 ? "s" : ""} para hoje`, link: "#/sala-agente", tipo: "info" },
  { id: "fomento-interesses", setor: "Fomento Paraná", icon: Landmark, cor: COR_FOMENTO, tabela: "fomento_interesses", filtro: (q) => q.eq("status", "novo"), texto: (n) => `${n} interessado${n > 1 ? "s" : ""} em crédito ainda sem contato`, link: "#/fomento-admin" },
];

async function contar(regra) {
  const { count, error } = await regra.filtro(supabase.from(regra.tabela).select("id", { count: "exact", head: true }));
  return error ? null : count || 0;
}

// Usado pelo Painel Admin para mostrar o número no menu e a lista na aba.
export function useAvisosCentral() {
  const [avisos, setAvisos] = useState(null);
  const carregar = useCallback(async () => {
    if (!supabaseConfigurado) { setAvisos([]); return; }
    const contagens = await Promise.all(REGRAS.map(contar));
    setAvisos(REGRAS.map((r, i) => ({ ...r, n: contagens[i] })).filter((r) => r.n > 0));
  }, []);
  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 120000); // atualiza a cada 2 minutos
    return () => clearInterval(t);
  }, [carregar]);
  const pendencias = (avisos || []).filter((a) => a.tipo !== "info").reduce((s, a) => s + a.n, 0);
  return { avisos, pendencias, recarregar: carregar };
}

export default function CentralAvisos({ avisos, recarregar, irPara }) {
  const setores = [...new Set((avisos || []).map((a) => a.setor))];
  const abrir = (a) => { if (a.link) window.location.hash = a.link; else irPara?.(a.aba); };

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <p className="font-body text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: AZUL }}>Início</p>
          <h2 className="font-display font-extrabold text-2xl mt-0.5 flex items-center gap-2" style={{ color: INK }}><Bell size={22} /> Central de avisos</h2>
          <p className="font-body text-sm mt-1 max-w-2xl" style={{ color: MUTED }}>
            O que está esperando você no Conecta, na Sala e na Fomento. Clique num aviso para ir direto à tela onde se resolve. Atualiza sozinho a cada 2 minutos.
          </p>
        </div>
        <button onClick={recarregar} className="inline-flex items-center gap-1.5 font-body text-xs font-bold rounded-lg border px-3 py-2" style={{ borderColor: LINHA, color: INK }}><RefreshCw size={14} /> Atualizar</button>
      </div>

      {!supabaseConfigurado && <p className="font-body text-sm rounded-xl px-4 py-3 mb-4" style={{ background: "#FFF6E5", color: "#7A5200" }}>Modo demonstração: conecte o Supabase para ver os avisos reais.</p>}
      {avisos === null && <p className="font-body text-sm text-center py-10" style={{ color: MUTED }}>Verificando...</p>}
      {avisos && avisos.length === 0 && supabaseConfigurado && (
        <div className="rounded-2xl border bg-white p-8 text-center" style={{ borderColor: LINHA }}>
          <CheckCircle2 size={28} color={COR_FOMENTO} className="mx-auto" />
          <p className="font-display font-bold mt-2" style={{ color: INK }}>Tudo em dia!</p>
          <p className="font-body text-sm mt-1" style={{ color: MUTED }}>Nenhuma pendência nos três ambientes agora.</p>
        </div>
      )}

      {setores.map((setor) => (
        <section key={setor} className="mb-5">
          <p className="font-body text-[11px] font-extrabold uppercase tracking-[0.14em] mb-2" style={{ color: MUTED }}>{setor}</p>
          <div className="flex flex-col gap-2">
            {avisos.filter((a) => a.setor === setor).map((a) => {
              const I = a.icon;
              return (
                <button key={a.id} onClick={() => abrir(a)} className="w-full flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left hover:shadow-sm transition-shadow" style={{ borderColor: LINHA }}>
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in srgb, ${a.cor} 10%, white)`, color: a.cor }}><I size={17} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-body text-sm font-bold" style={{ color: INK }}>{a.texto(a.n)}</span>
                    {a.tipo === "info" && <span className="block font-body text-[11px]" style={{ color: MUTED }}>Lembrete</span>}
                  </span>
                  <span className="font-body text-xs font-bold inline-flex items-center gap-1 flex-shrink-0" style={{ color: a.cor }}>{a.link ? "Abrir" : "Resolver"} <ArrowRight size={13} /></span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
