// =============================================================================
// CADASTRO ÚNICO DE EMPREENDEDORES (Projeto Master · seção 14)
// Mostra cada empreendedor UMA vez, juntando o que existe dele na Sala do
// Empreendedor, na Fomento Paraná e no Conecta Comércio (pelo CPF/CNPJ ou, sem
// documento, pelo WhatsApp). Não copia nem apaga nada: os históricos continuam
// em cada setor; aqui aparece só onde a pessoa está e quantos registros tem.
// A consulta é feita no banco (supabase-cadastro-unico.sql), só para admin geral.
// =============================================================================
import React, { useEffect, useMemo, useState } from "react";
import { Search, Fingerprint, Users, Layers, Phone, AlertTriangle, MessageCircle, RefreshCw } from "lucide-react";
import { supabase, supabaseConfigurado } from "../supabaseClient";

const AZUL = "var(--cor-principal, #0A5AA8)";
const INK = "#0E2233", MUTED = "#5C7186", LINHA = "#DCE7F2";
const COR_SALA = "#F19F74", COR_FOMENTO = "#1E8E5A";

const DEMO = [
  { chave: "doc:12345678909", tipo: "CPF", nome: "Maria Silva", empresa: "Doces da Maria", documento: "12345678909", whatsapp: "44999991111", sala_atendimentos: 2, sala_pedidos: 1, fomento_propostas: 1, fomento_interesses: 0, fomento_clientes: 0, conecta_empresas: 1, setores: 3, primeiro: "2026-03-02", ultimo: "2026-11-20", variacoes_nome: 2 },
  { chave: "tel:44988882222", tipo: "Telefone", nome: "João Souza", empresa: null, documento: null, whatsapp: "44988882222", sala_atendimentos: 1, sala_pedidos: 0, fomento_propostas: 0, fomento_interesses: 1, fomento_clientes: 0, conecta_empresas: 0, setores: 2, primeiro: "2026-08-10", ultimo: "2026-10-01", variacoes_nome: 1 },
];

// CPF aparece mascarado (LGPD); CNPJ é dado de empresa e aparece inteiro
const mostrarDoc = (r) => {
  if (!r.documento) return "sem documento";
  const d = r.documento;
  if (d.length === 11) return `CPF ***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
  return `CNPJ ${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};
const telefone = (t) => (t ? (t.length === 11 ? `(${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}` : t.length === 10 ? `(${t.slice(0, 2)}) ${t.slice(2, 6)}-${t.slice(6)}` : t) : "");
const data = (d) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

function Selo({ cor, rotulo, itens }) {
  const total = itens.reduce((s, [, n]) => s + n, 0);
  if (!total) return null;
  return (
    <span className="inline-flex items-center gap-1 font-body text-[11px] font-bold rounded-full px-2 py-0.5" title={itens.filter(([, n]) => n).map(([r, n]) => `${n} ${r}`).join(" · ")}
      style={{ background: `color-mix(in srgb, ${cor} 12%, white)`, color: cor === COR_SALA ? "#A85A2E" : cor }}>
      {rotulo} · {total}
    </span>
  );
}

export default function CadastroUnico() {
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");

  const carregar = async (termo = "") => {
    setErro("");
    if (!supabaseConfigurado) { setLista(DEMO); return; }
    setLista(null);
    const { data: d, error } = await supabase.rpc("central_empreendedores", { p_busca: termo || null });
    if (error) {
      setLista([]);
      setErro(/central_empreendedores|does not exist|schema cache/i.test(error.message)
        ? "Falta preparar o banco: rode o arquivo supabase-cadastro-unico.sql no Supabase (SQL Editor)."
        : error.message);
      return;
    }
    setLista(d || []);
  };
  useEffect(() => { carregar(); }, []);
  useEffect(() => { // busca no banco depois que a pessoa para de digitar
    if (!supabaseConfigurado) return undefined;
    const t = setTimeout(() => carregar(busca.trim()), 450);
    return () => clearTimeout(t);
  }, [busca]);

  const filtrada = useMemo(() => {
    let l = lista || [];
    if (!supabaseConfigurado && busca.trim()) { const t = busca.toLowerCase(); l = l.filter((r) => `${r.nome} ${r.empresa}`.toLowerCase().includes(t)); }
    if (filtro === "varios") l = l.filter((r) => r.setores >= 2);
    if (filtro === "sala-fomento") l = l.filter((r) => (r.sala_atendimentos + r.sala_pedidos) > 0 && (r.fomento_propostas + r.fomento_interesses + r.fomento_clientes) > 0);
    if (filtro === "sem-doc") l = l.filter((r) => !r.documento);
    if (filtro === "nomes") l = l.filter((r) => r.variacoes_nome > 1);
    return l;
  }, [lista, filtro, busca]);

  const tot = useMemo(() => {
    const l = lista || [];
    return { pessoas: l.length, varios: l.filter((r) => r.setores >= 2).length, semDoc: l.filter((r) => !r.documento).length, nomes: l.filter((r) => r.variacoes_nome > 1).length };
  }, [lista]);

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <p className="font-body text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: AZUL }}>Integração</p>
          <h2 className="font-display font-extrabold text-2xl mt-0.5 flex items-center gap-2" style={{ color: INK }}><Fingerprint size={22} /> Cadastro único de empreendedores</h2>
          <p className="font-body text-sm mt-1 max-w-2xl" style={{ color: MUTED }}>
            Cada empreendedor aparece uma vez só, juntando a Sala, a Fomento e o Conecta pelo CPF/CNPJ (ou pelo WhatsApp, quando não há documento). Os históricos continuam reservados em cada setor: aqui você vê só onde a pessoa está.
          </p>
        </div>
        <button onClick={() => carregar(busca.trim())} className="inline-flex items-center gap-1.5 font-body text-xs font-bold rounded-lg border px-3 py-2" style={{ borderColor: LINHA, color: INK }}><RefreshCw size={14} /> Atualizar</button>
      </div>

      {!supabaseConfigurado && <p className="font-body text-sm rounded-xl px-4 py-3 mb-4" style={{ background: "#FFF6E5", color: "#7A5200" }}>Modo demonstração: dados de exemplo.</p>}
      {erro && <p className="font-body text-sm rounded-xl px-4 py-3 mb-4" style={{ background: "#FBEAE5", color: "#8A2E1C" }}>{erro}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[["Empreendedores", tot.pessoas, Users, AZUL], ["Em 2 ou mais setores", tot.varios, Layers, COR_FOMENTO], ["Sem CPF/CNPJ (só WhatsApp)", tot.semDoc, Phone, COR_SALA], ["Nomes diferentes no mesmo cadastro", tot.nomes, AlertTriangle, "#B4462F"]].map(([r, n, I, c]) => (
          <div key={r} className="rounded-2xl border bg-white p-4" style={{ borderColor: LINHA }}>
            <div className="flex items-center justify-between gap-2"><p className="font-body text-[11px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{r}</p><I size={16} color={c} /></div>
            <p className="font-display font-extrabold text-2xl mt-1" style={{ color: INK }}>{lista ? n : "…"}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color={MUTED} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, empresa, CPF/CNPJ ou WhatsApp"
            className="font-body text-sm border rounded-xl pl-9 pr-3 py-2.5 w-full outline-none bg-white" style={{ borderColor: LINHA }} />
        </div>
        {[["todos", "Todos"], ["varios", "Em 2+ setores"], ["sala-fomento", "Sala e Fomento"], ["sem-doc", "Sem documento"], ["nomes", "Conferir nomes"]].map(([k, r]) => (
          <button key={k} onClick={() => setFiltro(k)} className="font-body text-xs font-bold rounded-full px-3 py-1.5 border"
            style={filtro === k ? { background: AZUL, color: "#fff", borderColor: "transparent" } : { borderColor: LINHA, color: MUTED, background: "#fff" }}>{r}</button>
        ))}
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: LINHA }}>
        {lista === null && <p className="font-body text-sm text-center py-10" style={{ color: MUTED }}>Juntando os cadastros...</p>}
        {lista && filtrada.length === 0 && !erro && <p className="font-body text-sm text-center py-10" style={{ color: MUTED }}>Nenhum empreendedor encontrado.</p>}
        {filtrada.map((r) => (
          <div key={r.chave} className="px-4 py-3 border-b last:border-b-0 grid md:grid-cols-[1.5fr_1fr_1.3fr_auto] gap-2 md:gap-4 items-center" style={{ borderColor: LINHA }}>
            <div className="min-w-0">
              <p className="font-body text-sm font-bold truncate" style={{ color: INK }}>{r.nome || r.empresa || "Sem nome"}</p>
              <p className="font-body text-xs truncate" style={{ color: MUTED }}>{r.nome && r.empresa ? r.empresa : ""}</p>
              {r.variacoes_nome > 1 && <p className="font-body text-[11px] font-semibold flex items-center gap-1 mt-0.5" style={{ color: "#B4462F" }}><AlertTriangle size={11} /> {r.variacoes_nome} grafias de nome: confira se é a mesma pessoa</p>}
            </div>
            <div className="font-body text-xs" style={{ color: MUTED }}>
              <p className="font-semibold" style={{ color: INK }}>{mostrarDoc(r)}</p>
              <p>{telefone(r.whatsapp)}</p>
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              <Selo cor={COR_SALA} rotulo="Sala" itens={[["atendimentos", r.sala_atendimentos], ["pedidos pelo site", r.sala_pedidos]]} />
              <Selo cor={COR_FOMENTO} rotulo="Fomento" itens={[["propostas", r.fomento_propostas], ["interesses pelo site", r.fomento_interesses], ["clientes da prospecção", r.fomento_clientes]]} />
              <Selo cor="#0A5AA8" rotulo="Conecta" itens={[["empresas cadastradas", r.conecta_empresas]]} />
              <span className="font-body text-[11px]" style={{ color: MUTED }}>{data(r.primeiro)} → {data(r.ultimo)}</span>
            </div>
            {r.whatsapp ? (
              <a href={`https://wa.me/55${r.whatsapp}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-body text-xs font-bold rounded-lg px-2.5 py-1.5 justify-self-start" style={{ background: "#E7F6EE", color: "#1E6B45" }}><MessageCircle size={13} /> WhatsApp</a>
            ) : <span />}
          </div>
        ))}
      </div>
      {lista && lista.length >= 500 && <p className="font-body text-xs mt-2" style={{ color: MUTED }}>Mostrando os 500 primeiros. Use a busca para achar alguém específico.</p>}
      <p className="font-body text-xs mt-3" style={{ color: MUTED }}>
        Para ver o histórico de alguém, abra a Sala ou a Fomento: cada setor continua com seus próprios registros e permissões. Passe o mouse sobre os selos para ver o detalhe.
      </p>
    </div>
  );
}
