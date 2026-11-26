// =============================================================================
// AUDITORIA (Projeto Master · seção 20 — registro de atividades)
// Quem criou, alterou ou apagou o quê no Conecta Comércio, na Sala do
// Empreendedor e na Fomento Paraná. Os registros são gravados pelo próprio banco
// (supabase-auditoria-central.sql); aqui só se lê. Guarda os NOMES dos campos
// alterados, nunca os valores (LGPD).
// =============================================================================
import React, { useEffect, useMemo, useState } from "react";
import { ScrollText, Search, RefreshCw, FileSpreadsheet, PlusCircle, Pencil, Trash2 } from "lucide-react";
import { supabase, supabaseConfigurado } from "../supabaseClient";

const AZUL = "var(--cor-principal, #0A5AA8)";
const INK = "#0E2233", MUTED = "#5C7186", LINHA = "#DCE7F2";
const COR_SALA = "#F19F74", COR_FOMENTO = "#1E8E5A";

const TABELAS = {
  perfis: "Conta de usuário", empresas: "Comerciante", prestadores: "Prestador de serviço", feirantes: "Feirante",
  produtos: "Produto", promocoes: "Promoção", combos: "Combo", cupons: "Cupom", vagas: "Vaga", noticias: "Notícia",
  banners: "Banner", categorias: "Categoria", cursos: "Curso", eventos_calendario: "Evento", pontos_turisticos: "Ponto turístico",
  utilidade_publica: "Utilidade pública", classificados: "Classificado", mural_comunidade: "Recado do mural", depoimentos: "Depoimento",
  ouvidoria_denuncias: "Ouvidoria", faq: "Pergunta do FAQ", enquetes: "Enquete", site_config: "Configuração do site",
  servicos_empreendedor: "Serviço do empreendedor", licitacoes: "Edital/licitação",
  sala_config: "Configuração da Sala", sala_equipe: "Equipe da Sala", sala_pedidos: "Pedido de atendimento", sala_atendimentos: "Atendimento",
  sala_orientacoes: "Orientação", sala_documentos: "Documento", sala_selo_itens: "Critério do Selo", sala_calendario: "Calendário da Sala",
  fomento_modulo_config: "Configuração da Fomento", fomento_agentes: "Agente da Fomento", fomento_linhas: "Linha de crédito",
  fomento_materiais: "Material", fomento_propostas: "Proposta de crédito", fomento_interesses: "Interessado em crédito", fomento_agenda: "Agenda da Fomento",
};
const setorDe = (t) => (t.startsWith("sala_") ? "sala" : t.startsWith("fomento_") ? "fomento" : "conecta");
const SETORES = { conecta: ["Conecta Comércio", AZUL], sala: ["Sala do Empreendedor", COR_SALA], fomento: ["Fomento Paraná", COR_FOMENTO] };
const ACOES = { INSERT: ["criou", PlusCircle, "#1E8E5A"], UPDATE: ["alterou", Pencil, "#0A5AA8"], DELETE: ["apagou", Trash2, "#B4462F"] };
const campoLegivel = (c) => c.replace(/_url(s)?$/, "").replace(/_/g, " ");

const DEMO = [
  { id: 3, quando: new Date().toISOString(), autor_nome: "Gabriel Oliveira", tabela: "sala_selo_itens", acao: "UPDATE", registro_nome: "Cliente oculto", campos: ["status", "anexos"] },
  { id: 2, quando: new Date(Date.now() - 3600e3).toISOString(), autor_nome: "Loja Exemplo", tabela: "empresas", acao: "UPDATE", registro_nome: "Padaria Pão Nosso", campos: ["whatsapp", "horario_atendimento"] },
  { id: 1, quando: new Date(Date.now() - 86400e3).toISOString(), autor_nome: "Agente Fomento", tabela: "fomento_propostas", acao: "INSERT", registro_nome: "Maria Silva", campos: null },
];

export default function Auditoria() {
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState("");
  const [dias, setDias] = useState(30);
  const [setor, setSetor] = useState("");
  const [acao, setAcao] = useState("");
  const [busca, setBusca] = useState("");

  const carregar = async () => {
    setErro("");
    if (!supabaseConfigurado) { setLista(DEMO); return; }
    setLista(null);
    const { data, error } = await supabase.rpc("central_atividades_lista", { p_dias: dias, p_limite: 2000 });
    if (error) {
      setLista([]);
      setErro(/central_atividades|does not exist|schema cache/i.test(error.message)
        ? "Falta preparar o banco: rode o arquivo supabase-auditoria-central.sql no Supabase (SQL Editor). Os registros começam a partir daí."
        : error.message);
      return;
    }
    setLista(data || []);
  };
  useEffect(() => { carregar(); }, [dias]);

  const filtrada = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return (lista || []).filter((a) =>
      (!setor || setorDe(a.tabela) === setor) && (!acao || a.acao === acao) &&
      (!t || `${a.autor_nome} ${a.registro_nome} ${TABELAS[a.tabela] || a.tabela}`.toLowerCase().includes(t)));
  }, [lista, setor, acao, busca]);

  const porDia = useMemo(() => {
    const g = new Map();
    filtrada.forEach((a) => { const d = new Date(a.quando).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }); if (!g.has(d)) g.set(d, []); g.get(d).push(a); });
    return [...g.entries()];
  }, [filtrada]);

  const exportar = async () => {
    const XLSX = await import("xlsx");
    const linhas = filtrada.map((a) => [new Date(a.quando).toLocaleString("pt-BR"), a.autor_nome, ACOES[a.acao]?.[0] || a.acao, SETORES[setorDe(a.tabela)][0], TABELAS[a.tabela] || a.tabela, a.registro_nome || "", (a.campos || []).map(campoLegivel).join(", ")]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Quando", "Quem", "Ação", "Ambiente", "O quê", "Registro", "Campos alterados"], ...linhas]), "Auditoria");
    XLSX.writeFile(wb, `auditoria-${new Date().toLocaleDateString("sv-SE")}.xlsx`);
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <p className="font-body text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: AZUL }}>Administração geral</p>
          <h2 className="font-display font-extrabold text-2xl mt-0.5 flex items-center gap-2" style={{ color: INK }}><ScrollText size={22} /> Auditoria</h2>
          <p className="font-body text-sm mt-1 max-w-2xl" style={{ color: MUTED }}>
            Quem criou, alterou ou apagou registros no Conecta, na Sala e na Fomento. Para proteger os dados pessoais, aparecem só os nomes dos campos alterados, não os valores.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportar} disabled={!filtrada.length} className="inline-flex items-center gap-1.5 font-body text-xs font-bold rounded-lg border px-3 py-2 disabled:opacity-50" style={{ borderColor: LINHA, color: INK }}><FileSpreadsheet size={14} /> Excel</button>
          <button onClick={carregar} className="inline-flex items-center gap-1.5 font-body text-xs font-bold rounded-lg border px-3 py-2" style={{ borderColor: LINHA, color: INK }}><RefreshCw size={14} /> Atualizar</button>
        </div>
      </div>

      {!supabaseConfigurado && <p className="font-body text-sm rounded-xl px-4 py-3 mb-4" style={{ background: "#FFF6E5", color: "#7A5200" }}>Modo demonstração: registros de exemplo.</p>}
      {erro && <p className="font-body text-sm rounded-xl px-4 py-3 mb-4" style={{ background: "#FBEAE5", color: "#8A2E1C" }}>{erro}</p>}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color={MUTED} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por pessoa ou registro" className="font-body text-sm border rounded-xl pl-9 pr-3 py-2.5 w-full outline-none bg-white" style={{ borderColor: LINHA }} />
        </div>
        <select value={dias} onChange={(e) => setDias(Number(e.target.value))} className="font-body text-sm border rounded-xl px-3 py-2.5 bg-white outline-none" style={{ borderColor: LINHA }}>
          {[[7, "Últimos 7 dias"], [30, "Últimos 30 dias"], [90, "Últimos 90 dias"], [365, "Último ano"]].map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
        <select value={setor} onChange={(e) => setSetor(e.target.value)} className="font-body text-sm border rounded-xl px-3 py-2.5 bg-white outline-none" style={{ borderColor: LINHA }}>
          <option value="">Todos os ambientes</option>
          {Object.entries(SETORES).map(([k, [r]]) => <option key={k} value={k}>{r}</option>)}
        </select>
        <select value={acao} onChange={(e) => setAcao(e.target.value)} className="font-body text-sm border rounded-xl px-3 py-2.5 bg-white outline-none" style={{ borderColor: LINHA }}>
          <option value="">Todas as ações</option>
          <option value="INSERT">Criou</option><option value="UPDATE">Alterou</option><option value="DELETE">Apagou</option>
        </select>
      </div>

      {lista === null && <p className="font-body text-sm text-center py-10" style={{ color: MUTED }}>Carregando registros...</p>}
      {lista && !filtrada.length && !erro && <p className="font-body text-sm text-center py-10 rounded-2xl border bg-white" style={{ color: MUTED, borderColor: LINHA }}>Nenhuma atividade registrada nesse período.</p>}

      {porDia.map(([dia, itens]) => (
        <section key={dia} className="mb-5">
          <p className="font-body text-[11px] font-extrabold uppercase tracking-[0.12em] mb-2" style={{ color: MUTED }}>{dia} · {itens.length}</p>
          <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: LINHA }}>
            {itens.map((a) => {
              const [verbo, Icone, cor] = ACOES[a.acao] || [a.acao, Pencil, MUTED];
              const [nomeSetor, corSetor] = SETORES[setorDe(a.tabela)];
              return (
                <div key={a.id} className="flex items-start gap-3 px-4 py-2.5 border-b last:border-b-0" style={{ borderColor: LINHA }}>
                  <Icone size={16} color={cor} className="mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0 font-body text-sm" style={{ color: INK }}>
                    <p><b>{a.autor_nome}</b> {verbo} {(TABELAS[a.tabela] || a.tabela).toLowerCase()} {a.registro_nome && <b>“{a.registro_nome}”</b>}</p>
                    {a.campos?.length > 0 && <p className="text-xs" style={{ color: MUTED }}>Campos: {a.campos.map(campoLegivel).join(", ")}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-body text-xs font-semibold" style={{ color: INK }}>{new Date(a.quando).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                    <p className="font-body text-[10px] font-bold" style={{ color: corSetor === COR_SALA ? "#A85A2E" : corSetor }}>{nomeSetor}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {lista && lista.length >= 2000 && <p className="font-body text-xs" style={{ color: MUTED }}>Mostrando as 2.000 atividades mais recentes do período.</p>}
    </div>
  );
}
