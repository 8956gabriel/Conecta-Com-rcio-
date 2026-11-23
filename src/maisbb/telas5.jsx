import React, { useState } from "react";
import { Trophy, Medal, Gift, FileDown, FileSpreadsheet, Sparkles, AlertTriangle, CheckCircle2, Info, Lightbulb, ChevronRight, Dices } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, LineChart, Line } from "recharts";
import { C, Titulo, Btn, Card, KPI, Aviso, Chip, Vazio, Selo, Modal, Campo, inp, inpS, Texto, Barra, msgErro, chamarIA } from "./base.jsx";
import { INDICADORES, CATEGORIAS_ATEND, RESULTADOS, ORIGENS, TIPOS_PROSP, STATUS_PROSP } from "./dados.js";
import { hoje, br, periodo, indicadores, progressoMeta, ranking, analise, pontosDe, MES_NOME, iso, exportarExcel, exportarPDF } from "./motor.js";

// ============================================================================= METAS E RANKING
export function MetasRanking({ K }) {
  const { D } = K;
  const [aba, setAba] = useState("metas");
  const [per, setPer] = useState("mes");
  const minhas = D.metas.filter((m) => m.ativo && (!m.atendente || m.atendente === K.eu));
  const ano = new Date().getFullYear();
  const evol = MES_NOME.map((n, i) => { const p = { de: iso(new Date(ano, i, 1)), ate: iso(new Date(ano, i + 1, 0)) }; const k = indicadores(D, p, K.eu); return { mes: n.slice(0, 3), atendimentos: k.atendimentos, novos: k.novos_clientes, prospeccoes: k.prospeccoes, visitas: k.visitas }; });
  const rk = ranking(D, D.membros, per, D.metas);
  const med = ["#D4A017", "#A7B1BC", "#B8733A"];
  const mesAtual = new Date().getMonth();
  return (
    <div>
      <Titulo eyebrow="Resultados" title="Metas e ranking" />
      <div className="flex gap-1.5 mb-4">{[["metas", "Minhas metas"], ["ranking", "Ranking da equipe"]].map(([k, l]) => <Chip key={k} ativo={aba === k} onClick={() => setAba(k)}>{l}</Chip>)}</div>
      {aba === "metas" && <div className="space-y-4">
        {minhas.length ? <div className="grid md:grid-cols-2 gap-3">{minhas.map((m) => { const r = progressoMeta(m, D, K.eu); return (
          <Card key={m.id}><div className="flex justify-between"><p className="font-body text-sm font-bold">{INDICADORES[m.indicador]}</p><Chip>{{ dia: "Diária", semana: "Semanal", mes: "Mensal" }[m.periodo]}</Chip></div>
            <div className="flex items-end justify-between mt-2"><p className="font-display font-extrabold text-2xl">{r.valor}<span className="text-sm font-bold" style={{ color: C.soft }}> / {m.alvo} planejado</span></p><b style={{ color: r.pct >= 100 ? C.green : C.navy }}>{r.pct}%</b></div>
            <div className="mt-2"><Barra pct={r.pct} cor={r.pct >= 100 ? C.green : r.pct >= 50 ? C.navy : C.yellowDeep} /></div></Card>); })}</div> : <Vazio>Nenhuma meta definida ainda. O administrador configura as metas no painel.</Vazio>}
        <Card><p className="font-display font-bold mb-3" style={{ color: C.navy }}>Evolução mensal · {ano}</p>
          <ResponsiveContainer width="100%" height={240}><LineChart data={evol}><CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" /><XAxis dataKey="mes" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Line dataKey="atendimentos" name="Atendimentos" stroke="#0B1F44" strokeWidth={2} /><Line dataKey="novos" name="Novos clientes" stroke="#E2B800" strokeWidth={2} /><Line dataKey="prospeccoes" name="Prospecções" stroke="#2257D6" /><Line dataKey="visitas" name="Visitas" stroke="#178A57" /></LineChart></ResponsiveContainer></Card>
        <Card><p className="font-display font-bold mb-2" style={{ color: C.navy }}>Comparação mensal</p>
          <table className="w-full font-body text-sm"><thead><tr className="text-left text-[11px] uppercase" style={{ color: C.muted }}><th className="py-1">Indicador</th><th>{MES_NOME[(mesAtual + 11) % 12]}</th><th>{MES_NOME[mesAtual]}</th><th>Variação</th></tr></thead>
            <tbody>{[["atendimentos", "Atendimentos"], ["novos", "Novos clientes"], ["prospeccoes", "Prospecções"], ["visitas", "Visitas"]].map(([k, l]) => { const a = mesAtual ? evol[mesAtual - 1][k] : 0, b = evol[mesAtual][k]; return <tr key={k} className="border-t" style={{ borderColor: C.line }}><td className="py-1.5">{l}</td><td>{a}</td><td><b>{b}</b></td><td style={{ color: b >= a ? C.green : C.red }}>{a ? `${b >= a ? "+" : ""}${Math.round((100 * (b - a)) / a)}%` : "—"}</td></tr>; })}</tbody></table></Card>
      </div>}
      {aba === "ranking" && <div>
        <div className="flex gap-1.5 mb-3">{[["dia", "Diário"], ["semana", "Semanal"], ["mes", "Mensal"], ["ano", "Anual"]].map(([k, l]) => <Chip key={k} ativo={per === k} onClick={() => setPer(k)}>{l}</Chip>)}</div>
        <Aviso>A posição considera o percentual das metas (e depois a produtividade). Qualidade — atendimentos resolvidos e satisfação — aparece separada: quantidade sozinha não mede qualidade.</Aviso>
        <div className="space-y-2 mt-3">{rk.map((r, i) => (
          <Card key={r.user_id} className="!p-3.5" style={{ borderColor: i < 3 ? med[i] : C.line, borderWidth: i < 3 ? 2 : 1 }}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="w-10 h-10 rounded-full flex items-center justify-center font-display font-extrabold shrink-0" style={{ background: i < 3 ? med[i] : C.gray, color: i < 3 ? "#fff" : C.muted }}>{i < 3 ? <Medal size={18} /> : i + 1}</span>
              <div className="flex-1 min-w-[140px]"><p className="font-body font-bold">{i + 1}º · {r.nome}{r.user_id === K.eu ? " (você)" : ""}</p><p className="font-body text-[11px]" style={{ color: C.soft }}>{i < 3 ? ["Ouro", "Prata", "Bronze"][i] : ""}</p></div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 font-body text-center text-xs">
                <div><b className="block text-base">{r.atendimentos}</b>atend.</div><div><b className="block text-base">{r.concluidos}</b>concluídos</div><div><b className="block text-base">{r.novos_clientes}</b>novos</div><div><b className="block text-base">{r.prospeccoes}</b>prosp.</div>
                <div><b className="block text-base" style={{ color: C.navy2 }}>{r.pctMeta != null ? `${r.pctMeta}%` : "—"}</b>da meta</div><div><b className="block text-base" style={{ color: C.green }}>{r.qualidade != null ? `${r.qualidade}%` : "—"}</b>resolvidos{r.satisfacao ? ` · ${r.satisfacao.toFixed(1)}★` : ""}</div>
              </div>
            </div>
          </Card>))}{!rk.length && <Vazio>Sem atendentes ativos.</Vazio>}</div>
      </div>}
    </div>
  );
}

// ============================================================================= DESAFIO DO MÊS E SORTEIOS
export async function pdfSorteio(s, d, cfg) {
  await exportarPDF(`sorteio-${s.protocolo}`, `Relatório do sorteio · ${d?.nome || ""}`, [
    { texto: `Protocolo: ${s.protocolo}\nData e hora: ${new Date(s.realizado_em).toLocaleString("pt-BR")}\nPrêmio: ${d?.premio || "—"}\nPeríodo: ${br(d?.inicio)} a ${br(d?.fim)} · Modo: ${d?.modo === "igual" ? "um número por participante elegível" : "um número por ponto"} · Pontuação mínima: ${d?.pontos_minimos}\nTotal de números: ${s.total_bilhetes} · Número sorteado: ${s.bilhete_sorteado}\nGANHADOR(A): ${s.ganhador_nome}\nHash (MD5) da lista de participantes: ${s.hash_participantes}\n\nRegras: ${d?.regras || "—"}` },
    { titulo: "Participantes elegíveis (lista congelada no momento do sorteio)", cab: ["Participante", "Pontos", "Números", "Faixa"], linhas: (s.participantes || []).map((p) => [p.nome, p.pontos, p.bilhetes, `${p.de} a ${p.ate}`]) },
  ], `${cfg?.nome_correspondente || "Mais BB"} · Sorteio realizado no Mais BB Digital com sorteio aleatório no banco de dados. A conformidade legal da promoção é responsabilidade do administrador.`, "portrait");
}
export function Desafios({ K }) {
  const { D } = K;
  const [sel, setSel] = useState(null);
  const lista = [...D.desafios].filter((d) => d.status !== "rascunho" || K.admin).sort((a, b) => b.inicio.localeCompare(a.inicio));
  return (
    <div>
      <Titulo eyebrow="Incentivo" title="Desafio do mês e sorteios" sub="Pontuação calculada automaticamente pelos registros. Sorteios auditáveis com protocolo e relatório." />
      {lista.length ? <div className="grid md:grid-cols-2 gap-3">{lista.map((d) => { const p = { de: d.inicio, ate: d.fim }; const meu = pontosDe(indicadores(D, p, K.eu), d.pontuacao); const s = D.sorteios.find((x) => x.desafio_id === d.id); return (
        <Card key={d.id} onClick={() => setSel(d)}>
          {d.imagem_url && <img src={d.imagem_url} alt="" className="w-full h-36 object-cover rounded-xl mb-3" />}
          <div className="flex justify-between gap-2"><p className="font-display font-bold" style={{ color: C.navy }}>{d.nome}</p><Chip cor={{ ativo: C.green, encerrado: C.soft, sorteado: C.yellowInk, rascunho: C.soft }[d.status]}>{d.status}</Chip></div>
          <p className="font-body text-sm mt-1">🎁 {d.premio || "—"}</p><p className="font-body text-xs" style={{ color: C.muted }}>{br(d.inicio)} a {br(d.fim)}{d.data_sorteio ? ` · sorteio em ${br(d.data_sorteio)}` : ""}</p>
          <p className="font-body text-sm mt-2"><b>Seus pontos:</b> {meu} {meu >= d.pontos_minimos ? <span style={{ color: C.green }}>· participando ✓</span> : <span style={{ color: C.soft }}>· mínimo {d.pontos_minimos}</span>}</p>
          {s && <p className="font-body text-sm mt-1" style={{ color: C.yellowInk }}>🏆 Ganhador(a): <b>{s.ganhador_nome}</b></p>}
        </Card>); })}</div> : <Vazio><Gift className="mx-auto mb-2" />Nenhum desafio cadastrado. O administrador cria no painel.</Vazio>}
      {sel && <ModalDesafio K={K} d={sel} onFechar={() => setSel(null)} />}
    </div>
  );
}
function ModalDesafio({ K, d, onFechar }) {
  const { D } = K;
  const p = { de: d.inicio, ate: d.fim };
  const parts = D.membros.filter((m) => m.ativo).map((m) => ({ ...m, pts: pontosDe(indicadores(D, p, m.user_id), d.pontuacao) })).sort((a, b) => b.pts - a.pts);
  const s = D.sorteios.find((x) => x.desafio_id === d.id);
  const [c, setC] = useState(false);
  const sortear = async () => {
    if (!confirm("Realizar o sorteio agora? A lista de participantes será congelada e o resultado não pode ser desfeito.")) return;
    setC(true);
    try { const { supabase } = await import("../supabaseClient"); const { data, error } = await supabase.rpc("maisbb_sortear", { p_desafio: d.id }); if (error) throw error; await K.carregar(); K.avisar(`Sorteio realizado! Ganhador(a): ${data.ganhador_nome}`); }
    catch (e) { K.avisar(msgErro(e), "erro"); } finally { setC(false); }
  };
  const pesos = d.pontuacao || {};
  return (
    <Modal onFechar={onFechar} titulo={d.nome} largura="max-w-3xl">
      {d.imagem_url && <img src={d.imagem_url} alt="" className="w-full max-h-56 object-cover rounded-xl mb-3" />}
      <div className="grid sm:grid-cols-2 gap-3 font-body text-sm"><p><b>Prêmio:</b> {d.premio || "—"}</p><p><b>Período:</b> {br(d.inicio)} a {br(d.fim)}</p><p><b>Data do sorteio:</b> {br(d.data_sorteio)}</p><p><b>Mínimo para participar:</b> {d.pontos_minimos} ponto(s)</p></div>
      <p className="font-body text-[11px] font-bold uppercase mt-3" style={{ color: C.muted }}>Pontuação</p>
      <p className="font-body text-sm">{[["atendimento", "atendimento"], ["atendimento_concluido", "atendimento concluído"], ["novo_cliente", "novo cliente"], ["prospeccao", "prospecção"], ["visita", "visita"], ["retorno", "retorno feito"]].filter(([k]) => pesos[k]).map(([k, l]) => `${pesos[k]} pt/${l}`).join(" · ")}</p>
      {d.regras && <><p className="font-body text-[11px] font-bold uppercase mt-3" style={{ color: C.muted }}>Regras</p><Texto>{d.regras}</Texto></>}
      <p className="font-display font-bold mt-4 mb-2" style={{ color: C.navy }}>Participantes e pontos</p>
      {parts.map((m, i) => <div key={m.user_id} className="flex justify-between py-1.5 border-b font-body text-sm" style={{ borderColor: C.line }}><span>{i + 1}. {m.nome}</span><b style={{ color: m.pts >= d.pontos_minimos ? C.green : C.soft }}>{m.pts} pts{m.pts >= d.pontos_minimos ? " · elegível" : ""}</b></div>)}
      {s ? <Card className="mt-4" style={{ borderColor: C.yellow, background: C.yellowTint }}>
        <p className="font-display font-extrabold text-lg" style={{ color: C.navy }}>🏆 {s.ganhador_nome}</p>
        <p className="font-body text-xs mt-1" style={{ color: C.muted }}>Protocolo {s.protocolo} · {new Date(s.realizado_em).toLocaleString("pt-BR")} · número {s.bilhete_sorteado} de {s.total_bilhetes} · hash {s.hash_participantes.slice(0, 12)}…</p>
        <Btn small tipo="claro" className="mt-2" icon={FileDown} onClick={() => pdfSorteio(s, d, D.config)}>Relatório do sorteio (PDF)</Btn>
      </Card> : K.admin && (
        <div className="mt-4">{!d.conformidade_confirmada ? <Aviso tipo="erro">Antes de sortear, o administrador precisa confirmar no painel que as regras e a conformidade legal foram validadas.</Aviso>
          : <Btn tipo="amarelo" icon={Dices} disabled={c} onClick={sortear}>{c ? "Sorteando..." : "Realizar sorteio auditável"}</Btn>}</div>
      )}
    </Modal>
  );
}

// ============================================================================= INTELIGÊNCIA COMERCIAL
export function Analise({ K }) {
  const { D } = K;
  const [meus, setMeus] = useState(true);
  const itens = analise(D, K.publicos, meus ? K.eu : null);
  const [ia, setIa] = useState({ t: "", c: false, e: "" });
  const ic = { alerta: [AlertTriangle, C.red], oportunidade: [Lightbulb, C.yellowInk], sugestao: [Sparkles, C.navy2], ok: [CheckCircle2, C.green], info: [Info, C.muted] };
  const pedir = async () => { setIa({ t: "", c: true, e: "" }); try { const k = indicadores(D, periodo("mes"), meus ? K.eu : null); setIa({ t: await chamarIA({ modo: "analise", pedido: "Analise meus resultados e sugira as próximas ações para esta semana.", contexto: `Indicadores do mês: ${JSON.stringify(k)}\nAchados do sistema:\n${itens.map((x) => `- ${x.t}: ${x.d}`).join("\n")}\nPúblicos: ${K.publicos.map((p) => `${p.nome} (${D.clientes.filter((c) => c.publico === p.chave).length} clientes)`).join(", ")}` }), c: false, e: "" }); } catch (e) { setIa({ t: "", c: false, e: e.message }); } };
  return (
    <div>
      <Titulo eyebrow="Análise" title="Inteligência comercial" sub="Recomendações a partir dos dados reais registrados. Quando faltam dados, o sistema avisa." direita={<Btn tipo="amarelo" icon={Sparkles} onClick={pedir} disabled={ia.c}>{ia.c ? "Analisando..." : "Análise com IA"}</Btn>} />
      <div className="flex gap-1.5 mb-4"><Chip ativo={meus} onClick={() => setMeus(true)}>Meus dados</Chip><Chip ativo={!meus} onClick={() => setMeus(false)}>Equipe toda</Chip></div>
      {ia.e && <div className="mb-3"><Aviso tipo="amarelo">{ia.e}</Aviso></div>}
      {ia.t && <Card className="mb-4" style={{ borderColor: C.yellow }}><Selo tipo="ia" /><Texto className="mt-2">{ia.t}</Texto></Card>}
      <div className="space-y-2">{itens.map((x, i) => { const [I, cor] = ic[x.tipo]; return (
        <Card key={i} className="!p-3.5" onClick={x.ir ? () => K.irPara(x.ir) : undefined}><div className="flex items-start gap-3"><I size={18} color={cor} className="mt-0.5 shrink-0" /><div className="flex-1"><p className="font-body text-sm font-bold" style={{ color: C.ink }}>{x.t}</p><p className="font-body text-xs" style={{ color: C.muted }}>{x.d}</p></div>{x.ir && <ChevronRight size={16} color={C.soft} />}</div></Card>); })}</div>
    </div>
  );
}

// ============================================================================= RELATÓRIOS
const REL = [["atendimentos", "Atendimentos"], ["clientes", "Clientes"], ["prospeccoes", "Prospecções"], ["publicos", "Públicos alcançados"], ["servicos", "Serviços procurados"], ["retornos", "Retornos"], ["campanhas", "Campanhas"], ["metas", "Metas"], ["ranking", "Ranking"], ["mensal", "Resultados mensais"], ["anual", "Evolução anual"]];
function montar(id, K, de, ate) {
  const { D } = K; const em = (x) => x && String(x).slice(0, 10) >= de && String(x).slice(0, 10) <= ate;
  const nm = Object.fromEntries(D.membros.map((m) => [m.user_id, m.nome])); const pn = Object.fromEntries(K.publicos.map((p) => [p.chave, p.nome]));
  const conta = (arr, f) => Object.entries(arr.reduce((m, x) => { const k = f(x) || "Não informado"; m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
  switch (id) {
    case "atendimentos": return { cab: ["Nº", "Data", "Hora", "Atendente", "Cliente", "Categoria", "Serviço", "Resultado", "Status"], linhas: D.atendimentos.filter((a) => em(a.data)).map((a) => [a.numero, br(a.data), String(a.hora || "").slice(0, 5), nm[a.atendente] || "", a.cliente_nome || "", CATEGORIAS_ATEND[a.categoria], a.servico_texto || "", RESULTADOS[a.resultado], a.status]) };
    case "clientes": return { cab: ["Nome", "Categoria", "Origem", "Oportunidade", "Cadastro", "Próximo contato", "Responsável"], linhas: D.clientes.filter((c) => em(c.criado_em)).map((c) => [c.nome, pn[c.publico] || "", ORIGENS[c.origem] || "", c.oportunidade, br(c.criado_em), br(c.proximo_contato), nm[c.responsavel] || ""]) };
    case "prospeccoes": return { cab: ["Data", "Público", "Tipo", "Objetivo", "Contatos", "Meta", "Situação", "Responsável"], linhas: D.prospeccoes.filter((p) => em(p.data)).map((p) => [br(p.data), pn[p.publico] || "", TIPOS_PROSP[p.tipo], p.objetivo || "", p.contatos_feitos || 0, p.meta || "", STATUS_PROSP[p.status], nm[p.responsavel] || ""]) };
    case "publicos": return { cab: ["Público", "Clientes cadastrados no período", "Prospecções no período"], linhas: K.publicos.map((p) => [p.nome, D.clientes.filter((c) => c.publico === p.chave && em(c.criado_em)).length, D.prospeccoes.filter((x) => x.publico === p.chave && em(x.data)).length]).filter((l) => l[1] || l[2]) };
    case "servicos": return { cab: ["Serviço procurado", "Atendimentos"], linhas: conta(D.atendimentos.filter((a) => em(a.data)), (a) => a.servico_texto) };
    case "retornos": return { cab: ["Data", "Título", "Concluído", "Responsável"], linhas: D.tarefas.filter((t) => t.tipo === "retorno" && em(t.data)).map((t) => [br(t.data), t.titulo, t.concluida ? "Sim" : "Não", nm[t.responsavel] || ""]) };
    case "campanhas": return { cab: ["Campanha", "Período", "Situação", "Prospecções", "Convertidas"], linhas: D.campanhas.map((c) => { const pr = D.prospeccoes.filter((p) => p.campanha_id === c.id); return [c.nome, `${br(c.inicio)} a ${br(c.fim)}`, c.status, pr.length, pr.filter((p) => p.status === "convertida").length]; }) };
    case "metas": return { cab: ["Atendente", "Indicador", "Período", "Meta", "Resultado", "%"], linhas: D.membros.filter((m) => m.ativo).flatMap((m) => D.metas.filter((x) => x.ativo && (!x.atendente || x.atendente === m.user_id)).map((x) => { const r = progressoMeta(x, D, m.user_id); return [m.nome, INDICADORES[x.indicador], x.periodo, x.alvo, r.valor, `${r.pct}%`]; })) };
    case "ranking": return { cab: ["Posição", "Atendente", "Atendimentos", "Concluídos", "Novos clientes", "Prospecções", "% meta", "% resolvidos"], linhas: ranking(D, D.membros, "mes", D.metas).map((r, i) => [i + 1, r.nome, r.atendimentos, r.concluidos, r.novos_clientes, r.prospeccoes, r.pctMeta ?? "—", r.qualidade ?? "—"]) };
    case "mensal": case "anual": { const ano = Number(de.slice(0, 4)); const linhas = MES_NOME.map((n, i) => { const k = indicadores(D, { de: iso(new Date(ano, i, 1)), ate: iso(new Date(ano, i + 1, 0)) }); return [`${n}/${ano}`, k.atendimentos, k.concluidos, k.novos_clientes, k.prospeccoes, k.visitas, k.retornos]; }); return { cab: ["Mês", "Atendimentos", "Concluídos", "Novos clientes", "Prospecções", "Visitas", "Retornos"], linhas: id === "mensal" ? linhas.filter((l, i) => iso(new Date(ano, i, 1)) <= ate && iso(new Date(ano, i + 1, 0)) >= de) : linhas }; }
    default: return { cab: [], linhas: [] };
  }
}
export function Relatorios({ K }) {
  const y = new Date().getFullYear();
  const [p, setP] = useState(periodo("mes"));
  const [sel, setSel] = useState("atendimentos");
  const r = montar(sel, K, p.de, p.ate);
  const nome = REL.find((x) => x[0] === sel)[1];
  const exp = async (tipo, todos) => {
    const abas = (todos ? REL : REL.filter((x) => x[0] === sel)).map(([id, n]) => ({ nome: n, ...montar(id, K, p.de, p.ate) }));
    try { if (tipo === "xlsx") await exportarExcel(`mais-bb-${todos ? "relatorios" : sel}-${p.de}-a-${p.ate}`, abas.map((a) => ({ nome: a.nome, cab: a.cab, linhas: a.linhas }))); else await exportarPDF(`mais-bb-${todos ? "relatorios" : sel}-${p.de}-a-${p.ate}`, todos ? "Relatórios do Mais BB Digital" : nome, abas.map((a) => ({ titulo: a.nome, cab: a.cab, linhas: a.linhas })), `Período: ${br(p.de)} a ${br(p.ate)} · CPF não incluído.`); }
    catch (e) { K.avisar(`Erro ao exportar: ${e.message}`, "erro"); }
  };
  return (
    <div>
      <Titulo eyebrow="Relatórios" title="Relatórios" sub="Exportação em PDF e Excel." direita={<><Btn tipo="claro" icon={FileSpreadsheet} onClick={() => exp("xlsx", true)}>Excel completo</Btn><Btn tipo="claro" icon={FileDown} onClick={() => exp("pdf", true)}>PDF completo</Btn></>} />
      <div className="flex gap-2 flex-wrap items-end mb-4">
        <Campo label="De"><input type="date" value={p.de} onChange={(e) => setP({ ...p, de: e.target.value })} className={inp} style={inpS} /></Campo>
        <Campo label="Até"><input type="date" value={p.ate} onChange={(e) => setP({ ...p, ate: e.target.value })} className={inp} style={inpS} /></Campo>
        {[["Hoje", "dia"], ["Semana", "semana"], ["Mês", "mes"], ["Ano", "ano"]].map(([l, k]) => <Chip key={k} onClick={() => setP(periodo(k))}>{l}</Chip>)}
      </div>
      <div className="grid lg:grid-cols-[230px_1fr] gap-4">
        <Card className="!p-2 h-fit">{REL.map(([id, n]) => <button key={id} onClick={() => setSel(id)} className="w-full text-left px-3 py-2 rounded-xl font-body text-sm font-semibold" style={{ background: sel === id ? C.navyTint : "transparent", color: sel === id ? C.navy : C.muted }}>{n}</button>)}</Card>
        <Card><div className="flex justify-between items-center mb-3 flex-wrap gap-2"><p className="font-display font-bold" style={{ color: C.navy }}>{nome} · {r.linhas.length} linha(s)</p><div className="flex gap-2"><Btn small tipo="claro" icon={FileSpreadsheet} onClick={() => exp("xlsx")}>Excel</Btn><Btn small tipo="claro" icon={FileDown} onClick={() => exp("pdf")}>PDF</Btn></div></div>
          {r.linhas.length ? <div className="overflow-x-auto"><table className="w-full font-body text-sm"><thead><tr className="text-left text-[11px] uppercase" style={{ background: C.gray, color: C.muted }}>{r.cab.map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead><tbody>{r.linhas.slice(0, 300).map((l, i) => <tr key={i} className="border-t" style={{ borderColor: C.line }}>{l.map((x, j) => <td key={j} className="px-3 py-1.5">{x}</td>)}</tr>)}</tbody></table></div> : <Vazio>Sem dados no período.</Vazio>}
        </Card>
      </div>
    </div>
  );
}
