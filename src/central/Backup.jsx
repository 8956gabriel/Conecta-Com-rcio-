// =============================================================================
// BACKUP (Projeto Master · seções 15 e 20)
// Baixa uma cópia dos dados dos três ambientes para guardar fora da plataforma:
//   • Excel: uma aba por tabela, fácil de abrir e conferir
//   • JSON: cópia fiel (listas, horários etc.), boa para restaurar se precisar
// Só LÊ o banco — não apaga nem altera nada. Cada tabela respeita as regras de
// segurança do Supabase: o que a conta não pode ver aparece como "sem acesso".
// O arquivo tem dados pessoais (LGPD): guarde em lugar seguro.
// =============================================================================
import React, { useState } from "react";
import { DatabaseBackup, FileSpreadsheet, FileJson, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";
import { supabase, supabaseConfigurado } from "../supabaseClient";

const AZUL = "var(--cor-principal, #0A5AA8)";
const INK = "#0E2233", MUTED = "#5C7186", LINHA = "#DCE7F2";

const GRUPOS = [
  { titulo: "Conecta Comércio", cor: AZUL, tabelas: [
    "perfis", "empresas", "prestadores", "prestador_agenda", "produtos", "promocoes", "combos", "cupons",
    "fidelidade_config", "fidelidade_clientes", "categorias", "vagas", "candidaturas", "avaliacoes", "favoritos",
    "feira_config", "feirantes", "eventos_calendario", "evento_participantes", "credenciais", "cursos", "curso_inscricoes",
    "noticias", "banners", "logos", "servicos_empreendedor", "licitacoes", "licitacao_leads", "fomento_leads",
    "pontos_turisticos", "utilidade_publica", "mural_comunidade", "classificados", "ouvidoria_denuncias", "depoimentos",
    "faq", "enquetes", "enquete_votos", "notificacoes", "site_config", "central_auditoria",
  ] },
  { titulo: "Sala do Empreendedor", cor: "#F19F74", tabelas: [
    "sala_config", "sala_equipe", "sala_pedidos", "sala_atendimentos", "sala_atendimentos_totais", "sala_orientacoes",
    "sala_documentos", "sala_selo_itens", "sala_checklist", "sala_checklist_marcas", "sala_calendario", "sala_estrategias",
    "sala_empresas_base", "sala_empresas_importacoes", "sala_acessos",
  ] },
  { titulo: "Fomento Paraná", cor: "#1E8E5A", tabelas: [
    "fomento_modulo_config", "fomento_agentes", "fomento_linhas", "fomento_materiais", "fomento_propostas", "fomento_historico",
    "fomento_interesses", "fomento_agenda", "fomento_ranking_oficial", "fomento_pontuacao", "fomento_acessos", "fomento_demo_visitas",
    "fomento_cp_clientes", "fomento_cp_atendimentos", "fomento_cp_visitas", "fomento_cp_campanhas", "fomento_cp_metas",
    "fomento_cp_datas", "fomento_cp_dias", "fomento_cp_ideias", "fomento_cp_ideias_uso",
  ] },
];
const LIMITE = 50000; // por tabela — o suficiente para a realidade de Ivatuba

async function lerTabela(nome) {
  const linhas = [];
  for (let de = 0; de < LIMITE; de += 1000) {
    const { data, error } = await supabase.from(nome).select("*").range(de, de + 999);
    if (error) return { erro: /does not exist|schema cache|relation/i.test(error.message) ? "não existe" : "sem acesso" };
    linhas.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return { linhas, cortado: linhas.length >= LIMITE };
}

const paraCelula = (v) => {
  if (v == null) return "";
  if (typeof v === "object") { const t = JSON.stringify(v); return t.length > 32000 ? t.slice(0, 32000) + "…" : t; }
  if (typeof v === "string" && v.length > 32000) return v.slice(0, 32000) + "…";
  return v;
};

export default function Backup() {
  const [status, setStatus] = useState({}); // { tabela: { n, erro, cortado } }
  const [rodando, setRodando] = useState(null); // "excel" | "json"
  const [feito, setFeito] = useState(null);

  const baixar = async (formato) => {
    if (!supabaseConfigurado) { setFeito("Modo demonstração: conecte o Supabase para gerar o backup."); return; }
    setRodando(formato); setFeito(null); setStatus({});
    const dados = {};
    for (const g of GRUPOS) {
      for (const t of g.tabelas) {
        const r = await lerTabela(t);
        setStatus((s) => ({ ...s, [t]: r.erro ? { erro: r.erro } : { n: r.linhas.length, cortado: r.cortado } }));
        if (!r.erro) dados[t] = r.linhas;
      }
    }
    const data = new Date().toLocaleDateString("sv-SE");
    if (formato === "json") {
      const blob = new Blob([JSON.stringify({ gerado_em: new Date().toISOString(), plataforma: "Conecta Comércio · Sala do Empreendedor · Fomento Paraná", tabelas: dados }, null, 1)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `backup-conecta-${data}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    } else {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const resumo = [["Tabela", "Registros"], ...Object.entries(dados).map(([t, l]) => [t, l.length])];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), "Resumo");
      Object.entries(dados).forEach(([t, l]) => {
        if (!l.length) return;
        const colunas = [...new Set(l.flatMap((x) => Object.keys(x)))];
        const ws = XLSX.utils.aoa_to_sheet([colunas, ...l.map((x) => colunas.map((c) => paraCelula(x[c])))]);
        XLSX.utils.book_append_sheet(wb, ws, t.slice(0, 31));
      });
      XLSX.writeFile(wb, `backup-conecta-${data}.xlsx`);
    }
    const total = Object.values(dados).reduce((s, l) => s + l.length, 0);
    setFeito(`Backup baixado: ${Object.keys(dados).length} tabelas, ${total.toLocaleString("pt-BR")} registros.`);
    setRodando(null);
  };

  return (
    <div>
      <p className="font-body text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: AZUL }}>Administração geral</p>
      <h2 className="font-display font-extrabold text-2xl mt-0.5 flex items-center gap-2" style={{ color: INK }}><DatabaseBackup size={22} /> Backup dos dados</h2>
      <p className="font-body text-sm mt-1 max-w-2xl" style={{ color: MUTED }}>
        Baixa uma cópia de tudo o que está guardado no Conecta Comércio, na Sala do Empreendedor e na Fomento Paraná. Só lê o banco: nada é apagado ou alterado.
      </p>

      <div className="rounded-2xl px-4 py-3 mt-4 flex items-start gap-2.5 font-body text-sm" style={{ background: "#FFF6E5", color: "#7A5200" }}>
        <ShieldAlert size={17} className="mt-0.5 flex-shrink-0" />
        <span>O arquivo tem dados pessoais (nomes, telefones, CPF/CNPJ). Pela LGPD, guarde em local seguro, não compartilhe e apague cópias antigas que não forem mais necessárias.</span>
      </div>

      <div className="flex flex-wrap gap-2 mt-5">
        <button disabled={!!rodando} onClick={() => baixar("excel")} className="inline-flex items-center gap-2 font-body text-sm font-bold text-white rounded-xl px-4 py-2.5 disabled:opacity-60" style={{ background: AZUL }}>
          {rodando === "excel" ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />} Baixar backup em Excel
        </button>
        <button disabled={!!rodando} onClick={() => baixar("json")} className="inline-flex items-center gap-2 font-body text-sm font-bold rounded-xl px-4 py-2.5 border disabled:opacity-60" style={{ borderColor: LINHA, color: INK, background: "#fff" }}>
          {rodando === "json" ? <Loader2 size={16} className="animate-spin" /> : <FileJson size={16} />} Baixar cópia completa (JSON)
        </button>
      </div>
      <p className="font-body text-xs mt-2" style={{ color: MUTED }}>Excel é o mais fácil de abrir e conferir. O JSON é a cópia mais fiel, a melhor para restaurar se um dia precisar. Sugestão: baixar uma vez por mês.</p>
      {feito && (supabaseConfigurado
        ? <p className="font-body text-sm font-semibold mt-3 flex items-center gap-1.5" style={{ color: "#1E6B45" }}><CheckCircle2 size={16} /> {feito}</p>
        : <p className="font-body text-sm mt-3" style={{ color: "#7A5200" }}>{feito}</p>)}

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        {GRUPOS.map((g) => (
          <div key={g.titulo} className="rounded-2xl border bg-white p-4" style={{ borderColor: LINHA }}>
            <p className="font-display font-bold text-sm flex items-center gap-2" style={{ color: INK }}><span className="w-1.5 h-4 rounded-full" style={{ background: g.cor }} />{g.titulo}</p>
            <ul className="mt-2 flex flex-col gap-0.5">
              {g.tabelas.map((t) => {
                const st = status[t];
                return (
                  <li key={t} className="flex items-center justify-between font-body text-xs py-0.5" style={{ color: MUTED }}>
                    <span className="truncate">{t}</span>
                    <span className="font-semibold" style={{ color: st?.erro ? "#B4462F" : st ? "#1E6B45" : "#B7C6D6" }}>
                      {!st ? (rodando ? "…" : "") : st.erro ? st.erro : `${st.n.toLocaleString("pt-BR")}${st.cortado ? "+" : ""}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
