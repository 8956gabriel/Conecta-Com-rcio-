// =============================================================================
// VISITAS E CLIQUES — o que é mais visto e mais procurado
// Lê o resumo pronto do banco (central_visitas_resumo, em
// supabase-visitas-cliques.sql): visitas por dia, horário e dia da semana,
// páginas mais vistas (Conecta, Sala e Fomento), empresas mais abertas e
// onde as pessoas mais clicam (WhatsApp, Instagram, mapa...).
// Sem dado pessoal: o "visitante" é só um código aleatório do aparelho.
// =============================================================================
import React, { useEffect, useState } from "react";
import { Eye, Users, MousePointerClick, Store, RefreshCw, FileSpreadsheet, MessageCircle, Instagram, MapPin, Phone, Globe, Facebook } from "lucide-react";
import { supabase, supabaseConfigurado } from "../supabaseClient";

const AZUL = "#0A5AA8", INK = "#0E2233", MUTED = "#5C7186", LINHA = "#DCE7F2";
const COR_AMB = { conecta: "#0A5AA8", sala: "#F19F74", fomento: "#1E8E5A" };
const NOME_AMB = { conecta: "Conecta Comércio", sala: "Sala do Empreendedor", fomento: "Fomento Paraná" };
const ICONE_CLIQUE = { whatsapp: MessageCircle, instagram: Instagram, mapa: MapPin, telefone: Phone, site: Globe, facebook: Facebook };
const NOME_CLIQUE = { whatsapp: "WhatsApp", instagram: "Instagram", mapa: "Mapa / Como chegar", telefone: "Telefone", site: "Site", facebook: "Facebook", outro: "Outros" };
const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const NOME_PAGINA = {
  site: "Início (vitrine)", loja: "Perfil de empresa", turismo: "Turismo", vagas: "Vagas", mural: "Mural da comunidade", classificados: "Classificados",
  votacao: "Votação", ouvidoria: "Ouvidoria", utilidade: "Utilidade pública", estatisticas: "Números da cidade", feira: "Feira do Empreendedor",
  sala: "Sala · área pública", "sala-agente": "Sala · atendente", "sala-admin": "Sala · administração", fomento: "Fomento · área pública",
  "fomento-agente": "Fomento · agente", "fomento-admin": "Fomento · administração", admin: "Painel Admin", empresa: "Painel do comerciante",
  prestador: "Painel do prestador", conta: "Entrar / cadastro", portal: "Portal (como você quer entrar)", acesso: "Sala · escolha de acesso",
  inicio: "Tela de entrada", publico: "Área pública", agente: "Área do agente/atendente", entrar: "Entrar",
};
const nomePagina = (p) => NOME_PAGINA[p] || p;
const fmt = (n) => Number(n || 0).toLocaleString("pt-BR");

const DEMO = {
  entradas: 1986, visitantes: 742, paginas_vistas: 4210, perfis: 615, cliques: 233,
  por_dia: Array.from({ length: 14 }, (_, i) => ({ dia: new Date(Date.now() - (13 - i) * 864e5).toLocaleDateString("sv-SE"), n: 40 + ((i * 37) % 60) })),
  por_hora: Array.from({ length: 24 }, (_, h) => ({ hora: h, n: h < 6 ? 2 : h < 12 ? 20 + h * 3 : h < 19 ? 55 - (h - 12) * 2 : 30 - (h - 19) * 4 })),
  por_semana: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dia: d, n: [120, 310, 290, 280, 300, 340, 200][d] })),
  por_ambiente: [{ ambiente: "conecta", n: 4800 }, { ambiente: "sala", n: 820 }, { ambiente: "fomento", n: 576 }],
  paginas: [{ ambiente: "conecta", pagina: "site", n: 1800 }, { ambiente: "conecta", pagina: "vagas", n: 410 }, { ambiente: "conecta", pagina: "turismo", n: 260 }, { ambiente: "sala", pagina: "publico", n: 210 }, { ambiente: "fomento", pagina: "publico", n: 160 }],
  perfis_top: [{ alvo: "Padaria Pão Nosso", n: 96 }, { alvo: "Açougue Bom Corte", n: 71 }, { alvo: "Mercado Central", n: 55 }],
  cliques_tipo: [{ alvo_tipo: "whatsapp", n: 170 }, { alvo_tipo: "instagram", n: 38 }, { alvo_tipo: "mapa", n: 25 }],
  cliques_top: [{ alvo_tipo: "whatsapp", alvo: "Padaria Pão Nosso", n: 41 }, { alvo_tipo: "whatsapp", alvo: "Atendente (vaga)", n: 22 }, { alvo_tipo: "instagram", alvo: "Açougue Bom Corte", n: 12 }],
};

function Barras({ itens, rotulo, valor, cor = AZUL, max }) {
  const m = max || Math.max(1, ...itens.map(valor));
  return (
    <div className="flex flex-col gap-1.5">
      {itens.map((x, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-center">
          <div className="min-w-0">
            <p className="font-body text-xs font-semibold truncate" style={{ color: INK }}>{rotulo(x)}</p>
            <div className="h-1.5 rounded-full mt-1" style={{ background: "#EEF3F8" }}><div className="h-1.5 rounded-full" style={{ width: `${(valor(x) * 100) / m}%`, background: typeof cor === "function" ? cor(x) : cor }} /></div>
          </div>
          <span className="font-body text-xs font-bold tabular-nums" style={{ color: INK }}>{fmt(valor(x))}</span>
        </div>
      ))}
      {!itens.length && <p className="font-body text-xs" style={{ color: MUTED }}>Ainda sem registros neste período.</p>}
    </div>
  );
}

function Colunas({ itens, rotulo, cor = AZUL, altura = 110 }) {
  const m = Math.max(1, ...itens.map((x) => x.n));
  return (
    <div className="flex items-end gap-1" style={{ height: altura + 18 }}>
      {itens.map((x, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end min-w-0" title={`${rotulo(x)}: ${fmt(x.n)}`}>
          <div className="w-full rounded-t" style={{ height: Math.max(2, (x.n * altura) / m), background: cor, opacity: 0.85 }} />
          <span className="font-body text-[9px] mt-1 truncate w-full text-center" style={{ color: MUTED }}>{rotulo(x)}</span>
        </div>
      ))}
    </div>
  );
}

function Caixa({ titulo, children, className = "" }) {
  return (
    <div className={`rounded-2xl border bg-white p-4 ${className}`} style={{ borderColor: LINHA }}>
      <p className="font-display font-bold text-sm mb-3" style={{ color: INK }}>{titulo}</p>
      {children}
    </div>
  );
}

export default function VisitasCliques() {
  const [dias, setDias] = useState(30);
  const [r, setR] = useState(null);
  const [erro, setErro] = useState("");

  const carregar = async () => {
    setErro("");
    if (!supabaseConfigurado) { setR(DEMO); return; }
    setR(null);
    const { data, error } = await supabase.rpc("central_visitas_resumo", { p_dias: dias });
    if (error) {
      setR({ ...DEMO, entradas: 0, visitantes: 0, paginas_vistas: 0, perfis: 0, cliques: 0, por_dia: [], por_hora: [], por_semana: [], por_ambiente: [], paginas: [], perfis_top: [], cliques_tipo: [], cliques_top: [] });
      setErro(/central_visitas_resumo|does not exist|schema cache/i.test(error.message) ? "Falta preparar o banco: rode o arquivo supabase-visitas-cliques.sql no Supabase (SQL Editor)." : error.message);
      return;
    }
    setR(data);
  };
  useEffect(() => { carregar(); }, [dias]);

  const exportar = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const add = (nome, linhas) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(linhas), nome);
    add("Resumo", [["Período", `Últimos ${dias} dias`], ["Visitas (entradas)", r.entradas], ["Visitantes únicos", r.visitantes], ["Páginas vistas", r.paginas_vistas], ["Perfis de empresa abertos", r.perfis], ["Cliques (WhatsApp, Instagram...)", r.cliques]]);
    add("Visitas por dia", [["Dia", "Visitas"], ...r.por_dia.map((x) => [new Date(`${x.dia}T12:00:00`).toLocaleDateString("pt-BR"), x.n])]);
    add("Por horário", [["Hora", "Visitas"], ...r.por_hora.map((x) => [`${x.hora}h`, x.n])]);
    add("Páginas mais vistas", [["Ambiente", "Página", "Vezes"], ...r.paginas.map((x) => [NOME_AMB[x.ambiente] || x.ambiente, nomePagina(x.pagina), x.n])]);
    add("Empresas mais vistas", [["Empresa", "Perfil aberto"], ...r.perfis_top.map((x) => [x.alvo, x.n])]);
    add("Mais clicados", [["Onde", "O quê", "Cliques"], ...r.cliques_top.map((x) => [NOME_CLIQUE[x.alvo_tipo] || x.alvo_tipo, x.alvo, x.n])]);
    XLSX.writeFile(wb, `visitas-e-cliques-${new Date().toLocaleDateString("sv-SE")}.xlsx`);
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <p className="font-body text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: AZUL }}>Início</p>
          <h2 className="font-display font-extrabold text-2xl mt-0.5" style={{ color: INK }}>Visitas e cliques</h2>
          <p className="font-body text-sm mt-1 max-w-2xl" style={{ color: MUTED }}>
            O que mais é visto e procurado no Conecta, na Sala e na Fomento: páginas, empresas e onde as pessoas clicam. Acessos da equipe não contam. Nenhum dado pessoal é guardado.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={dias} onChange={(e) => setDias(Number(e.target.value))} className="font-body text-sm border rounded-xl px-3 py-2 bg-white outline-none" style={{ borderColor: LINHA }}>
            {[[7, "Últimos 7 dias"], [30, "Últimos 30 dias"], [90, "Últimos 90 dias"], [365, "Último ano"]].map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
          <button onClick={exportar} disabled={!r} className="inline-flex items-center gap-1.5 font-body text-xs font-bold rounded-lg border px-3 py-2 disabled:opacity-50" style={{ borderColor: LINHA, color: INK }}><FileSpreadsheet size={14} /> Excel</button>
          <button onClick={carregar} className="inline-flex items-center gap-1.5 font-body text-xs font-bold rounded-lg border px-3 py-2" style={{ borderColor: LINHA, color: INK }}><RefreshCw size={14} /> Atualizar</button>
        </div>
      </div>
      {!supabaseConfigurado && <p className="font-body text-sm rounded-xl px-4 py-3 mb-4" style={{ background: "#FFF6E5", color: "#7A5200" }}>Modo demonstração: números de exemplo.</p>}
      {erro && <p className="font-body text-sm rounded-xl px-4 py-3 mb-4" style={{ background: "#FBEAE5", color: "#8A2E1C" }}>{erro}</p>}
      {!r ? <p className="font-body text-sm text-center py-10" style={{ color: MUTED }}>Carregando...</p> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[["Visitas", r.entradas, Eye], ["Visitantes únicos", r.visitantes, Users], ["Perfis de empresa abertos", r.perfis, Store], ["Cliques (WhatsApp, Instagram...)", r.cliques, MousePointerClick]].map(([t, n, I]) => (
              <div key={t} className="rounded-2xl border bg-white p-4" style={{ borderColor: LINHA }}>
                <div className="flex items-center justify-between gap-2"><p className="font-body text-[11px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{t}</p><I size={16} color={AZUL} /></div>
                <p className="font-display font-extrabold text-2xl mt-1" style={{ color: INK }}>{fmt(n)}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-3 mb-3">
            <Caixa titulo="Visitas por dia" className="lg:col-span-2">
              <Colunas itens={r.por_dia.slice(-31)} rotulo={(x) => new Date(`${x.dia}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} />
            </Caixa>
            <Caixa titulo="Por ambiente">
              <Barras itens={r.por_ambiente} rotulo={(x) => NOME_AMB[x.ambiente] || x.ambiente} valor={(x) => x.n} cor={(x) => COR_AMB[x.ambiente] || AZUL} />
            </Caixa>
          </div>

          <div className="grid lg:grid-cols-2 gap-3 mb-3">
            <Caixa titulo="Horário de mais movimento">
              <Colunas itens={Array.from({ length: 24 }, (_, h) => ({ hora: h, n: r.por_hora.find((x) => x.hora === h)?.n || 0 }))} rotulo={(x) => (x.hora % 3 === 0 ? `${x.hora}h` : "")} cor="#7E5BEF" altura={90} />
            </Caixa>
            <Caixa titulo="Dia da semana">
              <Colunas itens={[0, 1, 2, 3, 4, 5, 6].map((d) => ({ d, n: r.por_semana.find((x) => x.dia === d)?.n || 0 }))} rotulo={(x) => SEMANA[x.d]} cor="#1E8E5A" altura={90} />
            </Caixa>
          </div>

          <div className="grid lg:grid-cols-3 gap-3">
            <Caixa titulo="Páginas mais vistas">
              <Barras itens={r.paginas.slice(0, 12)} rotulo={(x) => `${nomePagina(x.pagina)}${x.ambiente !== "conecta" ? ` · ${NOME_AMB[x.ambiente]}` : ""}`} valor={(x) => x.n} cor={(x) => COR_AMB[x.ambiente] || AZUL} />
            </Caixa>
            <Caixa titulo="Empresas mais procuradas (perfil aberto)">
              <Barras itens={r.perfis_top.slice(0, 12)} rotulo={(x) => x.alvo} valor={(x) => x.n} />
            </Caixa>
            <Caixa titulo="Onde mais clicam">
              <div className="flex flex-wrap gap-2 mb-3">
                {r.cliques_tipo.map((x) => { const I = ICONE_CLIQUE[x.alvo_tipo] || MousePointerClick; return <span key={x.alvo_tipo} className="inline-flex items-center gap-1 font-body text-[11px] font-bold rounded-full px-2 py-1" style={{ background: "#EAF2FB", color: AZUL }}><I size={12} /> {NOME_CLIQUE[x.alvo_tipo] || x.alvo_tipo} · {fmt(x.n)}</span>; })}
              </div>
              <Barras itens={r.cliques_top.slice(0, 12)} rotulo={(x) => `${x.alvo} · ${NOME_CLIQUE[x.alvo_tipo] || x.alvo_tipo}`} valor={(x) => x.n} cor="#25A244" />
            </Caixa>
          </div>
          <p className="font-body text-[11px] mt-3" style={{ color: MUTED }}>As visitas antigas (antes desta tela) contam só no total e no gráfico por dia: páginas, perfis e cliques passam a ser registrados a partir de agora.</p>
        </>
      )}
    </div>
  );
}
