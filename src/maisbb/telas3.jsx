import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Megaphone, Plus, Save, Trash2, RefreshCw, CheckCircle2, Download, Image as ImageIcon, CalendarDays, Copy } from "lucide-react";
import { C, Titulo, Btn, Card, Aviso, Chip, Vazio, Selo, Modal, Campos, Campo, inp, inpS, Copiar, Zap, Texto, msgErro } from "./base.jsx";
import { GRUPOS, SEMANA_PADRAO, gerarMensagem } from "./dados.js";
import { mesInfo, datasDoAno, MES_NOME, SEMANA, hoje, br, plano30, periodo, local, iso } from "./motor.js";

// ============================================================================= CALENDÁRIO COMERCIAL (12 meses)
export function Calendario({ K }) {
  const { D } = K;
  const ano = new Date().getFullYear();
  const [m, setM] = useState(new Date().getMonth());
  const cal = D.config.calendario || {};
  const info = mesInfo(m, cal);
  const g = GRUPOS[info.publico] || GRUPOS.outros;
  const datas = datasDoAno(ano, cal).filter((x) => Number(x.data.slice(5, 7)) === m + 1);
  const servs = D.servicos.filter((s) => s.ativo && s.confirmado);
  const msg = gerarMensagem({ tipo: "divulgacao", estilo: "comercial", publico: g.nome, servico: servs[0]?.nome, atendente: K.nome, horario: D.config.horario });
  const criarCampanha = async () => {
    try {
      await K.salvar("campanhas", null, { nome: `${info.principal} ${ano}`, objetivo: info.objetivo, publico: g.nome, servicos: servs.map((s) => s.nome).join(", ") || null, inicio: iso(new Date(ano, m, 1)), fim: iso(new Date(ano, m + 1, 0)),
        acoes: `Presenciais: ${(g.onde || []).slice(0, 3).join("; ")}\nDigitais: WhatsApp Status 3x na semana; post semanal nas redes; mensagem para clientes com consentimento`, mensagens: msg, artes: `Arte com o tema "${info.principal}", cores do correspondente e horário de atendimento`, metas: `${(g.meta || 10) * 2} contatos com ${g.nome.toLowerCase()} no mês`, status: "planejada" });
      K.avisar("Campanha criada em Campanhas e marketing.");
    } catch (e) { K.avisar(msgErro(e), "erro"); }
  };
  const L = ({ t, children }) => <div><p className="font-body text-[11px] font-bold uppercase mb-1" style={{ color: C.yellowInk }}>{t}</p><div className="font-body text-sm" style={{ color: C.ink }}>{children}</div></div>;
  return (
    <div>
      <Titulo eyebrow={`${ano}`} title="Calendário comercial anual" sub="Tema, público, campanhas, datas e ações para cada mês. O administrador pode ajustar temas e datas." />
      <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 mb-4">{MES_NOME.map((n, i) => <button key={n} onClick={() => setM(i)} className="rounded-xl py-2 font-body text-xs font-bold" style={{ background: m === i ? C.navy : "#fff", color: m === i ? "#fff" : C.ink, border: `1px solid ${m === i ? C.navy : C.line}`, boxShadow: i === new Date().getMonth() ? `0 0 0 2px ${C.yellow}` : "none" }}>{n.slice(0, 3)}</button>)}</div>
      <Card className="!p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div><p className="font-body text-xs font-bold" style={{ color: C.yellowInk }}>{MES_NOME[m]} · {g.emoji} {g.nome}</p><p className="font-display font-extrabold text-xl" style={{ color: C.navy }}>{info.tema}</p></div>
          <div className="flex gap-2"><Selo tipo="sistema" /><Btn small tipo="amarelo" icon={Megaphone} onClick={criarCampanha}>Criar campanha do mês</Btn></div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <L t="Público prioritário">{g.emoji} {g.nome}</L>
          <L t="Objetivo">{info.objetivo}</L>
          <L t="Campanha principal">{info.principal}</L>
          <L t="Campanhas secundárias">{(info.secundarias || []).join(" · ")}</L>
          <L t="Serviços autorizados a divulgar">{servs.length ? servs.map((s) => s.nome).join(" · ") : <span style={{ color: C.soft }}>Cadastre e confirme os serviços na biblioteca.</span>}</L>
          <L t="Estratégias">{g.apresentacao} {g.acompanhamento}</L>
          <L t="Datas comemorativas">{datas.length ? datas.map((d) => <p key={d.data + d.titulo}>🎉 {br(d.data)} — {d.titulo}{d.local ? " (local)" : ""}</p>) : "—"}</L>
          <L t="Ações presenciais"><ul className="list-disc ml-4">{(g.onde || []).slice(0, 4).map((x) => <li key={x}>{x}</li>)}</ul></L>
          <L t="Ações digitais"><ul className="list-disc ml-4"><li>WhatsApp Status 3 vezes por semana com o tema do mês</li><li>Um post por semana nas redes do correspondente</li><li>Mensagem para clientes que autorizaram contato</li></ul></L>
          <L t="Sugestões de artes"><ul className="list-disc ml-4"><li>Card "{info.principal}" com horário e endereço</li><li>Story com dica de segurança</li><li>Arte de agradecimento aos clientes</li></ul></L>
          <L t="Metas">{(g.meta || 10) * 2} contatos com {g.nome.toLowerCase()} · 1 campanha ativa · retornos em dia</L>
          <L t="Indicadores">Prospecções do público · novos clientes · atendimentos · retornos feitos</L>
          <div className="md:col-span-2 rounded-xl p-3" style={{ background: "#EDFBF2" }}><p className="font-body text-[11px] font-bold uppercase mb-1" style={{ color: C.green }}>Mensagem do mês</p><Texto>{msg}</Texto><div className="mt-2 flex gap-1.5"><Copiar texto={msg} rotulo="Copiar mensagem" /><Zap texto={msg} rotulo="WhatsApp" /></div></div>
        </div>
      </Card>
      <Card className="mt-4"><p className="font-display font-bold mb-2" style={{ color: C.navy }}>Datas do ano</p><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1">{datasDoAno(ano, cal).map((d) => <p key={d.data + d.titulo} className="font-body text-sm" style={{ color: d.data < hoje() ? C.soft : C.ink }}>{br(d.data)} · {d.titulo}</p>)}</div></Card>
    </div>
  );
}

// ============================================================================= PLANEJAMENTO SEMANAL
export function PlanoSemanal({ K }) {
  const { D } = K;
  const rot = D.config.rotina || SEMANA_PADRAO;
  const sem = periodo("semana");
  const hojeDw = new Date().getDay();
  return (
    <div>
      <Titulo eyebrow="Rotina" title="Planejamento semanal" sub="Foco de cada dia (o administrador pode alterar conforme o expediente). Marque as tarefas da semana como concluídas na agenda." />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((d) => { const dia = iso(new Date(local(sem.de).getTime() + (d - 1) * 864e5)); const ts = D.tarefas.filter((t) => t.data === dia && (!t.responsavel || t.responsavel === K.eu)); return (
          <Card key={d} style={{ borderColor: d === hojeDw ? C.yellow : C.line, borderWidth: d === hojeDw ? 2 : 1 }}>
            <p className="font-body text-xs font-bold" style={{ color: C.yellowInk }}>{SEMANA[d].toUpperCase()} · {br(dia)}</p>
            <p className="font-display font-extrabold text-lg" style={{ color: C.navy }}>{rot[d]?.foco}</p>
            <ul className="list-disc ml-5 mt-1 font-body text-sm">{(rot[d]?.acoes || []).map((a) => <li key={a}>{a}</li>)}</ul>
            <p className="font-body text-[11px] mt-2" style={{ color: C.soft }}>{ts.filter((t) => t.concluida).length}/{ts.length} tarefa(s) concluída(s)</p>
            <Btn small tipo="fantasma" className="mt-2" icon={Plus} onClick={() => K.abrir("tarefa", { data: dia, titulo: rot[d]?.foco, tipo: d === 2 ? "prospeccao" : d === 4 ? "retorno" : d === 5 ? "campanha" : "lembrete" })}>Tarefa</Btn>
          </Card>); })}
      </div>
    </div>
  );
}

// ============================================================================= PLANO DE 30 DIAS
export function Plano30({ K }) {
  const { D } = K;
  const agora = new Date();
  const [ref, setRef] = useState({ ano: agora.getFullYear(), mes: agora.getMonth() + 1 });
  const chave = `maisbb-var-${ref.ano}-${ref.mes}`;
  const [variacao, setVariacao] = useState(() => { try { return Number(localStorage.getItem(chave) || 0); } catch { return 0; } });
  const [ed, setEd] = useState(null);
  const plano = plano30(ref.ano, ref.mes, { publicos: K.publicos, servicos: D.servicos, config: D.config, atendente: K.nome }, variacao);
  const reg = (d) => D.dias.find((x) => x.data === d && x.user_id === K.eu);
  const mudar = (n) => { let m = ref.mes + n, a = ref.ano; if (m < 1) { m = 12; a--; } if (m > 12) { m = 1; a++; } setRef({ ano: a, mes: m }); try { setVariacao(Number(localStorage.getItem(`maisbb-var-${a}-${m}`) || 0)); } catch { setVariacao(0); } };
  const novo = () => { const v = variacao + 1; setVariacao(v); try { localStorage.setItem(chave, String(v)); } catch { /* */ } K.avisar("Novo plano gerado."); };
  const salvarRes = async (d, resultado) => { try { const r = reg(d); await K.salvar("dias", null, { data: d, user_id: K.eu, status: r?.status || "pendente", ajustes: { ...(r?.ajustes || {}), plano_resultado: resultado } }); setEd(null); K.avisar("Resultado salvo."); } catch (e) { K.avisar(msgErro(e), "erro"); } };
  const feitos = plano.filter((p) => reg(p.data)?.ajustes?.plano_resultado).length;
  return (
    <div>
      <Titulo eyebrow="Mensal" title="Plano de prospecção de 30 dias" sub="Público, objetivo, estratégia, ação, mensagem e meta para cada dia útil. Registre o resultado de cada dia." direita={<Btn tipo="claro" icon={RefreshCw} onClick={novo}>Gerar novo plano</Btn>} />
      <div className="flex items-center justify-between mb-4"><Btn small tipo="claro" icon={ChevronLeft} onClick={() => mudar(-1)} /><p className="font-display font-extrabold" style={{ color: C.navy }}>{MES_NOME[ref.mes - 1]} {ref.ano} · {feitos}/{plano.length} dias com resultado</p><Btn small tipo="claro" icon={ChevronRight} onClick={() => mudar(1)} /></div>
      <div className="space-y-2">{plano.map((p) => { const r = reg(p.data)?.ajustes?.plano_resultado; return (
        <Card key={p.data} className="!p-3.5" style={{ borderColor: p.data === hoje() ? C.yellow : C.line, borderWidth: p.data === hoje() ? 2 : 1 }}>
          <div className="flex items-start gap-3 flex-wrap">
            <div className="w-14 text-center shrink-0 rounded-xl py-1.5" style={{ background: p.data === hoje() ? C.yellow : C.navyTint }}><p className="font-display font-extrabold" style={{ color: C.navy }}>{p.data.slice(8)}</p><p className="font-body text-[10px] font-bold" style={{ color: C.navy2 }}>{p.dia.slice(0, 3)}</p></div>
            <div className="flex-1 min-w-[200px]">
              <p className="font-body text-sm font-bold" style={{ color: C.ink }}>{p.publico.emoji} {p.publico.nome} · <span style={{ color: C.yellowInk }}>{p.objetivo}</span></p>
              <p className="font-body text-xs" style={{ color: C.muted }}><b>Estratégia:</b> {p.estrategia} · <b>Ação:</b> {p.acao} · <b>Meta:</b> {p.meta}</p>
              {r && <p className="font-body text-xs mt-1" style={{ color: C.green }}>✓ {r}</p>}
            </div>
            <div className="flex gap-1.5"><Copiar texto={p.mensagem} rotulo="Mensagem" /><Btn small tipo={r ? "verde" : "fantasma"} icon={CheckCircle2} onClick={() => setEd({ d: p.data, r: r || "" })}>Resultado</Btn></div>
          </div>
        </Card>); })}</div>
      {ed && <Modal onFechar={() => setEd(null)} titulo={`Resultado de ${br(ed.d)}`} largura="max-w-md"><textarea rows={4} className={inp} style={inpS} value={ed.r} onChange={(e) => setEd({ ...ed, r: e.target.value })} placeholder="Contatos feitos, interessados, próximos passos" /><div className="flex justify-end mt-3"><Btn icon={Save} onClick={() => salvarRes(ed.d, ed.r)}>Salvar</Btn></div></Modal>}
    </div>
  );
}

// ============================================================================= CAMPANHAS E MARKETING
const TIPOS_MKT = { post: "Publicação (feed)", story: "Story", status: "WhatsApp Status", banner: "Banner", comunicado: "Comunicado", arte: "Arte" };
export function Campanhas({ K }) {
  const { D } = K;
  const [aba, setAba] = useState("campanhas");
  const [ed, setEd] = useState(null);
  const [mk, setMk] = useState(null);
  return (
    <div>
      <Titulo eyebrow="Divulgação" title="Campanhas e marketing" direita={aba === "campanhas" ? <Btn tipo="amarelo" icon={Plus} onClick={() => setEd({})}>Nova campanha</Btn> : <Btn tipo="amarelo" icon={Plus} onClick={() => setMk({})}>Novo material</Btn>} />
      <div className="flex gap-1.5 mb-4">{[["campanhas", `Campanhas (${D.campanhas.length})`], ["estudio", `Estúdio de marketing (${D.marketing.length})`], ["publicacoes", "Calendário de publicações"]].map(([k, l]) => <Chip key={k} ativo={aba === k} onClick={() => setAba(k)}>{l}</Chip>)}</div>
      {aba === "campanhas" && (D.campanhas.length ? <div className="grid md:grid-cols-2 gap-3">{D.campanhas.map((c) => { const pr = D.prospeccoes.filter((p) => p.campanha_id === c.id); return (
        <Card key={c.id} onClick={() => setEd(c)}><div className="flex justify-between gap-2"><p className="font-display font-bold" style={{ color: C.navy }}>{c.nome}</p><Chip cor={{ planejada: C.soft, ativa: C.green, concluida: C.navy2, arquivada: C.soft }[c.status]}>{c.status}</Chip></div>
          <p className="font-body text-xs mt-1" style={{ color: C.muted }}>{br(c.inicio)} a {br(c.fim)} · {c.publico || "—"}</p><p className="font-body text-xs mt-1" style={{ color: C.ink }}>{c.objetivo}</p><p className="font-body text-[11px] mt-1" style={{ color: C.soft }}>{pr.length} prospecção(ões) · {pr.filter((p) => p.status === "convertida").length} convertida(s)</p></Card>); })}</div>
        : <Vazio>Nenhuma campanha. Crie a partir do Calendário comercial ou do zero.</Vazio>)}
      {aba === "estudio" && <div>
        <Aviso>Use apenas a identidade visual autorizada do Mais BB (logo enviada pelo administrador). Não use elementos que façam parecer um canal oficial do Banco do Brasil.</Aviso>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">{D.marketing.map((m) => <Card key={m.id} onClick={() => setMk(m)}><div className="flex justify-between"><Chip>{TIPOS_MKT[m.tipo]}</Chip><Chip cor={{ rascunho: C.soft, agendado: C.yellowInk, publicado: C.green }[m.status]}>{m.status}</Chip></div><p className="font-display font-bold mt-2" style={{ color: C.navy }}>{m.titulo}</p><p className="font-body text-xs mt-1 line-clamp-3" style={{ color: C.muted }}>{m.texto}</p>{m.data_publicacao && <p className="font-body text-[11px] mt-1" style={{ color: C.soft }}>📅 {br(m.data_publicacao)}</p>}</Card>)}
          {!D.marketing.length && <Vazio>Crie modelos de posts, stories, status, banners e comunicados.</Vazio>}</div>
      </div>}
      {aba === "publicacoes" && <div>{[...D.marketing].filter((m) => m.data_publicacao).sort((a, b) => a.data_publicacao.localeCompare(b.data_publicacao)).map((m) => <Card key={m.id} className="!p-3 mb-2" onClick={() => setMk(m)}><p className="font-body text-sm"><b style={{ color: m.data_publicacao < hoje() ? C.soft : C.navy }}>{br(m.data_publicacao)}</b> · {TIPOS_MKT[m.tipo]} · {m.titulo} <Chip cor={{ rascunho: C.soft, agendado: C.yellowInk, publicado: C.green }[m.status]}>{m.status}</Chip></p></Card>)}
        {!D.marketing.some((m) => m.data_publicacao) && <Vazio>Defina a data de publicação nos materiais do estúdio.</Vazio>}</div>}
      {ed && <ModalCampanha K={K} c={ed.id ? ed : null} onFechar={() => setEd(null)} />}
      {mk && <ModalMarketing K={K} m={mk.id ? mk : null} onFechar={() => setMk(null)} />}
    </div>
  );
}
function ModalCampanha({ K, c, onFechar }) {
  const [v, setV] = useState(c || { status: "planejada", inicio: hoje() });
  const salvar = async () => { if (!v.nome) return K.avisar("Informe o nome.", "erro"); try { const d = {}; for (const [k, x] of Object.entries(v)) if (!["id", "criado_em"].includes(k)) d[k] = x === "" ? null : x; await K.salvar("campanhas", c?.id, d); K.avisar("Campanha salva."); onFechar(); } catch (e) { K.avisar(msgErro(e), "erro"); } };
  return (
    <Modal onFechar={onFechar} titulo={c ? c.nome : "Nova campanha"} largura="max-w-3xl">
      <Campos v={v} set={setV} campos={[{ k: "nome", l: "Nome", req: true, full: true }, { k: "objetivo", l: "Objetivo", t: "textarea", full: true }, { k: "publico", l: "Público" }, { k: "servicos", l: "Serviços a divulgar", dica: "Somente serviços autorizados." },
        { k: "inicio", l: "Início", t: "date" }, { k: "fim", l: "Fim", t: "date" }, { k: "status", l: "Situação", t: "select", semVazio: true, op: [["planejada", "Planejada"], ["ativa", "Ativa"], ["concluida", "Concluída"], ["arquivada", "Arquivada"]] },
        { k: "acoes", l: "Ações", t: "textarea", full: true }, { k: "mensagens", l: "Mensagens", t: "textarea", full: true, rows: 5 }, { k: "artes", l: "Artes", t: "textarea", full: true }, { k: "metas", l: "Metas", t: "textarea", full: true }]} />
      <div className="flex justify-between mt-4">{c ? <Btn small tipo="perigo" icon={Trash2} onClick={async () => { if (confirm("Excluir campanha?")) { await K.apagar("campanhas", c.id); onFechar(); } }}>Excluir</Btn> : <span />}<Btn icon={Save} onClick={salvar}>Salvar</Btn></div>
    </Modal>
  );
}
function ModalMarketing({ K, m, onFechar }) {
  const { D } = K;
  const [v, setV] = useState(m || { tipo: "status", status: "rascunho", titulo: "", texto: "" });
  const canvas = useRef(null);
  const fmt = { story: [1080, 1920], status: [1080, 1920], post: [1080, 1080], banner: [1600, 600], comunicado: [1080, 1350], arte: [1080, 1080] }[v.tipo];
  useEffect(() => { desenhar(); }, [v.tipo, v.titulo, v.texto, D.config.logo_url]);
  const desenhar = async () => {
    const cv = canvas.current; if (!cv) return; const [w, h] = fmt; cv.width = w; cv.height = h; const x = cv.getContext("2d");
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, C.navy); g.addColorStop(1, C.navy2); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = "rgba(249,209,11,0.18)"; x.beginPath(); x.arc(w * 0.92, h * 0.08, Math.min(w, h) * 0.35, 0, Math.PI * 2); x.fill();
    x.fillStyle = C.yellow; x.fillRect(0, h - Math.max(14, h * 0.012), w, Math.max(14, h * 0.012));
    const pad = w * 0.08; let y = h * (v.tipo === "banner" ? 0.18 : 0.12);
    if (D.config.logo_url) { try { const img = await new Promise((ok, er) => { const i = new window.Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = er; i.src = D.config.logo_url; }); const lh = Math.min(h * 0.12, 180); const lw = (img.width / img.height) * lh; x.fillStyle = "#fff"; x.fillRect(pad - 12, y - 12, lw + 24, lh + 24); x.drawImage(img, pad, y, lw, lh); y += lh + h * 0.06; } catch { y += 0; } }
    const fs = v.tipo === "banner" ? 64 : w * 0.075; x.fillStyle = "#fff"; x.font = `800 ${fs}px Inter, Arial, sans-serif`;
    const quebrar = (t, larg, f) => { x.font = f; const ps = String(t || "").split(/\s+/); const ls = []; let l = ""; for (const p of ps) { const tt = l ? `${l} ${p}` : p; if (x.measureText(tt).width > larg && l) { ls.push(l); l = p; } else l = tt; } if (l) ls.push(l); return ls; };
    for (const l of quebrar(v.titulo || "Seu título aqui", w - pad * 2, `800 ${fs}px Inter, Arial, sans-serif`)) { x.fillText(l, pad, y + fs); y += fs * 1.15; }
    y += fs * 0.5; const fs2 = v.tipo === "banner" ? 34 : w * 0.038; x.fillStyle = "rgba(255,255,255,0.88)";
    for (const par of String(v.texto || "").split("\n")) for (const l of quebrar(par, w - pad * 2, `500 ${fs2}px Inter, Arial, sans-serif`)) { if (y > h * 0.86) break; x.fillText(l, pad, y + fs2); y += fs2 * 1.4; }
    x.fillStyle = C.yellow; x.font = `700 ${Math.max(22, w * 0.03)}px Inter, Arial, sans-serif`; x.fillText(`${D.config.nome_correspondente || "Mais BB Correspondente Autorizado"} · ${D.config.cidade || "Ivatuba-PR"}`, pad, h - h * 0.05);
  };
  const baixar = () => { const a = document.createElement("a"); a.download = `${(v.titulo || "arte").replace(/[^\w-]+/g, "-").toLowerCase()}.png`; try { a.href = canvas.current.toDataURL("image/png"); a.click(); } catch { K.avisar("Não foi possível exportar a imagem (logo de outro domínio).", "erro"); } };
  const salvar = async () => { if (!v.titulo) return K.avisar("Informe o título.", "erro"); try { const d = {}; for (const [k, x] of Object.entries(v)) if (!["id", "criado_em"].includes(k)) d[k] = x === "" ? null : x; await K.salvar("marketing", m?.id, d); K.avisar("Material salvo."); onFechar(); } catch (e) { K.avisar(msgErro(e), "erro"); } };
  return (
    <Modal onFechar={onFechar} titulo={m ? m.titulo : "Novo material de divulgação"} largura="max-w-4xl">
      <div className="grid md:grid-cols-2 gap-4">
        <div><Campos v={v} set={setV} campos={[{ k: "tipo", l: "Formato", t: "select", semVazio: true, op: Object.entries(TIPOS_MKT) }, { k: "status", l: "Situação", t: "select", semVazio: true, op: [["rascunho", "Rascunho"], ["agendado", "Agendado"], ["publicado", "Publicado"]] }, { k: "titulo", l: "Título", req: true, full: true }, { k: "texto", l: "Texto", t: "textarea", full: true, rows: 6 }, { k: "data_publicacao", l: "Data de publicação", t: "date" }, { k: "campanha_id", l: "Campanha", t: "select", op: D.campanhas.map((c) => [c.id, c.nome]) }]} />
          <div className="flex gap-1.5 flex-wrap mt-3">{["Horário de atendimento", "Dica de segurança", "Agradecimento", "Tema do mês"].map((t) => <Chip key={t} onClick={() => setV({ ...v, titulo: t === "Tema do mês" ? mesInfo(new Date().getMonth(), D.config.calendario || {}).principal : t, texto: t === "Horário de atendimento" ? `Estamos te esperando!\n${D.config.horario || "Consulte nosso horário"}\n${D.config.endereco || ""}` : t === "Dica de segurança" ? "O banco nunca liga pedindo senha nem envia link para desbloquear conta. Na dúvida, procure os canais oficiais." : t === "Agradecimento" ? "Obrigado pela confiança! Sempre que precisar, estamos aqui pertinho de você." : mesInfo(new Date().getMonth(), D.config.calendario || {}).objetivo })}>+ {t}</Chip>)}</div>
        </div>
        <div><canvas ref={canvas} className="w-full rounded-xl border" style={{ borderColor: C.line, maxHeight: 460, objectFit: "contain" }} /><div className="flex gap-2 mt-2"><Btn small tipo="claro" icon={Download} onClick={baixar}>Baixar imagem</Btn><Copiar texto={`${v.titulo}\n\n${v.texto}`} rotulo="Copiar texto" /></div></div>
      </div>
      <div className="flex justify-between mt-4">{m ? <Btn small tipo="perigo" icon={Trash2} onClick={async () => { await K.apagar("marketing", m.id); onFechar(); }}>Excluir</Btn> : <span />}<Btn icon={Save} onClick={salvar}>Salvar</Btn></div>
    </Modal>
  );
}
