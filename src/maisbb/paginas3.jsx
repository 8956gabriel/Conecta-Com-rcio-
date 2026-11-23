import React, { useMemo, useState } from "react";
import { Plus, Pencil, Save, Trash2, Trophy, Gift, Shuffle, FileDown, FileSpreadsheet, Upload, ShieldCheck, Sparkles, CheckCircle2, XCircle, Database, Users, History } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line } from "recharts";
import { supabase } from "../supabaseClient";
import { C, Titulo, Btn, Card, KPI, Aviso, Chip, Vazio, Selo, Modal, Campos, Campo, Copiar, Texto, inputCls, inputSty, chamarIA } from "../central/ui.jsx";
import { exportarExcel, exportarPDF } from "../central/motor.js";
import { TREINAMENTO, DICAS, CATEGORIAS_ATENDIMENTO, RESULTADOS, TIPOS_PROSPECCAO, OPORTUNIDADE, ORIGENS, datasComemorativas } from "./conteudo.js";
import { indicadores, periodo, progressoMeta, NOMES_INDICADOR, pontuacao, sortear, sha256, hojeISO, dataBR, dataLocal, isoData, diasEntre, todasDicas, dicaDoDia, listaPublicos, msgErro, enviarArquivo, urlArquivo, TAB } from "./base.js";
import { FormModal, limpar } from "./formularios.jsx";

const NAVY = "#0B2559", AMARELO = "#FCD535", NAVY_RGB = [11, 37, 89];
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export default function Paginas3({ K, pagina }) {
  if (pagina === "ranking") return <Ranking K={K} />;
  if (pagina === "desafios") return <Desafios K={K} />;
  if (pagina === "dicas") return <Dicas K={K} />;
  if (pagina === "treinamento") return <Treinamento K={K} />;
  if (pagina === "inteligencia") return <Inteligencia K={K} />;
  if (pagina === "relatorios") return <Relatorios K={K} />;
  if (pagina === "admin") return K.admin ? <Admin K={K} /> : <Vazio>Área exclusiva do administrador.</Vazio>;
  return <Metas K={K} />;
}

// ============================================================================= METAS
function Metas({ K }) {
  const [abrir, setAbrir] = useState(null);
  const ano = new Date().getFullYear();
  const comp = MESES.map((m, i) => { const p = { de: isoData(new Date(ano, i, 1)), ate: isoData(new Date(ano, i + 1, 0)) }; const k = indicadores(K.d, p); return { m, atendimentos: k.atendimentos, novos: k.novos_clientes, prospeccoes: k.prospeccoes, retornos: k.retornos }; });
  const nome = (id) => (id ? K.d.usuarios.find((u) => u.id === id)?.nome : "Equipe");
  return (
    <div>
      <Titulo eyebrow="Desempenho" title="Metas" sub="Meta planejada × resultado real, com percentual e evolução." direita={K.admin && <Btn icon={Plus} onClick={() => setAbrir({ indicador: "atendimentos", periodo: "mes", alvo: 50, ativo: true })}>Nova meta</Btn>} />
      {K.d.metas.filter((m) => m.ativo).length ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{K.d.metas.filter((m) => m.ativo).map((m) => { const r = progressoMeta(K.d, m); return (
        <Card key={m.id}><div className="flex justify-between"><p className="font-body text-sm font-bold" style={{ color: NAVY }}>{NOMES_INDICADOR[m.indicador]}</p>{K.admin && <button onClick={() => setAbrir(m)}><Pencil size={14} color={C.soft} /></button>}</div>
          <p className="font-body text-xs" style={{ color: C.soft }}>{nome(m.usuario_id)} · {{ dia: "hoje", semana: "esta semana", mes: "este mês" }[m.periodo]}</p>
          <p className="font-display font-extrabold text-2xl mt-1" style={{ color: NAVY }}>{r.valor}<span className="text-sm" style={{ color: C.soft }}> / {m.alvo}</span></p>
          <div className="h-3 rounded-full mt-1 overflow-hidden" style={{ background: "#EEF2FA" }}><div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.pct >= 100 ? "#16A34A" : AMARELO }} /></div>
          <p className="font-body text-xs mt-1 font-bold" style={{ color: r.pct >= 100 ? "#16A34A" : NAVY }}>{r.pct}%{r.pct >= 100 ? " · meta batida! 🎉" : ""}</p></Card>); })}</div> : <Vazio>{K.admin ? "Nenhuma meta. Crie metas de atendimentos, novos clientes, prospecções, visitas, retornos, campanhas e interessados." : "O administrador ainda não configurou metas."}</Vazio>}
      <Card className="mt-4"><p className="font-display font-bold mb-2" style={{ color: NAVY }}>Comparação mensal · {ano}</p>
        <ResponsiveContainer width="100%" height={260}><BarChart data={comp}><CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" /><XAxis dataKey="m" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="atendimentos" name="Atendimentos" fill={NAVY} /><Bar dataKey="novos" name="Novos clientes" fill={AMARELO} /><Bar dataKey="prospeccoes" name="Prospecções" fill="#64748B" /><Bar dataKey="retornos" name="Retornos" fill="#16A34A" /></BarChart></ResponsiveContainer></Card>
      {abrir && <FormModal titulo={abrir.id ? "Editar meta" : "Nova meta"} inicial={abrir} onFechar={() => setAbrir(null)}
        campos={[{ k: "indicador", l: "Indicador", t: "select", semVazio: true, op: Object.entries(NOMES_INDICADOR) }, { k: "periodo", l: "Período", t: "select", semVazio: true, op: [["dia", "Diária"], ["semana", "Semanal"], ["mes", "Mensal"]] }, { k: "alvo", l: "Meta", t: "number", req: true }, { k: "usuario_id", l: "Atendente (vazio = equipe)", t: "select", op: K.d.usuarios.map((u) => [u.id, u.nome]) }, { k: "ativo", l: "Situação", t: "checkbox", texto: "Ativa" }]}
        onSalvar={async (v) => { await K.salvar("metas", abrir.id, limpar(v, ["alvo"])); }} onExcluir={abrir.id ? () => K.apagar("metas", abrir.id) : null} />}
    </div>
  );
}

// ============================================================================= RANKING
function Ranking({ K }) {
  const [per, setPer] = useState("mes");
  const p = periodo(per);
  const linhas = K.d.usuarios.filter((u) => u.ativo).map((u) => {
    const k = indicadores(K.d, p, u.id);
    const metas = K.d.metas.filter((m) => m.ativo && (m.usuario_id === u.id || !m.usuario_id) && m.periodo === (per === "dia" ? "dia" : per === "semana" ? "semana" : "mes"));
    const pcts = metas.map((m) => { const v = indicadores(K.d, p, m.usuario_id ? u.id : null)[m.indicador] || 0; return Math.min(100, Math.round((100 * v) / m.alvo)); });
    return { u, k, pts: pontuacao(K.d, k), metaPct: pcts.length ? Math.round(pcts.reduce((s, x) => s + x, 0) / pcts.length) : null, resolucao: k.atendimentos ? Math.round((100 * k.resolvidos) / k.atendimentos) : null, retPrazo: k.retornosTotal ? Math.round((100 * k.retornosNoPrazo) / k.retornosTotal) : null };
  }).sort((a, b) => b.pts - a.pts);
  const medalha = (i) => ["🥇 Ouro", "🥈 Prata", "🥉 Bronze"][i] || "";
  return (
    <div>
      <Titulo eyebrow="Produtividade" title="Ranking por atendente" sub="Produtividade (pontos) e qualidade aparecem separados: quantidade sozinha não mede um bom atendimento." />
      <div className="flex gap-1.5 mb-4">{[["dia", "Diário"], ["semana", "Semanal"], ["mes", "Mensal"], ["ano", "Anual"]].map(([k, l]) => <Chip key={k} cor={NAVY} ativo={per === k} onClick={() => setPer(k)}>{l}</Chip>)}</div>
      <div className="grid sm:grid-cols-3 gap-3 mb-4">{linhas.slice(0, 3).map((l, i) => <Card key={l.u.id} style={{ borderColor: ["#D4A017", "#A8A9AD", "#CD7F32"][i], borderWidth: 2 }}><p className="font-display font-extrabold text-lg" style={{ color: ["#B8860B", "#6B7280", "#8B5A2B"][i] }}>{medalha(i)}</p><p className="font-body font-bold" style={{ color: NAVY }}>{l.u.nome}</p><p className="font-display font-extrabold text-2xl" style={{ color: NAVY }}>{l.pts} pts</p></Card>)}</div>
      <Card className="!p-0 overflow-x-auto"><table className="w-full font-body text-sm">
        <thead><tr className="text-left text-[11px] uppercase" style={{ background: "#F5F7FB", color: C.muted }}><th className="px-3 py-2">Pos.</th><th className="px-3 py-2">Atendente</th><th className="px-3 py-2">Atend.</th><th className="px-3 py-2">Concluídos</th><th className="px-3 py-2">Novos clientes</th><th className="px-3 py-2">Prospecções</th><th className="px-3 py-2">Pontos</th><th className="px-3 py-2">Metas %</th><th className="px-3 py-2">Qualidade: resolução</th><th className="px-3 py-2">Qualidade: retornos no prazo</th></tr></thead>
        <tbody>{linhas.map((l, i) => <tr key={l.u.id} className="border-t" style={{ borderColor: "#EEF2F7" }}><td className="px-3 py-2 font-bold">{i + 1}º {["🥇", "🥈", "🥉"][i] || ""}</td><td className="px-3 py-2 font-bold" style={{ color: NAVY }}>{l.u.nome}</td><td className="px-3 py-2">{l.k.atendimentos}</td><td className="px-3 py-2">{l.k.concluidos}</td><td className="px-3 py-2">{l.k.novos_clientes}</td><td className="px-3 py-2">{l.k.prospeccoes}</td><td className="px-3 py-2 font-bold">{l.pts}</td><td className="px-3 py-2">{l.metaPct == null ? "—" : `${l.metaPct}%`}</td><td className="px-3 py-2">{l.resolucao == null ? "—" : `${l.resolucao}%`}</td><td className="px-3 py-2">{l.retPrazo == null ? "—" : `${l.retPrazo}%`}</td></tr>)}</tbody></table></Card>
      <p className="font-body text-xs mt-2" style={{ color: C.soft }}>Pontuação configurável pelo administrador. Resolução = atendimentos concluídos, orientados ou encaminhados ÷ total. Retornos no prazo = retornos concluídos até a data combinada ÷ retornos agendados.</p>
    </div>
  );
}

// ============================================================================= DESAFIO DO MÊS E SORTEIOS
function Desafios({ K }) {
  const [abrir, setAbrir] = useState(null);
  const [sel, setSel] = useState(null);
  const d = K.d.desafios.find((x) => x.id === sel);
  if (d) return <DetalheDesafio K={K} d={d} voltar={() => setSel(null)} editar={() => setAbrir(d)} abrir={abrir} setAbrir={setAbrir} />;
  return (
    <div>
      <Titulo eyebrow="Incentivo" title="Desafio do mês e sorteios" sub="Campanhas de incentivo com pontuação e sorteio aleatório auditável (protocolo, semente e hash publicados, relatório em PDF)." direita={K.admin && <Btn icon={Plus} onClick={() => setAbrir({ status: "aberto", pontos_minimos: 1, inicio: hojeISO() })}>Novo desafio</Btn>} />
      <Aviso tipo="amarelo">Antes de qualquer sorteio ou promoção, o administrador deve definir regras claras e validar a conformidade legal (ex.: necessidade de autorização para promoções comerciais com sorteio).</Aviso>
      <div className="grid md:grid-cols-2 gap-3 mt-4">{K.d.desafios.map((x) => <Card key={x.id} onClick={() => setSel(x.id)}>
        <div className="flex gap-3">{x.imagem_path ? <img src={urlArquivo(x.imagem_path)} alt="" className="w-20 h-20 rounded-xl object-cover" /> : <span className="w-20 h-20 rounded-xl flex items-center justify-center" style={{ background: "#FFF6CC" }}><Gift color={NAVY} /></span>}
          <div><p className="font-display font-bold" style={{ color: NAVY }}>{x.nome}</p><p className="font-body text-xs" style={{ color: C.muted }}>Prêmio: {x.premio || "—"}</p><p className="font-body text-xs" style={{ color: C.soft }}>{dataBR(x.inicio)} a {dataBR(x.fim)} · sorteio {dataBR(x.data_sorteio)}</p><Chip cor={{ aberto: "#16A34A", encerrado: "#64748B", sorteado: NAVY }[x.status]}>{x.status}</Chip></div></div></Card>)}
        {!K.d.desafios.length && <Vazio>Nenhum desafio criado.</Vazio>}</div>
      {abrir && <ModalDesafio K={K} d={abrir} onFechar={() => setAbrir(null)} />}
    </div>
  );
}
function ModalDesafio({ K, d, onFechar }) {
  const [img, setImg] = useState(null);
  return <FormModal titulo={d.id ? "Editar desafio" : "Novo desafio"} largura="max-w-3xl" inicial={{ ...d, pontuacao_txt: JSON.stringify(d.pontuacao || {}) }} onFechar={onFechar}
    aviso={<div className="flex items-center gap-2"><Upload size={14} /><input type="file" accept="image/*" onChange={(e) => setImg(e.target.files?.[0] || null)} className="font-body text-xs" /><span className="font-body text-xs" style={{ color: C.soft }}>Imagem do prêmio</span></div>}
    campos={[{ k: "nome", l: "Nome da campanha", req: true, full: true }, { k: "premio", l: "Prêmio" }, { k: "data_sorteio", l: "Data do sorteio", t: "date" }, { k: "inicio", l: "Início", t: "date" }, { k: "fim", l: "Fim", t: "date" }, { k: "pontos_minimos", l: "Pontos mínimos para participar", t: "number" },
      { k: "status", l: "Situação", t: "select", semVazio: true, op: [["aberto", "Aberto"], ["encerrado", "Encerrado"], ["sorteado", "Sorteado"]] }, { k: "regras", l: "Regras", t: "textarea", full: true, rows: 5 },
      { k: "conformidade_ok", l: "Conformidade", t: "checkbox", texto: "Confirmo que as regras foram validadas e o sorteio está em conformidade legal", full: true }]}
    onSalvar={async (v) => { const dados = limpar(v, ["pontos_minimos"]); delete dados.pontuacao_txt; if (img) dados.imagem_path = await enviarArquivo(img, "desafios"); await K.salvar("desafios", d.id, dados); K.avisar("Desafio salvo."); }}
    onExcluir={d.id ? () => K.apagar("desafios", d.id) : null} />;
}
function DetalheDesafio({ K, d, voltar, editar, abrir, setAbrir }) {
  const parts = K.d.participantes.filter((p) => p.desafio_id === d.id).sort((a, b) => b.pontos - a.pontos);
  const eleg = parts.filter((p) => p.elegivel && p.pontos >= (d.pontos_minimos || 0));
  const sorteios = K.d.sorteios.filter((s) => s.desafio_id === d.id);
  const [novo, setNovo] = useState(null); const [rodando, setRodando] = useState(false);
  const importarAtendentes = async () => {
    const p = { de: d.inicio || "2000-01-01", ate: d.fim || hojeISO() };
    try { for (const u of K.d.usuarios.filter((x) => x.ativo)) { const pts = pontuacao(K.d, indicadores(K.d, p, u.id)); const ex = parts.find((x) => x.usuario_id === u.id); await K.salvar("participantes", ex?.id, { desafio_id: d.id, nome: u.nome, usuario_id: u.id, pontos: pts, referencia: "Atendente (pontuação do período)" }); } K.avisar("Pontuação das atendentes atualizada."); } catch (e) { K.avisar(msgErro(e), "erro"); }
  };
  const realizar = async () => {
    if (!d.conformidade_ok) { K.avisar("Confirme a conformidade legal nas configurações do desafio antes de sortear.", "erro"); return; }
    if (!eleg.length) { K.avisar("Não há participantes elegíveis.", "erro"); return; }
    if (!window.confirm(`Realizar o sorteio entre ${eleg.length} participante(s) elegível(is)? O resultado é definitivo e fica registrado.`)) return;
    setRodando(true);
    try {
      const s = await sortear(eleg);
      await K.salvar("sorteios", null, { desafio_id: d.id, protocolo: s.protocolo, semente: s.semente, hash_lista: s.hashLista, participantes: s.lista, ganhador_nome: s.ganhador.nome, ganhador_id: s.ganhador.id });
      await K.salvar("desafios", d.id, { status: "sorteado" });
      K.avisar(`Ganhador(a): ${s.ganhador.nome} · protocolo ${s.protocolo}`);
    } catch (e) { K.avisar(msgErro(e), "erro"); } finally { setRodando(false); }
  };
  const pdf = (s) => exportarPDF(`sorteio-${s.protocolo}`, `Sorteio ${s.protocolo}`, [
    { titulo: "Dados do sorteio", cabecalho: ["Campo", "Valor"], linhas: [["Campanha", d.nome], ["Prêmio", d.premio || "—"], ["Data/hora", new Date(s.realizado_em).toLocaleString("pt-BR")], ["Realizado por", K.d.usuarios.find((u) => u.user_id === s.realizado_por)?.nome || s.realizado_por], ["Protocolo", s.protocolo], ["Semente aleatória", s.semente], ["Hash SHA-256 da lista", s.hash_lista], ["Ganhador(a)", s.ganhador_nome], ["Regra de escolha", "índice = SHA-256(semente + hash da lista) mod nº de participantes (lista ordenada por id)"]] },
    { titulo: "Participantes elegíveis", cabecalho: ["#", "Nome", "Pontos", "id"], linhas: s.participantes.map((p, i) => [i, p.nome, p.pontos, p.id]) },
  ], `Regras: ${(d.regras || "—").slice(0, 180)}`, "Mais BB Digital · Desafio do mês", NAVY_RGB);
  const conferir = async (s) => { const h = await sha256(JSON.stringify(s.participantes)); const x = await sha256(s.semente + h); const i = Number(BigInt(`0x${x}`) % BigInt(s.participantes.length)); K.avisar(h === s.hash_lista && s.participantes[i]?.nome === s.ganhador_nome ? "✔ Sorteio conferido: lista e ganhador batem com o registro." : "✖ Divergência na conferência!", h === s.hash_lista ? "ok" : "erro"); };
  return (
    <div>
      <Btn small tipo="claro" onClick={voltar}>‹ Desafios</Btn>
      <div className="mt-3"><Titulo eyebrow="Desafio" title={d.nome} sub={`Prêmio: ${d.premio || "—"} · ${dataBR(d.inicio)} a ${dataBR(d.fim)} · sorteio em ${dataBR(d.data_sorteio)}`} direita={K.admin && <Btn small tipo="claro" icon={Pencil} onClick={editar}>Editar</Btn>} /></div>
      <div className="grid lg:grid-cols-[1fr_340px] gap-4">
        <div className="space-y-3">
          {d.imagem_path && <img src={urlArquivo(d.imagem_path)} alt="" className="w-full max-h-64 object-cover rounded-2xl" />}
          <Card><p className="font-display font-bold mb-1" style={{ color: NAVY }}>Regras</p><Texto>{d.regras || "Sem regras cadastradas."}</Texto>{!d.conformidade_ok && <div className="mt-2"><Aviso tipo="amarelo">Conformidade legal ainda não confirmada pelo administrador. O sorteio fica bloqueado.</Aviso></div>}</Card>
          <Card><div className="flex justify-between items-center flex-wrap gap-2 mb-2"><p className="font-display font-bold" style={{ color: NAVY }}>Participantes ({parts.length}) · elegíveis ({eleg.length})</p>{K.admin && <div className="flex gap-1.5"><Btn small tipo="claro" onClick={importarAtendentes}>Pontuação das atendentes</Btn><Btn small icon={Plus} onClick={() => setNovo({ desafio_id: d.id, pontos: 0, elegivel: true })}>Participante</Btn></div>}</div>
            {parts.length ? parts.map((p) => <button key={p.id} disabled={!K.admin} onClick={() => setNovo(p)} className="w-full flex justify-between py-1.5 border-b font-body text-sm text-left" style={{ borderColor: "#EEF2F7" }}><span>{p.nome} {p.referencia && <span style={{ color: C.soft }}>· {p.referencia}</span>}</span><span className="flex gap-2 items-center"><b>{p.pontos} pts</b>{p.elegivel && p.pontos >= (d.pontos_minimos || 0) ? <CheckCircle2 size={14} color="#16A34A" /> : <XCircle size={14} color={C.danger} />}</span></button>) : <p className="font-body text-sm" style={{ color: C.soft }}>Nenhum participante.</p>}</Card>
        </div>
        <div className="space-y-3">
          {K.admin && d.status !== "sorteado" && <Card style={{ borderColor: AMARELO }}><p className="font-display font-bold" style={{ color: NAVY }}>Realizar sorteio</p><p className="font-body text-xs mt-1" style={{ color: C.muted }}>Aleatório e auditável: a lista é ordenada e registrada com hash; a semente vem do gerador criptográfico do navegador; qualquer pessoa pode conferir depois.</p><Btn className="mt-3 w-full" tipo="amarelo" icon={Shuffle} disabled={rodando} onClick={realizar}>{rodando ? "Sorteando..." : "SORTEAR AGORA"}</Btn></Card>}
          {sorteios.map((s) => <Card key={s.id} style={{ borderColor: NAVY }}><p className="font-body text-[11px] font-bold uppercase" style={{ color: C.muted }}>Protocolo {s.protocolo}</p><p className="font-display font-extrabold text-xl mt-1" style={{ color: NAVY }}>🏆 {s.ganhador_nome}</p><p className="font-body text-xs" style={{ color: C.soft }}>{new Date(s.realizado_em).toLocaleString("pt-BR")} · {s.participantes.length} participantes</p><p className="font-mono text-[10px] break-all mt-1" style={{ color: C.soft }}>semente {s.semente}<br />hash {s.hash_lista}</p>
            <div className="flex gap-1.5 mt-2"><Btn small icon={FileDown} onClick={() => pdf(s)}>Relatório PDF</Btn><Btn small tipo="claro" icon={ShieldCheck} onClick={() => conferir(s)}>Conferir</Btn></div></Card>)}
        </div>
      </div>
      {novo && <FormModal titulo="Participante" inicial={novo} onFechar={() => setNovo(null)} campos={[{ k: "nome", l: "Nome", req: true }, { k: "referencia", l: "Referência" }, { k: "pontos", l: "Pontos", t: "number" }, { k: "elegivel", l: "Elegibilidade", t: "checkbox", texto: "Elegível" }]}
        onSalvar={async (v) => { await K.salvar("participantes", novo.id, limpar(v, ["pontos"])); }} onExcluir={novo.id ? () => K.apagar("participantes", novo.id) : null} />}
      {abrir && <ModalDesafio K={K} d={abrir} onFechar={() => setAbrir(null)} />}
    </div>
  );
}

// ============================================================================= DICAS
function Dicas({ K }) {
  const [cat, setCat] = useState(""); const [nova, setNova] = useState(false);
  const hoje = dicaDoDia(K.d);
  const anteriores = Array.from({ length: 14 }, (_, i) => isoData(new Date(Date.now() - (i + 1) * 864e5))).map((d) => ({ d, dica: dicaDoDia(K.d, d) }));
  const todas = todasDicas(K.d).filter((x) => !cat || x.categoria === cat);
  const cats = [...new Set(todasDicas(K.d).map((x) => x.categoria))];
  return (
    <div>
      <Titulo eyebrow="Dicas" title="Dicas do dia" direita={K.admin && <Btn icon={Plus} onClick={() => setNova(true)}>Nova dica</Btn>} />
      <div className="rounded-3xl p-6 mb-5" style={{ background: NAVY }}><p className="font-body text-[11px] font-bold uppercase" style={{ color: AMARELO }}>💡 Dica de hoje · {hoje.categoria}</p><p className="font-display font-extrabold text-xl text-white mt-2">{hoje.texto}</p></div>
      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div><div className="flex gap-1.5 flex-wrap mb-3"><Chip cor={NAVY} ativo={!cat} onClick={() => setCat("")}>Todas</Chip>{cats.map((c) => <Chip key={c} cor={NAVY} ativo={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}</div>
          <div className="space-y-2">{todas.map((x) => <Card key={x.id} className="!p-3 flex justify-between gap-2"><span className="font-body text-sm"><b style={{ color: NAVY }}>{x.categoria}:</b> {x.texto}</span>{K.admin && !String(x.id).startsWith("s") && <button onClick={() => K.apagar("dicas", x.id)}><Trash2 size={14} color={C.danger} /></button>}</Card>)}</div></div>
        <Card className="h-fit"><p className="font-display font-bold mb-2" style={{ color: NAVY }}>Dicas anteriores</p>{anteriores.map(({ d, dica }) => <p key={d} className="font-body text-xs py-1.5 border-b last:border-0" style={{ borderColor: "#EEF2F7" }}><b>{dataBR(d).slice(0, 5)}</b> · {dica.texto}</p>)}</Card>
      </div>
      {nova && <FormModal titulo="Nova dica" inicial={{ categoria: "Atendimento", ativo: true }} onFechar={() => setNova(false)} campos={[{ k: "categoria", l: "Categoria", t: "select", semVazio: true, op: ["Atendimento", "Comunicação", "Vendas responsáveis", "Prospecção", "Relacionamento", "Segurança bancária", "Organização", "Produtividade"].map((c) => [c, c]) }, { k: "texto", l: "Dica", t: "textarea", req: true, full: true }]} onSalvar={async (v) => { await K.salvar("dicas", null, limpar(v)); }} />}
    </div>
  );
}

// ============================================================================= TREINAMENTO
function Treinamento({ K }) {
  const [mod, setMod] = useState(null); const [resp, setResp] = useState({}); const [enviado, setEnviado] = useState(false);
  const meus = K.d.treino.filter((r) => r.usuario_id === K.eu?.id);
  const melhor = (k) => meus.filter((r) => r.modulo === k).sort((a, b) => b.acertos / b.total - a.acertos / a.total)[0];
  const m = TREINAMENTO.find((x) => x.k === mod);
  if (m) {
    const acertos = m.quiz.filter((q, i) => resp[i] === q.certa).length;
    return (
      <div>
        <Btn small tipo="claro" onClick={() => { setMod(null); setResp({}); setEnviado(false); }}>‹ Módulos</Btn>
        <div className="mt-3"><Titulo eyebrow="Treinamento" title={m.nome} /></div>
        <Card className="mb-4"><ul className="space-y-2">{m.texto.map((t) => <li key={t} className="font-body text-sm flex gap-2"><CheckCircle2 size={16} color="#16A34A" className="shrink-0 mt-0.5" />{t}</li>)}</ul></Card>
        <p className="font-display font-bold mb-2" style={{ color: NAVY }}>Questionário</p>
        {m.quiz.map((q, i) => <Card key={i} className="mb-2"><p className="font-body text-sm font-bold">{i + 1}. {q.p}</p><div className="mt-2 space-y-1">{q.ops.map((o, j) => { const cor = enviado ? (j === q.certa ? "#E7F6EE" : resp[i] === j ? "#FBEAE5" : "#fff") : resp[i] === j ? "#FFF6CC" : "#fff"; return <button key={j} disabled={enviado} onClick={() => setResp({ ...resp, [i]: j })} className="w-full text-left rounded-xl border px-3 py-2 font-body text-sm" style={{ background: cor, borderColor: "#E2E8F0" }}>{o}</button>; })}</div>{enviado && <p className="font-body text-xs mt-2" style={{ color: C.muted }}>{q.exp}</p>}</Card>)}
        {!enviado ? <Btn tipo="amarelo" disabled={Object.keys(resp).length < m.quiz.length} onClick={async () => { setEnviado(true); try { await K.salvar("treino", null, { usuario_id: K.eu?.id, modulo: m.k, acertos, total: m.quiz.length }); } catch (e) { K.avisar(msgErro(e), "erro"); } }}>Enviar respostas</Btn>
          : <Aviso tipo={acertos === m.quiz.length ? "ok" : "amarelo"}>Você acertou {acertos} de {m.quiz.length}. {acertos === m.quiz.length ? "Parabéns! 🎉" : "Revise o conteúdo e tente de novo."}</Aviso>}
      </div>
    );
  }
  const equipe = K.d.usuarios.filter((u) => u.ativo).map((u) => ({ u, feitos: new Set(K.d.treino.filter((r) => r.usuario_id === u.id && r.acertos === r.total).map((r) => r.modulo)).size }));
  return (
    <div>
      <Titulo eyebrow="Capacitação" title="Treinamento da atendente" sub="9 módulos com questionário. O progresso fica registrado." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{TREINAMENTO.map((x) => { const b = melhor(x.k); return <Card key={x.k} onClick={() => setMod(x.k)}><p className="font-display font-bold" style={{ color: NAVY }}>{x.nome}</p><p className="font-body text-xs mt-1" style={{ color: C.soft }}>{x.quiz.length} pergunta(s)</p>{b ? <Chip cor={b.acertos === b.total ? "#16A34A" : "#D97706"}>{b.acertos}/{b.total} · {dataBR(b.criado_em)}</Chip> : <Chip cor="#94A3B8">não iniciado</Chip>}</Card>; })}</div>
      {K.admin && <Card className="mt-4"><p className="font-display font-bold mb-2" style={{ color: NAVY }}>Acompanhamento da equipe</p>{equipe.map(({ u, feitos }) => <div key={u.id} className="mb-2"><div className="flex justify-between font-body text-sm"><span>{u.nome}</span><b>{feitos}/{TREINAMENTO.length} módulos concluídos</b></div><div className="h-2 rounded-full mt-1" style={{ background: "#EEF2FA" }}><div className="h-full rounded-full" style={{ width: `${(100 * feitos) / TREINAMENTO.length}%`, background: AMARELO }} /></div></div>)}</Card>}
    </div>
  );
}

// ============================================================================= INTELIGÊNCIA COMERCIAL
function analise(K) {
  const mes = periodo("mes"); const ant = { de: isoData(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)), ate: isoData(new Date(new Date().getFullYear(), new Date().getMonth(), 0)) };
  const k = indicadores(K.d, mes), ka = indicadores(K.d, ant);
  const total = K.d.atendimentos.length + K.d.prospeccoes.length + K.d.clientes.length;
  const desde = isoData(new Date(Date.now() - 60 * 864e5));
  const trab = new Set([...K.d.prospeccoes.filter((p) => p.data >= desde).map((p) => p.publico), ...K.d.clientes.filter((c) => c.criado_em >= desde).map((c) => c.categoria)]);
  const pouco = listaPublicos(K.d).filter((p) => !trab.has(p.nome)).map((p) => p.nome);
  const interessadosParados = K.d.clientes.filter((c) => c.oportunidade === "interessado" && !c.nao_contatar && !K.d.atendimentos.some((a) => a.cliente_id === c.id && diasEntre(a.data) <= 14));
  const retornos = K.d.tarefas.filter((t) => !t.concluida && t.tipo === "retorno" && t.data < hojeISO());
  const aguardando = K.d.atendimentos.filter((a) => a.resultado === "aguardando" && a.status === "aberto");
  const ano = new Date().getFullYear();
  const prox = datasComemorativas(ano).concat(datasComemorativas(ano + 1)).filter((x) => { const n = diasEntre(hojeISO(), x.data); return n >= 0 && n <= 45; }).filter((x) => !K.d.campanhas.some((c) => c.nome.includes(x.titulo)));
  const var_ = (a, b) => (b ? `${a >= b ? "+" : ""}${Math.round((100 * (a - b)) / b)}%` : a ? "novo" : "—");
  const servProc = Object.entries(K.d.atendimentos.filter((a) => a.data >= mes.de).reduce((m, a) => { const s = a.servico || CATEGORIAS_ATENDIMENTO[a.categoria]; m[s] = (m[s] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return { k, ka, total, pouco, interessadosParados, retornos, aguardando, prox, var_, servProc };
}
function Inteligencia({ K }) {
  const a = useMemo(() => analise(K), [K.d]);
  const [ia, setIa] = useState({ t: "", c: false, e: "" });
  const insuf = a.total < 15;
  const pedir = async () => {
    setIa({ t: "", c: true, e: "" });
    const ctx = `Mês atual: ${JSON.stringify(a.k)}\nMês anterior: ${JSON.stringify(a.ka)}\nPúblicos sem ação nos últimos 60 dias: ${a.pouco.join(", ")}\nInteressados sem contato há 14+ dias: ${a.interessadosParados.length}\nRetornos atrasados: ${a.retornos.length}\nAtendimentos aguardando retorno: ${a.aguardando.length}\nDatas próximas sem campanha: ${a.prox.map((x) => x.titulo).join(", ")}\nServiços mais procurados: ${a.servProc.map(([s, n]) => `${s} (${n})`).join(", ")}\nTotal de registros no sistema: ${a.total}`;
    try { setIa({ t: await chamarIA({ endpoint: "/api/maisbb-ia", modo: "analise", pedido: "Analise os dados e sugira próximas ações priorizadas.", contexto: ctx }), c: false, e: "" }); } catch (e) { setIa({ t: "", c: false, e: e.message }); }
  };
  const Bloco = ({ t, children, vazio }) => <Card><p className="font-display font-bold mb-2" style={{ color: NAVY }}>{t}</p>{children || <p className="font-body text-sm" style={{ color: C.soft }}>{vazio}</p>}</Card>;
  return (
    <div>
      <Titulo eyebrow="Análise" title="Inteligência comercial" sub="Sugestões calculadas a partir dos dados reais registrados no sistema." direita={<Btn tipo="amarelo" icon={Sparkles} disabled={ia.c} onClick={pedir}>{ia.c ? "Analisando..." : "Análise com IA"}</Btn>} />
      {insuf && <div className="mb-4"><Aviso tipo="amarelo">Informações ainda insuficientes ({a.total} registros). As sugestões ficam mais confiáveis com mais atendimentos, clientes e prospecções registrados.</Aviso></div>}
      {(ia.t || ia.e) && <Card className="mb-4" style={{ borderColor: AMARELO }}>{ia.e ? <Aviso tipo="amarelo">{ia.e}</Aviso> : <><Selo tipo="ia" /><Texto className="mt-2">{ia.t}</Texto></>}</Card>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[["Atendimentos", "atendimentos"], ["Novos clientes", "novos_clientes"], ["Prospecções", "prospeccoes"], ["Retornos feitos", "retornos"]].map(([n, kk]) => <KPI key={kk} titulo={n} valor={a.k[kk]} sub={`vs. mês anterior: ${a.var_(a.k[kk], a.ka[kk])}`} cor={NAVY} />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-3">
        <Bloco t={`🎯 Públicos pouco trabalhados (${a.pouco.length})`} vazio="Todos os públicos tiveram ação nos últimos 60 dias.">{a.pouco.length > 0 && <><p className="font-body text-sm">{a.pouco.slice(0, 14).join(" · ")}{a.pouco.length > 14 ? " …" : ""}</p><Btn small className="mt-2" tipo="fantasma" onClick={() => K.ir("radar")}>Abrir Radar de clientes</Btn></>}</Bloco>
        <Bloco t={`📣 Campanhas a desenvolver (${a.prox.length})`} vazio="Nenhuma data comemorativa nos próximos 45 dias sem campanha.">{a.prox.length > 0 && a.prox.map((x) => <p key={x.data} className="font-body text-sm">• {x.titulo} em {dataBR(x.data)} (faltam {diasEntre(hojeISO(), x.data)} dias)</p>)}</Bloco>
        <Bloco t={`⏳ Oportunidades pendentes (${a.interessadosParados.length})`} vazio="Nenhum interessado parado.">{a.interessadosParados.length > 0 && a.interessadosParados.slice(0, 8).map((c) => <button key={c.id} className="block font-body text-sm text-left" onClick={() => K.abrir("cliente", c)}>• {c.nome}{c.proximo_contato ? ` · próximo contato ${dataBR(c.proximo_contato)}` : ""}</button>)}</Bloco>
        <Bloco t={`🔔 Retornos necessários (${a.retornos.length + a.aguardando.length})`} vazio="Nenhum retorno atrasado.">{(a.retornos.length + a.aguardando.length) > 0 && <>{a.retornos.slice(0, 6).map((t) => <p key={t.id} className="font-body text-sm">• {t.titulo} ({dataBR(t.data)})</p>)}{a.aguardando.slice(0, 4).map((x) => <p key={x.id} className="font-body text-sm">• Atendimento nº {x.numero} aguardando retorno</p>)}</>}</Bloco>
        <Bloco t="🔎 Serviços mais procurados no mês" vazio="Sem atendimentos no mês.">{a.servProc.length > 0 && a.servProc.map(([s, n]) => <p key={s} className="font-body text-sm">• {s}: {n}</p>)}</Bloco>
        <Bloco t="🚀 Próximas ações sugeridas">
          <ul className="list-disc ml-5 font-body text-sm space-y-1">
            {a.retornos.length > 0 && <li>Fazer hoje os {a.retornos.length} retorno(s) atrasado(s).</li>}
            {a.interessadosParados.length > 0 && <li>Contatar {Math.min(5, a.interessadosParados.length)} interessado(s) parado(s).</li>}
            {a.pouco.length > 0 && <li>Planejar uma ação com "{a.pouco[0]}" nesta semana.</li>}
            {a.prox.length > 0 && <li>Criar a campanha de {a.prox[0].titulo}.</li>}
            {a.k.prospeccoes < a.ka.prospeccoes && <li>Prospecções abaixo do mês anterior: reservar a terça-feira para visitas.</li>}
            <li>Seguir a estratégia do dia no Início.</li>
          </ul></Bloco>
      </div>
    </div>
  );
}

// ============================================================================= RELATÓRIOS
const REL = [["atendimentos", "Atendimentos"], ["clientes", "Clientes"], ["prospeccoes", "Prospecções"], ["publicos", "Públicos alcançados"], ["servicos", "Serviços procurados"], ["retornos", "Retornos"], ["campanhas", "Campanhas"], ["metas", "Metas"], ["ranking", "Ranking"], ["mensal", "Resultados mensais"], ["anual", "Evolução anual"]];
function montar(id, K, p) {
  const dn = (d) => d && String(d).slice(0, 10) >= p.de && String(d).slice(0, 10) <= p.ate;
  const nome = (uid) => K.d.usuarios.find((u) => u.id === uid)?.nome || "—";
  switch (id) {
    case "atendimentos": return { cab: ["Nº", "Data", "Hora", "Atendente", "Cliente", "Categoria", "Serviço", "Resultado", "Status"], linhas: K.d.atendimentos.filter((a) => dn(a.data)).map((a) => [a.numero, dataBR(a.data), String(a.hora || "").slice(0, 5), nome(a.atendente), a.cliente_nome || "", CATEGORIAS_ATENDIMENTO[a.categoria], a.servico || "", RESULTADOS[a.resultado], a.status]) };
    case "clientes": return { cab: ["Nome", "Categoria", "Origem", "Oportunidade", "Cadastro", "Próximo contato", "Responsável", "Consentimento", "Não contatar"], linhas: K.d.clientes.filter((c) => dn(c.criado_em)).map((c) => [c.nome, c.categoria || "", ORIGENS[c.origem] || "", OPORTUNIDADE[c.oportunidade], dataBR(c.criado_em), dataBR(c.proximo_contato), nome(c.responsavel), c.consentimento ? "sim" : "não", c.nao_contatar ? "sim" : "não"]) };
    case "prospeccoes": return { cab: ["Data", "Público", "Tipo", "Local", "Serviço", "Meta", "Contatos", "Interessados", "Situação", "Responsável"], linhas: K.d.prospeccoes.filter((x) => dn(x.data)).map((x) => [dataBR(x.data), x.publico || "", TIPOS_PROSPECCAO[x.tipo], x.local || "", x.servico || "", x.meta ?? "", x.contatos, x.interessados, x.status, nome(x.responsavel)]) };
    case "publicos": { const g = {}; for (const x of K.d.prospeccoes.filter((y) => dn(y.data))) { const k = x.publico || "Não informado"; g[k] = g[k] || [0, 0, 0, 0]; g[k][0]++; g[k][1] += x.contatos || 0; g[k][2] += x.interessados || 0; } for (const c of K.d.clientes.filter((y) => dn(y.criado_em))) { const k = c.categoria || "Não informado"; g[k] = g[k] || [0, 0, 0, 0]; g[k][3]++; } return { cab: ["Público", "Prospecções", "Contatos", "Interessados", "Novos clientes"], linhas: Object.entries(g).sort((a, b) => b[1][1] - a[1][1]).map(([k, v]) => [k, ...v]) }; }
    case "servicos": { const g = {}; for (const a of K.d.atendimentos.filter((y) => dn(y.data))) { const k = a.servico || CATEGORIAS_ATENDIMENTO[a.categoria]; g[k] = g[k] || [0, 0]; g[k][0]++; if (a.resultado === "concluido") g[k][1]++; } return { cab: ["Serviço/categoria", "Atendimentos", "Concluídos"], linhas: Object.entries(g).sort((a, b) => b[1][0] - a[1][0]).map(([k, v]) => [k, ...v]) }; }
    case "retornos": return { cab: ["Data", "Tarefa", "Responsável", "Concluída", "No prazo"], linhas: K.d.tarefas.filter((t) => t.tipo === "retorno" && dn(t.data)).map((t) => [dataBR(t.data), t.titulo, nome(t.responsavel), t.concluida ? "sim" : "não", t.concluida && t.concluida_em && isoData(t.concluida_em) <= t.data ? "sim" : "não"]) };
    case "campanhas": return { cab: ["Campanha", "Período", "Público", "Situação", "Prospecções", "Contatos", "Meta", "Atendimentos"], linhas: K.d.campanhas.map((c) => { const pr = K.d.prospeccoes.filter((x) => x.campanha_id === c.id); return [c.nome, `${dataBR(c.inicio)} a ${dataBR(c.fim)}`, c.publico || "", c.status, pr.length, pr.reduce((s, x) => s + (x.contatos || 0), 0), c.meta ?? "", K.d.atendimentos.filter((a) => a.campanha_id === c.id).length]; }) };
    case "metas": return { cab: ["Indicador", "Período", "Atendente", "Meta", "Resultado", "%"], linhas: K.d.metas.filter((m) => m.ativo).map((m) => { const r = progressoMeta(K.d, m); return [NOMES_INDICADOR[m.indicador], m.periodo, m.usuario_id ? nome(m.usuario_id) : "Equipe", m.alvo, r.valor, `${r.pct}%`]; }) };
    case "ranking": return { cab: ["Pos.", "Atendente", "Atendimentos", "Concluídos", "Novos clientes", "Prospecções", "Pontos", "Resolução"], linhas: K.d.usuarios.filter((u) => u.ativo).map((u) => { const k = indicadores(K.d, p, u.id); return [u.nome, k.atendimentos, k.concluidos, k.novos_clientes, k.prospeccoes, pontuacao(K.d, k), k.atendimentos ? `${Math.round((100 * k.resolvidos) / k.atendimentos)}%` : "—"]; }).sort((a, b) => b[5] - a[5]).map((l, i) => [i + 1, ...l]) };
    case "mensal": case "anual": { const ano = Number(p.ate.slice(0, 4)); const rows = MESES.map((m, i) => { const pp = { de: isoData(new Date(ano, i, 1)), ate: isoData(new Date(ano, i + 1, 0)) }; const k = indicadores(K.d, pp); return [`${m}/${ano}`, k.atendimentos, k.concluidos, k.novos_clientes, k.prospeccoes, k.contatos, k.retornos]; }); return { cab: ["Mês", "Atendimentos", "Concluídos", "Novos clientes", "Prospecções", "Contatos", "Retornos"], linhas: id === "mensal" ? rows.filter((r, i) => isoData(new Date(ano, i, 1)) >= p.de.slice(0, 8) + "01" && isoData(new Date(ano, i, 1)) <= p.ate) : rows, grafico: rows.map((r) => ({ m: r[0].slice(0, 3), atendimentos: r[1], novos: r[3], prospeccoes: r[4] })) }; }
    default: return { cab: [], linhas: [] };
  }
}
function Relatorios({ K }) {
  const y = new Date().getFullYear();
  const [p, setP] = useState(periodo("mes")); const [sel, setSel] = useState("atendimentos"); const [g, setG] = useState(false);
  const r = montar(sel, K, p); const nome = REL.find((x) => x[0] === sel)[1];
  const exp = async (tipo, todos) => {
    setG(true);
    try {
      const abas = (todos ? REL : REL.filter((x) => x[0] === sel)).map(([id, n]) => { const x = montar(id, K, p); return { nome: n, cabecalho: x.cab, linhas: x.linhas }; });
      const arq = `maisbb-${todos ? "relatorio-completo" : sel}-${p.de}-a-${p.ate}`;
      if (tipo === "xlsx") await exportarExcel(arq, abas);
      else await exportarPDF(arq, todos ? "Relatório completo" : `Relatório: ${nome}`, abas.map((a) => ({ titulo: a.nome, cabecalho: a.cabecalho, linhas: a.linhas.length ? a.linhas : [["Sem dados no período"]] })), `Período ${dataBR(p.de)} a ${dataBR(p.ate)} · dados do sistema Mais BB Digital (sem CPF)`, "Mais BB Digital · Inteligência Comercial e Atendimento", NAVY_RGB);
    } catch (e) { K.avisar(e.message, "erro"); } finally { setG(false); }
  };
  return (
    <div>
      <Titulo eyebrow="Relatórios" title="Relatórios" sub="Exportação em PDF e Excel (sem CPF)." direita={<><Btn tipo="claro" icon={FileSpreadsheet} disabled={g} onClick={() => exp("xlsx", true)}>Excel completo</Btn><Btn tipo="claro" icon={FileDown} disabled={g} onClick={() => exp("pdf", true)}>PDF completo</Btn></>} />
      <div className="flex gap-2 flex-wrap items-end mb-4">
        <Campo label="De"><input type="date" value={p.de} onChange={(e) => setP({ ...p, de: e.target.value })} className={inputCls} style={inputSty} /></Campo>
        <Campo label="Até"><input type="date" value={p.ate} onChange={(e) => setP({ ...p, ate: e.target.value })} className={inputCls} style={inputSty} /></Campo>
        {[["dia", "Hoje"], ["semana", "Semana"], ["mes", "Mês"], ["ano", "Ano"]].map(([k, l]) => <Chip key={k} cor={NAVY} onClick={() => setP(periodo(k))}>{l}</Chip>)}
      </div>
      <div className="grid lg:grid-cols-[220px_1fr] gap-4">
        <Card className="!p-2 h-fit">{REL.map(([id, n]) => <button key={id} onClick={() => setSel(id)} className="w-full text-left px-3 py-2 rounded-xl font-body text-sm font-semibold" style={{ background: sel === id ? "#FFF6CC" : "transparent", color: NAVY }}>{n}</button>)}</Card>
        <Card>
          <div className="flex justify-between items-center flex-wrap gap-2 mb-3"><p className="font-display font-bold" style={{ color: NAVY }}>{nome}</p><div className="flex gap-2"><Btn small tipo="claro" icon={FileSpreadsheet} disabled={g} onClick={() => exp("xlsx")}>Excel</Btn><Btn small tipo="claro" icon={FileDown} disabled={g} onClick={() => exp("pdf")}>PDF</Btn></div></div>
          {r.grafico && <ResponsiveContainer width="100%" height={220}><LineChart data={r.grafico}><CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" /><XAxis dataKey="m" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Line dataKey="atendimentos" name="Atendimentos" stroke={NAVY} strokeWidth={2} /><Line dataKey="novos" name="Novos clientes" stroke="#D4A017" strokeWidth={2} /><Line dataKey="prospeccoes" name="Prospecções" stroke="#64748B" /></LineChart></ResponsiveContainer>}
          {r.linhas.length ? <div className="overflow-x-auto"><table className="w-full font-body text-sm"><thead><tr className="text-left text-[11px] uppercase" style={{ background: "#F5F7FB", color: C.muted }}>{r.cab.map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead><tbody>{r.linhas.map((l, i) => <tr key={i} className="border-t" style={{ borderColor: "#EEF2F7" }}>{l.map((x, j) => <td key={j} className="px-3 py-1.5">{x}</td>)}</tr>)}</tbody></table></div> : <Vazio>Sem dados no período.</Vazio>}
        </Card>
      </div>
    </div>
  );
}

// ============================================================================= ADMINISTRAÇÃO
function Admin({ K }) {
  const [aba, setAba] = useState("equipe");
  return (
    <div>
      <Titulo eyebrow="Administrador" title="Administração" sub="Equipe e acessos, configurações, pontuação, conteúdos do assistente, LGPD, backup e registro de alterações." />
      <div className="flex gap-1.5 flex-wrap mb-4">{[["equipe", "Equipe e acessos"], ["config", "Configurações"], ["conhecimento", "Conteúdos do assistente"], ["lgpd", "LGPD e backup"], ["auditoria", "Registro de alterações"]].map(([k, l]) => <Chip key={k} cor={NAVY} ativo={aba === k} onClick={() => setAba(k)}>{l}</Chip>)}</div>
      <div className="mb-4 flex gap-2 flex-wrap font-body text-xs" style={{ color: C.muted }}>Atalhos de gestão: <button className="underline" onClick={() => K.ir("servicos")}>Serviços</button>·<button className="underline" onClick={() => K.ir("campanhas")}>Campanhas</button>·<button className="underline" onClick={() => K.ir("metas")}>Metas</button>·<button className="underline" onClick={() => K.ir("calendario")}>Calendário</button>·<button className="underline" onClick={() => K.ir("desafios")}>Sorteios</button>·<button className="underline" onClick={() => K.ir("relatorios")}>Relatórios</button>·<button className="underline" onClick={() => K.ir("dicas")}>Dicas</button></div>
      {aba === "equipe" && <Equipe K={K} />}{aba === "config" && <Config K={K} />}{aba === "conhecimento" && <Conhecimento K={K} />}{aba === "lgpd" && <Lgpd K={K} />}{aba === "auditoria" && <Auditoria K={K} />}
    </div>
  );
}
function Equipe({ K }) {
  const [u, setU] = useState(null); const [conv, setConv] = useState(null);
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card><div className="flex justify-between items-center mb-2"><p className="font-display font-bold" style={{ color: NAVY }}>Usuários ({K.d.usuarios.length})</p></div>
        {K.d.usuarios.map((x) => <button key={x.id} onClick={() => setU(x)} className="w-full flex justify-between py-2 border-b font-body text-sm text-left" style={{ borderColor: "#EEF2F7" }}><span>{x.nome}<span className="block text-xs" style={{ color: C.soft }}>{x.email}</span></span><span className="flex gap-1 items-center"><Chip cor={x.papel === "admin" ? NAVY : "#64748B"}>{x.papel === "admin" ? "Administrador" : "Atendente"}</Chip>{!x.ativo && <Chip cor={C.danger}>bloqueado</Chip>}</span></button>)}</Card>
      <Card><div className="flex justify-between items-center mb-2"><p className="font-display font-bold" style={{ color: NAVY }}>Convites pendentes</p><Btn small icon={Plus} onClick={() => setConv({ papel: "atendente" })}>Liberar acesso</Btn></div>
        <p className="font-body text-xs mb-2" style={{ color: C.muted }}>Cadastre o e-mail da atendente. Ela cria a conta (ou usa uma existente) com esse e-mail e o acesso é liberado no primeiro login.</p>
        {K.d.convites.length ? K.d.convites.map((x) => <div key={x.id} className="flex justify-between py-2 border-b font-body text-sm" style={{ borderColor: "#EEF2F7" }}><span>{x.nome}<span className="block text-xs" style={{ color: C.soft }}>{x.email} · {x.papel}</span></span><button onClick={() => K.apagar("convites", x.id)}><Trash2 size={14} color={C.danger} /></button></div>) : <p className="font-body text-sm" style={{ color: C.soft }}>Nenhum convite pendente.</p>}</Card>
      {u && <FormModal titulo={u.nome} inicial={u} onFechar={() => setU(null)} campos={[{ k: "nome", l: "Nome", req: true }, { k: "papel", l: "Perfil de acesso", t: "select", semVazio: true, op: [["atendente", "Atendente"], ["admin", "Administrador"]] }, { k: "ativo", l: "Acesso", t: "checkbox", texto: "Ativo (desmarque para bloquear)" }]}
        onSalvar={async (v) => { if (u.user_id === K.sessao.user.id && (v.papel !== "admin" || !v.ativo)) throw new Error("Você não pode tirar o seu próprio acesso de administrador."); await K.salvar("usuarios", u.id, { nome: v.nome, papel: v.papel, ativo: v.ativo }); }} />}
      {conv && <FormModal titulo="Liberar acesso" inicial={conv} onFechar={() => setConv(null)} campos={[{ k: "nome", l: "Nome", req: true }, { k: "email", l: "E-mail", t: "email", req: true }, { k: "papel", l: "Perfil", t: "select", semVazio: true, op: [["atendente", "Atendente"], ["admin", "Administrador"]] }]}
        onSalvar={async (v) => { await K.salvar("convites", null, { nome: v.nome, email: v.email.trim().toLowerCase(), papel: v.papel }); K.avisar("Acesso liberado. Peça para ela entrar com esse e-mail."); }} />}
    </div>
  );
}
function Config({ K }) {
  const c = K.config;
  const [v, setV] = useState({ nome_unidade: c.nome_unidade || "", endereco: c.endereco || "", whatsapp: c.whatsapp || "", horario: c.horario || "", retencao_meses: c.retencao_meses || 24, ...Object.fromEntries(Object.entries({ atendimento: 1, atendimento_concluido: 2, novo_cliente: 3, prospeccao: 2, visita: 2, retorno: 1, ...(c.pontuacao || {}) }).map(([k, x]) => [`p_${k}`, x])) });
  const [logo, setLogo] = useState(null); const [sal, setSal] = useState(false);
  const salvar = async () => {
    setSal(true);
    try {
      const pont = Object.fromEntries(Object.entries(v).filter(([k]) => k.startsWith("p_")).map(([k, x]) => [k.slice(2), Number(x) || 0]));
      const dados = { nome_unidade: v.nome_unidade, endereco: v.endereco || null, whatsapp: v.whatsapp || null, horario: v.horario || null, retencao_meses: Number(v.retencao_meses) || 24, pontuacao: pont };
      if (logo) dados.logo_path = await enviarArquivo(logo, "logo");
      await K.salvar("config", 1, dados); K.avisar("Configurações salvas.");
    } catch (e) { K.avisar(msgErro(e), "erro"); } finally { setSal(false); }
  };
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card><p className="font-display font-bold mb-3" style={{ color: NAVY }}>Unidade e identidade</p>
        <div className="flex items-center gap-3 mb-3">{c.logo_path ? <img src={urlArquivo(c.logo_path)} alt="logo" className="h-14 rounded-lg border p-1" /> : <span className="font-body text-xs" style={{ color: C.soft }}>Sem logo</span>}<label className="font-body text-xs font-bold cursor-pointer px-3 py-2 rounded-xl" style={{ background: "#FFF6CC", color: NAVY }}><Upload size={13} className="inline mr-1" />Logo oficial Mais BB<input type="file" accept="image/*" className="hidden" onChange={(e) => setLogo(e.target.files?.[0] || null)} /></label>{logo && <span className="font-body text-xs">{logo.name}</span>}</div>
        <Campos campos={[{ k: "nome_unidade", l: "Nome da unidade", full: true }, { k: "endereco", l: "Endereço", full: true }, { k: "whatsapp", l: "WhatsApp" }, { k: "horario", l: "Horário de atendimento" }]} valores={v} set={setV} /></Card>
      <Card><p className="font-display font-bold mb-3" style={{ color: NAVY }}>Pontuação (ranking e desafios)</p>
        <Campos campos={[["atendimento", "Por atendimento"], ["atendimento_concluido", "Por atendimento concluído"], ["novo_cliente", "Por novo cliente"], ["prospeccao", "Por prospecção"], ["visita", "Por visita"], ["retorno", "Por retorno feito"]].map(([k, l]) => ({ k: `p_${k}`, l, t: "number" }))} valores={v} set={setV} />
        <p className="font-display font-bold mt-4 mb-2" style={{ color: NAVY }}>Retenção de dados (LGPD)</p>
        <Campos campos={[{ k: "retencao_meses", l: "Manter clientes sem movimento por (meses)", t: "number" }]} valores={v} set={setV} /></Card>
      <div className="lg:col-span-2 flex justify-end"><Btn icon={Save} onClick={salvar} disabled={sal}>{sal ? "Salvando..." : "Salvar configurações"}</Btn></div>
    </div>
  );
}
function Conhecimento({ K }) {
  const [a, setA] = useState(null);
  return (
    <div>
      <div className="flex justify-between items-center mb-3"><p className="font-body text-sm" style={{ color: C.muted }}>Conteúdos que o assistente usa como base (procedimentos internos, orientações oficiais, respostas padrão).</p><Btn icon={Plus} onClick={() => setA({ ativo: true })}>Novo conteúdo</Btn></div>
      {K.d.conhecimento.length ? K.d.conhecimento.map((x) => <Card key={x.id} className="mb-2 !p-3" onClick={() => setA(x)}><p className="font-body text-sm font-bold" style={{ color: NAVY }}>{x.titulo} {!x.ativo && <Chip cor="#94A3B8">inativo</Chip>}</p><p className="font-body text-xs line-clamp-2" style={{ color: C.muted }}>{x.conteudo}</p></Card>) : <Vazio>Nenhum conteúdo cadastrado.</Vazio>}
      {a && <FormModal titulo={a.id ? "Editar conteúdo" : "Novo conteúdo"} largura="max-w-3xl" inicial={a} onFechar={() => setA(null)} campos={[{ k: "titulo", l: "Título", req: true, full: true }, { k: "conteudo", l: "Conteúdo", t: "textarea", rows: 8, req: true, full: true }, { k: "tags", l: "Palavras-chave", full: true, ph: "aposentado, pagamento, golpe" }, { k: "ativo", l: "Situação", t: "checkbox", texto: "Ativo" }]}
        onSalvar={async (v) => { await K.salvar("conhecimento", a.id, limpar(v)); }} onExcluir={a.id ? () => K.apagar("conhecimento", a.id) : null} />}
    </div>
  );
}
function Lgpd({ K }) {
  const [g, setG] = useState(false);
  const backup = async () => {
    setG(true);
    try {
      const abas = Object.entries(TAB).filter(([k]) => k !== "config").map(([k]) => { const rows = K.d[k] || []; const cab = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((c) => c !== "cpf"); return { nome: k, cabecalho: cab, linhas: rows.map((r) => cab.map((c) => (typeof r[c] === "object" && r[c] !== null ? JSON.stringify(r[c]) : r[c] ?? ""))) }; });
      await exportarExcel(`maisbb-backup-${hojeISO()}`, abas);
      K.registrarAcesso("backup_exportado", null);
    } catch (e) { K.avisar(e.message, "erro"); } finally { setG(false); }
  };
  const retencao = async () => {
    if (!window.confirm(`Excluir clientes sem movimento há mais de ${K.config.retencao_meses || 24} meses? Esta ação não pode ser desfeita.`)) return;
    const { data, error } = await supabase.rpc("maisbb_aplicar_retencao");
    if (error) K.avisar(msgErro(error), "erro"); else { K.avisar(`${data} cadastro(s) removido(s) pela política de retenção.`); K.carregar(); }
  };
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card><p className="font-display font-bold mb-2" style={{ color: NAVY }}>Proteção de dados</p><ul className="list-disc ml-5 font-body text-sm space-y-1">
        <li>Login com e-mail e senha; perfis Administrador e Atendente com permissões no banco (RLS).</li>
        <li>Comunicação criptografada (HTTPS) e dados criptografados em repouso pelo provedor do banco.</li>
        <li>Registro de alterações automático em clientes, atendimentos, serviços, usuários e demais cadastros.</li>
        <li>CPF mascarado na tela, visualização registrada e excluído do backup e dos relatórios.</li>
        <li>O sistema não armazena senhas bancárias, tokens, códigos de autenticação, dados completos de cartão nem credenciais de clientes, e não faz consultas ou operações bancárias.</li>
        <li>Consentimento e "não contatar" por cliente; botões de WhatsApp só aparecem com consentimento e sem pedido de não contato.</li>
      </ul></Card>
      <Card><p className="font-display font-bold mb-2" style={{ color: NAVY }}>Backup e retenção</p>
        <p className="font-body text-sm mb-3" style={{ color: C.muted }}>O backup exporta todas as tabelas para Excel (sem CPF). Guarde em local seguro.</p>
        <Btn icon={Database} onClick={backup} disabled={g}>{g ? "Gerando..." : "Exportar backup (Excel)"}</Btn>
        <p className="font-body text-sm mt-4 mb-2" style={{ color: C.muted }}>Política de retenção: {K.config.retencao_meses || 24} meses sem movimento (altere em Configurações).</p>
        <Btn tipo="perigo" onClick={retencao}>Aplicar política de retenção agora</Btn></Card>
    </div>
  );
}
function Auditoria({ K }) {
  const [rows, setRows] = useState(null);
  React.useEffect(() => { supabase.from("maisbb_auditoria").select("*").order("em", { ascending: false }).limit(300).then(({ data }) => setRows(data || [])); }, []);
  const nome = (uid) => K.d.usuarios.find((u) => u.user_id === uid)?.nome || "sistema";
  return (
    <Card className="!p-0 overflow-x-auto">{!rows ? <p className="p-4 font-body text-sm">Carregando...</p> : rows.length ? <table className="w-full font-body text-xs"><thead><tr className="text-left uppercase" style={{ background: "#F5F7FB", color: C.muted }}><th className="px-3 py-2">Quando</th><th className="px-3 py-2">Quem</th><th className="px-3 py-2">Tabela</th><th className="px-3 py-2">Ação</th><th className="px-3 py-2">Registro</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id} className="border-t" style={{ borderColor: "#EEF2F7" }}><td className="px-3 py-1.5 whitespace-nowrap">{new Date(r.em).toLocaleString("pt-BR")}</td><td className="px-3 py-1.5">{nome(r.usuario)}</td><td className="px-3 py-1.5">{r.tabela.replace("maisbb_", "")}</td><td className="px-3 py-1.5">{({ insert: "criou", update: "alterou", delete: "excluiu" })[r.acao] || r.acao}</td><td className="px-3 py-1.5 truncate max-w-[260px]">{r.dados?.nome || r.dados?.titulo || r.dados?.numero || r.registro || ""}</td></tr>)}</tbody></table> : <Vazio>Sem registros.</Vazio>}</Card>
  );
}
