// =============================================================================
// 🎓 TREINAMENTO ANEPS — capacitação, simulados, pontuação, ranking, histórico
// e Professor BBB+. Usa o login e o perfil que o agente já tem no Mais BB.
// =============================================================================
import React, { useEffect, useMemo, useRef, useState } from "react";
import { GraduationCap, BookOpen, Timer, Trophy, History, Bot, FileText, PlayCircle, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Send, RotateCcw, Medal, Plus, Save, Trash2, Upload, Settings, Download, ListChecks, Lightbulb, Target } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { C, Titulo, Btn, Card, KPI, Aviso, Chip, Vazio, Modal, Campos, Campo, inp, inpS, Texto, Barra, msgErro, chamarIA } from "./base.jsx";
import { AVISO_ANEPS } from "./aneps-conteudo.js";
import { carregarAneps, iniciarSimulado, finalizarSimulado, MODALIDADES, ANEPS_PADRAO, faltaBanco, gravar, excluir, instalarConteudoInicial, lerConfigNova, salvarConfigAneps } from "./ampliacao-dados.js";

const LETRAS = ["A", "B", "C", "D"];
const mmss = (s) => { s = Math.max(0, Math.round(s || 0)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
const dataHora = (s) => (s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");
export const SEM_BANCO = "As novas ferramentas ainda não foram instaladas no banco. O administrador precisa rodar o arquivo supabase-maisbb-ampliacao.sql no Supabase (SQL Editor).";

function useAneps() {
  const [A, setA] = useState(null); const [erro, setErro] = useState(null);
  const recarregar = async () => { try { setA(await carregarAneps()); setErro(null); } catch (e) { setErro(e); setA((x) => x || { modulos: [], materiais: [], questoes: [], todasQuestoes: [], tentativas: [], ranking: [] }); } };
  useEffect(() => { recarregar(); }, []);
  return { A, erro, recarregar };
}
export function ErroBanco({ erro }) { if (!erro) return null; return <div className="mb-4"><Aviso tipo={faltaBanco(erro) ? "amarelo" : "erro"}>{faltaBanco(erro) ? SEM_BANCO : msgErro(erro)}</Aviso></div>; }

// ============================================================================= PÁGINA DO AGENTE
export function TreinamentoANEPS({ K }) {
  const { A, erro, recarregar } = useAneps();
  const [aba, setAba] = useState("modulos");
  const [modulo, setModulo] = useState(null);
  const [prova, setProva] = useState(null);       // simulado em andamento
  const [resultado, setResultado] = useState(null);
  if (!A) return <p className="font-body text-sm">Carregando o treinamento...</p>;
  const ativos = A.modulos.filter((m) => m.ativo);
  const minhas = A.tentativas.filter((t) => (t.user_id === K.eu || t.user_id === "demo") && t.status === "finalizada");
  const eu = A.ranking.find((r) => r.user_id === K.eu || r.user_id === "demo");
  const comecar = async (modalidade, mod = null) => { try { const p = await iniciarSimulado(modalidade, mod); setResultado(null); setProva(p); } catch (e) { K.avisar(faltaBanco(e) ? SEM_BANCO : msgErro(e), "erro"); } };

  if (prova) return <Prova K={K} p={prova} onFim={(r) => { setProva(null); setResultado(r); recarregar(); }} onSair={() => { if (confirm("Sair do simulado? Ele será descartado e não contará pontos.")) setProva(null); }} />;
  if (resultado) return <Resultado r={resultado} onVoltar={() => setResultado(null)} onRefazer={() => comecar(resultado.modalidade, resultado.modalidade === "exercicio" ? modulo?.id : null)} />;
  if (modulo) return <ModuloView K={K} A={A} m={modulo} onVoltar={() => setModulo(null)} onExercicios={() => comecar("exercicio", modulo.id)} />;

  return (
    <div>
      <Titulo eyebrow="Capacitação profissional" title="🎓 Treinamento ANEPS" sub="Prepare-se para a certificação de correspondentes com módulos, simulados cronometrados e gabarito comentado." />
      <ErroBanco erro={erro} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPI titulo="Meus pontos" valor={eu?.pontos ?? 0} icon={Trophy} cor={C.yellowDeep} destaque />
        <KPI titulo="Posição no ranking" valor={eu ? `${A.ranking.indexOf(eu) + 1}º` : "—"} sub={`de ${A.ranking.length}`} icon={Medal} />
        <KPI titulo="Simulados feitos" valor={eu?.simulados ?? 0} icon={ListChecks} />
        <KPI titulo="Média de acertos" valor={`${eu?.media ?? 0}%`} icon={Target} cor={C.green} />
      </div>
      <div className="flex gap-1.5 mb-4 flex-wrap">{[["modulos", "Módulos", BookOpen], ["simulados", "Simulados", Timer], ["ranking", "Ranking", Trophy], ["historico", "Meu histórico", History], ["professor", "Professor BBB+", Bot]].map(([k, l, I]) => <Chip key={k} ativo={aba === k} onClick={() => setAba(k)}><I size={12} /> {l}</Chip>)}</div>

      {aba === "modulos" && (ativos.length ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">{ativos.map((m) => { const st = desempenhoModulo(minhas, m.id); return (
        <Card key={m.id} onClick={() => setModulo(m)}>
          <p className="font-body text-[11px] font-bold uppercase" style={{ color: C.yellowInk }}>Módulo {m.ordem}</p>
          <p className="font-display font-bold mt-0.5" style={{ color: C.navy }}>{m.titulo}</p>
          {m.descricao && <p className="font-body text-xs mt-1" style={{ color: C.muted }}>{m.descricao}</p>}
          <div className="mt-3">{st.total ? <><p className="font-body text-[11px] mb-1" style={{ color: C.muted }}>Seu aproveitamento: <b>{st.pct}%</b> ({st.ok}/{st.total})</p><Barra pct={st.pct} cor={st.pct >= 70 ? C.green : st.pct >= 50 ? C.yellowDeep : C.red} /></> : <p className="font-body text-[11px]" style={{ color: C.soft }}>Ainda sem questões respondidas</p>}</div>
        </Card>); })}</div> : <Vazio><GraduationCap className="mx-auto mb-2" />Os módulos ainda não foram cadastrados. {K.admin ? "Instale o conteúdo inicial no Painel do administrador › Treinamento ANEPS." : "O administrador vai liberar em breve."}</Vazio>)}

      {aba === "simulados" && <div>
        <div className="grid md:grid-cols-3 gap-3">{["rapido", "intermediario", "completo"].map((k) => (
          <Card key={k} className="flex flex-col">
            <p className="font-display font-bold" style={{ color: C.navy }}>{MODALIDADES[k].l}</p>
            <p className="font-body text-sm mt-1" style={{ color: C.muted }}>{MODALIDADES[k].n} questões aleatórias de todos os módulos · alternativas A a D · cronômetro · correção automática.</p>
            <Btn className="mt-auto pt-2.5" tipo={k === "completo" ? "amarelo" : "navy"} icon={PlayCircle} onClick={() => comecar(k)}>Iniciar</Btn>
          </Card>))}</div>
        <div className="mt-4"><Aviso>Pontuação: cada acerto vale pontos, concluir o simulado dá bônus, e aproveitamento a partir de 80% (ou 100%) dá bônus extra. Os pontos são calculados no servidor e contam uma única vez por simulado — reenviar ou atualizar a página não soma de novo.</Aviso></div>
      </div>}

      {aba === "ranking" && <Ranking ranking={A.ranking} eu={K.eu} />}
      {aba === "historico" && <Historico tentativas={minhas} modulos={A.modulos} />}
      {aba === "professor" && <Professor K={K} A={A} minhas={minhas} />}
      <p className="font-body text-[11px] mt-6" style={{ color: C.soft }}>{AVISO_ANEPS}</p>
    </div>
  );
}

function desempenhoModulo(tentativas, moduloId) {
  let ok = 0, total = 0;
  tentativas.forEach((t) => (t.detalhe || []).forEach((d) => { if (d.modulo_id === moduloId) { total++; if (d.ok) ok++; } }));
  return { ok, total, pct: total ? Math.round((100 * ok) / total) : 0 };
}

function videoEmbed(url) {
  const m = String(url || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

function ModuloView({ K, A, m, onVoltar, onExercicios }) {
  const [aba, setAba] = useState("teoria");
  const mats = A.materiais.filter((x) => x.modulo_id === m.id && x.ativo);
  const estudo = A.questoes.filter((q) => q.modulo_id === m.id);
  const [ver, setVer] = useState({});
  const temQuestoes = true;
  return (
    <div>
      <button onClick={onVoltar} className="font-body text-sm font-bold mb-3 flex items-center gap-1" style={{ color: C.navy }}><ChevronLeft size={16} /> Voltar aos módulos</button>
      <Titulo eyebrow={`Módulo ${m.ordem}`} title={m.titulo} sub={m.descricao} direita={temQuestoes && <Btn tipo="amarelo" icon={PlayCircle} onClick={onExercicios}>Fazer exercícios</Btn>} />
      <div className="flex gap-1.5 mb-4 flex-wrap">{[["teoria", "Conteúdo teórico"], ["resumo", "Resumo"], ["aulas", `Aulas e materiais (${mats.length})`], ["comentadas", `Questões comentadas (${estudo.length})`]].map(([k, l]) => <Chip key={k} ativo={aba === k} onClick={() => setAba(k)}>{l}</Chip>)}</div>
      {aba === "teoria" && <Card>{m.teoria ? <Texto>{m.teoria}</Texto> : <p className="font-body text-sm" style={{ color: C.soft }}>Conteúdo teórico ainda não cadastrado.</p>}</Card>}
      {aba === "resumo" && <Card style={{ background: C.yellowTint, borderColor: C.yellow }}>{m.resumo ? <Texto>{m.resumo}</Texto> : <p className="font-body text-sm" style={{ color: C.soft }}>Resumo ainda não cadastrado.</p>}</Card>}
      {aba === "aulas" && (mats.length ? <div className="space-y-3">{mats.map((x) => { const emb = x.tipo === "video" && videoEmbed(x.url); return (
        <Card key={x.id}>
          <div className="flex items-center gap-2 mb-2">{x.tipo === "pdf" ? <FileText size={16} color={C.red} /> : x.tipo === "video" ? <PlayCircle size={16} color={C.blue} /> : <BookOpen size={16} color={C.navy} />}<p className="font-display font-bold" style={{ color: C.navy }}>{x.titulo}</p><Chip>{{ aula: "Aula", pdf: "PDF", video: "Vídeo-aula" }[x.tipo]}</Chip></div>
          {x.conteudo && <Texto className="mb-2">{x.conteudo}</Texto>}
          {emb ? <div className="aspect-video rounded-xl overflow-hidden"><iframe src={emb} title={x.titulo} className="w-full h-full" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen /></div>
            : x.url && <a href={x.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-body text-sm font-bold px-3 py-2 rounded-xl" style={{ background: C.navyTint, color: C.navy }}>{x.tipo === "pdf" ? <><Download size={14} /> Abrir PDF</> : <><PlayCircle size={14} /> Assistir</>}</a>}
        </Card>); })}</div> : <Vazio>Nenhuma aula, PDF ou vídeo cadastrado para este módulo ainda.</Vazio>)}
      {aba === "comentadas" && (estudo.length ? <div className="space-y-3">{estudo.map((q, i) => (
        <Card key={q.id}><p className="font-body text-sm font-bold mb-2">{i + 1}. {q.enunciado}</p>
          <div className="space-y-1.5">{q.alternativas.map((a, j) => <div key={j} className="rounded-xl border px-3 py-2 font-body text-sm" style={{ borderColor: ver[q.id] && j === q.correta ? C.green : C.line, background: ver[q.id] && j === q.correta ? C.greenTint : "#fff" }}><b>{LETRAS[j]})</b> {a}</div>)}</div>
          {ver[q.id] ? <div className="mt-2"><Aviso tipo="ok"><b>Resposta: {LETRAS[q.correta]}.</b> {q.comentario}</Aviso></div> : <Btn small tipo="fantasma" className="mt-2" onClick={() => setVer({ ...ver, [q.id]: true })}>Ver resposta comentada</Btn>}
        </Card>))}</div> : <Vazio>Nenhuma questão comentada neste módulo. Use "Fazer exercícios" para praticar.</Vazio>)}
    </div>
  );
}

// ----------------------------------------------------------------- PROVA (cronômetro + correção no servidor)
function Prova({ K, p, onFim, onSair }) {
  const [resp, setResp] = useState({});
  const [i, setI] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const fim = useRef(p.tempo_limite_seg ? Date.now() + p.tempo_limite_seg * 1000 : null);
  const inicio = useRef(Date.now());
  const [agora, setAgora] = useState(Date.now());
  const enviado = useRef(false);
  const enviar = async () => {
    if (enviado.current) return; enviado.current = true; setEnviando(true);
    try { onFim(await finalizarSimulado(p.id, resp)); } catch (e) { enviado.current = false; setEnviando(false); K.avisar(msgErro(e), "erro"); }
  };
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 1000); return () => clearInterval(t); }, []);
  const restante = fim.current ? (fim.current - agora) / 1000 : null;
  useEffect(() => { if (restante != null && restante <= 0) enviar(); }, [restante != null && restante <= 0]);
  useEffect(() => { const f = (e) => { if (!enviado.current) { e.preventDefault(); e.returnValue = ""; } }; window.addEventListener("beforeunload", f); return () => window.removeEventListener("beforeunload", f); }, []);
  const q = p.questoes[i];
  const respondidas = Object.keys(resp).length;
  return (
    <div>
      <div className="sticky top-[60px] z-30 -mx-4 px-4 py-2 mb-4 border-b flex items-center gap-3 flex-wrap" style={{ background: C.gray, borderColor: C.line }}>
        <p className="font-display font-bold" style={{ color: C.navy }}>{MODALIDADES[p.modalidade]?.l}</p>
        <Chip>{respondidas}/{p.total} respondidas</Chip>
        <span className="ml-auto inline-flex items-center gap-1.5 font-display font-extrabold text-lg px-3 py-1 rounded-xl" style={{ background: restante != null && restante < 60 ? C.redTint : "#fff", color: restante != null && restante < 60 ? C.red : C.navy }}><Timer size={18} /> {restante != null ? mmss(restante) : mmss((agora - inicio.current) / 1000)}</span>
      </div>
      <Card>
        <p className="font-body text-[11px] font-bold uppercase" style={{ color: C.yellowInk }}>Questão {i + 1} de {p.total} · {q.modulo}</p>
        <p className="font-body text-base font-bold mt-2 mb-3" style={{ color: C.ink }}>{q.enunciado}</p>
        <div className="space-y-2">{q.alternativas.map((a, j) => { const on = resp[q.id] === j; return (
          <button key={j} disabled={enviando} onClick={() => setResp({ ...resp, [q.id]: j })} className="w-full text-left rounded-xl border-2 px-3 py-2.5 font-body text-sm flex gap-2 transition" style={{ borderColor: on ? C.navy : C.line, background: on ? C.navyTint : "#fff" }}>
            <span className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: on ? C.navy : C.gray, color: on ? "#fff" : C.muted }}>{LETRAS[j]}</span><span>{a}</span></button>); })}</div>
        <div className="flex justify-between mt-4 gap-2">
          <Btn tipo="claro" icon={ChevronLeft} disabled={i === 0} onClick={() => setI(i - 1)}>Anterior</Btn>
          {i < p.total - 1 ? <Btn onClick={() => setI(i + 1)}>Próxima <ChevronRight size={15} /></Btn> : <Btn tipo="amarelo" icon={Send} disabled={enviando} onClick={() => { if (respondidas < p.total && !confirm(`Faltam ${p.total - respondidas} questão(ões). Enviar mesmo assim? Questões em branco contam como erro.`)) return; enviar(); }}>{enviando ? "Corrigindo..." : "Finalizar e corrigir"}</Btn>}
        </div>
      </Card>
      <div className="flex flex-wrap gap-1.5 mt-4">{p.questoes.map((x, j) => <button key={x.id} onClick={() => setI(j)} className="w-9 h-9 rounded-lg font-body text-xs font-bold border" style={{ borderColor: j === i ? C.navy : C.line, background: resp[x.id] != null ? C.navy : "#fff", color: resp[x.id] != null ? "#fff" : C.muted }}>{j + 1}</button>)}</div>
      <div className="flex justify-between mt-5 gap-2 flex-wrap"><Btn small tipo="perigo" onClick={onSair}>Abandonar</Btn>{i < p.total - 1 && <Btn small tipo="amarelo" icon={Send} disabled={enviando} onClick={() => { if (confirm(`Finalizar agora? ${p.total - respondidas} questão(ões) em branco contam como erro.`)) enviar(); }}>Finalizar agora</Btn>}</div>
    </div>
  );
}

function Resultado({ r, onVoltar, onRefazer }) {
  const bom = r.pct >= 80;
  return (
    <div>
      <Titulo eyebrow="Resultado" title={MODALIDADES[r.modalidade]?.l || "Simulado"} direita={<><Btn tipo="claro" icon={ChevronLeft} onClick={onVoltar}>Voltar</Btn><Btn tipo="amarelo" icon={RotateCcw} onClick={onRefazer}>Fazer outro</Btn></>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPI titulo="Aproveitamento" valor={`${r.pct}%`} icon={Target} cor={bom ? C.green : C.yellowDeep} destaque />
        <KPI titulo="Acertos" valor={`${r.acertos}/${r.total}`} sub={`${r.total - r.acertos} erro(s)`} icon={CheckCircle2} cor={C.green} />
        <KPI titulo="Pontos ganhos" valor={r.pontos} sub={r.modalidade === "exercicio" ? "exercícios não pontuam" : r.fora_do_tempo ? "enviado fora do tempo: sem bônus" : ""} icon={Trophy} cor={C.yellowDeep} />
        <KPI titulo="Tempo utilizado" valor={mmss(r.tempo_seg)} icon={Timer} />
      </div>
      <Aviso tipo={bom ? "ok" : "amarelo"}>{r.pct >= 100 ? "Gabaritou! Excelente preparo. 🎉" : bom ? "Ótimo resultado! Revise os erros abaixo para fixar." : "Continue praticando: leia os comentários das questões que errou e revise o resumo dos módulos."}</Aviso>
      <p className="font-display font-bold mt-5 mb-2" style={{ color: C.navy }}>Gabarito comentado</p>
      <div className="space-y-3">{(r.gabarito || []).map((q, i) => { const ok = q.resposta === q.correta; return (
        <Card key={q.id} style={{ borderColor: ok ? C.green : C.red }}>
          <div className="flex gap-2 items-start">{ok ? <CheckCircle2 size={18} color={C.green} className="shrink-0 mt-0.5" /> : <XCircle size={18} color={C.red} className="shrink-0 mt-0.5" />}<div className="min-w-0">
            <p className="font-body text-[11px] font-bold uppercase" style={{ color: C.yellowInk }}>{i + 1} · {q.modulo}</p>
            <p className="font-body text-sm font-bold mt-0.5">{q.enunciado}</p>
            <div className="space-y-1 mt-2">{q.alternativas.map((a, j) => <p key={j} className="font-body text-sm rounded-lg px-2 py-1" style={{ background: j === q.correta ? C.greenTint : j === q.resposta ? C.redTint : "transparent", color: j === q.correta ? C.green : j === q.resposta ? C.red : C.ink }}><b>{LETRAS[j]})</b> {a}{j === q.correta ? " ✓" : j === q.resposta ? " (sua resposta)" : ""}</p>)}</div>
            {q.resposta == null && <p className="font-body text-xs mt-1" style={{ color: C.red }}>Em branco</p>}
            {q.comentario && <p className="font-body text-sm mt-2 leading-relaxed" style={{ color: C.muted }}><Lightbulb size={13} className="inline mr-1" color={C.yellowDeep} />{q.comentario}</p>}
          </div></div>
        </Card>); })}</div>
    </div>
  );
}

function Ranking({ ranking, eu }) {
  const cores = ["#D4A017", "#A7B1BC", "#B8733A"];
  if (!ranking.length) return <Vazio>Nenhum agente no ranking ainda.</Vazio>;
  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-3 mb-4">{ranking.slice(0, 3).map((r, i) => (
        <Card key={r.user_id} className="text-center" style={{ borderColor: cores[i], borderWidth: 2 }}>
          <Medal size={30} color={cores[i]} className="mx-auto" />
          <p className="font-display font-extrabold text-lg mt-1" style={{ color: C.navy }}>{i + 1}º · {r.nome}</p>
          <p className="font-display font-extrabold text-2xl" style={{ color: C.yellowInk }}>{r.pontos} pts</p>
          <p className="font-body text-xs" style={{ color: C.muted }}>{r.simulados} simulado(s) · média {r.media}%</p>
        </Card>))}</div>
      <Card className="!p-0 overflow-x-auto"><table className="w-full font-body text-sm"><thead><tr className="text-left text-[11px] uppercase" style={{ background: C.gray, color: C.muted }}><th className="px-3 py-2">Posição</th><th className="px-3 py-2">Agente</th><th className="px-3 py-2 text-right">Pontos</th><th className="px-3 py-2 text-right">Simulados</th><th className="px-3 py-2 text-right">Média</th></tr></thead>
        <tbody>{ranking.map((r, i) => <tr key={r.user_id} className="border-t" style={{ borderColor: C.line, background: r.user_id === eu ? C.yellowTint : i < 3 ? "#FFFDF3" : "#fff" }}><td className="px-3 py-2 font-bold">{i < 3 ? ["🥇", "🥈", "🥉"][i] : `${i + 1}º`}</td><td className="px-3 py-2">{r.nome}{r.user_id === eu ? " (você)" : ""}</td><td className="px-3 py-2 text-right font-bold">{r.pontos}</td><td className="px-3 py-2 text-right">{r.simulados}</td><td className="px-3 py-2 text-right">{r.media}%</td></tr>)}</tbody></table></Card>
      <p className="font-body text-[11px] mt-2" style={{ color: C.soft }}>Atualizado automaticamente a cada simulado concluído. Exercícios de módulo não entram no ranking.</p>
    </div>
  );
}

function Historico({ tentativas, modulos, nomes, soTabela }) {
  const sims = tentativas.filter((t) => t.modalidade !== "exercicio");
  if (!tentativas.length) return <Vazio>Você ainda não fez nenhum simulado. Comece pelo simulado rápido!</Vazio>;
  const melhor = sims.reduce((b, t) => (!b || Number(t.pct) > Number(b.pct) ? t : b), null);
  const media = sims.length ? Math.round((10 * sims.reduce((s, t) => s + Number(t.pct), 0)) / sims.length) / 10 : 0;
  const evol = [...sims].sort((a, b) => a.finalizado_em.localeCompare(b.finalizado_em)).map((t, i) => ({ n: `${i + 1}º`, pct: Number(t.pct) }));
  const porModulo = modulos.filter((m) => m.ativo).map((m) => ({ m, ...desempenhoModulo(tentativas, m.id) })).filter((x) => x.total);
  const tabela = (
    <Card className="!p-0 overflow-x-auto"><table className="w-full font-body text-sm"><thead><tr className="text-left text-[11px] uppercase" style={{ background: C.gray, color: C.muted }}>{nomes && <th className="px-3 py-2">Agente</th>}<th className="px-3 py-2">Data</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2 text-right">Acertos</th><th className="px-3 py-2 text-right">Erros</th><th className="px-3 py-2 text-right">%</th><th className="px-3 py-2 text-right">Pontos</th><th className="px-3 py-2 text-right">Tempo</th></tr></thead>
      <tbody>{tentativas.map((t) => <tr key={t.id} className="border-t" style={{ borderColor: C.line }}>{nomes && <td className="px-3 py-1.5">{nomes[t.user_id] || "—"}</td>}<td className="px-3 py-1.5 whitespace-nowrap">{dataHora(t.finalizado_em)}</td><td className="px-3 py-1.5">{MODALIDADES[t.modalidade]?.l}</td><td className="px-3 py-1.5 text-right" style={{ color: C.green }}>{t.acertos}</td><td className="px-3 py-1.5 text-right" style={{ color: C.red }}>{t.total - t.acertos}</td><td className="px-3 py-1.5 text-right font-bold">{t.pct}%</td><td className="px-3 py-1.5 text-right">{t.pontos}</td><td className="px-3 py-1.5 text-right">{mmss(t.tempo_seg)}{t.fora_do_tempo ? " ⚠" : ""}</td></tr>)}</tbody></table></Card>
  );
  if (soTabela) return tabela;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI titulo="Simulados" valor={sims.length} sub={`${tentativas.length - sims.length} exercício(s)`} icon={ListChecks} />
        <KPI titulo="Melhor resultado" valor={melhor ? `${melhor.pct}%` : "—"} icon={Trophy} cor={C.yellowDeep} />
        <KPI titulo="Média de aproveitamento" valor={`${media}%`} icon={Target} cor={C.green} />
        <KPI titulo="Pontos acumulados" valor={sims.reduce((s, t) => s + t.pontos, 0)} icon={Medal} cor={C.yellowDeep} destaque />
      </div>
      {evol.length > 1 && <Card><p className="font-display font-bold mb-2" style={{ color: C.navy }}>Evolução do desempenho</p><ResponsiveContainer width="100%" height={220}><LineChart data={evol}><CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" /><XAxis dataKey="n" fontSize={11} /><YAxis domain={[0, 100]} fontSize={11} unit="%" /><Tooltip formatter={(v) => `${v}%`} /><Line dataKey="pct" name="Aproveitamento" stroke={C.navy} strokeWidth={2.5} dot={{ r: 4, fill: C.yellow }} /></LineChart></ResponsiveContainer></Card>}
      {porModulo.length > 0 && <Card><p className="font-display font-bold mb-3" style={{ color: C.navy }}>Aproveitamento por módulo</p><div className="space-y-2.5">{porModulo.sort((a, b) => a.pct - b.pct).map((x) => <div key={x.m.id}><div className="flex justify-between font-body text-xs mb-1"><span>{x.m.titulo}</span><b>{x.pct}% ({x.ok}/{x.total})</b></div><Barra pct={x.pct} cor={x.pct >= 70 ? C.green : x.pct >= 50 ? C.yellowDeep : C.red} /></div>)}</div></Card>}
      {tabela}
    </div>
  );
}

// ----------------------------------------------------------------- PROFESSOR BBB+ (IA)
function Professor({ K, A, minhas }) {
  const [msgs, setMsgs] = useState([]);
  const [txt, setTxt] = useState("");
  const [carr, setCarr] = useState(false);
  const fimRef = useRef(null);
  const ctx = useMemo(() => {
    const desemp = A.modulos.filter((m) => m.ativo).map((m) => { const d = desempenhoModulo(minhas, m.id); return `- ${m.titulo}: ${d.total ? `${d.pct}% de acerto em ${d.total} questões` : "sem questões respondidas"}`; }).join("\n");
    const resumos = A.modulos.filter((m) => m.ativo).map((m) => `## ${m.titulo}\n${(m.resumo || "").slice(0, 700)}`).join("\n\n");
    return `AGENTE: ${K.nome}\nDESEMPENHO POR MÓDULO:\n${desemp}\n\nRESUMOS DOS MÓDULOS CADASTRADOS:\n${resumos}`;
  }, [A, minhas]);
  const enviar = async (texto) => {
    const t = (texto ?? txt).trim(); if (!t || carr) return;
    const nova = [...msgs, { role: "user", content: t }]; setMsgs(nova); setTxt(""); setCarr(true);
    try { const r = await chamarIA({ modo: "professor", messages: nova, contexto: ctx }); setMsgs([...nova, { role: "assistant", content: r }]); }
    catch (e) { setMsgs([...nova, { role: "assistant", content: `⚠ ${e.message}` }]); }
    finally { setCarr(false); setTimeout(() => fimRef.current?.scrollIntoView({ behavior: "smooth" }), 50); }
  };
  const atalhos = ["Quais conteúdos devo revisar primeiro?", "Me ensine juros compostos passo a passo", "Crie 3 exercícios de matemática financeira com resolução", "Explique a diferença entre SAC e Price", "O que o correspondente pode e não pode fazer?", "Resuma a LGPD para a prova"];
  return (
    <Card>
      <div className="flex items-center gap-3 mb-3"><span className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: C.yellow }}><Bot size={22} color={C.navy} /></span><div><p className="font-display font-extrabold" style={{ color: C.navy }}>PROFESSOR BBB+</p><p className="font-body text-xs" style={{ color: C.muted }}>Explica conteúdos, tira dúvidas, ensina matemática financeira, cria exercícios e indica o que revisar com base no seu desempenho.</p></div></div>
      <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
        {!msgs.length && <div className="flex flex-wrap gap-1.5">{atalhos.map((a) => <Chip key={a} onClick={() => enviar(a)}>{a}</Chip>)}</div>}
        {msgs.map((m, i) => <div key={i} className={`rounded-2xl px-3.5 py-2.5 font-body text-sm whitespace-pre-line leading-relaxed ${m.role === "user" ? "ml-8" : "mr-4"}`} style={{ background: m.role === "user" ? C.navy : C.gray, color: m.role === "user" ? "#fff" : C.ink }}>{m.content}</div>)}
        {carr && <p className="font-body text-sm" style={{ color: C.soft }}>Professor BBB+ está pensando...</p>}
        <div ref={fimRef} />
      </div>
      <div className="flex gap-2 mt-3"><input value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enviar()} placeholder="Pergunte ao Professor BBB+..." className={inp} style={inpS} /><Btn icon={Send} disabled={carr || !txt.trim()} onClick={() => enviar()} /></div>
      <p className="font-body text-[11px] mt-2" style={{ color: C.soft }}>As respostas são geradas por IA para estudo e podem conter erros: confira sempre na norma vigente e no material oficial. Não escreva dados de clientes aqui.</p>
    </Card>
  );
}

// ============================================================================= ADMINISTRAÇÃO DO TREINAMENTO
export function AnepsAdm({ K }) {
  const { A, erro, recarregar } = useAneps();
  const [aba, setAba] = useState("modulos");
  const [cfg, setCfg] = useState(null);
  useEffect(() => { lerConfigNova().then((c) => setCfg(c.aneps)).catch(() => setCfg(ANEPS_PADRAO)); }, []);
  const [instalando, setInstalando] = useState(false);
  if (!A) return <p className="font-body text-sm">Carregando...</p>;
  const nomes = Object.fromEntries(K.D.membros.map((m) => [m.user_id, m.nome]));
  const instalar = async () => { setInstalando(true); try { const r = await instalarConteudoInicial(); K.avisar(`Conteúdo instalado: ${r.nm} módulo(s) e ${r.nq} questão(ões) novas.`); recarregar(); } catch (e) { K.avisar(faltaBanco(e) ? SEM_BANCO : msgErro(e), "erro"); } finally { setInstalando(false); } };
  return (
    <div>
      <Titulo eyebrow="Capacitação" title="Treinamento ANEPS" sub="Módulos, aulas, PDFs, vídeos, banco de questões, pontuação, tempo de prova, resultados e ranking." direita={<Btn tipo="amarelo" icon={Download} disabled={instalando} onClick={instalar}>{instalando ? "Instalando..." : "Instalar conteúdo inicial"}</Btn>} />
      <ErroBanco erro={erro} />
      <div className="mb-3"><Aviso tipo="amarelo">O conteúdo inicial (9 módulos e 45 questões) é material de estudo independente. Revise e atualize conforme a matriz vigente da certificação escolhida antes de liberar às agentes. Não apresente o treinamento como certificação oficial da ANEPS.</Aviso></div>
      <div className="flex gap-1.5 mb-4 flex-wrap">{[["modulos", "Módulos e aulas"], ["questoes", `Questões (${A.todasQuestoes.length})`], ["config", "Pontuação e tempo"], ["resultados", "Resultados"], ["ranking", "Ranking"]].map(([k, l]) => <Chip key={k} ativo={aba === k} onClick={() => setAba(k)}>{l}</Chip>)}</div>
      {aba === "modulos" && <ModulosAdm K={K} A={A} recarregar={recarregar} />}
      {aba === "questoes" && <QuestoesAdm K={K} A={A} recarregar={recarregar} />}
      {aba === "config" && cfg && <ConfigAneps K={K} cfg={cfg} setCfg={setCfg} />}
      {aba === "resultados" && <ResultadosAdm A={A} nomes={nomes} />}
      {aba === "ranking" && <Ranking ranking={A.ranking} eu={K.eu} />}
    </div>
  );
}

function ModulosAdm({ K, A, recarregar }) {
  const [ed, setEd] = useState(null); const [mat, setMat] = useState(null); const [env, setEnv] = useState(false);
  const salvarMod = async () => { if (!ed.titulo) return K.avisar("Informe o título.", "erro"); try { const { id, criado_em, atualizado_em, ...d } = ed; await gravar("modulos", id, { ...d, ordem: Number(d.ordem) || 1 }); K.avisar("Módulo salvo."); setEd(null); recarregar(); } catch (e) { K.avisar(msgErro(e), "erro"); } };
  const salvarMat = async () => { if (!mat.titulo) return K.avisar("Informe o título.", "erro"); if (mat.tipo !== "aula" && !mat.url) return K.avisar(mat.tipo === "pdf" ? "Envie o arquivo PDF." : "Informe o link do vídeo.", "erro"); try { const { id, criado_em, ...d } = mat; await gravar("materiais", id, { ...d, ordem: Number(d.ordem) || 1 }); K.avisar("Material salvo."); setMat(null); recarregar(); } catch (e) { K.avisar(msgErro(e), "erro"); } };
  const pdf = async (f) => { if (!f) return; if (f.type !== "application/pdf") return K.avisar("Envie um arquivo PDF.", "erro"); setEnv(true); try { setMat({ ...mat, url: await K.enviarArquivo(f, "aneps"), titulo: mat.titulo || f.name.replace(/\.pdf$/i, "") }); } catch (e) { K.avisar(msgErro(e), "erro"); } finally { setEnv(false); } };
  return (
    <div>
      <div className="flex justify-end mb-3"><Btn icon={Plus} onClick={() => setEd({ ordem: A.modulos.length + 1, ativo: true })}>Novo módulo</Btn></div>
      {A.modulos.length ? <div className="space-y-3">{A.modulos.map((m) => { const mats = A.materiais.filter((x) => x.modulo_id === m.id); const nq = A.todasQuestoes.filter((q) => q.modulo_id === m.id).length; return (
        <Card key={m.id}>
          <div className="flex items-start gap-2 flex-wrap"><div className="flex-1 min-w-[200px]"><p className="font-display font-bold" style={{ color: C.navy }}>{m.ordem}. {m.titulo} {!m.ativo && <Chip cor={C.soft}>inativo</Chip>}</p><p className="font-body text-xs" style={{ color: C.muted }}>{nq} questão(ões) · {mats.length} material(is)</p></div>
            <Btn small tipo="claro" onClick={() => setEd(m)}>Editar conteúdo</Btn><Btn small tipo="fantasma" icon={Plus} onClick={() => setMat({ modulo_id: m.id, tipo: "aula", ordem: mats.length + 1, ativo: true })}>Aula / PDF / vídeo</Btn></div>
          {mats.length > 0 && <div className="mt-2 space-y-1">{mats.map((x) => <button key={x.id} onClick={() => setMat(x)} className="w-full text-left font-body text-sm px-2.5 py-1.5 rounded-lg flex items-center gap-2" style={{ background: C.gray }}>{x.tipo === "pdf" ? <FileText size={14} /> : x.tipo === "video" ? <PlayCircle size={14} /> : <BookOpen size={14} />} {x.titulo}{!x.ativo && " (inativo)"}</button>)}</div>}
        </Card>); })}</div> : <Vazio>Nenhum módulo. Clique em "Instalar conteúdo inicial" para criar os 9 módulos sugeridos, ou crie um novo.</Vazio>}
      {ed && <Modal onFechar={() => setEd(null)} titulo={ed.id ? ed.titulo : "Novo módulo"} largura="max-w-3xl">
        <Campos v={ed} set={setEd} campos={[{ k: "titulo", l: "Título", req: true }, { k: "ordem", l: "Ordem", t: "number" }, { k: "descricao", l: "Descrição curta", full: true }, { k: "teoria", l: "Conteúdo teórico", t: "textarea", rows: 12, full: true }, { k: "resumo", l: "Resumo", t: "textarea", rows: 6, full: true }, { k: "ativo", l: "Situação", t: "checkbox", texto: "Ativo (aparece para os agentes)" }]} />
        <div className="flex justify-between mt-4">{ed.id ? <Btn small tipo="perigo" icon={Trash2} onClick={async () => { if (!confirm("Excluir o módulo, suas aulas e questões? O histórico de simulados é mantido.")) return; try { await excluir("modulos", ed.id); setEd(null); recarregar(); } catch (e) { K.avisar(msgErro(e), "erro"); } }}>Excluir</Btn> : <span />}<Btn icon={Save} onClick={salvarMod}>Salvar</Btn></div></Modal>}
      {mat && <Modal onFechar={() => setMat(null)} titulo={mat.id ? "Editar material" : "Novo material"}>
        <Campos v={mat} set={setMat} campos={[{ k: "tipo", l: "Tipo", t: "select", semVazio: true, op: [["aula", "Aula (texto)"], ["pdf", "Material em PDF"], ["video", "Vídeo-aula (link)"]] }, { k: "titulo", l: "Título", req: true }, mat.tipo === "video" && { k: "url", l: "Link do vídeo (YouTube, Drive...)", t: "url", full: true }, { k: "conteudo", l: mat.tipo === "aula" ? "Texto da aula" : "Descrição (opcional)", t: "textarea", rows: mat.tipo === "aula" ? 10 : 3, full: true }, { k: "ordem", l: "Ordem", t: "number" }, { k: "ativo", l: "Situação", t: "checkbox", texto: "Ativo" }]} />
        {mat.tipo === "pdf" && <div className="mt-3 flex items-center gap-2 flex-wrap"><label className="cursor-pointer"><span className="inline-flex items-center gap-1.5 font-body text-sm font-bold px-3.5 py-2.5 rounded-xl" style={{ background: C.yellow, color: C.navy }}><Upload size={15} /> {env ? "Enviando..." : mat.url ? "Trocar PDF" : "Enviar PDF"}</span><input type="file" accept="application/pdf" className="hidden" onChange={(e) => pdf(e.target.files?.[0])} /></label>{mat.url && <a href={mat.url} target="_blank" rel="noopener noreferrer" className="font-body text-sm underline" style={{ color: C.navy }}>Ver arquivo atual</a>}</div>}
        <div className="flex justify-between mt-4">{mat.id ? <Btn small tipo="perigo" icon={Trash2} onClick={async () => { try { await excluir("materiais", mat.id); setMat(null); recarregar(); } catch (e) { K.avisar(msgErro(e), "erro"); } }}>Excluir</Btn> : <span />}<Btn icon={Save} onClick={salvarMat}>Salvar</Btn></div></Modal>}
    </div>
  );
}

function QuestoesAdm({ K, A, recarregar }) {
  const [filtro, setFiltro] = useState(""); const [busca, setBusca] = useState(""); const [ed, setEd] = useState(null);
  const nm = Object.fromEntries(A.modulos.map((m) => [m.id, m.titulo]));
  const lista = A.todasQuestoes.filter((q) => (!filtro || q.modulo_id === filtro) && (!busca || q.enunciado.toLowerCase().includes(busca.toLowerCase())));
  const abrir = (q) => setEd(q ? { ...q, a0: q.alternativas[0], a1: q.alternativas[1], a2: q.alternativas[2], a3: q.alternativas[3], correta: String(q.correta) } : { modulo_id: filtro || A.modulos[0]?.id, correta: "0", uso: "simulado", dificuldade: "media", ativo: true });
  const salvar = async () => {
    const alt = [ed.a0, ed.a1, ed.a2, ed.a3].map((x) => String(x || "").trim());
    if (!ed.modulo_id || !String(ed.enunciado || "").trim() || alt.some((x) => !x)) return K.avisar("Preencha módulo, enunciado e as 4 alternativas.", "erro");
    try { await gravar("questoes", ed.id, { modulo_id: ed.modulo_id, enunciado: ed.enunciado.trim(), alternativas: alt, correta: Number(ed.correta), comentario: ed.comentario || null, uso: ed.uso, dificuldade: ed.dificuldade, ativo: !!ed.ativo }); K.avisar("Questão salva."); setEd(null); recarregar(); } catch (e) { K.avisar(msgErro(e), "erro"); }
  };
  if (!A.modulos.length) return <Vazio>Crie os módulos antes de cadastrar questões.</Vazio>;
  return (
    <div>
      <div className="flex gap-2 mb-3 flex-wrap"><select value={filtro} onChange={(e) => setFiltro(e.target.value)} className={inp} style={{ ...inpS, width: "auto" }}><option value="">Todos os módulos</option>{A.modulos.map((m) => <option key={m.id} value={m.id}>{m.titulo}</option>)}</select><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar no enunciado..." className={inp} style={{ ...inpS, maxWidth: 260 }} /><Btn className="ml-auto" icon={Plus} onClick={() => abrir(null)}>Nova questão</Btn></div>
      <p className="font-body text-xs mb-2" style={{ color: C.muted }}>{lista.length} questão(ões). Para o simulado completo (30 questões) é preciso ter pelo menos 30 questões de simulado ativas.</p>
      <div className="space-y-2">{lista.map((q) => <Card key={q.id} className="!p-3" onClick={() => abrir(q)}><p className="font-body text-sm">{q.enunciado}</p><div className="flex gap-1.5 mt-1.5 flex-wrap"><Chip>{nm[q.modulo_id]}</Chip><Chip cor={C.green}>Resposta {LETRAS[q.correta]}</Chip><Chip cor={q.uso === "estudo" ? C.blue : C.navy}>{q.uso === "estudo" ? "questão comentada (aberta)" : "simulado"}</Chip>{!q.ativo && <Chip cor={C.soft}>inativa</Chip>}</div></Card>)}</div>
      {ed && <Modal onFechar={() => setEd(null)} titulo={ed.id ? "Editar questão" : "Nova questão"} largura="max-w-3xl">
        <Campos v={ed} set={setEd} campos={[{ k: "modulo_id", l: "Módulo", t: "select", semVazio: true, op: A.modulos.map((m) => [m.id, m.titulo]), full: true }, { k: "enunciado", l: "Enunciado", t: "textarea", rows: 3, full: true, req: true },
          { k: "a0", l: "Alternativa A", req: true, full: true }, { k: "a1", l: "Alternativa B", req: true, full: true }, { k: "a2", l: "Alternativa C", req: true, full: true }, { k: "a3", l: "Alternativa D", req: true, full: true },
          { k: "correta", l: "Resposta correta", t: "select", semVazio: true, op: LETRAS.map((l, i) => [String(i), l]) }, { k: "uso", l: "Uso", t: "select", semVazio: true, op: [["simulado", "Simulado (gabarito só no final)"], ["estudo", "Questão comentada aberta no módulo"]] },
          { k: "comentario", l: "Comentário do gabarito", t: "textarea", rows: 3, full: true }, { k: "dificuldade", l: "Dificuldade", t: "select", semVazio: true, op: [["facil", "Fácil"], ["media", "Média"], ["dificil", "Difícil"]] }, { k: "ativo", l: "Situação", t: "checkbox", texto: "Ativa" }]} />
        <div className="flex justify-between mt-4">{ed.id ? <Btn small tipo="perigo" icon={Trash2} onClick={async () => { if (!confirm("Excluir esta questão?")) return; try { await excluir("questoes", ed.id); setEd(null); recarregar(); } catch (e) { K.avisar(msgErro(e), "erro"); } }}>Excluir</Btn> : <span />}<Btn icon={Save} onClick={salvar}>Salvar</Btn></div></Modal>}
    </div>
  );
}

function ConfigAneps({ K, cfg, setCfg }) {
  const [v, setV] = useState({ ...cfg, t_rapido: cfg.tempo?.rapido, t_intermediario: cfg.tempo?.intermediario, t_completo: cfg.tempo?.completo });
  const salvar = async () => {
    const n = (x, d) => (Number.isFinite(Number(x)) && Number(x) >= 0 ? Math.round(Number(x)) : d);
    const novo = { ponto_acerto: n(v.ponto_acerto, 10), bonus_conclusao: n(v.bonus_conclusao, 20), bonus_80: n(v.bonus_80, 50), bonus_100: n(v.bonus_100, 100), certificacao: v.certificacao || "ANEPS", tempo: { rapido: Math.max(1, n(v.t_rapido, 15)), intermediario: Math.max(1, n(v.t_intermediario, 30)), completo: Math.max(1, n(v.t_completo, 45)) } };
    try { await salvarConfigAneps(novo); setCfg(novo); K.avisar("Configuração salva. Vale para os próximos simulados."); } catch (e) { K.avisar(faltaBanco(e) ? SEM_BANCO : msgErro(e), "erro"); }
  };
  return (
    <Card>
      <p className="font-display font-bold mb-3" style={{ color: C.navy }}>Pontuação</p>
      <Campos v={v} set={setV} campos={[{ k: "ponto_acerto", l: "Pontos por questão correta", t: "number" }, { k: "bonus_conclusao", l: "Bônus por simulado concluído", t: "number" }, { k: "bonus_80", l: "Bônus por aproveitamento ≥ 80%", t: "number" }, { k: "bonus_100", l: "Bônus por aproveitamento de 100%", t: "number", dica: "Com 100% vale este bônus (no lugar do de 80%)." }]} />
      <p className="font-display font-bold mt-5 mb-3" style={{ color: C.navy }}>Tempo de prova (minutos)</p>
      <Campos v={v} set={setV} campos={[{ k: "t_rapido", l: "Simulado rápido (10 questões)", t: "number" }, { k: "t_intermediario", l: "Simulado intermediário (20)", t: "number" }, { k: "t_completo", l: "Simulado completo (30)", t: "number" }, { k: "certificacao", l: "Certificação de referência", dica: "Ex.: ANEPS — Correspondente no País" }]} />
      <div className="mt-3"><Aviso>Simulados enviados mais de 90 segundos depois do tempo recebem só os pontos dos acertos (sem bônus). Mudanças valem para simulados iniciados depois de salvar.</Aviso></div>
      <div className="flex justify-end mt-4"><Btn icon={Save} onClick={salvar}>Salvar</Btn></div>
    </Card>
  );
}

function ResultadosAdm({ A, nomes }) {
  const [quem, setQuem] = useState("");
  const fin = A.tentativas.filter((t) => t.status === "finalizada" && (!quem || t.user_id === quem));
  const sims = fin.filter((t) => t.modalidade !== "exercicio");
  const media = sims.length ? Math.round((10 * sims.reduce((s, t) => s + Number(t.pct), 0)) / sims.length) / 10 : 0;
  const ids = [...new Set(A.tentativas.map((t) => t.user_id))];
  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center"><select value={quem} onChange={(e) => setQuem(e.target.value)} className={inp} style={{ ...inpS, width: "auto" }}><option value="">Todos os agentes</option>{ids.map((u) => <option key={u} value={u}>{nomes[u] || u.slice(0, 8)}</option>)}</select></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><KPI titulo="Simulados concluídos" valor={sims.length} icon={ListChecks} /><KPI titulo="Exercícios" valor={fin.length - sims.length} icon={BookOpen} /><KPI titulo="Média geral" valor={`${media}%`} icon={Target} cor={C.green} /><KPI titulo="Pontos distribuídos" valor={sims.reduce((s, t) => s + t.pontos, 0)} icon={Trophy} cor={C.yellowDeep} /></div>
      <Card><p className="font-display font-bold mb-3" style={{ color: C.navy }}>Desempenho por módulo {quem ? `· ${nomes[quem] || ""}` : "· equipe"}</p><div className="space-y-2.5">{A.modulos.map((m) => { const d = desempenhoModulo(fin, m.id); return d.total ? <div key={m.id}><div className="flex justify-between font-body text-xs mb-1"><span>{m.titulo}</span><b>{d.pct}% ({d.ok}/{d.total})</b></div><Barra pct={d.pct} cor={d.pct >= 70 ? C.green : d.pct >= 50 ? C.yellowDeep : C.red} /></div> : null; })}</div></Card>
      {fin.length ? <Historico tentativas={fin} modulos={[]} nomes={nomes} soTabela /> : <Vazio>Nenhum resultado ainda.</Vazio>}
    </div>
  );
}
