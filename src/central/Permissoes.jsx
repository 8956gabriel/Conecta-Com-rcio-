// =============================================================================
// USUÁRIOS E PERMISSÕES (Projeto Master · seção 16 / Fase 9)
// Uma tela só para o administrador geral ver e ajustar o acesso de cada conta
// nos três ambientes: Conecta Comércio, Sala do Empreendedor e Fomento Paraná.
// Quem confere a permissão é o banco (funções em supabase-permissoes-central.sql);
// esta tela só mostra e chama essas funções. Tirar o acesso não apaga nada.
// =============================================================================
import React, { useEffect, useMemo, useState } from "react";
import { Search, ShieldCheck, Store, Briefcase, Landmark, History, RefreshCw, ExternalLink } from "lucide-react";
import { supabase, supabaseConfigurado } from "../supabaseClient";

const AZUL = "var(--cor-principal, #0A5AA8)";
const INK = "#0E2233", MUTED = "#5C7186", LINHA = "#DCE7F2";
const COR_SALA = "#F19F74", COR_FOMENTO = "#1E8E5A";

const PAPEIS = {
  conecta: { cliente: "Cliente", empresario: "Comerciante", prestador: "Prestador", editor: "Editor (conteúdo)", visualizador: "Visualizador (só vê)", admin: "Administrador geral" },
  sala: { nenhum: "Sem acesso", atendente: "Atendente", gestor: "Administrador da Sala" },
  fomento: { nenhum: "Sem acesso", agente: "Agente de crédito", gestor: "Administrador da Fomento" },
};
const SETORES = { conecta: "Conecta Comércio", sala: "Sala do Empreendedor", fomento: "Fomento Paraná" };
const FILTROS = [
  ["todos", "Todos"],
  ["admin", "Administradores"],
  ["equipe-conteudo", "Editores e visualizadores"],
  ["equipe-sala", "Equipe da Sala"],
  ["equipe-fomento", "Equipe da Fomento"],
  ["comerciantes", "Comerciantes"],
];

const DEMO = [
  { user_id: "d1", nome: "Gabriel Oliveira", email: "gabriel@exemplo.com", tipo: "admin", sala_papel: "gestor", sala_ativo: true, fomento_papel: "gestor", fomento_ativo: true, ultimo_login: new Date().toISOString() },
  { user_id: "d2", nome: "Atendente da Sala", email: "sala@exemplo.com", tipo: "cliente", sala_papel: "atendente", sala_ativo: true, fomento_papel: null, fomento_ativo: null, ultimo_login: null },
  { user_id: "d3", nome: "Loja Exemplo", email: "loja@exemplo.com", tipo: "empresario", sala_papel: null, sala_ativo: null, fomento_papel: "agente", fomento_ativo: false, ultimo_login: null },
];

const papelSala = (u) => (u.sala_ativo ? u.sala_papel : "nenhum");
const papelFomento = (u) => (u.fomento_ativo ? u.fomento_papel : "nenhum");
const dataHora = (d) => (d ? new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");

function Seletor({ valor, opcoes, cor, onMudar, desabilitado }) {
  const ativo = valor && valor !== "nenhum" && valor !== "cliente";
  return (
    <select value={valor} disabled={desabilitado} onChange={(e) => onMudar(e.target.value)}
      className="font-body text-xs font-bold rounded-lg border px-2 py-1.5 w-full outline-none disabled:opacity-60"
      style={{ borderColor: ativo ? cor : LINHA, color: ativo ? cor : MUTED, background: ativo ? `color-mix(in srgb, ${cor} 7%, white)` : "#fff" }}>
      {Object.entries(opcoes).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
    </select>
  );
}

export default function Permissoes({ notificar }) {
  const [meuId, setMeuId] = useState(null);
  useEffect(() => { if (supabaseConfigurado) supabase.auth.getUser().then(({ data }) => setMeuId(data?.user?.id || null)); else setMeuId("d1"); }, []);
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState("");
  const [historico, setHistorico] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [salvando, setSalvando] = useState(null);
  const avisar = (m, t = "sucesso") => (notificar ? notificar(m, t) : console.log(m));

  const carregar = async () => {
    setErro("");
    if (!supabaseConfigurado) { setLista(DEMO); return; }
    const { data, error } = await supabase.rpc("central_acessos");
    if (error) {
      setLista([]);
      setErro(/central_acessos|does not exist|schema cache/i.test(error.message)
        ? "Falta preparar o banco: rode o arquivo supabase-permissoes-central.sql no Supabase (SQL Editor)."
        : error.message);
      return;
    }
    setLista(data || []);
    const h = await supabase.from("central_auditoria").select("*").order("quando", { ascending: false }).limit(40);
    setHistorico(h.error ? [] : h.data || []);
  };
  useEffect(() => { carregar(); }, []);

  const nomePorId = useMemo(() => Object.fromEntries((lista || []).map((u) => [u.user_id, u.nome])), [lista]);

  const mudar = async (u, setor, papel) => {
    if (setor === "conecta" && papel === "admin" && !window.confirm(`Tornar ${u.nome} administrador geral? Ele passa a ver e mudar tudo na plataforma.`)) return;
    if (setor === "conecta" && u.tipo === "admin" && papel !== "admin" && u.user_id === meuId) { avisar("Você não pode tirar o seu próprio acesso de administrador.", "erro"); return; }
    const aplicar = (x) => {
      if (setor === "conecta") return { ...x, tipo: papel };
      if (setor === "sala") return papel === "nenhum" ? { ...x, sala_ativo: x.sala_papel ? false : null } : { ...x, sala_papel: papel, sala_ativo: true };
      return papel === "nenhum" ? { ...x, fomento_ativo: x.fomento_papel ? false : null } : { ...x, fomento_papel: papel, fomento_ativo: true };
    };
    if (!supabaseConfigurado) { setLista((l) => l.map((x) => (x.user_id === u.user_id ? aplicar(x) : x))); avisar("Modo demonstração: nada foi salvo."); return; }
    setSalvando(`${u.user_id}-${setor}`);
    const { error } = await supabase.rpc("central_definir_acesso", { p_user: u.user_id, p_setor: setor, p_papel: papel });
    setSalvando(null);
    if (error) { avisar("Não consegui mudar: " + error.message, "erro"); return; }
    setLista((l) => l.map((x) => (x.user_id === u.user_id ? aplicar(x) : x)));
    avisar(`${u.nome}: ${SETORES[setor]} → ${PAPEIS[setor][papel]}.`);
    const h = await supabase.from("central_auditoria").select("*").order("quando", { ascending: false }).limit(40);
    if (!h.error) setHistorico(h.data || []);
  };

  const filtrada = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return (lista || []).filter((u) => {
      if (t && !`${u.nome} ${u.email}`.toLowerCase().includes(t)) return false;
      if (filtro === "admin") return u.tipo === "admin" || papelSala(u) === "gestor" || papelFomento(u) === "gestor";
      if (filtro === "equipe-sala") return papelSala(u) !== "nenhum";
      if (filtro === "equipe-fomento") return papelFomento(u) !== "nenhum";
      if (filtro === "comerciantes") return u.tipo === "empresario" || u.tipo === "prestador";
      if (filtro === "equipe-conteudo") return u.tipo === "editor" || u.tipo === "visualizador";
      return true;
    });
  }, [lista, busca, filtro]);

  const tot = useMemo(() => {
    const l = lista || [];
    return {
      contas: l.length,
      admins: l.filter((u) => u.tipo === "admin").length,
      sala: l.filter((u) => papelSala(u) !== "nenhum").length,
      fomento: l.filter((u) => papelFomento(u) !== "nenhum").length,
    };
  }, [lista]);

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <p className="font-body text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: AZUL }}>Administração geral</p>
          <h2 className="font-display font-extrabold text-2xl mt-0.5" style={{ color: INK }}>Usuários e permissões</h2>
          <p className="font-body text-sm mt-1 max-w-2xl" style={{ color: MUTED }}>
            O acesso de cada conta nos três ambientes, numa tela só. Tirar o acesso da Sala ou da Fomento não apaga o histórico: a pessoa só deixa de entrar.
          </p>
        </div>
        <button onClick={carregar} className="inline-flex items-center gap-1.5 font-body text-xs font-bold rounded-lg border px-3 py-2" style={{ borderColor: LINHA, color: INK }}><RefreshCw size={14} /> Atualizar</button>
      </div>

      {!supabaseConfigurado && <p className="font-body text-sm rounded-xl px-4 py-3 mb-4" style={{ background: "#FFF6E5", color: "#7A5200" }}>Modo demonstração: as mudanças não são salvas.</p>}
      {erro && <p className="font-body text-sm rounded-xl px-4 py-3 mb-4" style={{ background: "#FBEAE5", color: "#8A2E1C" }}>{erro}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[["Contas", tot.contas, Store, AZUL], ["Administradores gerais", tot.admins, ShieldCheck, AZUL], ["Equipe da Sala", tot.sala, Briefcase, COR_SALA], ["Equipe da Fomento", tot.fomento, Landmark, COR_FOMENTO]].map(([r, n, I, c]) => (
          <div key={r} className="rounded-2xl border bg-white p-4" style={{ borderColor: LINHA }}>
            <div className="flex items-center justify-between"><p className="font-body text-[11px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{r}</p><I size={16} color={c} /></div>
            <p className="font-display font-extrabold text-2xl mt-1" style={{ color: INK }}>{lista ? n : "…"}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color={MUTED} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou e-mail"
            className="font-body text-sm border rounded-xl pl-9 pr-3 py-2.5 w-full outline-none bg-white" style={{ borderColor: LINHA }} />
        </div>
        {FILTROS.map(([k, r]) => (
          <button key={k} onClick={() => setFiltro(k)} className="font-body text-xs font-bold rounded-full px-3 py-1.5 border"
            style={filtro === k ? { background: AZUL, color: "#fff", borderColor: "transparent" } : { borderColor: LINHA, color: MUTED, background: "#fff" }}>{r}</button>
        ))}
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: LINHA }}>
        <div className="hidden md:grid grid-cols-[1.6fr_1fr_1fr_1fr] gap-3 px-4 py-2.5 border-b font-body text-[11px] font-extrabold uppercase tracking-wide" style={{ borderColor: LINHA, color: MUTED, background: "#F7FAFD" }}>
          <span>Conta</span><span>Conecta Comércio</span><span style={{ color: COR_SALA }}>Sala do Empreendedor</span><span style={{ color: COR_FOMENTO }}>Fomento Paraná</span>
        </div>
        {lista === null && <p className="font-body text-sm text-center py-10" style={{ color: MUTED }}>Carregando contas...</p>}
        {lista && filtrada.length === 0 && <p className="font-body text-sm text-center py-10" style={{ color: MUTED }}>Nenhuma conta encontrada.</p>}
        {filtrada.slice(0, 300).map((u) => (
          <div key={u.user_id} className="grid md:grid-cols-[1.6fr_1fr_1fr_1fr] gap-2 md:gap-3 px-4 py-3 border-b last:border-b-0 items-center" style={{ borderColor: LINHA }}>
            <div className="min-w-0">
              <p className="font-body text-sm font-bold truncate" style={{ color: INK }}>{u.nome}{u.user_id === meuId && <span className="ml-1.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full" style={{ background: "#EAF2FB", color: AZUL }}>você</span>}</p>
              <p className="font-body text-xs truncate" style={{ color: MUTED }}>{u.email} · último acesso {dataHora(u.ultimo_login)}</p>
            </div>
            <label className="block"><span className="md:hidden font-body text-[10px] font-bold uppercase" style={{ color: MUTED }}>Conecta Comércio</span>
              <Seletor valor={u.tipo} opcoes={PAPEIS.conecta} cor={AZUL} desabilitado={salvando === `${u.user_id}-conecta`} onMudar={(p) => mudar(u, "conecta", p)} /></label>
            <label className="block"><span className="md:hidden font-body text-[10px] font-bold uppercase" style={{ color: COR_SALA }}>Sala do Empreendedor</span>
              <Seletor valor={papelSala(u)} opcoes={PAPEIS.sala} cor={COR_SALA} desabilitado={salvando === `${u.user_id}-sala`} onMudar={(p) => mudar(u, "sala", p)} /></label>
            <label className="block"><span className="md:hidden font-body text-[10px] font-bold uppercase" style={{ color: COR_FOMENTO }}>Fomento Paraná</span>
              <Seletor valor={papelFomento(u)} opcoes={PAPEIS.fomento} cor={COR_FOMENTO} desabilitado={salvando === `${u.user_id}-fomento`} onMudar={(p) => mudar(u, "fomento", p)} /></label>
          </div>
        ))}
        {filtrada.length > 300 && <p className="font-body text-xs text-center py-3" style={{ color: MUTED }}>Mostrando 300 de {filtrada.length}. Use a busca para achar uma conta.</p>}
      </div>

      <p className="font-body text-xs mt-3 flex flex-wrap gap-x-4 gap-y-1" style={{ color: MUTED }}>
        <span><b>Administrador geral</b>: vê e muda tudo, inclusive a Sala e a Fomento.</span>
        <span><b>Editor</b>: notícias, banners, vagas, eventos, cursos, turismo, enquetes, FAQ e moderação da comunidade.</span>
        <span><b>Visualizador</b>: só vê os números do painel, sem alterar nada.</span>
        <span><b>Administrador da Sala/Fomento</b>: equipe e configurações do próprio setor.</span>
        <span><b>Atendente / Agente</b>: trabalha no seu ambiente.</span>
      </p>
      <p className="font-body text-xs mt-2 flex flex-wrap gap-3">
        <a href="#/sala-agente" className="inline-flex items-center gap-1 font-bold" style={{ color: COR_SALA }}><ExternalLink size={12} /> Abrir Sala do Empreendedor</a>
        <a href="#/fomento-admin" className="inline-flex items-center gap-1 font-bold" style={{ color: COR_FOMENTO }}><ExternalLink size={12} /> Abrir Fomento Paraná</a>
      </p>

      {supabaseConfigurado && !erro && (
        <div className="rounded-2xl border bg-white p-4 mt-6" style={{ borderColor: LINHA }}>
          <p className="font-display font-bold text-sm flex items-center gap-1.5" style={{ color: INK }}><History size={15} /> Histórico de alterações</p>
          {historico.length === 0 && <p className="font-body text-xs mt-2" style={{ color: MUTED }}>Nenhuma alteração feita por aqui ainda.</p>}
          <ul className="mt-2 divide-y" style={{ borderColor: LINHA }}>
            {historico.map((h) => (
              <li key={h.id} className="font-body text-xs py-2 flex flex-wrap gap-x-2" style={{ color: MUTED }}>
                <span className="font-semibold" style={{ color: INK }}>{dataHora(h.quando)}</span>
                <span>{nomePorId[h.autor] || "Admin"} mudou <b style={{ color: INK }}>{nomePorId[h.alvo] || "conta"}</b> em {SETORES[h.setor] || h.setor}: {PAPEIS[h.setor]?.[h.de] || h.de} → {PAPEIS[h.setor]?.[h.para] || h.para}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
